"use client";

import { useCallback, useMemo, useState } from "react";
import { FileNode } from "./file-node";
import type { Node } from "@/types/drive";
import type { MouseEvent, PointerEvent } from "react";

interface FileGridProps {
  nodes: Node[];
}

function buildIdIndex(nodes: Node[]) {
  return new Map(nodes.map((n, i) => [n.id, i]));
}

export function FileGrid({ nodes }: FileGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);

  const validIds = useMemo(
    () => new Set(nodes.map((n) => n.id)),
    [nodes]
  );

  // Ignore ids no longer in the list (e.g. refresh) without a setState-in-effect
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

  const handleBackgroundPointer = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.target instanceof Element) {
        if (e.target.closest("[data-file-node]")) return;
        setSelectedIds(new Set());
        setAnchorId(null);
      }
    },
    []
  );

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

  return (
    <div
      role="listbox"
      aria-label="Files and folders"
      aria-multiselectable
      onPointerDown={handleBackgroundPointer}
      className="grid min-h-full content-start items-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4"
    >
      {nodes.map((node) => (
        <FileNode
          key={node.id}
          node={node}
          selected={selectedInView.has(node.id)}
          onSelectClick={handleNodeClick}
        />
      ))}
    </div>
  );
}
