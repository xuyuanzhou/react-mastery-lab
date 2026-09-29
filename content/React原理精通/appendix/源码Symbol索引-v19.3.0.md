# React v19.3.0 源码 Symbol 索引

> 这是“导航索引”，不是稳定 API 列表。React 内部函数可能在 patch/minor 中移动。读源码时以 tag `v19.3.0` 为基线。

| 主题 | 关键 Symbol | 主要文件 | 读它为了什么 |
|---|---|---|---|
| 公共 Hooks | `useState/useEffect/use` 等 | `packages/react/src/ReactHooks.js` | 看公共 API 如何交给 Dispatcher |
| Hook render | `renderWithHooks`, `renderWithHooksAgain` | `react-reconciler/src/ReactFiberHooks.js` | mount/update dispatcher、Hook 游标、re-render |
| Hook state | `mountState`, `updateState`, `dispatchSetState` | `ReactFiberHooks.js` | Hook/Queue/Update 与调度入口 |
| Fiber 构造 | `createFiber`, `createWorkInProgress` | `ReactFiber.js` | current/WIP/alternate |
| Begin | `beginWork`, `updateFunctionComponent` | `ReactFiberBeginWork.js` | 从 Fiber tag 到组件执行/reconcile |
| Complete | `completeWork` | `ReactFiberCompleteWork.js` | Host 实例、flags、回溯阶段 |
| WorkLoop | `performUnitOfWork`, `completeUnitOfWork`, `renderRoot*` | `ReactFiberWorkLoop.js` | Render engine |
| Update scheduling | `requestUpdateLane`, `scheduleUpdateOnFiber` | `ReactFiberWorkLoop.js` | Update 如何携带 lane 进入 root |
| Root scheduling | `ensureRootIsScheduled`, `processRootScheduleInMicrotask`, `scheduleTaskForRootDuringMicrotask` | `ReactFiberRootScheduler.js` | 19.3 Root 链表 + microtask + task |
| Lane | `getNextLanes`, lane sets/helpers | `ReactFiberLane.js` | pending/suspended/pinged/entangled lanes |
| Child reconciliation | `reconcileChildFibers`, array reconciliation helpers | `ReactChildFiber.js` | key/type/reuse/placement/deletion |
| Commit | `commit*Effects` | `ReactFiberCommitWork.js`, WorkLoop commit orchestration | mutation/layout/passive |
| Concurrent queue | `enqueueConcurrentHookUpdate` 等 | `ReactFiberConcurrentUpdates.js` | 并发 update 缓冲与传播 |
| Suspense/thenable | `trackUsedThenable`, `getSuspendedThenable`, internal exception | `ReactFiberThenable.js` | modern `use()` pending control flow |
| Hydration | claim/mismatch/pop hydration state | `ReactFiberHydrationContext.js` | client Fiber 与 server host nodes 匹配 |
| DOM Host Config | create/commit/hydration host ops | `react-dom-bindings/src/client/ReactFiberConfigDOM.js` | Reconciler→DOM 边界 |
| DOM event root | `listenToAllSupportedEvents`, plugin dispatch | `react-dom-bindings/src/events/DOMPluginEventSystem.js` | root delegation/plugin event system |
| Event priority | event listener dispatch priority | `react-dom-bindings/src/events/ReactDOMEventListener.js` | native event → React update priority |
| Scheduler | task queue / callback scheduling | `packages/scheduler/src/*` | React 外部的 cooperative task scheduler |
| Server render | Fizz related files | `packages/react-server/src/*` | server HTML/stream rendering |
| Flight | Flight server/client | `packages/react-server/src/*`, `packages/react-client/src/*`, renderer bindings | RSC serialization/reconstruction |

## 阅读提示

先用 symbol 搜索进入函数，再读 30~80 行上下文。除非当前问题要求，否则不要顺着 import 把整个仓库展开。每次阅读只维护一张“当前对象状态表”：Fiber、Hook、Queue、Root、Host 五列足够覆盖大多数主干。
