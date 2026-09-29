# 参考答案与验收标准

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“如何检验 SSR / RSC 的回答不是背术语？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 用不变量检验答案

Fiber 遍历先尝试 child，子树完成后寻找 sibling，再沿 return 回溯。常规 Hook 以顺序匹配。低优先级更新被跳过后，需要保留它以及后续已执行更新的重放信息。C A B 例中 A、B 需要移动，C 更新 lastPlacedIndex。

## 用一个例子建立直觉

```jsx
// 队列答案：
// 初始 baseState = 1
// Sync 渲染：memoizedState = 2
// baseQueue = [+10(Transition), ×2(NoLane)]
// Transition 渲染：memoizedState = 22
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [ReactFlightServer.js](source:packages/react-server/src/ReactFlightServer.js#L1) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-server/src/ReactFlightServer.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**如何检验 SSR / RSC 的回答不是背术语？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

给出各自产物：SSR 输出 HTML；RSC 输出组件结果与客户端引用的协议数据；Hydration 在客户端对接已有 HTML 和组件逻辑。说明它们可以协作，而不是互相替代。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。
