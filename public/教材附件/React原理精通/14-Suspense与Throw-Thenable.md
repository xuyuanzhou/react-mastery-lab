# 14. Suspense：Thenable、Opaque Suspension、Ping、Retry 与 Replay

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Current Tree` | 当前已提交 Fiber 树 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Hook Linked List` | Hook 链表 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Concurrent Rendering` | 并发渲染 |
| `Transition` | 过渡更新 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** “throw Promise”只能作为历史/概念简写。现代 `use()` 的具体实现更精细。

## 本章掌握标准

你应该能画出：

```text
use(thenable)
→ track thenable
→ pending
→ 保存真实 thenable
→ 抛内部 SuspenseException
→ WorkLoop 捕获
→ 取回 suspended thenable
→ 找 Suspense boundary
→ fallback / retain previous UI
→ attach ping listener
→ thenable resolve
→ ping root
→ retry lane
→ replay / rerender
```

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberThenable.js
packages/react-reconciler/src/ReactFiberThrow.js
packages/react-reconciler/src/ReactFiberSuspenseContext.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberLane.js
```

## 本章核心不变量

- 未完成的 primary tree 不能被当成已完成 UI 提交。
- suspension 必须能找到一个处理边界或升级为错误/根级处理。
- thenable resolve 不能直接“继续旧 JS 调用栈”，而是重新调度 React work。
- retry 必须保留当前已提交 UI 的一致性。

---

## 先用白话理解：Suspense 不是一个 Loading 组件

Suspense 的核心问题是：组件在 Render 时发现“我现在还算不出最终 UI，因为依赖的数据/代码还没准备好”，React 如何暂时停止这条子树、找到最近边界显示备用 UI，并在资源就绪后重新尝试？

所以真正要学的是 suspend（挂起）→ capture（边界捕获）→ fallback（备用内容）→ ping（就绪通知）→ retry（重试），而不是只会写 `<Suspense fallback={...}>`。

---

## 1. Suspense 不是异步组件语法糖

Suspense 的核心问题是：

> **Render 过程中发现当前子树暂时无法完成时，React 如何保持已提交 UI 一致，同时安排未来重试？**

这个问题依赖 Fiber 架构：

```text
Current Tree 继续作为已提交 UI
WIP Tree 尝试下一版本
WIP suspend → 可以放弃/回退/保留旧 UI
```

## 2. “throw Promise”为什么是过度简化

早期理解 Suspense 时常说：

```js
if (!ready) throw promise
```

这帮助理解“用 throw 解开同步调用栈”。

但在 React 19.3 的 `use()` 路径中，核心设计是：

```text
真实 thenable 被保存到内部 suspendedThenable
React 抛出一个 opaque SuspenseException
WorkLoop 捕获后再调用 getSuspendedThenable()
```

原因之一：避免用户代码通过普通 `try/catch` 把真实 suspension 信号误吞掉。

因此分两层记：

```text
稳定模型：Render 用异常式控制流中断当前同步执行
19.3 实现：use() 抛 opaque internal exception，真实 thenable 单独保存
```

## 3. Thenable 状态跟踪

React 需要把 thenable 归一为：

```text
pending
fulfilled(value)
rejected(reason)
```

如果 fulfilled：

```text
use(thenable) → 返回 value
```

如果 rejected：

```text
抛 reason → 进入 error path
```

如果 pending：

```text
触发 suspension path
```

这说明 `use()` 本质不是“await 的 Hook 版本”，而是把一个异步资源状态接入 React Render 控制流。

## 4. use() 为什么可以有不同于传统 Hooks 的调用限制

传统状态 Hook 身份依赖：

```text
Fiber.memoizedState Hook linked list 顺序
```

`use(thenable/context)` 的内部路径与普通有状态 Hook 并不完全相同，因此不能机械套用：

```text
“所有 React useX 都必须完全相同规则”
```

但这也不意味着可以任意改变资源读取语义。React 19.3 甚至加入了对某些“条件 use 导致前一次 suspend、后一次不再 use”模式的 DEV 检查。

## 5. WorkLoop 如何区分 suspension 与普通 error

Render 中出现 throw 后，React 要判断：

```text
这是 thenable/suspense 控制流？
还是普通错误？
还是特殊内部异常？
```

随后：

```text
suspension
→ 找最近可处理的 Suspense boundary

error
→ 找 Error Boundary / root error path
```

所以 Suspense 和 Error Boundary 共用“Render 不能完成”的某些基础设施，但语义完全不同。

## 6. Boundary 做了什么

概念上：

```text
primary children 尝试 render
      ↓ suspend
nearest Suspense boundary
      ↓
决定本轮显示/保留什么
      ↓
fallback 或旧内容
```

不要把 Suspense 理解为：

```text
promise pending → 立刻 DOM 替换 fallback
```

因为 Transition、已有 UI、timeout/avoid fallback、Activity/Offscreen 等策略都会影响可见行为。

## 7. Ping：Promise resolve 之后不是“继续执行”

thenable resolve 后：

```text
wakeable listener
→ pingSuspendedRoot
→ 标记相关 lanes 已可重试
→ ensure Root scheduling
→ 下一次 render
```

它不会恢复先前 JS 栈：

```text
Component()
  paused here  ← ❌ 不是协程恢复
```

而是：

```text
重新进入 React Render
→ 重新执行需要的组件
→ 这次 use(thenable) 读取 fulfilled value
```

这与“Render 可重放”不变量完全一致。

## 8. Retry Lane

Suspense retry 不一定和普通 click/setState 采用同一个 lane。

源码里有专门 retry lane 选择逻辑。

意义：

```text
“一个资源现在 ready 了”
```

是一类特殊 React work，应被 Root Scheduler 正确排序。

## 9. Replay：现代 React 源码的重要概念

Suspense 可能出现：

```text
组件执行到一半 suspend
→ 数据很快 ready
→ React 对相关 unit 进行 replay
```

因此 `renderWithHooks` 周边会看到：

```text
renderWithHooksAgain
resetHooksAfterThrow
resetHooksOnUnwind
thenable state reset/reuse
```

这比传统“函数组件只执行一次”的心智模型复杂得多。

## 10. Suspense 与 Transition

典型场景：

```text
当前页面 A 已显示
用户触发 transition 到 B
B render 中 suspend
```

React 可以选择：

```text
保留 A 一段时间
而不是立即用 fallback 覆盖整个交互
```

这就是为什么 Suspense 必须与 Lane/Transition 一起学习。

## 11. Suspense 与 Activity / Offscreen

现代 React 不只有“mount/unmount”两种状态。

隐藏/后台树可以存在：

```text
state 保留
DOM 可能隐藏
effects 可能断开/重连
工作优先级降低
```

Activity/Offscreen 相关设计说明 React 的树状态空间已经比经典生命周期更丰富。

## 12. Suspense 与 Server Rendering

Streaming SSR 中 Suspense boundary 还是：

```text
HTML streaming 的切分单元
```

服务端可以先发送 shell/fallback，边界内容准备好后继续发送。

客户端 hydration 又能按 boundary 逐步接管。

因此 Suspense 同时连接：

```text
Client Concurrent Rendering
Server Streaming
Hydration
RSC/Flight
```

## 13. 实验：证明“不是恢复旧函数栈”

```jsx
function ResourceView() {
  console.log('render ResourceView')
  const data = use(resourcePromise)
  console.log('after use', data)
  return <div>{data}</div>
}
```

观察 pending → fulfilled 前后的日志。

你会看到数据 ready 后组件重新进入 render，而不是从上次 `use()` 下一行简单继续。

## 14. 源码断点

```text
trackUsedThenable
getSuspendedThenable
throwException
attachPingListener
pingSuspendedRoot
requestRetryLane
updateSuspenseComponent
renderWithHooksAgain
```

记录：

```text
workInProgressSuspendedReason
suspendedThenable
root.pingedLanes
retry lane
boundary flags
```

## 15. 常见错误认知

```text
❌ Suspense = loading 组件
❌ React 19 的 use() 就是直接 throw Promise
❌ Promise resolve 后 React 从暂停的 JS 行继续
❌ Suspense 和 Error Boundary 是同一个东西
❌ Suspense 只和客户端数据请求有关
```

## 16. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么 React 要抛 opaque `SuspenseException` 而不是直接让真实 thenable 泄漏给用户代码？
2. 为什么 thenable resolve 只能触发 retry，而不能直接 mutate DOM？
3. Suspense 为什么天然依赖 current/WIP 双缓冲？
4. Transition + Suspense 为什么能避免已有 UI 立即闪成 fallback？
5. Server Streaming 为什么也把 Suspense boundary 当关键单元？
