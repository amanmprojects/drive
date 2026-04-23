import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

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

/**
 * Check if a folder with the given name already exists in the parent folder
 */
export async function folderExists(
  name: string,
  parentId: string | null,
  userId: string
): Promise<boolean> {
  const query = parentId
    ? and(
        eq(nodes.parentId, parentId),
        eq(nodes.ownerId, userId),
        eq(nodes.name, name),
        eq(nodes.type, "folder")
      )
    : and(
        isNull(nodes.parentId),
        eq(nodes.ownerId, userId),
        eq(nodes.name, name),
        eq(nodes.type, "folder")
      );

  const result = await db.select({ id: nodes.id }).from(nodes).where(query).limit(1);

  return result.length > 0;
}

/**
 * Create a new folder
 * Calculates path and depth based on parent folder
 * Throws error if folder with same name already exists in parent
 */
export async function createFolder(
  name: string,
  parentId: string | null,
  userId: string
): Promise<DriveNode> {
  // Validate folder name
  if (!name || name.trim().length === 0) {
    throw new Error("Folder name is required");
  }

  if (name.length > 255) {
    throw new Error("Folder name must be less than 255 characters");
  }

  const trimmedName = name.trim();

  // Check for duplicate name in parent folder
  const exists = await folderExists(trimmedName, parentId, userId);
  if (exists) {
    throw new Error(`A folder named "${trimmedName}" already exists in this location`);
  }

  // Calculate path and depth based on parent
  let path: string;
  let depth: number;

  if (parentId) {
    // Get parent folder to determine path and depth
    const parent = await getFolderById(parentId, userId);
    if (!parent) {
      throw new Error("Parent folder not found");
    }
    path = `${parent.path}/${parentId}`;
    depth = parent.depth + 1;
  } else {
    // Root-level folder
    path = "/";
    depth = 0;
  }

  try {
    // Insert the new folder
    const result = await db
      .insert(nodes)
      .values({
        ownerId: userId,
        name: trimmedName,
        type: "folder",
        parentId,
        path,
        depth,
      })
      .returning();

    if (!result[0]) {
      throw new Error("Failed to create folder");
    }

    return result[0];
  } catch (error) {
    // Handle unique constraint violation (parent_id, name)
    if (error instanceof Error && error.message.includes("unique constraint")) {
      throw new Error(`A folder named "${trimmedName}" already exists in this location`);
    }
    throw error;
  }
}
