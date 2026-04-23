"use client";

import { useEffect, useState } from "react";
import { formatFileSize } from "@/lib/upload-ui";

export function DriveSidebarStorage() {
  const [usedBytes, setUsedBytes] = useState<number | null>(null);
  const [quotaBytes, setQuotaBytes] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/drive/usage");
        if (!res.ok) throw new Error("usage");
        const data = (await res.json()) as { usedBytes: number; quotaBytes: number };
        if (!cancelled) {
          setUsedBytes(data.usedBytes);
          setQuotaBytes(data.quotaBytes);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pct =
    usedBytes == null || quotaBytes == null || quotaBytes === 0
      ? null
      : Math.min(100, (usedBytes / quotaBytes) * 100);

  return (
    <div className="shrink-0 border-t border-sidebar-border p-4">
      <div className="mb-2 text-xs text-sidebar-foreground/70">Storage used</div>
      <div className="h-2 overflow-hidden rounded-full bg-sidebar-border">
        {usedBytes == null && !error ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-sidebar-primary/30" />
        ) : (
          <div
            className="h-full rounded-full bg-sidebar-primary"
            style={{ width: error ? "0%" : `${pct ?? 0}%` }}
          />
        )}
      </div>
      <div className="mt-2 text-xs text-sidebar-foreground/70">
        {error
          ? "Could not load storage"
          : usedBytes == null || quotaBytes == null
            ? "…"
            : `${formatFileSize(usedBytes)} of ${formatFileSize(quotaBytes)}`}
      </div>
    </div>
  );
}
