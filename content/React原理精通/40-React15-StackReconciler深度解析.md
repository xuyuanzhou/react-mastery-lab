# 40. React 15 Stack Reconciler 深度解析

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
| `Lane` | 更新车道/优先级集合 |
| `Priority` | 优先级 |
| `Mount` | 挂载 |
| `Stack Reconciler` | 栈协调器 |
| `Call Stack` | 调用栈 |
<!-- TERMS-AUTO-END -->


> 这一章用于理解“为什么 Fiber 必须出现”。React 15 没有 Hooks；状态组件主要依赖 Class instance 和旧 reconciler。

## 1. 组件实例模型

```text
Class component
→ new Component(props)
→ instance.props / state
→ instance.render()
```

Function component 当时主要被视为无状态渲染函数，没有现代 Hooks 的 Fiber-linked state model。

## 2. Stack Reconciler 的核心限制

旧模型在大体上依赖同步递归调用：

```text
update A
  → update B
    → update D
  → update C
```

遍历进度隐含在 JavaScript call stack 中。要在任意组件之间暂停，然后以后恢复，就必须能显式保存“当前工作位置”和局部状态，而普通递归栈不适合作为 React 自己可控制的持久工作结构。

## 3. 生命周期与副作用

旧生命周期如 `componentWillMount`、`componentWillReceiveProps`、`componentWillUpdate` 容易让开发者把副作用放在“render 前”阶段。进入可重做 render 模型后，这种副作用就可能被执行多次，因此后来出现 `UNSAFE_` 标记和生命周期迁移。

## 4. 从 Stack 到 Fiber 的设计推导

如果我们提出需求：

```text
大更新可以分片
高优先级输入能先处理
未提交结果可以丢弃
已提交 UI 必须保持一致
```

就自然推导出：

```text
显式工作单元 Fiber
+ current/WIP 双树
+ priority/lane
+ render/commit 分离
```

## 5. 为什么 React 15 不可能“直接加 Hooks”就等于现代 React

Hooks 不只是 API。现代 Hook 系统与 `Fiber.memoizedState`、UpdateQueue、renderWithHooks、lane 调度、effect commit 紧密结合。React 15 缺少这套运行时基础。

## 自检

1. Stack Reconciler 最大限制是 Class 语法还是工作模型？
2. Fiber 为什么必须显式保存 parent/child/sibling？
3. 为什么旧 `componentWill*` 生命周期与可重做 render 冲突？
