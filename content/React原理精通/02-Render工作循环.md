# 02. Render 工作循环：beginWork / completeWork

> 源码定位：点击 [performUnitOfWork](source:packages/react-reconciler/src/ReactFiberWorkLoop.js#performUnitOfWork)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Current Tree` | 当前已提交 Fiber 树 |
| `alternate` | 双树对应指针 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `Flags` | 副作用标记 |
| `beginWork` | 开始处理 Fiber |
| `completeWork` | 完成 Fiber 工作 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能按 DFS 手工模拟 beginWork / completeWork
- 能解释同步与并发 work loop 的区别
- 能说明 bailout 与 replay 在工作循环中的位置

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberCompleteWork.js
```

## 本章核心不变量

- Render Phase 必须允许重放
- 每个 unit 完成后必须能找到下一个 child/sibling/parent
- 未完成树不得进入 Commit

---

## 先用白话理解：Render 工作循环在做什么

假设 UI 是一份待审批的“新页面方案”。Render Phase（渲染计算阶段）不是马上装修房子，而是在草稿纸上把每个房间应该变成什么样算出来；`beginWork` 像从父任务向子任务展开，`completeWork` 像子任务做完后逐层回收结果。

只有整份方案准备好后，React 才进入 Commit Phase（提交阶段）真正修改 DOM。正因为 Render 只是准备候选结果，它才有机会暂停、重做或丢弃。

---

## 1. Render 的真正含义

React Render 不是浏览器 Paint。

Render Phase 的目标：

> 构造或复用 WorkInProgress Fiber Tree，计算出“下一版 UI”以及需要在 Commit 执行的 flags。

## 2. workLoop

同步模式可以抽象为：

```js
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}
```

并发模式：

```js
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress)
  }
}
```

关键差异：

```text
Sync：一直做完
Concurrent：浏览器/调度器需要时可以让出
```

## 3. performUnitOfWork

核心思想：

```js
function performUnitOfWork(unit) {
  const current = unit.alternate
  const next = beginWork(current, unit, renderLanes)

  unit.memoizedProps = unit.pendingProps

  if (next === null) {
    completeUnitOfWork(unit)
  } else {
    workInProgress = next
  }
}
```

你要看懂三件事：

1. `beginWork` 尝试继续往 child 深入。
2. 没有 child 工作时进入 `completeUnitOfWork`。
3. DFS 的“向下”和“回溯”完全由 Fiber 指针控制。

## 4. beginWork

`beginWork` 会根据 Fiber.tag 分派：

```text
FunctionComponent
  → updateFunctionComponent

ClassComponent
  → updateClassComponent

HostRoot
  → updateHostRoot

HostComponent
  → updateHostComponent

MemoComponent
  → updateMemoComponent
```

函数组件主干：

```text
beginWork
 ↓
updateFunctionComponent
 ↓
renderWithHooks
 ↓
Component(props)
 ↓
得到 nextChildren
 ↓
reconcileChildren
```

这说明：

> 函数组件的“执行”发生在 Render Phase。

所以组件函数必须保持纯净。

## 5. completeUnitOfWork

当一个 Fiber 没有未处理 child：

```text
当前 Fiber complete
↓
如果有 sibling → 去 sibling
↓
否则 return 到 parent
↓
继续 complete parent
```

伪代码：

```js
function completeUnitOfWork(unit) {
  let completed = unit

  do {
    const current = completed.alternate
    const parent = completed.return

    completeWork(current, completed)

    const sibling = completed.sibling
    if (sibling !== null) {
      workInProgress = sibling
      return
    }

    completed = parent
    workInProgress = completed
  } while (completed !== null)
}
```

## 6. completeWork

对于 HostComponent，mount 时要准备真实 DOM：

```text
<div>
  ↓
createInstance
  ↓
append children
  ↓
保存到 fiber.stateNode
```

update 时则比较 props 并准备更新信息/flags。

## 7. 深度优先执行顺序

树：

```text
      A
    /   \
   B     C
  /
 D
```

大致执行：

```text
begin A
begin B
begin D
complete D
complete B
begin C
complete C
complete A
```

这张顺序一定要自己手画。

## 8. Render 为什么可以被丢弃

因为在 Commit 前：

```text
Current Tree 仍然代表已提交页面
WIP Tree 只是候选结果
```

如果高优先级更新插入，React 可以：

```text
暂停/放弃当前 WIP
重新用更合适 lanes render
```

所以不要在 Render 里执行不可重复的副作用。

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

**先独立作答：** 给 A 的子 B、兄弟 C 手算 begin/complete 顺序，并指出返回到父节点依赖哪个指针。

**参考解析：** DFS 先 begin A/B，B 无子后 complete B，再走 C，最后 complete A；return 指针负责回到父节点。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
