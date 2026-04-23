import { auth } from "@/lib/auth";
import { s3 } from "@/lib/s3";
import { newDriveObjectKey } from "@/lib/drive-object-key";
import { getFolderById, MAX_UPLOAD_BYTES } from "@/lib/queries";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const PRESIGN_EXPIRES = 120;

export interface PresignRequest {
  name: string;
  parentId: string | null;
  mimeType: string;
  size: number;
}

export interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
  headers: { "Content-Type": string };
}

export interface PresignError {
  error: string;
}

export async function POST(
  request: Request
): Promise<NextResponse<PresignResponse | PresignError>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    console.error("AWS_S3_BUCKET is not set");
    return NextResponse.json(
      { error: "File upload is not configured" },
      { status: 500 }
    );
  }

  try {
    const body: PresignRequest = await request.json();
    const { name, mimeType, size } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "File name is required" },
        { status: 400 }
      );
    }
    if (name.length > 255) {
      return NextResponse.json(
        { error: "File name must be less than 255 characters" },
        { status: 400 }
      );
    }

    if (body.parentId != null) {
      if (typeof body.parentId !== "string") {
        return NextResponse.json(
          { error: "Invalid parent folder" },
          { status: 400 }
        );
      }
      const parentFolder = await getFolderById(body.parentId, userId);
      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
    }
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is too large" },
        { status: 400 }
      );
    }

    const contentType =
      typeof mimeType === "string" && mimeType.trim()
        ? mimeType.trim()
        : "application/octet-stream";

    const s3Key = newDriveObjectKey();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: PRESIGN_EXPIRES,
    });

    const res: PresignResponse = {
      uploadUrl,
      s3Key,
      expiresIn: PRESIGN_EXPIRES,
      headers: { "Content-Type": contentType },
    };
    return NextResponse.json(res);
  } catch (error) {
    console.error("Presign API error:", error);
    return NextResponse.json(
      { error: "Failed to prepare upload" },
      { status: 500 }
    );
  }
}
