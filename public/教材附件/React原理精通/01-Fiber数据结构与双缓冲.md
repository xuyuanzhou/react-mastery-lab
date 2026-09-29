# 01. Fiber 数据结构与双缓冲

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Root Container` | 根容器 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Current Tree` | 当前已提交 Fiber 树 |
| `Double Buffering` | 双缓冲 |
| `alternate` | 双树对应指针 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `Key` | 列表身份键 |
| `Placement` | 插入标记 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能从 Fiber 字段反推它承担的运行时职责
- 能手画 current / workInProgress / alternate 的关系
- 能解释 flags、lanes、childLanes 为什么是局部增量更新的基础

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiber.js
packages/react-reconciler/src/ReactInternalTypes.js
packages/react-reconciler/src/ReactFiberRoot.js
```

## 本章核心不变量

- current 始终代表已提交树
- WIP 可以失败/重做而不能污染 current
- child/sibling/return 必须足以恢复 DFS 进度

---

## 先用白话理解：Fiber 到底是什么

如果你只写业务，可以先把 Fiber 想成 React 给“页面里的每个组件/节点”建立的一张**工作卡片**。卡片上记录：我是谁、我的父子兄弟是谁、上次 props/state 是什么、这次有没有更新、优先级多高、最终要不要改 DOM。

React 15 更像“一口气递归把整棵组件树算完”；Fiber 以后，React 把大任务拆成很多工作卡片，所以做完一张后可以知道下一张是谁，也有机会先处理更紧急的工作。

注意：Fiber **不是线程**，也不是浏览器 DOM；它是 React 运行时内部的数据结构和工作单元。

---

## 1. Fiber 是什么

Fiber 不是简单“虚拟 DOM 节点”。

一个 Fiber 同时表示：

```text
组件身份
+ 树关系
+ props/state
+ Hooks
+ 更新优先级
+ 副作用标记
+ 对应宿主节点
```

教学化结构：

```js
type Fiber = {
  tag,
  key,
  elementType,
  type,
  stateNode,

  return,
  child,
  sibling,
  index,

  pendingProps,
  memoizedProps,
  memoizedState,
  updateQueue,

  flags,
  subtreeFlags,

  lanes,
  childLanes,

  alternate
}
```

## 2. 三个树指针

### child

指向第一个子 Fiber。

### sibling

指向下一个兄弟 Fiber。

### return

指向父 Fiber。

例如：

```jsx
<App>
  <Header />
  <Main />
  <Footer />
</App>
```

内部关系：

```text
App.child = Header
Header.sibling = Main
Main.sibling = Footer

Header.return = App
Main.return = App
Footer.return = App
```

这使 React 可以在不依赖递归调用栈的情况下进行 DFS。

## 3. memoizedState 为什么非常重要

不同 Fiber tag 下含义不同。

对于 FunctionComponent：

```text
fiber.memoizedState
        ↓
      Hook1
        ↓
      Hook2
        ↓
      Hook3
```

对于 ClassComponent，状态模型不同。

这也是为什么你不能看到 `memoizedState` 就简单翻译成“组件 state”。

## 4. stateNode

对于不同 Fiber：

```text
HostComponent <div> → DOM Element
HostText             → Text Node
ClassComponent       → class instance
FunctionComponent    → 通常没有组件实例
HostRoot             → root container
```

## 5. alternate：双缓冲的连接

React 常见两棵 Fiber 树：

```text
Current Tree
   │
alternate
   │
WorkInProgress Tree
```

更新开始：

```text
current
  ↓
createWorkInProgress(current)
  ↓
workInProgress
```

Render 期间主要修改 WIP。

Commit 后：

```text
root.current = finishedWork
```

原 WIP 成为新的 current。

这和图形学里的 double buffering 很像：

```text
屏幕继续显示旧画面
后台准备下一帧
完成后整体交换
```

React 的意义是：

> Render 阶段可以在不破坏当前已提交 UI 的情况下构造下一版本。

## 6. flags / subtreeFlags

Render 阶段不会直接修改 DOM，而是标记：

```text
Placement
Update
ChildDeletion
Ref
Passive
Layout...
```

父 Fiber 还会汇总：

```text
subtreeFlags
```

Commit 阶段依赖这些标记快速定位真正需要执行副作用的节点。

## 7. lanes / childLanes

```text
lanes
```

表示当前 Fiber 自己有哪些待处理更新优先级。

```text
childLanes
```

表示子树有哪些待处理优先级。

这让 React 能够 bailout：

```text
当前 Fiber 自己不需要更新
且子树也没有当前 lane 的工作
→ 整棵子树可跳过
```

## 8. Fiber 为什么能暂停

不是 Fiber 对象本身“会暂停”，而是因为 React 把遍历进度显式保存在：

```text
workInProgress
child
sibling
return
```

而不是隐藏在 JS call stack。

于是：

```text
performUnitOfWork(A)
→ next = B

执行若干 Fiber 后
→ shouldYield()
→ 保存当前 workInProgress

稍后继续
```

这才是可中断 Render 的真正基础。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**
