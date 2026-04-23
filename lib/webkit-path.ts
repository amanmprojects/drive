const SEG_RE = /[/\\]/g;

/**
 * Splits a directory-relative path from `webkitdirectory` into directory segments and leaf name.
 * Rejects ".." and "." segments. Empty `webkitRelativePath` falls back to `file.name` as the only leaf.
 */
export function splitWebkitRelativePath(
  webkitRelativePath: string,
  file: File
): { dirSegments: string[]; displayName: string } {
  const raw = webkitRelativePath.trim();
  if (!raw) {
    return { dirSegments: [], displayName: file.name };
  }
  const parts = raw.split(SEG_RE).filter((p) => p.length > 0);
  for (const p of parts) {
    if (p === ".." || p === ".") {
      throw new Error(`Invalid path: "${webkitRelativePath}"`);
    }
  }
  if (parts.length === 0) {
    return { dirSegments: [], displayName: file.name };
  }
  return {
    dirSegments: parts.slice(0, -1),
    displayName: parts[parts.length - 1]!,
  };
}
