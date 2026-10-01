# 22. Reconciler 与 Renderer：Host Config、自定义 Renderer、React DOM 边界

> 源码定位：点击 [completeWork](source:packages/react-reconciler/src/ReactFiberCompleteWork.js#completeWork)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。
> 学完即练：[对应实验](labs/09-CustomRenderer.md)。先写预测，再观察源码和结果。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Host Instance` | 宿主实例/真实平台节点 |
| `Host Config` | 宿主配置/渲染器平台适配层 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Update Queue` | 更新队列 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Transition` | 过渡更新 |
| `Diff` | 差异比较 |
| `Placement` | 插入标记 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 这是“架构师级 React”必须掌握的一章。

## 本章掌握标准

你要能回答：

```text
React Reconciler 为什么可以不依赖 DOM？
HostComponent 的 DOM 在哪里创建？
Commit 如何调用平台 API？
React DOM 与 React Native 为什么能共享 Fiber？
```

## 源码锚点

```text
packages/react-reconciler/src/ReactFiberCompleteWork.js
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react-reconciler/src/ReactFiberHostConfig.js
packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js
packages/react-reconciler/README.md
```

## 1. React 的平台无关核心

Reconciler 关心：

```text
Element identity
Fiber tree
state/update queues
lanes
render/commit traversal
```

它不应该硬编码：

```js
document.createElement
node.appendChild
```

## 2. Host Config 是依赖倒置

从架构模式看：

```text
Reconciler = policy / algorithm
Host Config = platform capability interface
```

Reconciler 调用抽象能力：

```text
createInstance
createTextInstance
appendInitialChild
prepareUpdate / commitUpdate
removeChild
hideInstance / unhideInstance
scheduleTimeout...
```

具体 Renderer 提供实现。

## 3. Complete Phase 为什么适合创建 Host Instance

初次 mount：

```text
beginWork
→ 确定 children

completeWork HostComponent
→ children 已完成
→ createInstance
→ append children
→ stateNode = host instance
```

这形成 bottom-up 构建。

## 4. Render 创建 Host Instance，为什么不等于修改屏幕？

React DOM 在 mount 期间可以先创建离线 DOM node：

```text
createElement
set initial props
append child to detached parent
```

真正把 subtree 插入已连接 DOM 通常仍由 Commit Placement 完成。

因此：

```text
create host object ≠ user-visible mutation
```

## 5. Mutation Mode / Persistence Mode

不同 Renderer 可以有不同 host 更新策略。

常见 DOM renderer 是 mutation style：

```text
对已有 host tree 执行 insert/update/remove
```

某些 renderer 理论上可采用 persistence：

```text
构造新 host child set
→ replace container children
```

这体现 Reconciler 与宿主策略的解耦。

## 6. 自定义 Renderer 的学习价值

`react-reconciler` 包的 API 是实验性的，但实现一个教学 renderer 很有价值。

例如目标宿主：

```text
Canvas scene graph
terminal tree
JSON object tree
custom game UI
```

你会被迫区分：

```text
Fiber ≠ Host Node
Reconciliation ≠ DOM Diff
Commit ≠ Browser Paint
```

## 7. DOM Renderer 还负责什么

React DOM 不只 Host Config：

```text
property setting
styles
controlled inputs
selection
focus
hydration matching
events
resource hints
form actions
view transitions
Trusted Types integration
```

所以“ReactDOM 就是 appendChild adapter”也过度简化。

## 8. 实验：做一个 JSON Renderer

目标 API：

```jsx
<box width={100}>
  <text>Hello</text>
</box>
```

Commit 后得到：

```js
{
  type: 'box',
  props: { width: 100 },
  children: [{ type: 'text', children: ['Hello'] }]
}
```

实现：

```text
createInstance
createTextInstance
appendInitialChild
appendChild
removeChild
commitUpdate
```

不需要浏览器，就能验证 Reconciler 的平台无关性。

## 9. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么 HostComponent Fiber.stateNode 对 DOM renderer 是 DOM node，而 FunctionComponent 不是？
2. completeWork 中创建 DOM 为什么仍可以属于 Render Phase？
3. Host Config 从软件架构角度属于什么设计思想？
4. 为什么学自定义 Renderer 能纠正“Virtual DOM = DOM wrapper”的错误理解？

<!-- CHAPTER-CHECK-START -->
## 本章情境自检与参考解析

**先独立作答：** JSON Renderer 与 React DOM 共享哪些层，必须替换哪一层？

**参考解析：** 可共享 React Element、Reconciler、Fiber/Hook/调度思想；Host Config 决定宿主节点创建、更新、插入和删除。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
