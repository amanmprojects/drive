import {
  type HeadObjectCommandOutput,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { s3 } from "./s3";

function headContentTypePrimary(
  headContentType: string | undefined
): string {
  if (!headContentType?.trim()) {
    return "application/octet-stream";
  }
  return headContentType.split(";")[0]!.trim();
}

function isS3NotFoundError(error: unknown): boolean {
  if (error && typeof error === "object" && "name" in error) {
    const name = (error as { name: string }).name;
    if (name === "NotFound" || name === "NoSuchKey") {
      return true;
    }
  }
  if (error && typeof error === "object" && "$metadata" in error) {
    const code = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    if (code === 404) {
      return true;
    }
  }
  return false;
}

/**
 * Verifies the object exists and size matches, returns Content-Type to persist (matches S3).
 */
export async function headVerifyUploadedObject(
  bucket: string,
  key: string,
  expectedSize: number
): Promise<{ contentType: string; size: number }> {
  const expected = Math.trunc(expectedSize);
  if (!Number.isFinite(expected) || expected < 0) {
    throw new Error("Invalid file size");
  }

  let head: HeadObjectCommandOutput;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (isS3NotFoundError(error)) {
      throw new Error("Uploaded object not found in storage. Try uploading again.");
    }
    throw error;
  }

  const rawLen = head.ContentLength;
  if (rawLen === undefined) {
    throw new Error("Storage object is missing a size. Try uploading again.");
  }
  const actual = Number(rawLen);
  if (actual !== expected) {
    throw new Error(
      `Upload size does not match file (${actual} bytes in storage, ${expected} expected). Try uploading again.`
    );
  }

  return {
    contentType: headContentTypePrimary(head.ContentType),
    size: actual,
  };
}
