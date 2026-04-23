"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, FolderPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateFolderDialog } from "./create-folder-dialog";
import { cn } from "@/lib/utils";

interface CreateItemFABProps {
  parentId: string | null;
  onFolderCreated?: () => void;
}

export function CreateItemFAB({ parentId, onFolderCreated }: CreateItemFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleNewFolderClick = () => {
    setIsExpanded(false);
    setIsDialogOpen(true);
  };

  const handleUploadClick = () => {
    setIsExpanded(false);
    // Placeholder for upload functionality
    alert("Upload functionality coming soon!");
  };

  return (
    <>
      <div
        ref={containerRef}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
      >
        {/* Expanded menu items */}
        <div
          className={cn(
            "flex flex-col items-end gap-3 transition-all duration-200",
            isExpanded
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {/* New Folder option */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground bg-background/80 px-2 py-1 rounded shadow-sm">
              New folder
            </span>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={handleNewFolderClick}
            >
              <FolderPlus className="h-5 w-5" />
              <span className="sr-only">Create new folder</span>
            </Button>
          </div>

          {/* Upload option */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground bg-background/80 px-2 py-1 rounded shadow-sm">
              Upload
            </span>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={handleUploadClick}
            >
              <Upload className="h-5 w-5" />
              <span className="sr-only">Upload file</span>
            </Button>
          </div>
        </div>

        {/* Main FAB button */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-transform duration-200",
            isExpanded && "rotate-45"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Create new item</span>
        </Button>
      </div>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        parentId={parentId}
        onSuccess={onFolderCreated}
      />
    </>
  );
}
