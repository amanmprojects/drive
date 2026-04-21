"use client";

import { Folder, HardDrive } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DriveSidebar() {
  const pathname = usePathname();

  const isActive = pathname === "/drive" || pathname.startsWith("/drive/");

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo / Brand */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <HardDrive className="h-5 w-5 text-sidebar-primary mr-2" />
        <span className="font-semibold text-sidebar-foreground">Drive</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <Link
          href="/drive"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <Folder className="h-4 w-4" />
          My Drive
        </Link>
      </nav>

      {/* Storage indicator (dummy) */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/70 mb-2">
          Storage used
        </div>
        <div className="h-2 bg-sidebar-border rounded-full overflow-hidden">
          <div className="h-full w-[0%] bg-sidebar-primary rounded-full" />
        </div>
        <div className="text-xs text-sidebar-foreground/70 mt-2">0 MB of 15 GB</div>
      </div>
    </aside>
  );
}
