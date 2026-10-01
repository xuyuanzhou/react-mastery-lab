# 08. Lane 与 Scheduler：优先级、并发和 Transition

> 源码定位：点击 [getNextLanes](source:packages/react-reconciler/src/ReactFiberLane.js#getNextLanes)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。
> 学完即练：[对应实验](labs/03-RootScheduler与microtask.md)。先写预测，再观察源码和结果。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Priority` | 优先级 |
| `Concurrent Rendering` | 并发渲染 |
| `Transition` | 过渡更新 |
| `Suspense` | 异步等待边界 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 区分 Lane、Event Priority、Scheduler Priority
- 能解释 Root Scheduler 的 microtask 层
- 能手算低优先级 update 被跳过并 rebase 的过程

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberLane.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberRootScheduler.js
packages/scheduler/src/forks/Scheduler.js
```

## 本章核心不变量

- 高优先级工作可以先完成，低优先级语义不能丢
- Root 的 pending/suspended/pinged/expired 状态必须保持一致
- Scheduler 决定“何时运行 callback”，Lane 决定“React 处理哪组更新”

---

## 先用白话理解：Lane 和 Scheduler 为什么同时存在

想象医院急诊：Lane（更新车道）像病历上的“紧急程度和所属批次”，它是 React Reconciler 对更新集合的表达；Scheduler（调度器）像负责安排“什么时候给医生一个时间片”的值班系统。

Lane 回答“哪些更新这轮应该算”，Scheduler 回答“这段 JS 工作何时获得执行机会”。它们相关，但不是同一个东西。

---

## 1. Lane 解决什么问题

React 需要同时处理：

```text
输入框紧急更新
点击
普通 setState
Transition 大列表
Suspense retry
Idle 工作
```

如果所有更新只有“有/无”，无法表达优先级与批次。

Lane 使用 bitmask 表示一组更新优先级。

概念化：

```text
00000001  SyncLane
00000100  某种高优先级
00100000  TransitionLane
...
```

多个 lane 可以 OR：

```text
pendingLanes = laneA | laneB
```

## 2. requestUpdateLane

setState 时首先要回答：

> 这次更新属于哪个 lane？

影响因素包括：

```text
当前执行上下文
是否 transition
当前 event priority
并发模式
```

然后 Update 会携带：

```js
update.lane = lane
```

## 3. markRootUpdated

Fiber 上的更新最终要传播到 Root。

Root 维护：

```text
pendingLanes
suspendedLanes
pingedLanes
expiredLanes
entangledLanes...
```

这让调度不是针对单个组件，而是针对整个 Root 的待处理工作集合。

## 4. ensureRootIsScheduled

Root 有更新后需要确保存在合适的调度任务。

概念：

```text
取 next lanes
 ↓
判断优先级
 ↓
同步工作？
   → sync queue
并发工作？
   → Scheduler callback
```

## 5. Scheduler 和 React Lane 不是同一个系统

容易混淆：

### Lane

React Reconciler 内部的更新优先级/批次模型。

### Scheduler

更通用的 JS 任务调度器，帮助：

```text
按 priority 执行 callback
判断 shouldYield
让出主线程
```

关系：

```text
Lane 决定 React 这次应该处理哪些更新
Scheduler 帮助安排什么时候执行对应工作
```

## 6. Concurrent Rendering

“并发”不是 JS 多线程。

还是主线程，但 React 可以：

```text
做一部分 Render
↓
shouldYield
↓
把控制权还给宿主环境
↓
之后继续/重做
```

所以更准确是：

> 可中断、可调度的 Render。

## 7. startTransition

```js
startTransition(() => {
  setResults(nextResults)
})
```

不是：

```text
setTimeout
```

也不是：

```text
创建新线程
```

核心效果：

> 让 transition 内触发的更新获得 transition 语义/较低优先级，使更紧急更新可以抢先。

常见场景：

```text
输入框 value：紧急
搜索结果大列表：transition
```

用户输入保持响应，大列表允许稍后完成。

## 8. baseQueue 与 Lane 为什么必须结合理解

有队列：

```text
U1 Sync
U2 Transition
U3 Sync
```

本轮只 render Sync：

```text
执行 U1
跳过 U2
执行 U3（但为了未来重放需要保留正确基础）
```

因此 React 需要：

```text
baseState
baseQueue
```

来保证以后处理 U2 时结果仍一致。

如果你不懂这一点，就还没有真正懂 concurrent state queue。


## 9. React 19.3：Root Scheduler 才是现代调度主入口之一

很多 React 18 时代的教程会把下面这条链画得过于简单：

```text
scheduleUpdateOnFiber
→ ensureRootIsScheduled
→ Scheduler.scheduleCallback
```

在 v19.3.0 中，需要把 **Root Scheduler 的 microtask 层**单独画出来：

```text
setState / dispatch
  ↓
requestUpdateLane
  ↓
enqueue update
  ↓
scheduleUpdateOnFiber(root, fiber, lane)
  ↓
markRootUpdated(...)
  ↓
ensureRootIsScheduled(root)
  ↓
把 root 加入 scheduled-root 链表
  ↓
确保一次 microtask
  ↓
processRootScheduleInMicrotask
  ↓
scheduleTaskForRootDuringMicrotask(root, now)
  ↓
getNextLanes(root, ...)
  ↓
┌──────────────────────┬──────────────────────────┐
│ sync lanes           │ concurrent lanes         │
│ flush sync path      │ Scheduler callback       │
└──────────────────────┴──────────────────────────┘
```

关键文件：

```text
packages/react-reconciler/src/ReactFiberRootScheduler.js
```

这个变化非常值得理解，因为它揭示了一个更深的架构事实：

> **“收到更新”与“决定这一轮真正处理哪些 root / lanes”不是同一个时刻。**

`ensureRootIsScheduled` 的主要职责之一，是保证 Root 出现在 root schedule 中，并保证后续 microtask 会处理这份 schedule；它并不等于“立刻执行 React render”。

### 为什么要在 microtask 里统一处理 Root schedule？

概念上可以理解为：

```text
同一个 browser task 内
setA()
setB()
setC()
  ↓
都只是在声明“root 有工作”
  ↓
microtask checkpoint
  ↓
统一看这一批 root / lane 状态
  ↓
决定 sync / concurrent work
```

这和 Automatic Batching 的整体设计方向高度一致：**先收集更新，再以 Root 为单位决定工作。**

> 注意：不要把这句话简化成“React 就是用 microtask 实现 batching”。Automatic Batching 是完整更新/Root scheduling 体系的结果，microtask 是其中一个重要调度边界。

## 10. Lane 的准确心智模型：不仅仅是 Priority

错误心智模型：

```text
Lane = 一个数字优先级
```

更准确：

```text
Lane = bitmask 中的一个工作身份
Lanes = 一组工作身份
```

Lane 同时参与：

```text
更新分组
优先级选择
Root pending 状态
suspend / ping
expiration
transition 语义
rebase
子树剪枝 childLanes
```

因此 Lane 更像一种 **“可组合的更新集合坐标系”**。

### Root 上最重要的集合

建立以下状态机：

```text
pendingLanes
  ├─ suspendedLanes    等待外部条件
  ├─ pingedLanes       suspend 后已被唤醒
  ├─ expiredLanes      等太久，需要提升处理
  └─ entangled/...     具有必须协调处理的关系
```

`getNextLanes` 的本质不是“找最大数字”，而是根据 Root 当前状态求：

> **此刻合法、最高价值、应该进入下一轮 render 的 lanes 集合。**

## 11. Event Priority → Lane → Scheduler Priority，不要混成一个概念

完整链要分三层：

```text
浏览器/React Event Priority
        ↓
requestUpdateLane / eventPriorityToLane
        ↓
React Lane(s)
        ↓
Root Scheduler 选择 next lanes
        ↓
映射为 Scheduler Priority
        ↓
Scheduler callback / shouldYield
```

这三个层级分别解决：

```text
Event Priority：这次交互有多紧急？
Lane：这批 React 更新属于哪组工作？
Scheduler Priority：宿主 JS callback 什么时候获得执行时间？
```

## 12. React 19.3 的 Transition：避免背旧的“所有 transition 都 entangle”结论

React 19.3 的 release notes 特别指出：**Transitions 现在可以独立渲染，不再把无关 transition 全部纠缠成一次共同完成的 render。**

因此学习 Transition 时，应该掌握稳定模型：

```text
startTransition
→ 建立 transition context
→ transition 内 update 获得 transition lane 语义
→ urgent update 可以先处理
→ transition 允许被中断/重启
```

而不要把某一版本具体的 lane entanglement 策略背成 React 永久设计。

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

**先独立作答：** 普通输入与 Transition 更新同时待处理，Lane、Root Scheduler、Scheduler 分别做什么？

**参考解析：** Lane 表示本轮选择的更新集合；Root Scheduler 选任务/时机；Scheduler 帮助安排可让出的回调。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
