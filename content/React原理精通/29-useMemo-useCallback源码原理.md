# 29. useMemo / useCallback：Render 缓存，而不是状态管理

> 源码定位：点击 [mountMemo](source:packages/react-reconciler/src/ReactFiberHooks.js#mountMemo)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `stale closure` | 过期闭包/陈旧闭包 |
| `Closure` | 闭包 |
| `Memoization` | 记忆化/缓存计算结果 |
| `Profiler` | 性能分析器 |
| `React Compiler` | React 编译器 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


源码锚点：[`ReactFiberHooks.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)

## 1. 核心模型

`useMemo` 的 Hook `memoizedState` 可以教学化理解为：

```text
[value, deps]
```

更新时：

```text
读取 old [value, deps]
  ↓
逐项 Object.is 比较 deps
  ↓
相同 → 返回旧 value
不同 → 执行 create()，存 [newValue, nextDeps]
```

`useCallback(fn, deps)` 本质上缓存的是函数引用：

```text
[fn, deps]
```

它不是“让函数不创建”，而是**让 React 在依赖不变时把上一次函数引用返还给你**。

## 2. 为什么不能把 useMemo 当语义保证

Memoization 是性能工具，而不是状态容器。业务正确性不应该依赖“这个值一定不会重新计算”。否则你的逻辑把优化层误当成了语义层。

## 3. React.memo + useCallback 的真实关系

```jsx
const Child = memo(function Child({ onClick }) { ... })
```

如果父组件每次：

```jsx
<Child onClick={() => save(id)} />
```

函数引用变化会让浅比较失败。

`useCallback` 只有在**下游真的利用引用稳定性**时才可能有价值，例如 memoized child 或 Effect dependency。

## 4. 成本模型

手工 memo 也有成本：

```text
保存缓存值
+ 保存 deps
+ 每次 render 比较 deps
+ 增加代码复杂度
+ 更容易制造 stale closure
```

因此优化过程应该是：Profiler 找热点 → 确定重渲染/计算成本 → 再选择 memo，而不是“函数都包 useCallback”。

## 5. React Compiler 时代

React Compiler 可以自动做大量基于依赖的 memoization。它并不让这些原理失效，反而要求你更理解“纯 render + 稳定数据流”为什么是编译器能优化的前提。

## 6. 自检

1. `useCallback(fn, deps)` 与 `useMemo(() => fn, deps)` 在模型上有什么关系？
2. 为什么 `useMemo` 不能用来保证对象“永远只创建一次”？
3. 什么时候 `useCallback` 反而可能降低可维护性而没有性能收益？

参考答案见答案册。

<!-- CHAPTER-CHECK-START -->
## 本章情境自检与参考解析

**先独立作答：** 依赖数组没变时 useMemo 可以复用什么？为何不能把它当成持久业务 state？

**参考解析：** 可复用上次 Render 的计算结果；它是性能缓存，业务正确性不应依赖缓存永不失效。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
