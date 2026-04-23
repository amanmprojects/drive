"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileNode } from "./file-node";
import type { Node } from "@/types/drive";
import type { MouseEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface FileGridProps {
  nodes: Node[];
  onListChanged?: () => void;
}

const MARQUEE_THRESHOLD_PX = 4;

function buildIdIndex(nodes: Node[]) {
  return new Map(nodes.map((n, i) => [n.id, i]));
}

function domRectsIntersect(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number }
): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

export function FileGrid({ nodes, onListChanged }: FileGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    ids: string[];
    contextNode: Node;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [marqueeBox, setMarqueeBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    mode: "undecided" | "marquee";
  } | null>(null);
  const rafMarquee = useRef<number | null>(null);
  const pendingMove = useRef<{ x: number; y: number } | null>(null);

  const validIds = useMemo(
    () => new Set(nodes.map((n) => n.id)),
    [nodes]
  );

  const selectedInView = useMemo(
    () => new Set([...selectedIds].filter((id) => validIds.has(id))),
    [selectedIds, validIds]
  );

  const handleNodeClick = useCallback(
    (node: Node, e: MouseEvent) => {
      const id = node.id;
      const indexById = buildIdIndex(nodes);
      const i = indexById.get(id);
      if (i === undefined) return;

      if (e.shiftKey) {
        const aId = anchorId && validIds.has(anchorId) ? anchorId : id;
        const ai = indexById.get(aId) ?? i;
        const lo = Math.min(ai, i);
        const hi = Math.max(ai, i);
        const next = new Set<string>();
        for (let j = lo; j <= hi; j++) {
          const n = nodes[j];
          if (n) next.add(n.id);
        }
        setSelectedIds(next);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        setSelectedIds((prev) => {
          const s = new Set(
            [...prev].filter((x) => validIds.has(x))
          );
          if (s.has(id)) s.delete(id);
          else s.add(id);
          return s;
        });
        return;
      }

      setSelectedIds(new Set([id]));
      setAnchorId(id);
    },
    [anchorId, nodes, validIds]
  );

  const applyMarqueeSelection = useCallback(
    (box: { left: number; top: number; width: number; height: number }) => {
      const container = containerRef.current;
      if (!container) return;
      const cr = container.getBoundingClientRect();
      const sel = {
        left: cr.left + box.left,
        right: cr.left + box.left + box.width,
        top: cr.top + box.top,
        bottom: cr.top + box.top + box.height,
      };
      const next = new Set<string>();
      for (const el of container.querySelectorAll<HTMLElement>("[data-file-node]")) {
        const id = el.getAttribute("data-node-id");
        if (!id || !validIds.has(id)) continue;
        if (domRectsIntersect(sel, el.getBoundingClientRect())) {
          next.add(id);
        }
      }
      setSelectedIds(next);
      if (next.size > 0) {
        setAnchorId([...next][0] ?? null);
      } else {
        setAnchorId(null);
      }
    },
    [validIds]
  );

  const flushMarqueeRaf = useCallback(() => {
    rafMarquee.current = null;
    const move = pendingMove.current;
    if (!move || !dragRef.current || dragRef.current.mode !== "marquee") return;
    const container = containerRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const x1 = move.x - cr.left;
    const y1 = move.y - cr.top;
    const x0 = dragRef.current.startClientX - cr.left;
    const y0 = dragRef.current.startClientY - cr.top;
    const left = Math.min(x0, x1);
    const top = Math.min(y0, y1);
    const width = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);
    setMarqueeBox({ left, top, width, height });
  }, []);

  const endBackgroundGesture = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const drag = dragRef.current;
      const container = containerRef.current;
      dragRef.current = null;
      if (rafMarquee.current != null) {
        cancelAnimationFrame(rafMarquee.current);
        rafMarquee.current = null;
      }
      pendingMove.current = null;

      if (drag?.mode === "marquee" && container) {
        const cr = container.getBoundingClientRect();
        const x1 = e.clientX - cr.left;
        const y1 = e.clientY - cr.top;
        const x0 = drag.startClientX - cr.left;
        const y0 = drag.startClientY - cr.top;
        const left = Math.min(x0, x1);
        const top = Math.min(y0, y1);
        const width = Math.abs(x1 - x0);
        const height = Math.abs(y1 - y0);
        applyMarqueeSelection({ left, top, width, height });
        setMarqueeBox(null);
        document.body.classList.remove("select-none", "cursor-crosshair");
        return;
      }

      setMarqueeBox(null);
      document.body.classList.remove("select-none", "cursor-crosshair");

      if (drag?.mode === "undecided") {
        if (e.target instanceof Element) {
          if (e.target.closest("[data-file-node]")) return;
        }
        setSelectedIds(new Set());
        setAnchorId(null);
      }
    },
    [applyMarqueeSelection]
  );

  const handleContainerPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      // Ignore events bubbling through React portals (e.g. Radix context menu items).
      // Without this, setPointerCapture below would steal the pointer from the menu item
      // and prevent its click/onSelect from firing.
      if (
        e.target instanceof Node &&
        !e.currentTarget.contains(e.target)
      ) {
        return;
      }
      if (e.target instanceof Element && e.target.closest("[data-file-node]")) {
        return;
      }

      dragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        mode: "undecided",
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    []
  );

  const handleContainerPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      const dist = Math.hypot(dx, dy);

      if (drag.mode === "undecided" && dist >= MARQUEE_THRESHOLD_PX) {
        drag.mode = "marquee";
        document.body.classList.add("select-none", "cursor-crosshair");
      }

      if (drag.mode === "marquee") {
        pendingMove.current = { x: e.clientX, y: e.clientY };
        if (rafMarquee.current == null) {
          rafMarquee.current = requestAnimationFrame(() => {
            rafMarquee.current = null;
            flushMarqueeRaf();
          });
        }
      }
    },
    [flushMarqueeRaf]
  );

  const handleContainerPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      endBackgroundGesture(e);
    },
    [endBackgroundGesture]
  );

  const handleContainerPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      endBackgroundGesture(e);
    },
    [endBackgroundGesture]
  );

  const handleDeleteRequest = useCallback((node: Node) => {
    const inMulti =
      selectedInView.size > 1 && selectedInView.has(node.id);
    const ids = inMulti ? [...selectedInView] : [node.id];
    setDeleteDialog({ ids, contextNode: node });
  }, [selectedInView]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isDeleteKey =
        e.key === "Delete" ||
        (e.key === "Backspace" && (e.metaKey || e.ctrlKey));
      if (!isDeleteKey) return;
      if (e.repeat) return;
      if (isDeleting) return;
      if (deleteDialog != null) return;
      if (selectedInView.size === 0) return;

      const t = e.target;
      if (t instanceof Element) {
        if (
          t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement
        ) {
          return;
        }
        if (t instanceof HTMLElement && t.isContentEditable) {
          return;
        }
        if (t.closest("input, textarea, [contenteditable='true']")) {
          return;
        }
      }

      e.preventDefault();
      const first = nodes.find((n) => selectedInView.has(n.id));
      if (first) handleDeleteRequest(first);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    deleteDialog,
    isDeleting,
    handleDeleteRequest,
    nodes,
    selectedInView,
  ]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog) return;
    setIsDeleting(true);
    const { ids } = deleteDialog;
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/drive/nodes/${id}`, { method: "DELETE" })
        )
      );
      const okIds = ids.filter((id, i) => results[i]?.ok);
      if (okIds.length === 0) {
        window.alert("Could not delete the selected items. Try again.");
        return;
      }
      if (okIds.length < ids.length) {
        window.alert(
          `Some items could not be deleted (${ids.length - okIds.length} failed).`
        );
      }
      const toRemove = new Set(okIds);
      setSelectedIds((prev) => new Set([...prev].filter((x) => !toRemove.has(x))));
      setAnchorId((a) => (a && toRemove.has(a) ? null : a));
      setDeleteDialog(null);
      onListChanged?.();
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog, onListChanged]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <svg
          className="h-16 w-16 mb-4 opacity-50"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p className="text-lg font-medium">This folder is empty</p>
        <p className="text-sm mt-1">Upload files or create folders to get started</p>
      </div>
    );
  }

  const deleteCount = deleteDialog?.ids.length ?? 0;
  const deleteMulti = deleteCount > 1;
  const deleteTitle =
    deleteDialog == null
      ? ""
      : deleteMulti
        ? `Delete ${deleteCount} items?`
        : `Delete ${
            deleteDialog.contextNode.type === "folder" ? "folder" : "file"
          } "${deleteDialog.contextNode.name}"?`;
  const deleteDescription =
    deleteDialog == null
      ? ""
      : deleteMulti
        ? "The selected files and folders will be removed from your drive. Folders include everything inside them. This cannot be undone."
        : deleteDialog.contextNode.type === "folder"
          ? "This folder and everything inside it will be removed from your drive. This cannot be undone."
          : "The file will be removed from your drive. This cannot be undone.";

  return (
    <>
      <div
        ref={containerRef}
        className="relative min-h-full"
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
        onPointerCancel={handleContainerPointerCancel}
      >
        {marqueeBox && (
          <div
            className="pointer-events-none absolute z-20 border border-primary/60 bg-primary/10"
            style={{
              left: marqueeBox.left,
              top: marqueeBox.top,
              width: marqueeBox.width,
              height: marqueeBox.height,
            }}
            aria-hidden
          />
        )}
        <div
          role="listbox"
          aria-label="Files and folders"
          aria-multiselectable
          className="grid min-h-full content-start items-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4"
        >
          {nodes.map((node) => (
            <FileNode
              key={node.id}
              node={node}
              selected={selectedInView.has(node.id)}
              onSelectClick={handleNodeClick}
              onDeleteRequest={handleDeleteRequest}
            />
          ))}
        </div>
      </div>

      <AlertDialog
        open={deleteDialog != null}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleConfirmDelete()}
            >
              {isDeleting
                ? "Deleting…"
                : deleteMulti
                  ? `Delete ${deleteCount}`
                  : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
