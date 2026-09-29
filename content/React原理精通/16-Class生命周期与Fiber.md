# 16. Class Component：Instance Model、UpdateQueue 与 Fiber 生命周期映射

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Hook Linked List` | Hook 链表 |
| `Update Queue` | 更新队列 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `beginWork` | 开始处理 Fiber |
| `completeWork` | 完成 Fiber 工作 |
| `Context` | 上下文 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** Class 不是“React 15 的遗迹”；现代 React 仍由 Fiber Reconciler 执行 ClassComponent。

## 本章掌握标准

你需要理解的不只是生命周期名字，而是：

```text
Class instance 如何挂到 Fiber
this.state 如何进入 class UpdateQueue
render-phase lifecycle 与 commit-phase lifecycle 如何映射
为什么 UNSAFE_* 与可重放 Render 冲突
```

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberClassComponent.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberClassUpdateQueue.js
packages/react-reconciler/src/ReactFiberCommitWork.js
```

## 核心不变量

- `render()` 属于可重放 Render Phase，不能依赖“只执行一次”。
- Class instance 可以持久存在，但它看到的 props/state 必须和 Fiber 当前处理阶段保持一致。
- commit lifecycle 才能安全依赖宿主 DOM 已进入新状态。

---

## 1. Class 与 Function 的状态宿主不同

Class：

```text
Fiber.stateNode → class instance
instance.state
Fiber.updateQueue → class updates
```

Function：

```text
Fiber.memoizedState → Hook linked list
Hook.queue → hook updates
```

但两者最终都进入同一套：

```text
Lane
Root Scheduler
beginWork
completeWork
commit
```

## 2. mountClassInstance

初次 mount 大致需要：

```text
构造 instance
绑定 Fiber ↔ instance
初始化 props/state/context
处理 update queue
调用合法的 mount render-phase lifecycle
执行 render()
```

注意：`constructor` 是 JavaScript instance 初始化，不等于 Commit。

## 3. this.setState 不是直接改 this.state

概念链：

```text
this.setState(partial)
→ class updater
→ create Update
→ enqueueUpdate(Fiber.updateQueue)
→ requestUpdateLane
→ scheduleUpdateOnFiber
```

因此 Class 和 Hook 的 setState 有共同架构原则：

> **更新先成为 queue 中的数据，再由 Render 消费。**

## 4. Class UpdateQueue 与 Hook UpdateQueue 不要混为一谈

两者都解决“排队/优先级/rebase”，但数据结构和实现文件不同。

Class：

```text
ReactFiberClassUpdateQueue.js
```

Function Hook：

```text
ReactFiberHooks.js
```

真正应该比较的是设计目标，而不是强行认为源码结构一致。

## 5. Render Phase 生命周期

历史 API：

```text
componentWillMount
componentWillReceiveProps
componentWillUpdate
```

现代别名：

```text
UNSAFE_componentWillMount
UNSAFE_componentWillReceiveProps
UNSAFE_componentWillUpdate
```

问题不是“这些名字老”。

真正冲突是：

```text
Render 可能执行
→ 被打断
→ 被丢弃
→ 重新执行
```

如果你在 Will 生命周期中：

```text
发不可撤销请求
修改外部单例
手工改 DOM
记录一次性计费
```

就无法满足 Render 可重放。

## 6. static getDerivedStateFromProps

它属于 render 计算路径。

因此必须理解成：

```text
next props + previous state
→ 计算 derived state
```

而不是“收到 props 变化时触发一次的事件回调”。

## 7. getSnapshotBeforeUpdate 为什么非常重要

它体现 Commit 的 phase 设计：

```text
Before Mutation
  ↓
getSnapshotBeforeUpdate(prevProps, prevState)
  ↓
Mutation
  DOM 变化
  ↓
Layout
  componentDidUpdate(..., snapshot)
```

典型滚动列表：

```text
DOM 变之前读 scrollHeight
DOM 变之后根据 snapshot 调整 scrollTop
```

如果只有 `componentDidUpdate`，某些“变更前宿主状态”已经丢失。

## 8. componentDidMount / componentDidUpdate

属于 Layout/Commit 语义。

它们可以：

```text
读取已提交 DOM
建立订阅
执行与新 UI 对应的外部同步
```

但仍不意味着可以无脑 setState，否则会形成 nested update。

## 9. componentWillUnmount

卸载过程要理解成资源清理协议：

```text
Fiber 被删除
→ layout/passive/class cleanup 按阶段执行
→ refs detach
→ host nodes removal
→ 内部指针逐步断开
```

不要把 unmount 只理解成“DOM remove 后调用一个函数”。

## 10. Error Boundary 为什么主要是 Class API

错误边界典型依赖：

```text
static getDerivedStateFromError
componentDidCatch
```

它们分别覆盖：

```text
render error → 计算 fallback state
commit/reporting → componentDidCatch
```

详细见错误恢复章节。

## 11. 为什么 Hooks 不是 lifecycle 一一替换

错误映射：

```text
useEffect([]) = componentDidMount
useEffect([x]) = componentDidUpdate
cleanup = componentWillUnmount
```

这只能帮助初学迁移，不是正确架构模型。

Effect 的正确模型：

```text
一个外部系统同步过程
setup(deps)
cleanup(previous deps)
```

一个组件可以有多个独立 Effect，而 Class lifecycle 是围绕 instance 阶段聚合的。

## 12. 实验

在 StrictMode 开发环境中给：

```text
constructor
render
componentDidMount
componentWillUnmount
```

分别打日志。

然后解释：

```text
哪些重复是 DEV 检查语义？
哪些真正对应 production mount？
为什么 render 重复不能产生副作用？
```

## 13. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. Class instance 为什么可以持久存在，但 render 仍必须纯？
2. `this.setState` 与 Hook `setState` 的共同架构原则是什么？
3. `getSnapshotBeforeUpdate` 为什么必须在 mutation 之前？
4. UNSAFE lifecycle 的真正问题是“弃用”还是“与可重放 Render 冲突”？
5. 为什么不能用 Class lifecycle 机械解释 Hooks？
