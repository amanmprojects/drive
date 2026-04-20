import { auth } from "@/lib/auth";
import { db } from "@/db";
import { nodes } from "@/db/schema";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";

export async function GET() {
  // Get session to identify the user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  const userId = session.user.id;

  // Check if user already has a root node (idempotency check)
  const existingRoot = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.ownerId, userId), isNull(nodes.parentId)))
    .limit(1);

  if (existingRoot.length > 0) {
    // Already onboarded, redirect to drive
    return redirect("/drive");
  }

  // Create the root node ("My Drive")
  await db.insert(nodes).values({
    ownerId: userId,
    name: "My Drive",
    type: "folder",
    parentId: null,
    path: "", // Empty string - root has no parent path
    depth: 0,
  });

  // Redirect to the main drive interface
  return redirect("/drive");
}
