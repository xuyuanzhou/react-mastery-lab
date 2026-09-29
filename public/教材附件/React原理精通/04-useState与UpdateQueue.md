# 04. useState：Hook、UpdateQueue 与调度

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Fiber Root` | Fiber 根 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `pending` | 待处理更新 |
| `eager state` | 预计算状态 |
| `Render Snapshot` | 渲染快照 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Bailout` | 跳过渲染/提前退出 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能手工跑一次 mountState 和 updateState
- 能解释 pending 环形链表、baseQueue 与 rebase
- 能追踪 dispatchSetState → Root scheduling

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberConcurrentUpdates.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberRootScheduler.js
```

## 本章核心不变量

- update 可以延迟但不能丢失
- 不同 lane 被跳过时必须保留可重放的基础状态
- setState 产生的是 Update，不是对当前 render 变量的原地修改

---

## 先用白话理解：setState 为什么不是赋值

`setCount(1)` 不是执行 `count = 1`。当前函数里的 `count` 属于本次 Render Snapshot（渲染快照），不能被 setter 改写。setter 做的是“提交一张更新单”：把 action 放进 Update Queue（更新队列），标记优先级，然后让 React 安排下一轮计算。

下一轮 Render 再读取旧 state + 一串 Update，计算出新的 state。理解这一点后，批处理、函数式更新、stale closure、Lane、Rebase 都会自然串起来。

---

## 1. mountState

第一次调用：

```js
const [count, setCount] = useState(0)
```

主干逻辑：

```text
mountState
 ↓
mountStateImpl
 ↓
创建 Hook
 ↓
初始化 memoizedState/baseState
 ↓
创建 UpdateQueue
 ↓
创建 dispatchSetState 绑定 fiber + queue
```

教学简化：

```js
function mountState(initialState) {
  const hook = mountStateImpl(initialState)
  const queue = hook.queue

  const dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue
  )

  queue.dispatch = dispatch
  return [hook.memoizedState, dispatch]
}
```

## 2. UpdateQueue

简化结构：

```js
type UpdateQueue<S, A> = {
  pending,
  lanes,
  dispatch,
  lastRenderedReducer,
  lastRenderedState,
}
```

`pending` 常以环形单链表维护。

为什么环形？

如果只保存最后一个 update：

```text
pending = U3

U3.next → U1
U1.next → U2
U2.next → U3
```

可以 O(1) 把新 update 插入尾部，同时仍可从 `pending.next` 找到第一个。

## 3. setCount 并不修改 count

调用：

```js
setCount(1)
```

概念链：

```text
dispatchSetState
 ↓
requestUpdateLane
 ↓
创建 Update
 ↓
enqueueConcurrentHookUpdate
 ↓
scheduleUpdateOnFiber
```

简化 Update：

```js
const update = {
  lane,
  action,
  hasEagerState: false,
  eagerState: null,
  next: null,
}
```

`action` 可以是：

```js
1
```

或者：

```js
prev => prev + 1
```

## 4. 为什么 setState 后还是旧值

```js
setCount(count + 1)
console.log(count)
```

当前 `count` 属于本次 render snapshot。

`setCount` 做的是：

```text
给未来 render 排一个更新
```

不是：

```text
原地修改当前函数局部变量
```

## 5. basicStateReducer

`useState` 可以理解为基于一个非常简单 reducer：

```js
function basicStateReducer(state, action) {
  return typeof action === 'function'
    ? action(state)
    : action
}
```

因此：

```js
setCount(5)
```

等价于：

```text
action = 5
→ newState = 5
```

而：

```js
setCount(c => c + 1)
```

则：

```text
action = function
→ newState = action(previousState)
```

## 6. 为什么连续三次 setCount(count + 1) 通常只 +1

假设当前：

```text
count = 0
```

代码：

```js
setCount(count + 1)
setCount(count + 1)
setCount(count + 1)
```

三次闭包里读取到的都是：

```text
count = 0
```

所以 action 都是：

```text
1
1
1
```

最终 reduce 后仍然 1。

函数式更新：

```js
setCount(c => c + 1)
setCount(c => c + 1)
setCount(c => c + 1)
```

则：

```text
0 → 1 → 2 → 3
```

## 7. baseState / baseQueue 为什么存在

这是理解 Lane 和跳过更新的关键。

假设队列：

```text
U1 高优先级
U2 低优先级
U3 高优先级
```

当前 render 只处理高优先级 lane。

React 不能直接把 U2 丢掉，所以需要保存：

```text
baseState
baseQueue
```

用于未来继续重放被跳过的 update。

这说明 React 的 state queue 不是简单 FIFO：

> 它必须支持“按优先级部分消费，并保证之后可以正确重放”。

## 8. eager state

当队列为空且条件合适时，React 可能提前计算下一 state：

```text
oldState
 ↓ reducer(action)
eagerState
```

如果：

```js
Object.is(eagerState, oldState)
```

可能直接 bailout，避免进入完整 render。

这解释了为什么某些：

```js
setCount(count)
```

可能连 render 都跳过。

## 9. 更新真正进入 Root 调度

关键链路：

```text
dispatchSetState
 ↓
dispatchSetStateInternal
 ↓
enqueueConcurrentHookUpdate
 ↓
scheduleUpdateOnFiber(root, fiber, lane)
 ↓
markRootUpdated
 ↓
ensureRootIsScheduled
```

这里从“Hook 层”进入“Fiber Root 调度层”。

这也是读源码时第一个重要跨模块边界。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**
