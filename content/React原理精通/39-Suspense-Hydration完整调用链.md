# 39. Suspense / Hydration 完整调用链

> 源码定位：点击 [enterHydrationState](source:packages/react-reconciler/src/ReactFiberHydrationContext.js#enterHydrationState)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `hydrateRoot` | 水合根节点 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Suspense` | 异步等待边界 |
| `Thenable` | 类 Promise 对象 |
| `Ping` | 异步完成唤醒 |
| `Retry` | 重试渲染 |
| `Hydration` | 水合/复用服务端 DOM |
| `DOM` | 文档对象模型 |
<!-- TERMS-AUTO-END -->


## Suspense

React 19.3 不能只用“throw Promise”概括。教学主线：

```text
render reads resource
→ pending thenable
→ internal suspension signal
→ WorkLoop captures suspended thenable
→ nearest Suspense boundary marks fallback/retry state
→ commit fallback when appropriate
→ thenable resolves → ping root
→ retry lane scheduled
→ boundary renders primary content again
```

源码锚点：

- [`ReactFiberThenable.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberThenable.js)
- [`ReactFiberThrow.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberThrow.js)
- [`ReactFiberWorkLoop.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)

## Hydration

```text
server HTML already exists
→ hydrateRoot establishes hydration root
→ render attempts to claim/match existing host nodes
→ matching succeeds: attach React ownership/event semantics
→ mismatch: recover according to boundary/root strategy
```

Hydration 的目标不是“再 render 一遍同样 HTML”，而是把现有宿主 DOM 与客户端 Fiber tree 对齐并接管交互。

## Event replay / selective hydration

在尚未完全 hydration 的区域发生离散事件时，React DOM 可以利用事件优先级和 hydration 机制尝试让相关边界更快变得可交互，而不是要求整棵树一次性同步完成。

## 自检

1. Suspense 的 ping 触发了什么？
2. Hydration mismatch 为什么不能总是简单忽略？
3. Selective hydration 与普通 client render 的目标有什么不同？

<!-- ANSWER-GUIDE-START -->
## 本章自检参考解析

> 建议先遮住本节独立作答。每题至少说出“现象 → 内部机制 → 反例/边界”，再点击本章源码锚点核对。

1. **Ping 表示依赖可能已可读，触发重试安排。** Thenable resolve 后 React 标记相关根/边界并重新调度 Render；不会直接把 Promise 的值塞进已提交 DOM。下一次 Render 仍需重新计算 UI，再决定是否 Commit。
2. **Mismatch 可能破坏语义和交互。** 服务端 DOM 与客户端期望树不一致时，React 无法可靠地把 Fiber 关联到正确宿主节点；事件、属性、状态都可能错位。因此需要报告、恢复或改走 client render，不能总是静默保留任意旧 DOM。
3. **Selective Hydration 要复用已经可见的服务端 HTML 并优先接管有交互需求的 boundary。** 普通 client render 是从客户端创建/更新宿主节点；水合还要做匹配、定位和必要的事件处理。HTML 可见、边界已水合、事件已处理是三个不同状态。

更多情境题及答案：[全章节自检题](assessments/全章节自检题.md) · [参考答案](assessments/全章节自检题-参考答案.md)。
<!-- ANSWER-GUIDE-END -->
