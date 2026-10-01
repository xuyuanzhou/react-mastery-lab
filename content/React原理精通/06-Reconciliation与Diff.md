# 06. Reconciliation 与 Diff

> 源码定位：点击 [reconcileChildFibers](source:packages/react-reconciler/src/ReactChildFiber.js#reconcileChildFibers)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。
> 学完即练：[对应实验](labs/04-Key-Diff与state-identity.md)。先写预测，再观察源码和结果。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `Diff` | 差异比较 |
| `Key` | 列表身份键 |
| `Placement` | 插入标记 |
| `Flags` | 副作用标记 |
| `beginWork` | 开始处理 Fiber |
| `Context` | 上下文 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 把 reconciliation 理解为身份匹配而非“虚拟 DOM 比真实 DOM 快”
- 能手算 keyed array diff
- 能解释 type/key/position 如何决定 state 保留

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactChildFiber.js
packages/react-reconciler/src/ReactFiberBeginWork.js
```

## 本章核心不变量

- 相同身份才能安全复用 Fiber/state
- 移动/插入由新旧索引和 lastPlacedIndex 决定
- 算法追求可预测 O(n) 启发式而不是理论最小编辑距离

---

## 先用白话理解：Diff 真正在解决什么

每次组件执行都会得到一份新的 UI 描述。React 必须判断：新描述里的这个 `Item`，是不是上一次那个 `Item`？如果是，就尽量复用原来的 Fiber/state/DOM；如果不是，就卸载旧身份并创建新身份。

因此 Reconciliation（协调）的核心首先是 **identity（身份匹配）**，其次才是“怎么少改 DOM”。`key` 的真正作用也是帮助 React 识别列表中的身份。

---

## 1. Reconciliation 是什么

React 不直接“比较 DOM”。

它比较的是：

```text
旧 Fiber 子树
vs
新 React Elements
```

目标：

```text
尽可能复用旧 Fiber / DOM
并标记新增、移动、删除、更新
```

## 2. 单节点复用的核心

简化规则：

```text
key 相同
  ↓
再比较 type
  ↓
type 也相同 → 复用
type 不同 → 删除旧节点，创建新节点
```

因此 identity 更接近：

```text
(position, key, type)
```

而不是“组件函数名字”。

## 3. key 的真正意义

错误理解：

> key 只是为了消除 warning。

正确理解：

> key 是同级 child identity 的一部分。

例如：

```jsx
<User key={userId} />
```

userId 改变：

```text
旧 Fiber identity 失效
 ↓
卸载旧组件
 ↓
创建新 Fiber
 ↓
Hook state 被重置
```

## 4. reconcileChildrenArray

数组 Diff 是重点。

可以粗略分几步：

1. 从头按位置快速比较
2. 某处不匹配后建立旧 Fiber map
3. 用 key/index 查找可复用节点
4. 计算移动
5. 删除剩余旧节点

## 5. lastPlacedIndex

这是理解“移动”的关键。

旧列表：

```text
A(index 0)
B(index 1)
C(index 2)
D(index 3)
```

新列表：

```text
B
A
D
C
```

React 会维护：

```text
lastPlacedIndex
```

如果复用到的旧 Fiber.index：

```text
oldIndex < lastPlacedIndex
```

说明这个节点相对顺序发生倒退，需要 Placement（移动）。

## 6. 为什么 index key 有风险

旧：

```text
0:A
1:B
2:C
```

头部插 X：

```text
0:X
1:A
2:B
3:C
```

如果 key=index，React 会误把：

```text
旧 key=0 A
复用给
新 key=0 X
```

组件 state 可能跟着位置走，而不是跟着业务实体走。

## 7. Diff 不是“求理论最小编辑距离”

React 采用启发式 O(n) 策略，而不是通用树编辑距离。

原因：

```text
UI 更新频繁
理论最优算法代价太高
现实 UI 有 key/type 等强先验信息
```

## 8. bailout

如果：

```text
props 没变
state 没变
当前 lanes 不包含工作
子树 childLanes 也没当前工作
```

React 可以跳过某些 Fiber。

`React.memo` 只是 bailout 的一个入口，不代表“组件永远不会 render”。

Context、内部 state、lane 等仍可能要求更新。

## 9. 重点源码函数

```text
reconcileChildFibers
reconcileSingleElement
reconcileSingleTextNode
reconcileChildrenArray
updateSlot
updateFromMap
placeChild
deleteChild
deleteRemainingChildren
```

读 Diff 时不要先看所有分支。

建议只用：

```jsx
<ul>
  {items.map(x => <Item key={x.id} />)}
</ul>
```

然后只调：

```text
A B C
→
B A D
```

手工记录每个 Fiber 的：

```text
key
index
oldIndex
flags
sibling
```

这是最快掌握的方法。

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

**先独立作答：** 旧列表 [A,B,C] 变 [C,A,B] 且 key 稳定，哪些 state 能保留？为何不能只看新下标？

**参考解析：** 三项均可按 type/key 复用状态；下标变化影响移动标记，不等于身份变化。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
