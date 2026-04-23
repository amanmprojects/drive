"use client";

import { Folder, HardDrive } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DriveSidebarUploads } from "./drive-sidebar-uploads";
import { DriveSidebarStorage } from "./drive-sidebar-storage";

export function DriveSidebar() {
  const pathname = usePathname();

  const isActive = pathname === "/drive" || pathname.startsWith("/drive/");

  return (
    <aside className="flex h-full w-64 min-h-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        <HardDrive className="mr-2 h-5 w-5 text-sidebar-primary" />
        <span className="font-semibold text-sidebar-foreground">Drive</span>
      </div>

      <nav className="shrink-0 p-3">
        <Link
          href="/drive"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <Folder className="h-4 w-4" />
          My Drive
        </Link>
      </nav>

      <div className="min-h-0 flex-1" aria-hidden="true" />

      <DriveSidebarUploads />

      <DriveSidebarStorage />
    </aside>
  );
}
