# 39. Suspense / Hydration 完整调用链

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
