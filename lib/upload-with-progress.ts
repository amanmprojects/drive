/**
 * Single-part PUT to a signed URL with upload progress (browser XHR).
 * Pass `signal` to cancel; cancellation rejects with a DOMException named "AbortError".
 */
export function uploadWithProgress(
  uploadUrl: string,
  file: File,
  requestHeaders: Record<string, string>,
  onProgress: (pct: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);

    for (const [key, value] of Object.entries(requestHeaders)) {
      xhr.setRequestHeader(key, value);
    }

    const cleanup = () => {
      signal?.removeEventListener("abort", onSignalAbort);
    };

    const onSignalAbort = () => {
      xhr.abort();
    };

    signal?.addEventListener("abort", onSignalAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("Upload failed"));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Network error during upload"));
    };
    xhr.send(file);
  });
}
