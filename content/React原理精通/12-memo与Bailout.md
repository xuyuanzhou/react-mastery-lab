# 12. React.memo、useMemo、useCallback 与 Bailout

> 源码定位：点击 [beginWork](source:packages/react-reconciler/src/ReactFiberBeginWork.js#beginWork)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `Memoization` | 记忆化/缓存计算结果 |
| `beginWork` | 开始处理 Fiber |
| `Context` | 上下文 |
| `Ref` | 引用 |
| `React Compiler` | React 编译器 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 区分 memo/useMemo/useCallback 的缓存对象
- 能解释 bailout 为什么仍可能继续处理 childLanes
- 能在 Compiler 时代判断手工 memoization 是否还有必要

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberHooks.js
compiler/ 与 React Compiler 官方文档
```

## 本章核心不变量

- bailout 不能跳过子树中仍有当前 lanes 的工作
- referential equality 只是一种证明“可复用”的手段
- memoization 是性能语义，不应改变业务语义

---

## 1. 三者不是一个东西

```text
React.memo
  控制组件 Fiber 是否可以跳过 render

useMemo
  缓存某次 render 中的计算结果

useCallback
  缓存函数引用
```

## 2. memo 的核心

```jsx
const Child = memo(ChildImpl)
```

更新时 React 会比较：

```text
prevProps
nextProps
```

默认浅比较。

如果：

```text
props equal
ref equal
当前 Fiber 没有必须处理的 lane/context work
```

可能进入 bailout。

## 3. bailout 不等于什么都不做

重要：

> bailout 当前 Fiber 后，React 仍可能需要检查 childLanes。

情况：

```text
Parent props 没变
但孙组件自己有 state update
```

不能因为 Parent bailout 就把整个子树扔掉。

所以有：

```text
bailoutOnAlreadyFinishedWork
```

其逻辑会判断当前 render lanes 是否与 childLanes 相交。

## 4. useMemo

概念：

```js
Hook.memoizedState = [value, deps]
```

update：

```text
deps 相同
→ 返回旧 value

deps 不同
→ 调 factory
→ 保存 [newValue, newDeps]
```

## 5. useCallback

基本可以理解：

```text
useCallback(fn, deps)
≈ 缓存 fn 本身
```

Hook.memoizedState：

```text
[callback, deps]
```

## 6. 为什么无脑 useCallback 不是优化

useCallback 也有：

```text
Hook 管理
deps 比较
闭包
代码复杂度
```

只有当“稳定函数引用”有下游价值时才值得，例如：

```text
作为 memo child 的 prop
作为其他 Hook dependency
注册/注销要求引用稳定的外部 API
```

## 7. React Compiler 时代

现代 React Compiler 可以自动进行部分 memoization 类优化。

但这不意味着这些原理失效。

你仍要理解：

```text
identity
referential equality
render cost
bailout
dependency
```

因为这些是 React 数据流的基础，不只是手动性能 API 的技巧。

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

**先独立作答：** 给组件包 React.memo 后，为什么其自身 useState 更新仍会导致它 Render？

**参考解析：** memo 主要比较父层传入的 props；自身 state、context 等更新仍可使它有工作。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
