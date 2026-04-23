import { auth } from "@/lib/auth";
import { s3 } from "@/lib/s3";
import { getFileByIdForOwner } from "@/lib/queries";
import { resolveContentTypeForView } from "@/lib/view-content-type";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const VIEW_PRESIGN_EXPIRES = 300;

function contentDispositionInline(filename: string): string {
  const safe = filename.replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `inline; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { fileId } = await params;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    console.error("AWS_S3_BUCKET is not set");
    return NextResponse.json(
      { error: "File storage is not configured" },
      { status: 500 }
    );
  }

  const file = await getFileByIdForOwner(fileId, userId);
  if (!file?.s3Key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const s3Key = file.s3Key;
  const contentType = resolveContentTypeForView(file.mimeType, file.name);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ResponseContentType: contentType,
    ResponseContentDisposition: contentDispositionInline(file.name),
  });

  try {
    const viewUrl = await getSignedUrl(s3, command, {
      expiresIn: VIEW_PRESIGN_EXPIRES,
    });
    return NextResponse.redirect(viewUrl, 307);
  } catch (error) {
    console.error("View redirect presign error:", error);
    return NextResponse.json(
      { error: "Failed to open file" },
      { status: 500 }
    );
  }
}
