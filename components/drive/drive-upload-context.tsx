"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useDriveUpload } from "@/lib/hooks/use-drive-upload";
import { uploadParentIdFromPathname } from "@/lib/drive-pathname";
import type { DriveListUpdate } from "@/lib/drive-list-merge";

export type { DriveListUpdate } from "@/lib/drive-list-merge";

type Ctx = ReturnType<typeof useDriveUpload> & {
  /** Current URL folder: `null` for My Drive, else folder id */
  parentId: string | null;
  registerOnDriveListUpdate: (cb: ((u: DriveListUpdate) => void) | null) => void;
  /** Forwards to the page handler; upload and dialogs use this */
  notifyDriveList: (u: DriveListUpdate) => void;
};

const DriveUploadContext = createContext<Ctx | null>(null);

export function DriveUploadProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const parentId = uploadParentIdFromPathname(pathname);
  const onDriveListRef = useRef<((u: DriveListUpdate) => void) | null>(null);

  const notifyDriveList = useCallback((u: DriveListUpdate) => {
    onDriveListRef.current?.(u);
  }, []);

  const registerOnDriveListUpdate = useCallback(
    (cb: ((u: DriveListUpdate) => void) | null) => {
      onDriveListRef.current = cb;
    },
    []
  );

  const upload = useDriveUpload(parentId, notifyDriveList);

  const value: Ctx = {
    ...upload,
    parentId,
    registerOnDriveListUpdate,
    notifyDriveList,
  };

  return (
    <DriveUploadContext.Provider value={value}>
      {children}
    </DriveUploadContext.Provider>
  );
}

export function useDriveUploadContext(): Ctx {
  const ctx = useContext(DriveUploadContext);
  if (!ctx) {
    throw new Error("useDriveUploadContext must be used within DriveUploadProvider");
  }
  return ctx;
}

/**
 * Call from drive folder/root pages to update the file grid on uploads, folder
 * creation, or explicit refresh.
 */
export function useRegisterDriveListUpdate(
  callback: (u: DriveListUpdate) => void
) {
  const { registerOnDriveListUpdate } = useDriveUploadContext();

  useEffect(() => {
    registerOnDriveListUpdate(callback);
    return () => registerOnDriveListUpdate(null);
  }, [callback, registerOnDriveListUpdate]);
}
