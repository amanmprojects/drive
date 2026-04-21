import { auth } from "@/lib/auth";
import {
  getRootFolder,
  getNodesByParentId,
  buildBreadcrumbs,
  type DriveNode,
  type BreadcrumbItem,
} from "@/lib/queries";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export interface DriveApiResponse {
  nodes: DriveNode[];
  currentFolder: DriveNode;
  breadcrumbs: BreadcrumbItem[];
}

export async function GET(request: Request) {
  // Get session to identify the user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Root drive - get "My Drive" folder
    const currentFolder = await getRootFolder(userId);

    if (!currentFolder) {
      return NextResponse.json(
        { error: "Root folder not found." },
        { status: 404 }
      );
    }

    // Get all nodes in root folder
    const folderNodes = await getNodesByParentId(currentFolder.id, userId);

    // Build breadcrumbs
    const breadcrumbs = await buildBreadcrumbs(currentFolder, userId);

    const response: DriveApiResponse = {
      nodes: folderNodes,
      currentFolder,
      breadcrumbs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Drive API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch drive contents" },
      { status: 500 }
    );
  }
}
