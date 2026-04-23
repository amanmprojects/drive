import { auth } from "@/lib/auth";
import {
  DEFAULT_DRIVE_QUOTA_BYTES,
  getTotalFileSizeBytesByOwner,
} from "@/lib/queries";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usedBytes = await getTotalFileSizeBytesByOwner(session.user.id);
    return NextResponse.json({
      usedBytes,
      quotaBytes: DEFAULT_DRIVE_QUOTA_BYTES,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load storage usage" },
      { status: 500 }
    );
  }
}
