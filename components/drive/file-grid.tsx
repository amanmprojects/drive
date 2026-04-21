"use client";

import { FileNode } from "./file-node";
import type { Node } from "@/types/drive";

interface FileGridProps {
  nodes: Node[];
}

export function FileGrid({ nodes }: FileGridProps) {
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
      {nodes.map((node) => (
        <FileNode key={node.id} node={node} />
      ))}
    </div>
  );
}
