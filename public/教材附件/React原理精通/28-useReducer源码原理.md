# 28. useReducer 源码原理：同一套 Hook Queue 的另一种表达

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `pending` | 待处理更新 |
| `eager state` | 预计算状态 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `Mount` | 挂载 |
<!-- TERMS-AUTO-END -->


> 基线：React 19.3.0。目标不是记 API，而是理解 `useReducer` 为什么和 `useState` 共享同一类 Hook / UpdateQueue 模型。

## 1. 先建立不变量

`useReducer` 必须满足四个约束：

- render 阶段读取到的是当前 render 对应的 state snapshot；
- `dispatch(action)` 不直接修改当前局部变量；
- update 必须进入队列，并带着 lane 参与优先级选择；
- 被跳过的低优先级 update 必须能够在未来 rebase，否则并发更新会丢失语义。

所以它自然会落到：

```text
Hook
  ├─ memoizedState
  ├─ baseState
  ├─ baseQueue
  └─ queue
       ├─ pending
       ├─ dispatch
       ├─ lastRenderedReducer
       └─ lastRenderedState
```

## 2. 源码主线

源码锚点：[`ReactFiberHooks.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)

```text
useReducer
  ↓ Dispatcher
mountReducer / updateReducer / rerenderReducer
  ↓
updateReducerImpl
  ↓
合并 pendingQueue 与 baseQueue
  ↓
按 renderLanes 消费 update
  ↓
跳过的 update 克隆进 newBaseQueue
  ↓
得到 memoizedState / baseState / baseQueue
```

教学化伪码：

```js
function updateReducerImpl(hook, reducer) {
  const queue = hook.queue
  mergePendingIntoBaseQueue(hook, queue)

  let state = hook.baseState
  let newBaseQueue = null

  for (const update of hook.baseQueue) {
    if (!includesRenderLane(update.lane)) {
      newBaseQueue = cloneForLater(update, newBaseQueue)
      continue
    }
    state = update.hasEagerState
      ? update.eagerState
      : reducer(state, update.action)
  }

  hook.memoizedState = state
  hook.baseQueue = newBaseQueue
  return [state, queue.dispatch]
}
```

> 上面是教学化结构，不是逐字复制 React 源码。

## 3. useState 与 useReducer 的关系

`useState` 可以理解成使用了一个“basicStateReducer”的特殊 reducer：

```js
function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action
}
```

所以：

```text
useState(value)
≈ useReducer(basicStateReducer, value)
```

这不是说两者公共 API 完全等价，而是说它们在 reconciler 内部共享大量队列处理机制。

## 4. 为什么 reducer 必须是纯函数

Render 可能被重新执行、放弃或重试。如果 reducer 有副作用：

```js
function reducer(state, action) {
  analytics.send(action) // 错误：副作用
  return nextState
}
```

同一个 action 可能因为重渲染而造成重复外部副作用。Reducer 的职责是**从输入计算状态**，不是执行外部同步。

## 5. eager state 优化

当 React 能够安全地提前计算下一 state，并且新旧 state `Object.is` 相等时，可能走 eager bailout，减少一次无意义调度。但这只是优化，不能依赖它作为业务语义。

## 6. 实验

```jsx
function Demo() {
  const [state, dispatch] = useReducer((s, a) => s + a, 0)
  return <button onClick={() => { dispatch(1); dispatch(2) }}>{state}</button>
}
```

断点建议：

```text
mountReducer
updateReducerImpl
dispatchReducerAction
scheduleUpdateOnFiber
```

观察 `pending` 环、lane、`baseState` 与 `baseQueue` 的变化。

## 7. 自检

1. 为什么 `dispatch` 可以保持稳定引用，但 reducer/state 每个 render 都可能变化？
2. 为什么 `baseQueue` 不是普通“待执行队列”？
3. 如果 reducer 返回与当前 state `Object.is` 相同的值，React 能做什么优化？

参考答案见 [`assessments/全章节自检题-参考答案.md`](assessments/全章节自检题-参考答案.md)。
