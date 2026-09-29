# 25. React 性能工程：Profiler、Performance Tracks 与浏览器流水线

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Fiber` | 纤程/React 工作单元 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Scheduler` | 调度器 |
| `Transition` | 过渡更新 |
| `Bailout` | 跳过渲染/提前退出 |
| `Memoization` | 记忆化/缓存计算结果 |
| `Key` | 列表身份键 |
| `Context` | 上下文 |
| `Provider` | 上下文提供者 |
| `Consumer` | 上下文消费者 |
| `Ref` | 引用 |
| `Profiler` | 性能分析器 |
| `External Store` | 外部状态仓库 |
<!-- TERMS-AUTO-END -->


> **目标：从“猜优化”升级为“测量 → 分类 → 归因 → 验证”。**

## 1. 先分类，不要先加 memo

性能问题至少分四类：

```text
A. React Render CPU
B. Commit / DOM Mutation
C. Browser Style/Layout/Paint/Composite
D. Network/Server/Data waterfall
```

不同类别解决方案完全不同。

## 2. React Profiler 解决什么

Profiler 能回答：

```text
哪些组件 render 了？
本次 commit 花了多久？
为什么 render？
memo 是否真正跳过？
```

但它不完整显示浏览器 layout/paint 成本。

## 3. Browser Performance 面板

用于看：

```text
JS task
Style recalculation
Layout
Paint
Composite
Long Task
network timing
```

如果 React render 只有 3ms，但 Layout 80ms：

```text
加 useMemo 大概率方向错了
```

## 4. React Performance Tracks

React 19.2 引入 Performance Tracks，使 React/Scheduler 信息更直接进入性能时间线。

这让你可以关联：

```text
user interaction
→ React scheduled work
→ component/render work
→ browser rendering
```

源码理解应该和 profiling 证据互相验证。

## 5. 性能优化的因果树

### Render 次数太多

检查：

```text
state 放置位置
Context fan-out
props identity
external store selector
unnecessary effect setState
```

### 单次 Render 太慢

检查：

```text
昂贵 JS 计算
大列表
重复数据转换
组件粒度
Compiler/memoization
```

### Commit 太重

检查：

```text
大量 Host nodes 插入/删除
key 导致 remount
频繁 ref/layout effect
```

### Layout/Paint 太重

检查：

```text
DOM 规模
CSS selector/layout dependency
forced synchronous layout
复杂 paint
动画属性
```

## 6. memoization 的成本模型

任何 memo 都有：

```text
比较成本
缓存内存
代码复杂度
引用管理成本
```

收益成立条件：

```text
被避免的工作成本
× 避免频率
>
缓存/比较/复杂度成本
```

所以“全部 useCallback”不是工程策略。

## 7. Context 性能不是简单 useMemo(value)

Provider：

```jsx
<Ctx value={{a,b,c}}>
```

即使 useMemo 稳定对象，只要 a/b/c 中任一变化，所有依赖整个 Context 的 consumer 仍可能需要更新。

更结构性的解法：

```text
拆 Context
external store + selector
状态下沉/上移重构
server/client boundary 调整
```

## 8. 大列表

React 层：

```text
virtualization
stable key
bailout
transition/deferred value
```

浏览器层：

```text
DOM 数量
layout scope
contain/content-visibility（适用时）
```

不要只优化 Fiber 而留下十万个真实 DOM。

## 9. 一次性能实验模板

```text
问题：输入搜索框卡顿

Baseline:
React render 38ms
Layout 4ms

Hypothesis:
过滤 20k items 每次 urgent render 计算

Change:
把结果更新放 transition + memo/Compiler + virtualization

Result:
urgent input render 3ms
transition render 可中断
DOM 数量从 20k → 30

Conclusion:
瓶颈同时有 React CPU + DOM 规模
```

## 10. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么 React Profiler 不能代替 Browser Performance？
2. 为什么 useMemo 不能修复 Layout？
3. key 不稳定会怎样同时伤害 Render 与 Commit？
4. Compiler 自动 memo 后，为什么仍需要架构级性能设计？
