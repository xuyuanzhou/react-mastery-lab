// 教学模型：只保留与优先级跳过和 rebase 有关的字段。
export function rebase(baseState, queue, renderLanes) {
  let state = baseState,
    newBaseState = baseState;
  const baseQueue = [];
  let skipped = false;
  for (const update of queue) {
    if (update.lane !== 0 && (update.lane & renderLanes) !== update.lane) {
      if (!skipped) {
        skipped = true;
        newBaseState = state;
      }
      baseQueue.push({ ...update });
    } else {
      state =
        update.kind === "add" ? state + update.value : state * update.value;
      if (skipped) baseQueue.push({ ...update, lane: 0 });
    }
  }
  return {
    memoizedState: state,
    baseState: skipped ? newBaseState : state,
    baseQueue,
  };
}
export function keyedDiff(oldKeys, newKeys) {
  let lastPlacedIndex = 0;
  return newKeys.map((key, index) => {
    const oldIndex = oldKeys.indexOf(key);
    const action =
      oldIndex < 0 ? "插入" : oldIndex < lastPlacedIndex ? "移动" : "复用";
    if (oldIndex >= lastPlacedIndex) lastPlacedIndex = oldIndex;
    return { key, index, oldIndex, action, lastPlacedIndex };
  });
}
