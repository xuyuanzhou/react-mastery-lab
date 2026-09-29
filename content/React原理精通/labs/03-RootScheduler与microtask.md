# Lab 03：Root Scheduler、Microtask 与 Scheduler Task

## 目标

纠正“setState 后 React 立即丢给 Scheduler”的过时直觉。React 19.3 的 Root 调度需要先把 Root 纳入 schedule，并确保 microtask，再在 microtask 中选择 lanes 和决定任务形式。

## 断点

```text
scheduleUpdateOnFiber
ensureRootIsScheduled
processRootScheduleInMicrotask
scheduleTaskForRootDuringMicrotask
performWorkOnRootViaSchedulerTask
performSyncWorkOnRoot
```

## 实验

事件处理器中：

```jsx
function click() {
  setA(x => x + 1)
  setB(x => x + 1)
  queueMicrotask(() => console.log('user microtask'))
  console.log('handler end')
}
```

记录：

| 顺序 | 调用/日志 | root.pendingLanes | root callback | 备注 |
|---|---|---|---|---|
| 1 | handler start | | | |
| 2 | first setState | | | |
| 3 | second setState | | | |
| 4 | handler end | | | |
| 5 | React root microtask | | | |
| 6 | render/commit | | | |

## 必须区分

- **Batching**：多个更新何时被一起考虑。
- **Microtask**：Root schedule 何时被统一处理的一种时机机制。
- **Scheduler task**：可中断并发工作的任务机制。
- **Sync work**：不一定需要普通 Scheduler callback。

四者不是同义词。
