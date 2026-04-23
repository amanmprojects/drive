import type { DriveNode } from "@/lib/queries";
import { driveUploadDebug } from "@/lib/drive-upload-debug";

function cacheKey(parentId: string | null, name: string): string {
  return `${parentId ?? "root"}\0${name}`;
}

export interface GetOrCreateFolderContext {
  signal: AbortSignal | undefined;
  /** Reused across many files in one batch to avoid duplicating work. */
  idCache: Map<string, string>;
  onFolderCreated?: (folder: DriveNode) => void;
}

export async function fetchChildFolderInParent(
  parentId: string | null,
  name: string,
  signal: AbortSignal | undefined
): Promise<DriveNode | null> {
  const url = parentId == null ? "/api/drive" : `/api/drive/folders/${parentId}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as { nodes: DriveNode[] };
  const found = data.nodes.find(
    (n) => n.type === "folder" && n.name === name
  );
  return found ?? null;
}

/**
 * Create a child folder, or on 409 resolve the existing folder id (same parent + name).
 */
export async function getOrCreateFolder(
  parentId: string | null,
  name: string,
  ctx: GetOrCreateFolderContext
): Promise<string> {
  const { signal, idCache, onFolderCreated } = ctx;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255) {
    throw new Error(
      !trimmed ? "Folder name is required" : "Folder name is too long"
    );
  }
  const k = cacheKey(parentId, trimmed);
  const hit = idCache.get(k);
  if (hit) {
    driveUploadDebug("getOrCreateFolder: cache hit", {
      name: trimmed,
      parentId,
      id: hit,
    });
    return hit;
  }

  driveUploadDebug("getOrCreateFolder: POST /api/drive/folders", {
    name: trimmed,
    parentId,
    aborted: signal?.aborted ?? false,
  });
  const res = await fetch("/api/drive/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: trimmed, parentId }),
    signal,
  });

  if (res.status === 201) {
    const data = (await res.json()) as { folder: DriveNode };
    const id = data.folder.id;
    idCache.set(k, id);
    onFolderCreated?.(data.folder);
    return id;
  }

  if (res.status === 409) {
    const existing = await fetchChildFolderInParent(
      parentId,
      trimmed,
      signal
    );
    if (existing) {
      idCache.set(k, existing.id);
      return existing.id;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Folder already exists");
  }

  const data = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(data.error || "Failed to create folder");
}

/**
 * Walk `dirSegments` from `rootParentId`, creating folders as needed. Returns the folder id
 * that should be the `parentId` for files living in that directory (or `rootParentId` if no segments).
 */
export async function ensureFolderChain(
  rootParentId: string | null,
  dirSegments: string[],
  ctx: GetOrCreateFolderContext
): Promise<string | null> {
  driveUploadDebug("ensureFolderChain: start", {
    rootParentId,
    segmentCount: dirSegments.length,
    segments: dirSegments,
    aborted: ctx.signal?.aborted ?? false,
  });
  let current: string | null = rootParentId;
  for (const seg of dirSegments) {
    const t = seg.trim();
    if (!t || t === "." || t === "..") {
      throw new Error(`Invalid folder segment: "${seg}"`);
    }
    driveUploadDebug("ensureFolderChain: segment", {
      seg: t,
      parentId: current,
    });
    const id = await getOrCreateFolder(current, t, ctx);
    current = id;
  }
  driveUploadDebug("ensureFolderChain: done", { fileParentId: current });
  return current;
}
