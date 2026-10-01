# 08. React Monorepo 与 packages 源码地图

> 目标：第一次打开 React 仓库时知道应该去哪，不会在几千个文件之间迷路。

## 1. Monorepo（单体多包仓库）是什么

React 官方仓库同时维护多个相互协作的 package：

```text
packages/
├── react/
├── react-dom/
├── react-reconciler/
├── scheduler/
├── react-server/
├── react-client/
└── shared/
```

不要把整个仓库当成一个巨大的 `react.js`。

## 2. 最重要的职责边界

### `packages/react`

面向使用者的核心 API、React Element、Hooks API 的薄入口等。

### `packages/react-dom`

浏览器客户端入口，例如 `createRoot`、`hydrateRoot`，以及 DOM Renderer 的外围组织。

源码入口：[createRoot](source:packages/react-dom/src/client/ReactDOMRoot.js#createRoot)。

### `packages/react-reconciler`

源码学习最核心的目录：

- Fiber
- Hooks
- UpdateQueue
- Lane
- WorkLoop
- Reconciliation
- Commit
- Suspense / error recovery

### `packages/scheduler`

React 调度协作所依赖的通用 Scheduler 实现。要注意：**React Lane 与 Scheduler priority 不是同一个概念**。

### `packages/shared`

多个包共享的常量、工具和 feature flags。

## 3. 第一次读源码只追一条主线

```text
createRoot
→ updateContainer
→ scheduleUpdateOnFiber
→ ensureRootIsScheduled
→ beginWork
→ renderWithHooks
→ completeWork
→ commitRoot
```

先把跨包边界认清，再扩展到 Diff、Effect、Suspense、Hydration。

## 自检

- 为什么 Reconciler 不能直接等于 ReactDOM？
- `react` 包与 `react-reconciler` 包分别面向谁？
- 为什么学习 React 源码不应该从仓库目录第一行开始顺序读？

## 参考答案

1. Reconciler 负责计算组件/Fiber 工作和待提交变化，React DOM 负责浏览器 DOM 宿主的入口与绑定。React 还可以有非 DOM Renderer；如果两者完全等同，平台无关的协调逻辑便难以复用。对照 [completeWork](source:packages/react-reconciler/src/ReactFiberCompleteWork.js#completeWork) 与 [createRoot](source:packages/react-dom/src/client/ReactDOMRoot.js#createRoot)。
2. `react` 包主要提供应用开发者使用的元素、组件和 Hook 公共 API；`react-reconciler` 包包含 Fiber、工作循环、Hook 实现等内部协调机制。公共 `useState` 是入口，状态队列的处理主要在 Reconciler 内部。
3. 目录顺序不等于执行顺序。先用最小 Counter 触发一次更新，沿 `createRoot → updateContainer → scheduleUpdateOnFiber → Render → Commit` 追一条路径，记录跨包调用与状态变化，再按问题扩展到异常分支。否则很容易把工具代码、历史分支和当前执行路径混在一起。
