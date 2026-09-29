export const groups: Record<string, string> = {
  prerequisites: "01 / 前置基础",
  core: "02 / 核心原理",
  hooks: "03 / Hooks",
  concurrency: "04 / 调度与并发",
  server: "05 / SSR 与 RSC",
  architecture: "06 / 系统架构",
  labs: "07 / 交互实验",
  assessments: "08 / 自测与验收",
};
export const glossary: Record<string, [string, string]> = {
  Fiber: [
    "工作单元",
    "React 用来保存组件身份、状态、树关系和待提交工作的一种数据结构。它不等于 DOM 节点。",
  ],
  alternate: [
    "另一棵树中的对应节点",
    "把 current 与 workInProgress 的对应 Fiber 连接起来，让 React 准备下一版界面而不立即修改已提交的界面。",
  ],
  Lane: [
    "更新通道",
    "以位集合表达更新类别。一次渲染可以选择一组通道；它不简单等同于单个数值优先级。",
  ],
  Reconciliation: [
    "协调",
    "根据元素类型、key 和位置复用或创建 Fiber，记录需要提交的变化。",
  ],
  Commit: [
    "提交阶段",
    "把完成的渲染结果应用到宿主环境，并处理 ref 与 effect。",
  ],
  Hook: [
    "钩子",
    "在函数组件中使用 React 能力的 API；常规 Hook 状态由 Fiber 上按调用顺序组织的链表保存。",
  ],
  Suspense: [
    "挂起边界",
    "子树暂时未准备好时显示备用界面，并在资源就绪后安排重试。",
  ],
  Hydration: [
    "水合",
    "客户端把组件逻辑与服务端已有 HTML 对接，建立可交互的树。",
  ],
  baseQueue: [
    "基线更新队列",
    "保留被跳过的更新，以及它们之后需要重放的更新，以维持原始更新顺序。",
  ],
  baseState: [
    "基线状态",
    "第一个被跳过更新之前的状态，后续重新计算从这里开始。",
  ],
  memoizedState: [
    "已记忆状态",
    "Fiber 或 Hook 保存的状态字段；具体含义取决于节点类型。",
  ],
  closure: [
    "闭包",
    "函数保留创建时的词法环境；组件每次渲染创建的回调看到那一轮的状态快照。",
  ],
  RSC: [
    "服务端组件",
    "在服务端执行的组件模型，通过序列化协议把渲染结果与客户端引用传递到客户端。",
  ],
  Effect: [
    "副作用",
    "提交后与外部系统同步的逻辑；必须考虑清理、依赖与开发模式重放。",
  ],
};
export const chain = [
  ["createRoot", "react-dom/src/client/ReactDOMRoot.js"],
  ["updateContainer", "react-reconciler/src/ReactFiberReconciler.js"],
  ["scheduleUpdateOnFiber", "react-reconciler/src/ReactFiberWorkLoop.js"],
  ["ensureRootIsScheduled", "react-reconciler/src/ReactFiberRootScheduler.js"],
  ["beginWork", "react-reconciler/src/ReactFiberBeginWork.js"],
  ["renderWithHooks", "react-reconciler/src/ReactFiberHooks.js"],
  ["completeWork", "react-reconciler/src/ReactFiberCompleteWork.js"],
  ["commitRoot", "react-reconciler/src/ReactFiberWorkLoop.js"],
];
export type SourceTarget = { path: string; line?: number; symbol?: string };
export function sourceLink(href: string): SourceTarget | null {
  if (href.startsWith("source:")) {
    const [path, anchor = ""] = href.slice(7).replace(/^\/\//, "").split("#");
    return {
      path,
      ...(anchor.match(/^L\d+/)
        ? { line: Number(anchor.slice(1).split("-")[0]) }
        : { symbol: decodeURIComponent(anchor) }),
    };
  }
  const m = href.match(
    /^https:\/\/github\.com\/facebook\/react\/blob\/v19\.3\.0\/(.+?)(?:#(.*))?$/,
  );
  if (m) return { path: m[1], line: Number(m[2]?.match(/L(\d+)/)?.[1] || 1) };
  return null;
}
export function resolveMd(from: string, href: string) {
  const [p, anchor] = href.split("#");
  const parts = (
    p.startsWith("/")
      ? p.slice(1)
      : from.split("/").slice(0, -1).join("/") + "/" + decodeURIComponent(p)
  ).split("/");
  const result: string[] = [];
  for (const x of parts) {
    if (x === "..") result.pop();
    else if (x && x !== ".") result.push(x);
  }
  return { id: result.join("/"), anchor };
}
