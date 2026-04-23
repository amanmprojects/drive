/** Verbose upload tracing; no-ops in production builds. */
export function driveUploadDebug(message: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV !== "development") return;
  if (args.length > 0) {
    console.log(`[drive-upload] ${message}`, ...args);
  } else {
    console.log(`[drive-upload] ${message}`);
  }
}
