export type NodeType = "file" | "folder";

/**
 * Represents a file or folder node in the drive
 */
export interface Node {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  path: string;
  depth: number;
  s3Key: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Breadcrumb item for navigation
 */
export interface Breadcrumb {
  id: string;
  name: string;
  path: string;
}

/**
 * Props for the FileGrid component
 */
export interface FileGridProps {
  nodes: Node[];
  currentPath: string;
}

/**
 * Props for the FileNode component
 */
export interface FileNodeProps {
  node: Node;
  onNavigate?: (folderName: string) => void;
}

/**
 * Props for the Sidebar component
 */
export interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * Props for the TopBar component
 */
export interface TopBarProps {
  breadcrumbs: Breadcrumb[];
}
