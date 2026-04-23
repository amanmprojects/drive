/**
 * Map drive URL to the folder id used as upload parent, or `null` for My Drive root.
 */
export function uploadParentIdFromPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  if (pathname === "/drive" || pathname === "/drive/") return null;
  const m = pathname.match(/^\/drive\/folders\/([^/]+)\/?/);
  return m ? m[1] : null;
}
