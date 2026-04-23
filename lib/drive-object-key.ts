import { randomUUID } from "node:crypto";

const DRIVE_KEY_PREFIX = "drive/";

/**
 * S3 object keys for uploads: `drive/{uuid}`. No user-controlled segments.
 */
export function newDriveObjectKey(): string {
  return `${DRIVE_KEY_PREFIX}${randomUUID()}`;
}

/**
 * Validates keys produced by {@link newDriveObjectKey} (defense in depth on complete).
 */
export function isValidDriveObjectKey(key: string): boolean {
  return /^drive\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    key
  );
}
