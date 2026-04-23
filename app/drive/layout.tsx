import { DriveLayoutClient } from "@/components/drive/drive-layout-shell";

export default function DriveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DriveLayoutClient>{children}</DriveLayoutClient>;
}
