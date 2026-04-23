"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Folder, FileText } from "lucide-react";
import type { MouseEvent } from "react";
import type { Node } from "@/types/drive";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FileNodeProps {
  node: Node;
  selected: boolean;
  onSelectClick: (node: Node, e: MouseEvent) => void;
  onDeleteRequest: (node: Node) => void;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

export function FileNode({
  node,
  selected,
  onSelectClick,
  onDeleteRequest,
}: FileNodeProps) {
  const router = useRouter();
  const isFolder = node.type === "folder";

  const targetPath = `/drive/folders/${node.id}`;
  const viewHref = `/api/drive/files/${node.id}/view`;

  const handleOpen = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (isFolder) {
        router.push(targetPath);
        return;
      }
      if (!node.s3Key) return;
      window.open(viewHref, "_blank", "noopener,noreferrer");
    },
    [isFolder, node.s3Key, router, targetPath, viewHref]
  );

  const doOpen = useCallback(() => {
    if (isFolder) {
      router.push(targetPath);
      return;
    }
    if (!node.s3Key) return;
    window.open(viewHref, "_blank", "noopener,noreferrer");
  }, [isFolder, node.s3Key, router, targetPath, viewHref]);

  const unavailable = !isFolder && !node.s3Key;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          data-file-node
          data-node-id={node.id}
          role="option"
          tabIndex={-1}
          aria-selected={selected}
          title={unavailable ? "File is not available in storage" : undefined}
          onClick={(e) => onSelectClick(node, e)}
          onDoubleClick={handleOpen}
          className={cn(
            "h-auto w-full self-start text-left",
            "group flex flex-col items-center p-4 rounded-xl border bg-card text-card-foreground",
            "transition-colors hover:bg-muted/50 hover:border-muted-foreground/20",
            "cursor-pointer select-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selected && "ring-2 ring-primary bg-muted/40 border-primary/30",
            unavailable && "opacity-60"
          )}
        >
          <div className="mb-3">
            {isFolder ? (
              <Folder className="h-12 w-12 text-foreground/80 fill-foreground/12" />
            ) : (
              <FileText className="h-12 w-12 text-gray-500" />
            )}
          </div>

          <div className="w-full text-center">
            <p className="text-sm font-medium truncate" title={node.name}>
              {node.name}
            </p>
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            {isFolder ? (
              <span>Folder</span>
            ) : (
              <span>{formatFileSize(node.size)}</span>
            )}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          disabled={unavailable}
          onSelect={() => {
            doOpen();
          }}
        >
          Open
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={() => {
            onDeleteRequest(node);
          }}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
