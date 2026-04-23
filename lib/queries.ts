import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export type NodeType = "file" | "folder";

export interface DriveNode {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  path: string;
  depth: number;
  s3Key: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  path: string;
}

/**
 * Get a folder by its ID
 */
export async function getFolderById(
  folderId: string,
  userId: string
): Promise<DriveNode | null> {
  const result = await db
    .select()
    .from(nodes)
    .where(
      and(
        eq(nodes.id, folderId),
        eq(nodes.ownerId, userId),
        eq(nodes.type, "folder")
      )
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get all nodes (files and folders) inside a specific parent folder
 */
export async function getNodesByParentId(
  parentId: string | null,
  userId: string
): Promise<DriveNode[]> {
  const query = parentId
    ? and(eq(nodes.parentId, parentId), eq(nodes.ownerId, userId))
    : and(isNull(nodes.parentId), eq(nodes.ownerId, userId));

  const results = await db
    .select()
    .from(nodes)
    .where(query)
    .orderBy(nodes.type, nodes.name);

  return results;
}

/**
 * Build breadcrumbs for a given folder
 * Walks up the parent chain to root
 * Uses ID-based paths: /drive/folders/{folderId}
 */
export async function buildBreadcrumbs(
  folder: DriveNode,
  userId: string
): Promise<BreadcrumbItem[]> {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Add current folder first (we'll reverse at the end)
  breadcrumbs.push({
    id: folder.id,
    name: folder.name,
    path: "", // Will compute after we have full chain
  });

  let currentFolder: DriveNode | null = folder;

  // Walk up parent chain
  while (currentFolder?.parentId) {
    const parent = await getFolderById(currentFolder.parentId, userId);
    if (!parent) break;

    breadcrumbs.push({
      id: parent.id,
      name: parent.name,
      path: "", // Will compute after we have full chain
    });

    currentFolder = parent;
  }

  // Reverse to get root -> current
  breadcrumbs.reverse();

  // Build path strings for each breadcrumb using IDs
  // Root folder uses /drive, others use /drive/folders/{folderId}
  for (let i = 0; i < breadcrumbs.length; i++) {
    if (i === 0 && breadcrumbs[i].name === "My Drive") {
      // Root folder - path is just /drive
      breadcrumbs[i].path = "/drive";
    } else {
      breadcrumbs[i].path = `/drive/folders/${breadcrumbs[i].id}`;
    }
  }

  return breadcrumbs;
}
