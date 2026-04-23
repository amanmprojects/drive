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

export default function DriveFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [driveData, setDriveData] = useState<DriveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const lastLoadedFolderIdRef = useRef<string | null>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isSessionPending && !session) {
      router.push("/sign-in");
    }
  }, [session, isSessionPending, router]);

  // Resolve params and store folderId
  useEffect(() => {
    const resolveParams = async () => {
      const { folderId: resolvedFolderId } = await params;
      setFolderId(resolvedFolderId);
    };
    resolveParams();
  }, [params]);

  // Fetch drive data when folderId changes
  const fetchDriveData = useCallback(async () => {
    if (!session || !folderId) return;

    if (lastLoadedFolderIdRef.current !== folderId) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const apiPath = `/api/drive/folders/${folderId}`;

      const response = await fetch(apiPath);

      if (!response.ok) {
        setDriveData(null);
        if (response.status === 404) {
          setError("Folder not found");
        } else {
          setError("Failed to load drive contents");
        }
        return;
      }

      const data = await response.json();
      setDriveData(data);
      lastLoadedFolderIdRef.current = folderId;
    } catch (err) {
      setDriveData(null);
      setError("An error occurred while loading your drive");
    } finally {
      setIsLoading(false);
    }
  }, [folderId, session]);

  useEffect(() => {
    fetchDriveData();
  }, [fetchDriveData]);

  const onDriveListUpdate = useCallback(
    (u: DriveListUpdate) => {
      if (u.kind === "refresh") {
        void fetchDriveData();
        return;
      }
      if (!folderId) return;
      setDriveData((prev) => {
        if (!prev) return prev;
        const next = mergeNodeIfInCurrentFolder(prev, folderId, u.node);
        return next ?? prev;
      });
    },
    [fetchDriveData, folderId]
  );

  useRegisterDriveListUpdate(onDriveListUpdate);

  const defaultBreadcrumbs: Breadcrumb[] = [
    { id: "root", name: "My Drive", path: "/drive" },
  ];
  const dataMatchesFolder = Boolean(
    folderId && driveData && driveData.currentFolder.id === folderId
  );
  const showContentLoader =
    isSessionPending ||
    !folderId ||
    (isLoading && !dataMatchesFolder);
  const folderMissing = error === "Folder not found";

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
            {folderMissing && (
              <button
                type="button"
                onClick={() => router.push("/drive")}
                className="mt-4 text-primary hover:underline"
              >
                Go to My Drive
              </button>
            )}
          </div>
        ) : (
          <FileGrid
            key={pathname}
            nodes={driveData?.nodes ?? []}
            onListChanged={fetchDriveData}
          />
        )}
      </div>

      <CreateItemFAB />
    </div>
  );
}
