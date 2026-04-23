import type { UploadRow } from "@/lib/hooks/use-drive-upload";

export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = sizeInBytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function rowStatusLabel(row: UploadRow): string {
  if (row.status === "done") return "Done";
  if (row.status === "error")
    return row.errorMessage && row.errorMessage.length < 50
      ? row.errorMessage
      : "Failed";
  if (row.status === "pending") return "Waiting";
  switch (row.stage) {
    case "presigning":
      return "Preparing";
    case "uploading":
      return "Uploading";
    case "completing":
      return "Finishing";
    default:
      return "Working";
  }
}
