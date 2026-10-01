# 34. Fragment / Portal / lazy / ViewTransition：组件树与宿主树并不总是一一对应

> 源码定位：点击 [createFiberFromPortal](source:packages/react-reconciler/src/ReactFiber.js#createFiberFromPortal)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Fiber` | 纤程/React 工作单元 |
| `Transition` | 过渡更新 |
| `Suspense` | 异步等待边界 |
| `Context` | 上下文 |
| `Ref` | 引用 |
| `DOM` | 文档对象模型 |
| `Portal` | 传送门 |
| `Fragment` | 片段 |
| `Lazy` | 懒加载 |
| `View Transition` | 视图过渡 |
<!-- TERMS-AUTO-END -->


## Fragment

Fragment 可以参与 React tree，但不一定引入额外 Host DOM wrapper。这是理解“React tree ≠ DOM tree”的典型例子。

React 19.3 将 Fragment Refs 稳定化，因此 Fragment 在现代 React 中不再只是“零 DOM wrapper 的语法糖”那么简单；具体 API 见官方 19.3 release notes。

## Portal

Portal 改变的是 Host DOM 插入位置，不改变 React ownership tree。因此 Context、React event propagation 等仍按 React tree 语义理解，而不是简单跟 DOM parent 一致。

## lazy

`lazy(() => import(...))` 把模块加载和 Suspense boundary 组合起来。加载未完成时，lazy component 的 render 会进入 suspension，而不是“返回 null 等待”。

## ViewTransition

React 19.3 稳定 `<ViewTransition>`，它与 Transition 更新以及浏览器 View Transition API 协作。它属于“React 提交变化 + 浏览器视觉过渡”的交叉层，不应该和 React Fiber 并发调度混为一谈。

## 自检

1. 为什么 Portal 的 DOM parent 和 React parent 可以不同？
2. lazy 为什么天然和 Suspense 配合？
3. ViewTransition 解决的是调度问题还是视觉过渡问题？

<!-- ANSWER-GUIDE-START -->
## 本章自检参考解析

> 建议先遮住本节独立作答。每题至少说出“现象 → 内部机制 → 反例/边界”，再点击本章源码锚点核对。

1. **Portal 改变宿主放置位置，不改变 React 逻辑父子关系。** 例如 Modal Fiber 仍在 App 的子树中，但对应 DOM 被插到 `document.body` 下的容器；Context 和合成事件可沿 React 树理解，DOM `parentNode` 却走另一条路径。画图时应分别画 Fiber 树和 DOM 树。
2. **`lazy` 的模块可能尚未加载。** 首次 Render 读到未完成的模块 thenable，组件不能继续得到实现；Suspense boundary 可显示 fallback，模块加载完成再重试。加载失败则走错误处理，不能把失败误当作永远 pending。
3. **ViewTransition 处理视觉连续性。** 它协调前后画面之间的过渡；Lane/Scheduler 管“工作何时、以何种优先级做”。两者可配合，但动画过渡不等于给更新换一个优先级。

更多情境题及答案：[全章节自检题](assessments/全章节自检题.md) · [参考答案](assessments/全章节自检题-参考答案.md)。
<!-- ANSWER-GUIDE-END -->
