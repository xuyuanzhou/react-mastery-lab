# Profiler、Compiler 与优化

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“actualDuration 就是用户看到页面需要的总时间吗？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 先量测瓶颈，再选择手段

性能问题可能来自大量组件计算、DOM 工作、布局或网络。Profiler 观察 React 渲染耗时，浏览器性能工具观察整个帧。Compiler 自动化部分记忆化，但不能把不纯的组件变成正确程序，也不能消除所有外部瓶颈。

## 用一个例子建立直觉

```jsx
<Profiler id="SearchResults" onRender={(id, phase, actualDuration) => {
  console.log(id, phase, actualDuration);
}}>
  <SearchResults />
</Profiler>
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [ReactProfilerTimer.js](source:packages/react-reconciler/src/ReactProfilerTimer.js#L1) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactProfilerTimer.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**actualDuration 就是用户看到页面需要的总时间吗？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

不是。它反映特定 React 渲染子树的计算耗时，不涵盖所有网络、浏览器布局、绘制与排队时间。必须结合完整时间线判断。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[源码实验：预测、操作与验证](../labs/01-lab-guide.md)。
