# 链表、树与队列

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“为什么在条件分支里调用 useState 会错位？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 对象之间如何组织成一条链？

链表节点保存数据和 next 引用。React 的常规 Hook 按调用顺序连接；Fiber 用 child、sibling、return 表达树。环形队列的尾节点.next 指向头节点，因此只保存尾节点也能找到两端。

## 用一个例子建立直觉

```jsx
const first = { state: 0, next: null };
const second = { state: 'hello', next: null };
first.next = second;
// 从 first 出发，每次沿 next 前进一步。
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [mountWorkInProgressHook](source:packages/react-reconciler/src/ReactFiberHooks.js#mountWorkInProgressHook) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**为什么在条件分支里调用 useState 会错位？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

更新时 React 依次读取已有 Hook 节点；少调用一个，后续调用就会读到错误节点。use API 具有不同规则，不要把所有带 use 的 API 一概而论。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[位运算与集合](03-bitmask.md)。
