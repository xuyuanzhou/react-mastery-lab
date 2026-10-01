# 10. 一次 setState 到屏幕像素：完整主干调用链

> 源码定位：点击 [scheduleUpdateOnFiber](source:packages/react-reconciler/src/ReactFiberWorkLoop.js#scheduleUpdateOnFiber)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Fiber Root` | Fiber 根 |
| `Mutation Phase` | DOM 变更阶段 |
| `Passive Effect` | 被动副作用 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能从事件回调一路追到浏览器像素
- 能标记每一步修改了哪个数据结构
- 能识别 19.3 Root Scheduler 与旧教程调用图差异

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberRootScheduler.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberCompleteWork.js
packages/react-reconciler/src/ReactFiberCommitWork.js
```

## 本章核心不变量

- Update 入队与 Root 调度是两个层次
- Render 计算结果通过 flags 才进入 Commit
- Passive effects 不应混同为 DOM mutation 的一部分

---

用这个 Demo：

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count}
    </button>
  )
}
```

点击按钮后，按层拆。

## 阶段 1：React Event

事件回调执行：

```js
setCount(c => c + 1)
```

这里的 `setCount` 是首次/某次 mountState 创建并绑定的 dispatch：

```text
fiber + queue + dispatchSetState
```

## 阶段 2：dispatchSetState

```text
dispatchSetState
 ↓
requestUpdateLane
 ↓
dispatchSetStateInternal
```

创建：

```text
Update {
  lane,
  action: c => c + 1,
  ...
}
```

## 阶段 3：进入 Hook UpdateQueue

```text
enqueueConcurrentHookUpdate
```

Update 被挂入 queue。

此时 state 还没有“原地变成 1”。

## 阶段 4：通知 Fiber Root

```text
scheduleUpdateOnFiber
 ↓
markRootUpdated
 ↓
ensureRootIsScheduled
```

Root 知道：

```text
某 lane 有 pending work
```

## 阶段 5：Root work 开始

根据优先级进入类似：

```text
performSyncWorkOnRoot
或
performWorkOnRootViaSchedulerTask
```

然后：

```text
renderRootSync
或
renderRootConcurrent
```

## 阶段 6：WorkLoop

```text
workLoop*
 ↓
performUnitOfWork
 ↓
beginWork
```

走到 Counter Fiber：

```text
updateFunctionComponent
 ↓
renderWithHooks
 ↓
Counter()
```

## 阶段 7：updateState

第二次 render 的：

```js
useState(0)
```

不再 mount，而是 update dispatcher：

```text
useState
 ↓
updateState
 ↓
updateReducer
 ↓
处理 UpdateQueue
```

执行 action：

```js
c => c + 1
```

得到：

```text
newState = 1
```

Hook.memoizedState 更新为 1。

## 阶段 8：组件返回新 Element

```jsx
<button>1</button>
```

Reconciliation 比较：

```text
旧 HostComponent button
vs
新 button
```

type/key 一致 → 复用 Fiber / DOM。

子 Text：

```text
"0" → "1"
```

产生更新标记。

## 阶段 9：completeWork

向上完成 Fiber：

```text
Text complete
Button complete
Counter complete
...
Root complete
```

收集 flags / subtreeFlags。

Render 完成：

```text
finishedWork
```

## 阶段 10：commitRoot

```text
commitRoot
 ↓
Mutation Phase
```

真实 DOM 文本变成：

```text
1
```

随后 Layout Effects。

## 阶段 11：浏览器

DOM 已变化：

```text
Style
 ↓
Layout（若需要）
 ↓
Paint
 ↓
Composite
```

用户最终看到：

```text
1
```

## 阶段 12：Passive Effects

如果 Counter 有：

```js
useEffect(...)
```

React 会在 passive effect flush 阶段执行相应 cleanup/create。

---

# 一句话闭环

```text
setState
不是“修改变量”

而是：

创建带优先级的 Update
→ 放进 Fiber Hook 队列
→ 调度 Root
→ Render 消费队列计算新 state
→ Reconciliation 标记变更
→ Commit 修改 DOM
→ 浏览器把 DOM 变化绘制成像素
```

如果你能从头手画并解释每一层的数据结构，才算真正理解 `useState`。


## React 19.3 修正版：一次 setState 的 Root Scheduling 中段

为了避免沿用旧教程，这一段建议单独背成“19.3 主链”：

```text
事件回调
  ↓
setCount(action)
  ↓
dispatchSetState / 对应 dispatch 实现
  ↓
requestUpdateLane(fiber)
  │
  ├─ legacy/sync 特殊情况
  ├─ render-phase update 特殊情况
  ├─ transition context → requestTransitionLane
  └─ resolveUpdatePriority → eventPriorityToLane
  ↓
创建 Update{ lane, action, ... }
  ↓
加入 Hook queue
  ↓
scheduleUpdateOnFiber(root, fiber, lane)
  ↓
Root pending lanes 被标记
  ↓
ensureRootIsScheduled(root)
  ↓
Root 进入 scheduled-root 链表 + 确保 microtask
  ↓
processRootScheduleInMicrotask
  ↓
scheduleTaskForRootDuringMicrotask
  ↓
getNextLanes
  ↓
决定：同步执行 or Scheduler callback
  ↓
performWorkOnRoot
```

这条链里最容易学错的是：

```text
ensureRootIsScheduled ≠ 直接开始 render
```

它首先是“确保 Root 被后续统一调度处理”。

## 一次更新应该记录的 8 组状态

真正看源码时，不要只记函数跳转。建议每次点击都记录：

| 层 | 观察值 | 你要回答的问题 |
|---|---|---|
| Hook | `hook.memoizedState` | 当前已使用的 state 是什么？ |
| Queue | `queue.pending` | 新 Update 如何链接？ |
| Update | `update.lane/action` | 这次更新是什么、属于哪组工作？ |
| Fiber | `fiber.lanes` | 当前 Fiber 标记了哪些工作？ |
| Ancestor | `childLanes` | 祖先如何知道子树有工作？ |
| Root | `pendingLanes` | Root 现在有哪些未完成工作？ |
| Scheduler | `callbackNode/priority` | 是否已有宿主 callback？ |
| Commit | `flags/subtreeFlags` | Render 最终准备提交什么？ |

如果你只会说“setState 会触发 render”，但无法描述这 8 组数据的变化，还没有达到源码级掌握。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**

<!-- CHAPTER-CHECK-START -->
## 本章情境自检与参考解析

**先独立作答：** 从按钮点击到屏幕变化，按顺序串起事件优先级、Update、Root、Render、Commit、浏览器。

**参考解析：** 事件建立优先级，setter 入队并选 lane，Root 安排工作，Render 处理队列和协调，Commit 更新 DOM，浏览器再绘制。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
