# Event Loop 与微任务

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“为何 Root 的调度决策可以推迟到微任务？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 同步代码、微任务和绘制有什么关系？

JavaScript 一次任务通常执行到调用栈清空。浏览器会在适当检查点清空微任务，再在渲染机会更新画面。不是每个任务后都绘制；很长的任务或不断追加的微任务都可能阻塞交互。

## 用一个例子建立直觉

```jsx
console.log('A');
queueMicrotask(() => console.log('B'));
setTimeout(() => console.log('C'), 0);
console.log('D'); // 输出 A、D、B、C
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [ensureRootIsScheduled](source:packages/react-reconciler/src/ReactFiberRootScheduler.js#ensureRootIsScheduled) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberRootScheduler.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**为何 Root 的调度决策可以推迟到微任务？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

可以在同步代码执行完后汇总多个根上的更新，再根据各根的 lanes 决定后续工作；入队不等于立刻执行整个渲染。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[DOM、CSSOM 与浏览器渲染](05-browser.md)。
