# Lab 10：React Compiler 与 Profiling

## 目标

从“到处手写 useMemo/useCallback”转向基于证据的性能工程。

## 实验 A：手工 memo

构造：

```text
高频父组件 render
+ 昂贵 child
+ object/function props
```

用 Profiler 分别测：

```text
无 memo
React.memo
useCallback/useMemo
```

记录总 render 次数、actual duration、交互延迟。

## 实验 B：Compiler

在支持 Compiler 的项目中，移除部分手工 memo，比较编译前后生成代码与 Profiler 结果。

## 必须回答

1. `memo` 优化的是哪类工作？
2. 它不能消除哪些浏览器 Layout/Paint 成本？
3. 手工 memo 的比较成本、内存成本、复杂度成本是什么？
4. Compiler 的核心不是“自动插 useMemo”，而是静态分析并安全地推导可复用边界，这两者为什么不同？
