# 03. Hooks：Dispatcher、链表与 Render Snapshot

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `Render Snapshot` | 渲染快照 |
| `stale closure` | 过期闭包/陈旧闭包 |
| `Closure` | 闭包 |
| `Ref` | 引用 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `Mount` | 挂载 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能解释 Dispatcher 为什么存在
- 能模拟 mount/update/rerender 三类 Hook 读取
- 能解释 Hook 顺序规则、render snapshot 与 stale closure 的同一根因

## React 19.3 源码锚点

```text
packages/react/src/ReactHooks.js
packages/react-reconciler/src/ReactFiberHooks.js
```

## 本章核心不变量

- 同一组件每次 render 的有状态 Hook 顺序必须稳定
- Hook 状态跨 render 存在 Fiber 而不是函数局部变量
- render-phase update 必须被限制并可重新执行组件

---

## 先用白话理解：为什么函数组件还能“记住状态”

函数每次调用都会重新开始，局部变量不会天然跨调用保存。React 的办法不是让函数自己记状态，而是让 Fiber 替它保存一串 Hook 记录。每次组件再次执行，React 按相同顺序把“第 1 个 useState、第 2 个 useRef、第 3 个 useEffect”与旧记录对应起来。

因此 Hook 规则不是风格建议，而是**状态记录与调用位置之间的身份协议**。

---

## 1. useState 并不直接知道如何实现

用户代码：

```js
const [state, setState] = useState(0)
```

`react` 包公开的 Hook API，本质会去找当前 Dispatcher：

```js
function useState(initialState) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}
```

关键问题：

> 当前到底是 mount 还是 update？

React 通过不同 Dispatcher 解决。

概念上：

```text
HooksDispatcherOnMount
  useState → mountState
  useEffect → mountEffect

HooksDispatcherOnUpdate
  useState → updateState
  useEffect → updateEffect
```

## 2. renderWithHooks

函数组件真正进入 Hooks 系统的核心入口。

重要职责：

```text
设置 currentlyRenderingFiber
重置当前 render 的 Hook 游标
选择 mount/update Dispatcher
执行 Component(props)
收尾并检查 Hook 数量
```

教学化逻辑：

```js
function renderWithHooks(current, workInProgress, Component, props) {
  currentlyRenderingFiber = workInProgress
  workInProgress.memoizedState = null
  workInProgress.updateQueue = null

  if (current === null || current.memoizedState === null) {
    ReactSharedInternals.H = HooksDispatcherOnMount
  } else {
    ReactSharedInternals.H = HooksDispatcherOnUpdate
  }

  const children = Component(props)

  finishRenderingHooks(current, workInProgress)

  return children
}
```

## 3. Hook 数据结构

简化：

```js
type Hook = {
  memoizedState,
  baseState,
  baseQueue,
  queue,
  next
}
```

函数组件：

```jsx
function App() {
  const [count] = useState(0)
  const ref = useRef()
  useEffect(...)
}
```

对应：

```text
Fiber.memoizedState
    ↓
Hook(useState)
    ↓
Hook(useRef)
    ↓
Hook(useEffect)
```

## 4. mountWorkInProgressHook

第一次 render：

```js
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  }

  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = hook
    workInProgressHook = hook
  } else {
    workInProgressHook.next = hook
    workInProgressHook = hook
  }

  return hook
}
```

重点：

> React 没有给 Hook 用变量名做 ID。

身份主要来自**调用顺序**。

## 5. updateWorkInProgressHook

更新 render 时：

```text
Current Fiber 的 Hook 链表
          ↓
按顺序读取对应旧 Hook
          ↓
克隆/复用为 WIP Hook
```

所以：

```jsx
if (flag) {
  useState(...)
}
```

会破坏顺序。

第一次：

```text
Hook1 = A
Hook2 = B
Hook3 = C
```

第二次 flag=false：

```text
Hook1 = A
Hook2 = C
```

React 会把 Hook2 当成原来的 B。

这不是风格约束，是数据结构约束。

## 6. Render Snapshot

每次函数调用都是新的闭包：

```text
Render #1
count = 0

Render #2
count = 1
```

`Render #1` 里创建的 callback 会捕获那一轮的 `count=0`。

这就是 stale closure 的根本：

```js
useEffect(() => {
  setInterval(() => {
    console.log(count)
  }, 1000)
}, [])
```

这里 interval callback 来自首次 render。

## 7. Function Component 没有持久实例

Class：

```text
同一个 instance
state 在 instance 上变化
```

Function：

```text
每次 render 都重新调用函数
持久数据在 Fiber/Hook
函数局部变量只属于当前 render
```

一句话：

> **函数组件不是“一个不断变化的函数对象”，而是一连串 render snapshot；Fiber 才是跨 render 的宿主。**

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**
