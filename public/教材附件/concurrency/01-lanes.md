# Lane 与 Root Scheduler

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“为何 ensureRootIsScheduled 不等于立即渲染？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 更新从入队到执行的桥梁

ensureRootIsScheduled 将 Root 纳入调度集合，并保证有微任务处理调度。在微任务阶段，scheduleTaskForRootDuringMicrotask 根据 lanes 等状态决定根的后续工作。Lane 和 Scheduler 优先级是相关但不同的概念。

## 用一个例子建立直觉

```jsx
// 概念路径（不是直接调用栈）
// update → mark root pending lanes
// ensureRootIsScheduled → microtask
// scheduleTaskForRootDuringMicrotask → 后续任务或同步处理
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [scheduleTaskForRootDuringMicrotask](source:packages/react-reconciler/src/ReactFiberRootScheduler.js#scheduleTaskForRootDuringMicrotask) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberRootScheduler.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**为何 ensureRootIsScheduled 不等于立即渲染？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

它首先确保调度会发生；实际任务选择和执行时机还依赖当前根的可运行更新、执行上下文和优先级。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Transition 与可中断渲染](02-transition.md)。
