"use client";

import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Breadcrumb } from "@/types/drive";
import { cn } from "@/lib/utils";

interface TopBarProps {
  breadcrumbs: Breadcrumb[];
}

export function DriveTopBar({ breadcrumbs }: TopBarProps) {
  return (
    <header className="h-14 border-b bg-background flex items-center px-4 gap-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center flex-1 min-w-0">
        <ol className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <li key={crumb.id} className="flex items-center">
                {index > 0 && (
                  <span className="mx-1 text-muted-foreground">/</span>
                )}
                {isLast ? (
                  <span className="font-medium text-foreground truncate">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Search */}
      <div className="relative w-64 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search in Drive"
          className="pl-9 h-9"
        />
      </div>

      {/* Account */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        title="Account"
      >
        <User className="h-5 w-5" />
      </Button>
    </header>
  );
}
