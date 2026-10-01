/** Teaching notes are overlays; the cached official source remains byte-for-byte unchanged. */
export type SourceAnnotation = {
  path: string;
  symbol: string;
  title: string;
  summary: string;
  watch: string;
  chapter: string;
};

const reconciler = "packages/react-reconciler/src/";
const hooks = reconciler + "ReactFiberHooks.js";
const workLoop = reconciler + "ReactFiberWorkLoop.js";
const rootScheduler = reconciler + "ReactFiberRootScheduler.js";
const chapter = (name: string) => `React原理精通/${name}.md`;

export const sourceAnnotations: SourceAnnotation[] = [
  {
    path: "packages/react-dom/src/client/ReactDOMRoot.js",
    symbol: "createRoot",
    title: "创建根：连接 DOM 容器与 FiberRoot",
    summary:
      "这是应用的客户端入口。它检查容器，创建 React 根，并返回可调用 render/unmount 的 Root 对象；此时还没有完成首次界面提交。",
    watch:
      "看容器校验、createContainer 和返回的 ReactDOMRoot；再追 render 如何进入 updateContainer。",
    chapter: chapter("37-初次Mount完整调用链"),
  },
  {
    path: reconciler + "ReactFiberReconciler.js",
    symbol: "updateContainer",
    title: "把新的 Element 登记为 Root 更新",
    summary:
      "root.render(element) 最终会把 Element 送进根节点的更新路径。这里仍是记录更新并安排工作，不是直接操作 DOM。",
    watch: "找更新对象、lane 和 scheduleUpdateOnFiber 的连接点。",
    chapter: chapter("37-初次Mount完整调用链"),
  },
  {
    path: workLoop,
    symbol: "scheduleUpdateOnFiber",
    title: "从 Fiber 更新推进到 Root 调度",
    summary:
      "更新已经有了目标 Fiber 和 lane；这个入口把相关 Root 标记为有待处理工作，再交给 Root Scheduler。",
    watch: "区分标记 Root、处理中断/挂起状态与真正执行 Render 的时刻。",
    chapter: chapter("10-完整setState调用链"),
  },
  {
    path: rootScheduler,
    symbol: "ensureRootIsScheduled",
    title: "保证 Root 进入调度队列",
    summary:
      "这里主要确保 Root 被纳入待处理调度，并安排后续微任务检查；不要把它误读成每次 setter 立即启动完整 Render。",
    watch: "继续追 processRootScheduleInMicrotask，观察何时选择 next lanes。",
    chapter: chapter("08-Lane与Scheduler"),
  },
  {
    path: rootScheduler,
    symbol: "processRootScheduleInMicrotask",
    title: "在微任务中统一处理 Root 调度",
    summary:
      "React 汇总待调度的 Root，再根据当前待处理 lanes 决定同步工作或 Scheduler 回调。多次 setter 因而不等于多次立即执行完整工作循环。",
    watch: "看它如何遍历 Root、调用 scheduleTaskForRootDuringMicrotask。",
    chapter: chapter("27-Batching与flushSync"),
  },
  {
    path: reconciler + "ReactFiberBeginWork.js",
    symbol: "beginWork",
    title: "向下计算本 Fiber 的子工作",
    summary:
      "根据 Fiber 类型、props、context 和本轮 lanes，决定更新、跳过或生成子 Fiber。它属于可重做的 Render 阶段。",
    watch:
      "先看 bailout，再选 HostRoot、FunctionComponent 等分支；不要把 beginWork 等同 DOM 写入。",
    chapter: chapter("02-Render工作循环"),
  },
  {
    path: hooks,
    symbol: "renderWithHooks",
    title: "运行函数组件并选择 Hook Dispatcher",
    summary:
      "React 在这里设置当前渲染的 Fiber、Hook 状态和 Dispatcher，然后调用组件函数。Hook 的逻辑身份依赖调用顺序。",
    watch:
      "比较 mount/update/re-render 的 Dispatcher，观察 memoizedState 与 Hook 指针怎样推进。",
    chapter: chapter("03-Hooks-Dispatcher与链表"),
  },
  {
    path: reconciler + "ReactFiberCompleteWork.js",
    symbol: "completeWork",
    title: "向上完成 Fiber 并汇总工作",
    summary:
      "子树处理完后回到父节点，准备宿主实例或更新标记，并汇总子树 flags。最终是否改 DOM，要等 Commit 阶段。",
    watch: "对照 HostComponent 的 mount/update 分支与 subtreeFlags 的汇总。",
    chapter: chapter("02-Render工作循环"),
  },
  {
    path: workLoop,
    symbol: "commitRoot",
    title: "提交已完成的候选树",
    summary:
      "只有成功完成的 Render 结果才能进入 Commit。此阶段协调 before-mutation、mutation、layout 及后续 passive 工作。",
    watch:
      "找 finishedWork 与 root.current 的切换；区分同步提交与稍后 flush 的 passive effects。",
    chapter: chapter("07-Commit阶段"),
  },
  {
    path: reconciler + "ReactFiber.js",
    symbol: "createWorkInProgress",
    title: "准备另一棵 Fiber 树中的对应节点",
    summary:
      "current 保存已提交版本；workInProgress 承载本轮候选计算。alternate 把两者连接，让失败或重做的 Render 不直接替换已提交 UI。",
    watch:
      "比较首次创建与复用 alternate 时，哪些字段从 current 复制，哪些本轮标记被重置。",
    chapter: chapter("01-Fiber数据结构与双缓冲"),
  },
  {
    path: workLoop,
    symbol: "performUnitOfWork",
    title: "执行一个 Fiber 工作单元",
    summary:
      "先调用 beginWork；如果没有子工作，就沿 return/sibling 关系进入 completeUnitOfWork。这是显式深度优先遍历的核心。",
    watch: "用三节点树手算 next、child、sibling、return 的变化。",
    chapter: chapter("02-Render工作循环"),
  },
  {
    path: hooks,
    symbol: "mountWorkInProgressHook",
    title: "首次 Render 时串起 Hook 链表",
    summary:
      "每次普通 Hook 调用创建一个节点，并按调用顺序挂到当前 Fiber 的 Hook 链表上。变量名并不参与匹配。",
    watch:
      "观察 first Hook 如何写入 memoizedState，以及后续 Hook 如何连接 next。",
    chapter: chapter("03-Hooks-Dispatcher与链表"),
  },
  {
    path: hooks,
    symbol: "updateWorkInProgressHook",
    title: "更新 Render 时按顺序匹配 Hook",
    summary:
      "React 从 current Hook 链取得对应节点，建立或复用 WIP Hook；条件调用普通 Hook 会破坏这个顺序关系。",
    watch:
      "比较 currentHook 与 workInProgressHook 的推进，留意 Hook 数量不匹配的分支。",
    chapter: chapter("03-Hooks-Dispatcher与链表"),
  },
  {
    path: hooks,
    symbol: "dispatchSetState",
    title: "setter 创建更新，而非改写当前变量",
    summary:
      "组件闭包中的 state 是本轮 Render 快照。setter 记录 action、选择 lane，并触发后续调度；当前函数里的变量不会原地变成新值。",
    watch: "区分 render-phase update、eager state 优化与一般入队路径。",
    chapter: chapter("04-useState与UpdateQueue"),
  },
  {
    path: hooks,
    symbol: "updateReducerImpl",
    title: "消费队列并维护 baseState/baseQueue",
    summary:
      "本轮 lane 不包含的 update 会被跳过并保留。其后的已处理 update 也可能需要重放副本，才能维持原始更新顺序。",
    watch: "用初始 1、低优先级 +10、高优先级 ×2 推演中间 2 与最终 22。",
    chapter: chapter("04-useState与UpdateQueue"),
  },
  {
    path: reconciler + "ReactFiberLane.js",
    symbol: "getNextLanes",
    title: "从 Root 待处理工作中选择本轮 lanes",
    summary:
      "Lane 是可组合的位集合，不是线程。Root 还记录 suspended、pinged、expired 等状态，决定哪些更新当前可以执行。",
    watch:
      "比较 pendingLanes、suspendedLanes、pingedLanes 与返回的 next lanes。",
    chapter: chapter("08-Lane与Scheduler"),
  },
  {
    path: reconciler + "ReactChildFiber.js",
    symbol: "reconcileChildrenArray",
    title: "按 key/type 匹配列表子节点",
    summary:
      "协调过程决定旧 Fiber 是否复用、新节点是否插入、旧节点是否删除；稳定 key 让业务实体的 state 身份跟随实体。",
    watch:
      "对照 updateSlot、mapRemainingChildren 和 placeChild，区分复用与 DOM 移动。",
    chapter: chapter("06-Reconciliation与Diff"),
  },
  {
    path: reconciler + "ReactFiberCommitWork.js",
    symbol: "commitMutationEffects",
    title: "在 Commit 中执行宿主树变更",
    summary:
      "Render 只准备候选与标记；Mutation 阶段才根据完成树的 flags 插入、更新或删除宿主节点。",
    watch:
      "沿 subtreeFlags 找到真正有副作用的子树，比较 Placement 与 Deletion 路径。",
    chapter: chapter("07-Commit阶段"),
  },
  {
    path: reconciler + "ReactFiberCommitWork.js",
    symbol: "commitLayoutEffects",
    title: "DOM 变更后处理布局阶段工作",
    summary:
      "Layout Effect 可以在提交后的布局窗口读取已更新的 DOM；它与通常稍后 flush 的 passive Effect 不同。",
    watch:
      "用 ref、useLayoutEffect、useEffect 日志对照阶段，不要把 useEffect 固定说成必在 Paint 后。",
    chapter: chapter("05-Effect系统"),
  },
  {
    path: reconciler + "ReactFiberCommitWork.js",
    symbol: "commitPassiveMountEffects",
    title: "提交后处理 passive Effect",
    summary:
      "useEffect 的 setup 属于 passive 阶段，常被安排在同步 mutation/layout 工作之后；具体与浏览器 Paint 的先后不能一概而论。",
    watch:
      "先区分 passive cleanup 与 setup，再观察 StrictMode 开发环境的额外检查。",
    chapter: chapter("05-Effect系统"),
  },
  {
    path: reconciler + "ReactFiberThrow.js",
    symbol: "throwException",
    title: "把挂起或错误交给边界处理",
    summary:
      "pending thenable 不代表立即修改 DOM。React 沿 Fiber 祖先寻找可处理的边界，决定 fallback、保留当前 UI 或重试路径。",
    watch:
      "区分 thenable 挂起与普通错误，继续追 ping/retry 如何重新调度 Render。",
    chapter: chapter("14-Suspense与Throw-Thenable"),
  },
  {
    path: reconciler + "ReactFiberHydrationContext.js",
    symbol: "enterHydrationState",
    title: "开始认领服务端已有 DOM",
    summary:
      "Hydration 不是先清空 HTML 再重建。React 需要维护当前位置，按 Fiber 遍历顺序尝试匹配服务端宿主节点。",
    watch:
      "观察 hydration parent、next hydratable instance 与 mismatch 恢复分支。",
    chapter: chapter("15-SSR与Hydration"),
  },
  {
    path: "packages/react-server/src/ReactFlightServer.js",
    symbol: "createRequest",
    title: "创建 Flight 服务端请求",
    summary:
      "RSC 服务端组织的是可传输的 React 模型与模块引用；Flight 输出不是浏览器可直接显示的 HTML。",
    watch: "区分 Server Component 计算、Flight 序列化与 Fizz HTML streaming。",
    chapter: chapter("20-ServerComponents与Flight"),
  },
  {
    path: hooks,
    symbol: "mountSyncExternalStore",
    title: "为外部可变状态建立一致性读取",
    summary:
      "外部 store 不受 React state 队列控制，需要 snapshot、订阅以及一致性检查，避免并发 Render 中读到撕裂的状态。",
    watch: "查看 getSnapshot、subscribe 和提交前后的一致性检查路径。",
    chapter: chapter("21-useSyncExternalStore与Tearing"),
  },
];
