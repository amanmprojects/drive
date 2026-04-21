"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { DriveTopBar } from "@/components/drive/top-bar";
import { FileGrid } from "@/components/drive/file-grid";
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
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [driveData, setDriveData] = useState<DriveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isSessionPending && !session) {
      router.push("/sign-in");
    }
  }, [session, isSessionPending, router]);

  // Fetch drive data when folderId changes
  useEffect(() => {
    if (!session) return;

    const fetchDriveData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { folderId } = await params;
        const apiPath = `/api/drive/folders/${folderId}`;

        const response = await fetch(apiPath);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Folder not found");
          } else {
            setError("Failed to load drive contents");
          }
          return;
        }

        const data = await response.json();
        setDriveData(data);
      } catch (err) {
        setError("An error occurred while loading your drive");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDriveData();
  }, [params, session]);

  // Show loading state while checking session or loading data
  if (isSessionPending || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-lg font-medium">{error}</p>
        <button
          onClick={() => router.push("/drive")}
          className="mt-4 text-primary hover:underline"
        >
          Go to My Drive
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar with Breadcrumbs */}
      <DriveTopBar breadcrumbs={driveData?.breadcrumbs ?? [{ id: "root", name: "My Drive", path: "/drive" }]} />

      {/* File Grid */}
      <div className="flex-1 overflow-y-auto">
        <FileGrid nodes={driveData?.nodes ?? []} />
      </div>
    </div>
  );
}
