# 37. 初次 Mount：从 createRoot 到第一个像素

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `createRoot` | 创建 React 根 |
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `beginWork` | 开始处理 Fiber |
| `completeWork` | 完成 Fiber 工作 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `DOM` | 文档对象模型 |
| `Layout` | 布局/回流 |
| `Paint` | 绘制 |
<!-- TERMS-AUTO-END -->


> 建议先完整阅读：[00C. 从编译入口到浏览器像素：React 完整渲染链路](00C-从编译入口到浏览器像素-完整渲染链路.md)。本章作为快速调用链复习。

## 主链

```text
createRoot(container)
→ createContainer / FiberRoot + HostRoot Fiber
→ root.render(<App />)
→ updateContainer
→ enqueue update on HostRoot
→ scheduleUpdateOnFiber
→ ensureRootIsScheduled
→ microtask / root scheduler
→ performWorkOnRoot
→ renderRoot*
→ workLoop*
→ beginWork HostRoot
→ updateFunctionComponent App
→ renderWithHooks
→ reconcileChildren
→ completeWork HostComponent
→ commitRoot
→ mutation/layout/passive phases
→ browser style/layout/paint/composite
```

源码锚点：

- [`ReactDOMRoot.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/client/ReactDOMRoot.js)
- [`ReactFiberReconciler.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberReconciler.js)
- [`ReactFiberWorkLoop.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [`ReactFiberBeginWork.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberBeginWork.js)
- [`ReactFiberCompleteWork.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberCompleteWork.js)

## 关键观察

初次 mount 时没有旧 child Fiber 可以复用，因此 reconciliation 主要构造新 Fiber；HostComponent 的 DOM instance 在 complete 阶段准备，最终在 commit 时连接到可见 DOM tree。

## 断点

```text
updateContainer
scheduleUpdateOnFiber
performWorkOnRoot
beginWork
renderWithHooks
reconcileChildFibers
completeWork
commitRoot
```

## 自检

1. 为什么 DOM instance 可以在 Render 的 complete 阶段创建，但不能在那时把它随便插进可见容器？
2. `root.render` 为什么不是“立即把 JSX 转成 DOM”？
3. 首次 mount 哪些阶段能被并发 render 放弃？
