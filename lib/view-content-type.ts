const GENERIC_MIME = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
]);

function extFromName(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i < 0) return "";
  return fileName.slice(i).toLowerCase();
}

// Minimal map for in-browser view; expand as needed.
const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".html": "text/html",
  ".htm": "text/html",
};

/**
 * S3 and the browser use Content-Type for open-vs-download. Uploaded files
 * often store `application/octet-stream` when `file.type` was empty — fix by
 * extension for common types so PDF/images open inline when possible.
 */
export function resolveContentTypeForView(
  storedMime: string | null,
  fileName: string
): string {
  const t = (storedMime ?? "").trim();
  if (t && !GENERIC_MIME.has(t)) {
    return t;
  }
  const ext = extFromName(fileName);
  const guessed = ext ? (EXT_TO_MIME[ext] ?? null) : null;
  if (guessed) return guessed;
  return t || "application/octet-stream";
}
