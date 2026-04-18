"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DrivePage() {
  const router = useRouter();
  const { data: session, isPending, isRefetching } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  return (
    <>
    {isPending ? (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center h-screen">
        {/* Drive Text */}
        <div className="flex flex-col items-center justify-center mb-5">
          <h1 className="text-4xl font-bold">Drive</h1>
          <p className="text-lg text-muted-foreground">
            Your files, your control
          </p>
        </div>
        {/* Sign Out Button */}
        <Button onClick={handleSignOut}>
          {isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign Out"}
        </Button>
      </div>
    )}
    </>
  );
}