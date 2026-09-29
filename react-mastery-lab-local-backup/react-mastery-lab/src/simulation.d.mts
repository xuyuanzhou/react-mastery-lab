export type Update = { lane: number; kind: string; value: number };
export function rebase(
  baseState: number,
  queue: Update[],
  renderLanes: number,
): { memoizedState: number; baseState: number; baseQueue: Update[] };
export function keyedDiff(
  oldKeys: string[],
  newKeys: string[],
): {
  key: string;
  index: number;
  oldIndex: number;
  action: string;
  lastPlacedIndex: number;
}[];
