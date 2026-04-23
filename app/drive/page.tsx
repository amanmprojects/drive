"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { DriveTopBar } from "@/components/drive/top-bar";
import { FileGrid } from "@/components/drive/file-grid";
import { CreateItemFAB } from "@/components/drive/create-item-fab";
import { useRegisterDriveListUpdate } from "@/components/drive/drive-upload-context";
import {
  mergeNodeIfInCurrentFolder,
  type DriveListUpdate,
} from "@/lib/drive-list-merge";
import type { Node, Breadcrumb } from "@/types/drive";

interface DriveData {
  nodes: Node[];
  currentFolder: Node;
  breadcrumbs: Breadcrumb[];
}

export default function DriveRootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [driveData, setDriveData] = useState<DriveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRootOnceRef = useRef(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isSessionPending && !session) {
      router.push("/sign-in");
    }
  }, [session, isSessionPending, router]);

  // Fetch root drive data
  const fetchDriveData = useCallback(async () => {
    if (!session) return;

    if (!hasLoadedRootOnceRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/drive");

      if (!response.ok) {
        setError("Failed to load drive contents");
        return;
      }

      const data = await response.json();
      setDriveData(data);
      hasLoadedRootOnceRef.current = true;
    } catch (err) {
      setError("An error occurred while loading your drive");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchDriveData();
  }, [fetchDriveData]);

  const onDriveListUpdate = useCallback(
    (u: DriveListUpdate) => {
      if (u.kind === "refresh") {
        void fetchDriveData();
        return;
      }
      setDriveData((prev) => {
        if (!prev) return prev;
        const next = mergeNodeIfInCurrentFolder(prev, null, u.node);
        return next ?? prev;
      });
    },
    [fetchDriveData]
  );

  useRegisterDriveListUpdate(onDriveListUpdate);

  const showContentLoader = isSessionPending || (isLoading && !driveData);
  const defaultBreadcrumbs: Breadcrumb[] = [
    { id: "root", name: "My Drive", path: "/drive" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DriveTopBar
        breadcrumbs={driveData?.breadcrumbs ?? defaultBreadcrumbs}
      />

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {showContentLoader ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-10 w-10 shrink-0 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center p-4 text-center text-muted-foreground">
            <p className="text-lg font-medium">{error}</p>
          </div>
        ) : (
          <FileGrid key={pathname} nodes={driveData?.nodes ?? []} />
        )}
      </div>

      <CreateItemFAB />
    </div>
  );
}
