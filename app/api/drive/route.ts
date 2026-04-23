import { auth } from "@/lib/auth";
import {
  getNodesByParentId,
  type DriveNode,
  type BreadcrumbItem,
} from "@/lib/queries";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export interface DriveApiResponse {
  nodes: DriveNode[];
  currentFolder: {
    id: string;
    name: string;
    type: "folder";
    parentId: null;
    path: string;
    depth: number;
  };
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
    // Get all nodes in root (parentId = null)
    const folderNodes = await getNodesByParentId(null, userId);

    // Virtual root folder - not stored in DB, just a UI concept
    const currentFolder = {
      id: "root",
      name: "My Drive",
      type: "folder" as const,
      parentId: null,
      path: "/",
      depth: 0,
    };

    // Single breadcrumb for root
    const breadcrumbs: BreadcrumbItem[] = [
      {
        id: "root",
        name: "My Drive",
        path: "/drive",
      },
    ];

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
