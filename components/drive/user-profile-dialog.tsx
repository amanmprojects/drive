"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileDialog({
  open,
  onOpenChange,
}: UserProfileDialogProps) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [imageError, setImageError] = useState(false);

  const user = session?.user;
  const email = user?.email ?? "";

  useEffect(() => {
    if (open) setImageError(false);
  }, [open, user?.image]);

  useEffect(() => {
    if (open && !isSessionPending && !session) {
      onOpenChange(false);
    }
  }, [open, isSessionPending, session, onOpenChange]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      onOpenChange(false);
      router.push("/sign-in");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>
            Your profile and sign-in details for this app.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {isSessionPending ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : user ? (
            <>
              <div className="flex flex-col items-center gap-3">
                <div
                  className={cn(
                    "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full",
                    "bg-muted text-muted-foreground"
                  )}
                >
                  {user.image && !imageError ? (
                    <img
                      src={user.image}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <User className="h-10 w-10" aria-hidden />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">
                    {user.name?.trim() || "No name"}
                  </p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={isSessionPending || !user || isSigningOut}
            onClick={handleSignOut}
          >
            {isSigningOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing out…
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
