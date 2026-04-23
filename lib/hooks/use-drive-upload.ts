"use client";

import { useCallback, useRef, useState } from "react";
import {
  uploadDriveFile,
  formatUploadAggregateError,
  type UploadOneResult,
} from "@/lib/drive-upload-file";
import { ensureFolderChain } from "@/lib/ensure-folder-chain";
import type { DriveListUpdate } from "@/lib/drive-list-merge";
import type { DriveNode } from "@/lib/queries";
import type { Node } from "@/types/drive";
import {
  mapWithConcurrency,
  DEFAULT_UPLOAD_CONCURRENCY,
} from "@/lib/promise-pool";
import { driveUploadDebug } from "@/lib/drive-upload-debug";
import { splitWebkitRelativePath } from "@/lib/webkit-path";

export type UploadRow = {
  id: string;
  displayName: string;
  size: number;
  progress: number;
  status: "pending" | "active" | "done" | "error";
  stage?: "presigning" | "uploading" | "completing";
  errorMessage?: string;
};

type PreparedFileItem = {
  id: string;
  file: File;
  rootParentId: string | null;
  dirSegments: string[];
  displayName: string;
  /** Resolved after the folder pre-pass; files with an error here are skipped. */
  fileParentId?: string | null;
  preError?: string;
};

function chainCacheKey(
  rootParentId: string | null,
  dirSegments: string[]
): string {
  return `${rootParentId ?? "root"}\0${dirSegments.join("/")}`;
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

function applyRow(
  rows: UploadRow[] | null,
  id: string,
  patch: Partial<UploadRow>
): UploadRow[] | null {
  if (!rows) return rows;
  return rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

export function useDriveUpload(
  parentId: string | null,
  onDriveListUpdate?: (update: DriveListUpdate) => void
) {
  const [rows, setRows] = useState<UploadRow[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [aggregateError, setAggregateError] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const parentIdRef = useRef(parentId);
  parentIdRef.current = parentId;
  const abortRef = useRef<AbortController | null>(null);

  const runBatch = useCallback(
    async (prepared: PreparedFileItem[], initialRows: UploadRow[]) => {
      driveUploadDebug("runBatch: start", {
        itemCount: prepared.length,
        parentId: parentIdRef.current,
        abortedBefore: abortRef.current?.signal.aborted,
      });
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const { signal } = ac;

      setShowCancelled(false);
      setAggregateError(null);
      setRows(initialRows);
      setIsUploading(true);

      const idCache = new Map<string, string>();
      const onFolderCreated = (folder: DriveNode) => {
        onDriveListUpdate?.({ kind: "add", node: folder as Node });
      };

      const updateRow = (id: string, patch: Partial<UploadRow>) => {
        setRows((r) => applyRow(r, id, patch));
      };

      // Folder pre-pass: resolve every unique chain sequentially *before*
      // starting concurrent file uploads. Eliminates folder-creation races
      // (two workers trying to POST the same folder and racing the DB
      // unique constraint, which surfaced as "Failed to create folder").
      try {
        const chainResults = new Map<string, string | null>();
        const chainErrors = new Map<string, string>();
        for (const item of prepared) {
          if (signal.aborted) break;
          const key = chainCacheKey(item.rootParentId, item.dirSegments);
          if (item.dirSegments.length === 0) {
            item.fileParentId = item.rootParentId;
            continue;
          }
          if (chainResults.has(key)) {
            item.fileParentId = chainResults.get(key) ?? null;
            continue;
          }
          if (chainErrors.has(key)) {
            item.preError = chainErrors.get(key);
            continue;
          }
          try {
            const resolved = await ensureFolderChain(
              item.rootParentId,
              item.dirSegments,
              { signal, idCache, onFolderCreated }
            );
            chainResults.set(key, resolved);
            item.fileParentId = resolved;
          } catch (err) {
            if (isAbortError(err)) throw err;
            const message =
              err instanceof Error
                ? err.message
                : "Failed to prepare folder path";
            chainErrors.set(key, message);
            item.preError = message;
          }
        }

        // Apply pre-pass errors to rows up front so users see them immediately.
        for (const item of prepared) {
          if (item.preError) {
            updateRow(item.id, {
              status: "error",
              errorMessage: item.preError,
              progress: 0,
            });
          }
        }

        const uploadable = prepared.filter((p) => !p.preError);

        const results = await mapWithConcurrency(
          uploadable,
          DEFAULT_UPLOAD_CONCURRENCY,
          async (item) => {
            if (signal.aborted) {
              driveUploadDebug("worker: skip (already aborted)", {
                name: item.displayName,
              });
              return {
                ok: false,
                name: item.displayName,
                message: "Cancelled",
              } as UploadOneResult;
            }

            const fileParentId = item.fileParentId ?? null;

            updateRow(item.id, {
              status: "active",
              stage: "presigning",
              progress: 0,
            });

            driveUploadDebug("worker: calling uploadDriveFile", {
              displayName: item.displayName,
              fileParentId,
              fileSize: item.file.size,
            });
            let lastPct = -1;
            const r = await uploadDriveFile(
              item.file,
              fileParentId,
              {
                displayName: item.displayName,
                signal,
                onProgress: (pct) => {
                  if (pct === lastPct) return;
                  lastPct = pct;
                  updateRow(item.id, { progress: pct, stage: "uploading" });
                },
                onStage: (stage) => updateRow(item.id, { stage }),
              }
            );

            if (r.ok) {
              updateRow(item.id, {
                status: "done",
                progress: 100,
                stage: undefined,
              });
              onDriveListUpdate?.({ kind: "add", node: r.file });
            } else {
              updateRow(item.id, {
                status: "error",
                errorMessage: r.message,
                progress: 0,
                stage: undefined,
              });
            }
            driveUploadDebug("worker: uploadDriveFile result", {
              displayName: item.displayName,
              ok: r.ok,
              ...(r.ok ? {} : { message: r.message }),
            });
            return r;
          }
        );

        driveUploadDebug("runBatch: mapWithConcurrency finished", {
          aborted: signal.aborted,
        });

        if (signal.aborted) {
          setShowCancelled(true);
          setRows(null);
          return;
        }

        const failed = results.filter(
          (r): r is Extract<UploadOneResult, { ok: false }> => !r.ok
        );
        const preFailed = prepared
          .filter((p) => p.preError)
          .map(
            (p) =>
              ({
                ok: false as const,
                name: p.displayName,
                message: p.preError!,
              })
          );
        const realFailures = [...preFailed, ...failed].filter(
          (r) => r.message !== "Cancelled"
        );
        if (realFailures.length > 0) {
          setAggregateError(formatUploadAggregateError(realFailures));
        } else {
          // Pool tasks all succeeded; any remaining `error` rows are preflight-only (never in pool)
          setRows((prev) => {
            if (!prev) return null;
            const preflightLeft = prev.filter((r) => r.status === "error");
            return preflightLeft.length > 0 ? preflightLeft : null;
          });
        }
      } catch (err) {
        driveUploadDebug("runBatch: catch", { err, aborted: signal.aborted });
        if (isAbortError(err)) {
          setShowCancelled(true);
          setRows(null);
        } else {
          setAggregateError(
            err instanceof Error ? err.message : "Upload batch failed"
          );
        }
      } finally {
        driveUploadDebug("runBatch: finally (isUploading=false)");
        setIsUploading(false);
        abortRef.current = null;
      }
    },
    [onDriveListUpdate]
  );

  const startFileBatch = useCallback(
    (files: File[]) => {
      driveUploadDebug("startFileBatch", {
        count: files.length,
        parentId: parentIdRef.current,
      });
      if (files.length === 0) return;
      const root = parentIdRef.current;
      const prepared: PreparedFileItem[] = [];
      const initialRows: UploadRow[] = [];
      for (const file of files) {
        const id = crypto.randomUUID();
        prepared.push({
          id,
          file,
          rootParentId: root,
          dirSegments: [],
          displayName: file.name,
        });
        initialRows.push({
          id,
          displayName: file.name,
          size: file.size,
          progress: 0,
          status: "pending",
        });
      }
      void runBatch(prepared, initialRows);
    },
    [runBatch]
  );

  const startFolderBatch = useCallback(
    (entries: { file: File; webkitRelativePath: string }[]) => {
      driveUploadDebug("startFolderBatch", {
        count: entries.length,
        parentId: parentIdRef.current,
      });
      if (entries.length === 0) return;
      const root = parentIdRef.current;
      const prepared: PreparedFileItem[] = [];
      const initialRows: UploadRow[] = [];
      for (const { file, webkitRelativePath } of entries) {
        const id = crypto.randomUUID();
        let split: { dirSegments: string[]; displayName: string };
        try {
          split = splitWebkitRelativePath(webkitRelativePath, file);
        } catch (e) {
          const message = e instanceof Error ? e.message : "Invalid path";
          initialRows.push({
            id,
            displayName: file.name,
            size: file.size,
            progress: 0,
            status: "error",
            errorMessage: message,
          });
          continue;
        }
        if (!split.displayName.trim()) {
          initialRows.push({
            id,
            displayName: file.name,
            size: file.size,
            progress: 0,
            status: "error",
            errorMessage: "Invalid file name in path",
          });
          continue;
        }
        prepared.push({
          id,
          file,
          rootParentId: root,
          dirSegments: split.dirSegments,
          displayName: split.displayName,
        });
        initialRows.push({
          id,
          displayName: split.displayName,
          size: file.size,
          progress: 0,
          status: "pending",
        });
      }
      if (prepared.length === 0) {
        driveUploadDebug("startFolderBatch: no prepared items (all path errors?)", {
          initialRowCount: initialRows.length,
        });
        setRows(initialRows);
        setAggregateError(
          initialRows.some((r) => r.status === "error")
            ? "Some paths could not be read"
            : null
        );
        return;
      }
      void runBatch(prepared, initialRows);
    },
    [runBatch]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const dismissPanel = useCallback(() => {
    setAggregateError(null);
    setRows(null);
  }, []);

  const clearCancelled = useCallback(() => {
    setShowCancelled(false);
    setRows(null);
  }, []);

  return {
    rows,
    isUploading,
    aggregateError,
    showCancelled,
    startFileBatch,
    startFolderBatch,
    cancel,
    dismissPanel,
    clearCancelled,
  };
}
