# 33. use / useActionState / useOptimistic / useFormStatus

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `pending` | 待处理更新 |
| `Transition` | 过渡更新 |
| `Suspense` | 异步等待边界 |
| `Thenable` | 类 Promise 对象 |
| `Context` | 上下文 |
| `Ref` | 引用 |
| `DOM` | 文档对象模型 |
<!-- TERMS-AUTO-END -->


官方参考：

- https://react.dev/reference/react/use
- https://react.dev/reference/react/useActionState
- https://react.dev/reference/react/useOptimistic
- https://react.dev/reference/react-dom/hooks/useFormStatus

## 1. use：读取可挂起资源与 Context

`use()` 与普通 Hooks 有不同调用约束，并与 Suspense 协作。当 thenable pending 时，React 进入内部 suspension 控制流，而不是让用户代码继续拿到一个“半完成结果”。

源码锚点：[`ReactFiberThenable.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberThenable.js)

## 2. useActionState

它把 Action 的结果状态和 pending 状态组织起来：

```text
Action invocation
→ pending
→ action result / error
→ state commit
```

重点不是“又一个 useState”，而是 Action/Transition/Form 语义之间的组合。

## 3. useOptimistic

乐观状态有两层：

```text
base value：服务器/父层确认的真实状态
optimistic overlay：Action pending 期间临时投影
```

当 Action 完成或失败，overlay 需要正确回落/重算，而不是永久覆盖 base value。

## 4. useFormStatus

它读取父 `<form>` Action 的状态，类似于表单范围内的状态通道。它不是任意请求的全局 loading store。

## 5. 自检

1. 为什么 `useOptimistic` 必须区分 base state 与 optimistic state？
2. `useActionState` 和普通 `useReducer` 的语义中心分别是什么？
3. `use()` 与 Suspense 的关系是什么？
