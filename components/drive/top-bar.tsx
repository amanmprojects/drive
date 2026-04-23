"use client";

import { useState } from "react";
import { ChevronRight, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Breadcrumb } from "@/types/drive";
import { authClient } from "@/lib/auth-client";
import { UserProfileDialog } from "@/components/drive/user-profile-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopBarProps {
  breadcrumbs: Breadcrumb[];
}

export function DriveTopBar({ breadcrumbs }: TopBarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const avatarUrl = session?.user?.image;

  return (
    <header className="h-14 border-b bg-background flex items-center px-4 gap-4">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center"
      >
        <ol className="flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto text-sm [scrollbar-width:thin]">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const pillClass =
              "h-auto min-h-7 max-w-[min(20rem,40vw)] shrink-0 px-2.5 py-1 text-sm";

            return (
              <li key={crumb.id} className="flex items-center gap-0.5">
                {index > 0 && (
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                {isLast ? (
                  <Badge
                    className={cn(
                      "border-border bg-muted/80 font-medium text-foreground",
                      pillClass
                    )}
                    variant="outline"
                    aria-current="page"
                  >
                    <span className="truncate">{crumb.name}</span>
                  </Badge>
                ) : (
                  <Badge
                    asChild
                    className={cn("border-border", pillClass)}
                    variant="outline"
                  >
                    <Link href={crumb.path} className="block truncate">
                      {crumb.name}
                    </Link>
                  </Badge>
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

      <ThemeToggle />

      {/* Account */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full"
        title="Account"
        onClick={() => setAccountOpen(true)}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <User className="h-5 w-5" />
        )}
      </Button>

      <UserProfileDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </header>
  );
}
