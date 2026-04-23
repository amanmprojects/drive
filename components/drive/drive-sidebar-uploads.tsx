"use client";

import {
  Loader2,
  X,
  Check,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriveUploadContext } from "./drive-upload-context";
import { formatFileSize, rowStatusLabel } from "@/lib/upload-ui";

function hasPanelContent(
  aggregateError: string | null,
  showCancelled: boolean,
  rows: { length: number } | null
): boolean {
  return (
    Boolean(aggregateError) ||
    showCancelled ||
    Boolean(rows && rows.length > 0)
  );
}

export function DriveSidebarUploads() {
  const {
    rows,
    isUploading,
    aggregateError,
    showCancelled,
    cancel,
    dismissPanel,
    clearCancelled,
  } = useDriveUploadContext();

  const hasContent = hasPanelContent(aggregateError, showCancelled, rows);
  const showEmpty = !hasContent;

  return (
    <div
      className="flex max-h-[min(50vh,22rem)] min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-t border-sidebar-border"
      aria-live="polite"
    >
      <div className="shrink-0 px-3 py-2 text-xs font-medium text-sidebar-foreground/90">
        Uploads
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
        {showEmpty && (
          <p className="px-1 text-xs text-sidebar-foreground/50">
            No uploads in progress
          </p>
        )}

        {aggregateError && (
          <div
            role="alert"
            className="mb-2 space-y-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-2 text-xs text-destructive"
          >
            <p className="break-words">{aggregateError}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-destructive"
              onClick={() => dismissPanel()}
            >
              Dismiss
            </Button>
          </div>
        )}

        {showCancelled && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-2 py-2 text-xs text-sidebar-foreground/80">
            <span>Upload cancelled</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-7 px-2"
              onClick={() => clearCancelled()}
            >
              OK
            </Button>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div
            className="space-y-2 rounded-md border border-sidebar-border bg-sidebar-accent/20 p-2"
            aria-label="Upload progress"
          >
            <div className="flex items-center justify-between gap-1 border-b border-sidebar-border/60 pb-1.5 text-[11px] text-sidebar-foreground/70">
              <span className="min-w-0 font-medium">Queue</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span>
                  {rows.filter((r) => r.status === "done").length} /{" "}
                  {rows.length}
                </span>
                {!isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-[10px] text-sidebar-foreground"
                    onClick={() => dismissPanel()}
                  >
                    Close
                  </Button>
                )}
              </span>
            </div>
            <ul className="space-y-2 pr-0.5">
              {rows.map((row) => (
                <li key={row.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-1 text-sidebar-foreground/80">
                    <span
                      className="flex min-w-0 flex-1 items-center gap-1.5"
                      title={row.displayName}
                    >
                      {row.status === "active" && (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      )}
                      {row.status === "done" && (
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-green-600"
                          aria-hidden
                        />
                      )}
                      {row.status === "error" && (
                        <CircleAlert
                          className="h-3.5 w-3.5 shrink-0 text-destructive"
                          aria-hidden
                        />
                      )}
                      {row.status === "pending" && (
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full border border-sidebar-foreground/30"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sidebar-foreground">
                        {row.displayName}
                      </span>
                    </span>
                    {row.status === "active" && row.stage === "uploading" && (
                      <span className="shrink-0 tabular-nums">
                        {row.progress}%
                      </span>
                    )}
                    {row.status === "error" && (
                      <span className="shrink-0 text-destructive" title="Failed">
                        !
                      </span>
                    )}
                  </div>
                  <p className="pl-5 text-[10px] text-sidebar-foreground/70">
                    {rowStatusLabel(row)} · {formatFileSize(row.size)}
                  </p>
                  {row.status === "active" && row.stage === "uploading" && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-sidebar-border pl-0">
                      <div
                        className="h-full bg-sidebar-primary transition-all duration-150"
                        style={{ width: `${row.progress}%` }}
                      />
                    </div>
                  )}
                  {row.status === "error" && row.errorMessage && (
                    <p
                      className="pl-5 text-[10px] text-destructive"
                      title={row.errorMessage}
                    >
                      {row.errorMessage}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex justify-end border-t border-sidebar-border/60 pt-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => cancel()}
                disabled={!isUploading}
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
