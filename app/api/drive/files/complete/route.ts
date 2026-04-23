import { auth } from "@/lib/auth";
import { isValidDriveObjectKey } from "@/lib/drive-object-key";
import {
  createFileNode,
  getFileNodeByS3Key,
  getFolderById,
  type DriveNode,
} from "@/lib/queries";
import { headVerifyUploadedObject } from "@/lib/s3-verify-upload";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export interface CompleteRequest {
  name: string;
  parentId: string | null;
  s3Key: string;
  mimeType: string;
  size: number;
}

export interface CompleteResponse {
  file: DriveNode;
}

export interface CompleteError {
  error: string;
}

function isDuplicateOwnerS3KeyError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("nodes_owner_s3_key_uniq");
}

export async function POST(
  request: Request
): Promise<NextResponse<CompleteResponse | CompleteError>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body: CompleteRequest = await request.json();
    const { name, s3Key, size } = body;

    if (typeof s3Key !== "string" || !isValidDriveObjectKey(s3Key)) {
      return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
    }

    const parentId: string | null =
      body.parentId === null || body.parentId === undefined
        ? null
        : typeof body.parentId === "string"
          ? body.parentId
          : null;
    if (body.parentId != null && parentId === null) {
      return NextResponse.json(
        { error: "Invalid parent folder" },
        { status: 400 }
      );
    }

    const existing = await getFileNodeByS3Key(userId, s3Key);
    if (existing) {
      return NextResponse.json({ file: existing }, { status: 200 });
    }

    if (parentId) {
      const parentFolder = await getFolderById(parentId, userId);
      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      console.error("AWS_S3_BUCKET is not set");
      return NextResponse.json(
        { error: "File upload is not configured" },
        { status: 500 }
      );
    }

    const sizeArg = typeof size === "number" ? size : NaN;

    let verified: { contentType: string; size: number };
    try {
      verified = await headVerifyUploadedObject(bucket, s3Key, sizeArg);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("Try uploading again") ||
          error.message === "Invalid file size"
        ) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }
      console.error("Complete HEAD S3 error:", error);
      return NextResponse.json(
        { error: "Failed to verify upload in storage" },
        { status: 500 }
      );
    }

    try {
      const file = await createFileNode(
        typeof name === "string" ? name : "",
        parentId,
        userId,
        s3Key,
        verified.contentType,
        verified.size
      );
      return NextResponse.json({ file }, { status: 201 });
    } catch (error) {
      if (isDuplicateOwnerS3KeyError(error)) {
        const row = await getFileNodeByS3Key(userId, s3Key);
        if (row) {
          return NextResponse.json({ file: row }, { status: 200 });
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Complete upload API error:", error);

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (
        error.message === "File name is required" ||
        error.message.includes("File name must be less") ||
        error.message === "Invalid file size" ||
        error.message === "File is too large"
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    );
  }
}
