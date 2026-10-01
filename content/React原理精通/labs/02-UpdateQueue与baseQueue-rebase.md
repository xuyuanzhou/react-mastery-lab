# Lab 02：同一 Hook 的 UpdateQueue、baseQueue 与 Rebase

## 要验证的命题

低优先级更新若被本轮 Render 跳过，不能直接丢弃；后续 Render 必须以保留的 `baseState/baseQueue` 按原顺序重放。**两条更新必须进入同一个 `useState` Hook 的队列**，否则不能用来证明这一机制。

## 第一部分：先做确定性的纸上实验

初始 state 为 `1`，依次入队：

```text
U1: TransitionLane，n => n + 10
U2: SyncLane，      n => n * 2
```

先假设本轮 `renderLanes` 只包含 U2 的 lane。不要先看答案，填写：

| 阶段 | 已处理的更新 | memoizedState | baseState | baseQueue |
|---|---|---:|---:|---|
| 入队后、Render 前 |  |  |  |  |
| 高优先级 Render 后 |  |  |  |  |
| 后续 Transition Render 后 |  |  |  |  |

关键预测：第一次可提交的结果是 `2`；由于 U1 被跳过，React 要保留 U1，并将 U2 作为无优先级的重放副本保留在基线队列中。后续从 `1` 按原顺序计算 `(1 + 10) * 2`，最终是 **22**，不是 12。队列节点的具体字段请以下面固定版本源码为准。

平台「交互实验室」中的 UpdateQueue/Lane 演示适合反复改变更新顺序与选择的 lane，先用它核对上表。

## 第二部分：在真实 React 中观察同一队列

把下面组件放进最小 React 开发项目。点击一次按钮后，在断点里核对两条 update 的 `queue` 是否属于同一个 Hook：

```jsx
import { startTransition, useState } from 'react';

export function QueueProbe() {
  const [value, setValue] = useState(1);

  function enqueueBoth() {
    startTransition(() => {
      setValue(n => n + 10); // U1，较低优先级
    });
    setValue(n => n * 2);   // U2，较高优先级
  }

  return <button onClick={enqueueBoth}>value: {value}</button>;
}
```

真实运行时**不保证**每次都能在屏幕上看到中间值 `2`：是否产生独立 Commit、是否发生跳过，取决于调度时机、已有工作和环境。按钮结果不能替代队列证据；若两条更新同一轮被处理，也不能据此推断 rebase 不存在。第一部分是指定 lane 的确定性推演，第二部分是对真实实现和可能分支的观测。

## 断点与记录

依次查看 [dispatchSetState](source:packages/react-reconciler/src/ReactFiberHooks.js#dispatchSetState)、[updateReducerImpl](source:packages/react-reconciler/src/ReactFiberHooks.js#updateReducerImpl) 和 [requestUpdateLane](source:packages/react-reconciler/src/ReactFiberWorkLoop.js#requestUpdateLane)。记录 `hook.memoizedState`、`hook.baseState`、`hook.baseQueue`、`queue.pending`、每个 `update.lane` 和本轮 `renderLanes`；标明哪一次 Render 真正跳过了 U1。

## 验收

1. 能解释为什么两条更新作用于不同 `useState` 时，本实验不成立。
2. 能手算 `1 → 2 → 22`，指出 U2 为什么需要进入重放队列。
3. 能区分“纸上指定 lanes 的确定性结果”和“真实浏览器中某次调度的观测结果”。
4. 能用至少一张断点记录表证明自己的结论，而不是只报告按钮最后显示的数字。
