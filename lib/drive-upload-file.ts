import { driveUploadDebug } from "@/lib/drive-upload-debug";
import { uploadWithProgress } from "@/lib/upload-with-progress";
import type { Node } from "@/types/drive";

export type UploadOneResult =
  | { ok: true; name: string; file: Node }
  | { ok: false; name: string; message: string };

interface PresignPayload {
  uploadUrl: string;
  s3Key: string;
  headers: { "Content-Type": string };
  expiresIn: number;
}

/**
 * presign → PUT (XHR) → complete for a single file. Uses `displayName` for server `name` fields.
 */
export async function uploadDriveFile(
  file: File,
  parentId: string | null,
  options: {
    displayName: string;
    signal?: AbortSignal;
    onProgress: (pct: number) => void;
    onStage?: (stage: "presigning" | "uploading" | "completing") => void;
  }
): Promise<UploadOneResult> {
  const { displayName, signal, onProgress, onStage } = options;
  const name = displayName.trim() || file.name;
  driveUploadDebug("uploadDriveFile: enter", {
    name,
    parentId,
    size: file.size,
    mimeType: file.type || "(empty)",
    aborted: signal?.aborted ?? false,
  });
  if (!name) {
    driveUploadDebug("uploadDriveFile: reject — empty name");
    return { ok: false, name: file.name, message: "File name is required" };
  }

  try {
    onStage?.("presigning");
    onProgress(0);
    const presignBody = {
      name,
      parentId,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    };
    driveUploadDebug("presign: fetch POST /api/drive/files/presign", presignBody);
    const presignRes = await fetch("/api/drive/files/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presignBody),
      signal,
    });

    driveUploadDebug("presign: response", {
      ok: presignRes.ok,
      status: presignRes.status,
    });

    if (!presignRes.ok) {
      const data = (await presignRes.json().catch(() => ({}))) as {
        error?: string;
      };
      return {
        ok: false,
        name,
        message: data.error || "Failed to start upload",
      };
    }

    const presign = (await presignRes.json()) as PresignPayload;
    driveUploadDebug("presign: parsed body (keys only)", {
      hasUploadUrl: Boolean(presign.uploadUrl),
      s3KeySuffix: presign.s3Key?.slice(-24),
    });
    const contentType =
      presign.headers["Content-Type"] || "application/octet-stream";

    onStage?.("uploading");
    const uploadHeaders: Record<string, string> = {
      "Content-Type": contentType,
    };

    driveUploadDebug("PUT: starting XHR to signed URL");
    await uploadWithProgress(
      presign.uploadUrl,
      file,
      uploadHeaders,
      (pct) => onProgress(pct),
      signal
    );
    driveUploadDebug("PUT: finished OK");

    onStage?.("completing");
    driveUploadDebug("complete: fetch POST /api/drive/files/complete");
    const completeRes = await fetch("/api/drive/files/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        parentId,
        s3Key: presign.s3Key,
        mimeType: contentType,
        size: file.size,
      }),
      signal,
    });

    if (!completeRes.ok) {
      const data = (await completeRes.json().catch(() => ({}))) as {
        error?: string;
      };
      return {
        ok: false,
        name,
        message: data.error || "Failed to complete upload",
      };
    }

    const completeBody = (await completeRes.json()) as { file?: Node };
    const fileNode = completeBody.file;
    if (!fileNode?.id) {
      return {
        ok: false,
        name,
        message: "Invalid response from complete upload",
      };
    }

    driveUploadDebug("uploadDriveFile: success", { name, fileId: fileNode.id });
    return { ok: true, name, file: fileNode };
  } catch (e) {
    driveUploadDebug("uploadDriveFile: catch", {
      name,
      e,
      isAbort:
        e instanceof DOMException && e.name === "AbortError",
    });
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, name, message: "Cancelled" };
    }
    const message = e instanceof Error ? e.message : "Upload failed";
    return { ok: false, name, message };
  }
}

export function formatUploadAggregateError(
  failed: { name: string; message: string }[]
): string {
  if (failed.length === 0) return "";
  if (failed.length === 1) {
    return `${failed[0]!.name}: ${failed[0]!.message}`;
  }
  return `${failed.length} files failed, including “${failed[0]!.name}”: ${failed[0]!.message}`;
}
