"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, FolderPlus, Upload, FolderUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateFolderDialog } from "./create-folder-dialog";
import { cn } from "@/lib/utils";
import { driveUploadDebug } from "@/lib/drive-upload-debug";
import { useDriveUploadContext } from "./drive-upload-context";

export function CreateItemFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const {
    parentId,
    isUploading,
    startFileBatch,
    startFolderBatch,
    notifyDriveList,
    dismissPanel,
  } = useDriveUploadContext();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.altKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key !== "f" && key !== "u") return;
      if (isEditable(event.target)) return;
      if (isUploading) return;
      event.preventDefault();
      setIsExpanded(false);
      if (key === "f") {
        setIsDialogOpen(true);
      } else {
        dismissPanel();
        fileInputRef.current?.click();
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [isUploading, dismissPanel]);

  const handleNewFolderClick = () => {
    setIsExpanded(false);
    setIsDialogOpen(true);
  };

  const handleUploadClick = () => {
    setIsExpanded(false);
    dismissPanel();
    fileInputRef.current?.click();
  };

  const handleUploadFolderClick = () => {
    setIsExpanded(false);
    dismissPanel();
    folderInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files?.length
      ? Array.from(e.target.files)
      : [];
    e.target.value = "";
    if (files.length === 0) {
      driveUploadDebug("file input: empty selection (cleared or cancelled)");
      return;
    }
    driveUploadDebug("file input: selected", {
      count: files.length,
      first: { name: files[0]?.name, size: files[0]?.size, type: files[0]?.type },
    });
    dismissPanel();
    startFileBatch(files);
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const entries = e.target.files?.length
      ? Array.from(e.target.files, (file) => ({
          file,
          webkitRelativePath: file.webkitRelativePath,
        }))
      : [];
    e.target.value = "";
    if (entries.length === 0) {
      driveUploadDebug("folder input: empty selection (cleared or cancelled)");
      return;
    }
    driveUploadDebug("folder input: selected", {
      count: entries.length,
      first: {
        name: entries[0]?.file.name,
        webkitRelativePath: entries[0]?.file.webkitRelativePath,
        size: entries[0]?.file.size,
      },
    });
    dismissPanel();
    startFolderBatch(entries);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        accept="*/*"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="sr-only"
        accept="*/*"
        aria-hidden
        tabIndex={-1}
        onChange={handleFolderChange}
        disabled={isUploading}
        // @ts-expect-error — webkitdirectory is not in all React HTML input typings
        webkitdirectory=""
        directory="true"
      />
      <div
        ref={containerRef}
        className="fixed bottom-6 right-6 z-50 flex max-w-sm flex-col items-end gap-3"
      >
        <div
          className={cn(
            "flex flex-col items-end gap-3 transition-all duration-200",
            isExpanded
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="rounded bg-background/80 px-2 py-1 text-sm font-medium text-foreground shadow-sm">
              New folder
            </span>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-white text-black shadow-lg hover:bg-white/90 dark:bg-black dark:text-white dark:hover:bg-black/90"
              onClick={handleNewFolderClick}
              disabled={isUploading}
            >
              <FolderPlus className="h-5 w-5 " />
              <span className="sr-only">Create new folder</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded bg-background/80 px-2 py-1 text-sm font-medium text-foreground shadow-sm">
              Upload files
            </span>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-white text-black shadow-lg hover:bg-white/90 dark:bg-black dark:text-white dark:hover:bg-black/90"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              <Upload className="h-5 w-5 " />
              <span className="sr-only">Upload files from device</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded bg-background/80 px-2 py-1 text-sm font-medium text-foreground shadow-sm">
              Upload folder
            </span>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-white text-black shadow-lg hover:bg-white/90 dark:bg-black dark:text-white dark:hover:bg-black/90"
              onClick={handleUploadFolderClick}
              disabled={isUploading}
            >
              <FolderUp className="h-5 w-5 " />
              <span className="sr-only">Upload a folder from device</span>
            </Button>
          </div>
        </div>

        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full bg-white text-black shadow-xl transition-transform duration-200 hover:bg-white/90 dark:bg-black dark:text-white dark:hover:bg-black/90",
            isExpanded && "rotate-45"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={isUploading}
        >
          <Plus className="h-6 w-6 " />
          <span className="sr-only">Create new item</span>
        </Button>
      </div>

      <CreateFolderDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        parentId={parentId}
        onDriveListUpdate={notifyDriveList}
      />
    </>
  );
}
