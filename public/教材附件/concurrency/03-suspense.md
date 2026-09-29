# Suspense 与重试

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“为什么不要在 try/catch 中吞掉 use 的挂起信号？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 没有准备好的子树如何表达等待？

Suspense 边界为尚未准备好的子树提供 fallback。资源就绪会触发重试相关调度。现代 use 的内部路径使用不透明的 SuspenseException 控制流，并暂存真实 thenable；不要把它简化成所有情况都直接 throw Promise。

## 用一个例子建立直觉

```jsx
<Suspense fallback={<Loading />}>
  <Profile />
</Suspense>
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [getSuspendedThenable](source:packages/react-reconciler/src/ReactFiberThenable.js#getSuspendedThenable) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberThenable.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**为什么不要在 try/catch 中吞掉 use 的挂起信号？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

这会干扰 React 用于挂起与重试的控制流。按 use 与 Suspense 的 API 约束使用，把错误交给合适的错误边界。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[SSR、流式输出与 Hydration](../server/01-hydration.md)。
