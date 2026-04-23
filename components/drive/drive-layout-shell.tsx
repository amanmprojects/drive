"use client";

import { DriveUploadProvider } from "./drive-upload-context";
import { DriveSidebar } from "./sidebar";

export function DriveLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DriveUploadProvider>
      <div className="flex min-h-0 h-full flex-1">
        <DriveSidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </DriveUploadProvider>
  );
}
