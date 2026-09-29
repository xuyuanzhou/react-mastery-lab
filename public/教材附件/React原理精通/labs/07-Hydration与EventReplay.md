# Lab 07：Hydration、Mismatch 与 Event Replay

## 目标

理解 hydration 不是“给 SSR HTML 绑事件”，而是 Client Fiber 与已有 Host Tree 的匹配、认领、恢复与优先级协调。

## 实验 A：稳定 hydration

服务端和客户端输出完全一致，记录 React 如何 claim hydratable nodes。

## 实验 B：制造 mismatch

让客户端首屏多一个节点或文本不同，观察错误信息和恢复策略。

## 实验 C：Suspense boundary 内交互

在尚未 hydration 的边界上触发可离散事件，观察 hydration 优先级与 replay 行为。

## 断点方向

```text
ReactFiberHydrationContext
tryToClaimNextHydratableInstance
throwOnHydrationMismatch
attempt*Hydration / event replay related paths
```

## 验收

你必须区分：

```text
server render
HTML streaming
hydration
selective hydration
event replay
RSC Flight
```

这些是不同层。
