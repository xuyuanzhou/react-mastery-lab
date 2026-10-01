// 两个 Lane 仅用于教学；React 19.3.0 的真实 Lane 集合与调度更复杂。
export const NoLane = 0;
export const SyncLane = 0b01;
export const TransitionLane = 0b10;

export function enqueue(queue, action, lane = SyncLane) {
  const update = { action, lane, next: null };
  if (queue.pending === null) {
    update.next = update;
  } else {
    update.next = queue.pending.next;
    queue.pending.next = update;
  }
  queue.pending = update; // pending 指向尾节点，pending.next 是头节点。
  return update;
}

function toArray(tail) {
  if (!tail) return [];
  const result = [];
  let node = tail.next;
  do {
    result.push(node);
    node = node.next;
  } while (node !== tail.next);
  return result;
}

function append(tail, update) {
  const copy = { action: update.action, lane: update.lane, next: null };
  if (!tail) copy.next = copy;
  else {
    copy.next = tail.next;
    tail.next = copy;
  }
  return copy;
}

export function processQueue(baseState, baseQueue, pending, renderLanes) {
  // 不修改传入的环：失败的 WIP 可以被丢弃，current 仍保持原队列。
  const updates = [...toArray(baseQueue), ...toArray(pending)];
  let state = baseState;
  let nextBaseState = baseState;
  let nextBaseQueue = null;
  for (const update of updates) {
    if (update.lane !== NoLane && (update.lane & renderLanes) === 0) {
      if (!nextBaseQueue) nextBaseState = state;
      nextBaseQueue = append(nextBaseQueue, update);
    } else {
      state =
        typeof update.action === "function"
          ? update.action(state)
          : update.action;
      if (nextBaseQueue) {
        nextBaseQueue = append(nextBaseQueue, { ...update, lane: NoLane });
      }
    }
  }
  return {
    memoizedState: state,
    baseState: nextBaseQueue ? nextBaseState : state,
    baseQueue: nextBaseQueue,
    processedPending: pending,
  };
}

export function queueToArray(tail) {
  return toArray(tail).map(({ lane, action }) => ({ lane, action }));
}
