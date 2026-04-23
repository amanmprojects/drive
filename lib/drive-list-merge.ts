import type { Node } from "@/types/drive";

export type DriveListUpdate =
  | { kind: "add"; node: Node }
  | { kind: "refresh" };

/**
 * Order matches getNodesByParentId: `orderBy(nodes.type, nodes.name)` with
 * `node_type` enum `file` before `folder`, then name.
 */
export function compareNodesForList(a: Node, b: Node): number {
  if (a.type !== b.type) {
    return a.type === "file" ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function mergeNodeIntoList(nodes: Node[], newNode: Node): Node[] {
  const without = nodes.filter((n) => n.id !== newNode.id);
  const next = [...without, newNode];
  next.sort(compareNodesForList);
  return next;
}

/**
 * If `newNode` is a direct child of the folder being viewed, return `data` with
 * that node merged into `nodes` (by id) and re-sorted. Otherwise return `null` (no change).
 */
export function mergeNodeIfInCurrentFolder<T extends { nodes: Node[] }>(
  data: T,
  viewParentId: string | null,
  newNode: Node
): T | null {
  if (newNode.parentId !== viewParentId) {
    return null;
  }
  return {
    ...data,
    nodes: mergeNodeIntoList(data.nodes, newNode),
  };
}
