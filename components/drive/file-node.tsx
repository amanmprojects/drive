"use client";

import { Folder, FileText } from "lucide-react";
import Link from "next/link";
import type { Node } from "@/types/drive";
import { cn } from "@/lib/utils";

interface FileNodeProps {
  node: Node;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

export function FileNode({ node }: FileNodeProps) {
  const isFolder = node.type === "folder";

  // Navigate using folder ID - O(log n) single query
  const targetPath = isFolder
    ? `/drive/folders/${node.id}`
    : "#";

  const content = (
    <div
      className={cn(
        "group flex flex-col items-center p-4 rounded-xl border bg-card text-card-foreground",
        "transition-colors hover:bg-muted/50 hover:border-muted-foreground/20",
        "cursor-pointer select-none"
      )}
    >
      {/* Icon */}
      <div className="mb-3">
        {isFolder ? (
          <Folder className="h-12 w-12 text-blue-500 fill-blue-500/20" />
        ) : (
          <FileText className="h-12 w-12 text-gray-500" />
        )}
      </div>

      {/* Name */}
      <div className="w-full text-center">
        <p className="text-sm font-medium truncate" title={node.name}>
          {node.name}
        </p>
      </div>

      {/* Meta info */}
      <div className="mt-2 text-xs text-muted-foreground">
        {isFolder ? (
          <span>Folder</span>
        ) : (
          <span>{formatFileSize(node.size)}</span>
        )}
      </div>
    </div>
  );

  if (isFolder) {
    return <Link href={targetPath}>{content}</Link>;
  }

  return (
    <div onClick={() => alert(`File: ${node.name}\nThis would open the file`)}>
      {content}
    </div>
  );
}
