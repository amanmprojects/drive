import { auth } from "@/lib/auth";
import { softDeleteNodeForOwner } from "@/lib/queries";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { nodeId } = await params;

  try {
    const result = await softDeleteNodeForOwner(nodeId, userId);

    if (!result) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete node API error:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
