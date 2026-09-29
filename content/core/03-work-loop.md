# Render 工作循环

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“函数组件里一个很长的同步循环能被 React 自动切开吗？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 如何在树上分解工作？

beginWork 处理当前 Fiber 并向子树推进；没有子节点可继续时进入 completeWork，然后寻找兄弟或回到父节点。这样的迭代遍历把隐式调用栈中的工作显式保存到 Fiber 中。并发能力不是把组件函数执行到一半切开。

## 用一个例子建立直觉

```jsx
// 教学示意，省略异常、优先级和中断
let next = beginWork(current, unit, lanes);
if (next === null) completeUnitOfWork(unit);
else workInProgress = next;
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [performUnitOfWork](source:packages/react-reconciler/src/ReactFiberWorkLoop.js#performUnitOfWork) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**函数组件里一个很长的同步循环能被 React 自动切开吗？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

不能把任意 JavaScript 函数中间抢占掉。React 在它掌控的工作边界让出执行权；单个组件中的长同步计算仍可能阻塞。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Render 与 Commit 的边界](04-commit.md)。
