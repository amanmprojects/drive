import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq, and, isNull, isNotNull, sql } from "drizzle-orm";

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
 * Get a non-deleted file by ID for the owning user (with storage key).
 */
export async function getFileByIdForOwner(
  fileId: string,
  userId: string
): Promise<DriveNode | null> {
  const result = await db
    .select()
    .from(nodes)
    .where(
      and(
        eq(nodes.id, fileId),
        eq(nodes.ownerId, userId),
        eq(nodes.type, "file"),
        isNull(nodes.deletedAt),
        isNotNull(nodes.s3Key)
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
 * Build breadcrumbs for a given folder.
 * Walks up the parent chain to the top-level folder, then prepends "My Drive" → `/drive`.
 * Each folder segment uses `/drive/folders/{folderId}`.
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

  for (const crumb of breadcrumbs) {
    crumb.path = `/drive/folders/${crumb.id}`;
  }

  // Virtual home — matches `/api/drive` root response
  return [
    { id: "root", name: "My Drive", path: "/drive" },
    ...breadcrumbs,
  ];
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

/**
 * Resolve `path` and `depth` for a new node (file or folder) under `parentId`.
 */
export async function getPathAndDepthForParent(
  parentId: string | null,
  userId: string
): Promise<{ path: string; depth: number }> {
  if (parentId) {
    const parent = await getFolderById(parentId, userId);
    if (!parent) {
      throw new Error("Parent folder not found");
    }
    return {
      path: `${parent.path}/${parentId}`,
      depth: parent.depth + 1,
    };
  }
  return { path: "/", depth: 0 };
}

/**
 * Check if any node (file or folder) with the given name already exists in the parent.
 * Matches the DB unique index on (`parentId`, `name`).
 */
export async function nameExistsInParent(
  name: string,
  parentId: string | null,
  userId: string
): Promise<boolean> {
  const query = parentId
    ? and(
        eq(nodes.parentId, parentId),
        eq(nodes.ownerId, userId),
        eq(nodes.name, name)
      )
    : and(isNull(nodes.parentId), eq(nodes.ownerId, userId), eq(nodes.name, name));

  const result = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(query)
    .limit(1);

  return result.length > 0;
}

/**
 * Find a non-deleted file node by storage key (for idempotent complete).
 */
export async function getFileNodeByS3Key(
  userId: string,
  s3Key: string
): Promise<DriveNode | null> {
  const result = await db
    .select()
    .from(nodes)
    .where(
      and(
        eq(nodes.ownerId, userId),
        eq(nodes.s3Key, s3Key),
        eq(nodes.type, "file"),
        isNull(nodes.deletedAt)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

const MAX_FILE_NAME_LEN = 255;
/** Default max for single-part upload (5 GiB, S3 single-object limit). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

/**
 * Create a file node after S3 upload. Duplicate names in the same parent raise.
 */
export async function createFileNode(
  name: string,
  parentId: string | null,
  userId: string,
  s3Key: string,
  mimeType: string,
  size: number
): Promise<DriveNode> {
  if (!name || name.trim().length === 0) {
    throw new Error("File name is required");
  }
  if (name.length > MAX_FILE_NAME_LEN) {
    throw new Error(`File name must be less than ${MAX_FILE_NAME_LEN} characters`);
  }
  if (!Number.isFinite(size) || size < 0) {
    throw new Error("Invalid file size");
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large");
  }

  const trimmedName = name.trim();

  const taken = await nameExistsInParent(trimmedName, parentId, userId);
  if (taken) {
    throw new Error(
      `A file named "${trimmedName}" already exists in this location`
    );
  }

  const { path, depth } = await getPathAndDepthForParent(parentId, userId);

  const normalizedMime = mimeType.trim() || "application/octet-stream";

  try {
    const result = await db
      .insert(nodes)
      .values({
        ownerId: userId,
        name: trimmedName,
        type: "file",
        parentId,
        path,
        depth,
        s3Key,
        mimeType: normalizedMime,
        size: Math.trunc(size),
      })
      .returning();

    if (!result[0]) {
      throw new Error("Failed to create file");
    }

    return result[0];
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("unique constraint")) {
      if (error.message.includes("nodes_owner_s3_key_uniq")) {
        throw error;
      }
      throw new Error(
        `A file named "${trimmedName}" already exists in this location`
      );
    }
    throw error;
  }
}

/** Default free-tier quota; keep in sync with marketing (e.g. sign-up page). */
export const DEFAULT_DRIVE_QUOTA_BYTES = 15 * 1024 * 1024 * 1024;

/**
 * Total stored bytes for non-deleted file nodes (folders excluded).
 */
export async function getTotalFileSizeBytesByOwner(
  userId: string
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${nodes.size}), 0)`,
    })
    .from(nodes)
    .where(
      and(
        eq(nodes.ownerId, userId),
        eq(nodes.type, "file"),
        isNull(nodes.deletedAt)
      )
    );
  return Number(row?.total ?? 0);
}
