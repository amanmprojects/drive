import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  // Get session to identify the user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  // With virtual root approach, no onboarding setup needed
  // Root (My Drive) is just a UI concept, not a database row
  // User's top-level folders simply have parentId = null

  // Redirect to the main drive interface
  return redirect("/drive");
}
