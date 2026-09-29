# 外部 Store 与 Tearing

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“getSnapshot 为什么不能每次返回一个全新对象？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 多处读取为什么可能看到不同版本？

外部 store 可以独立于 React 改变。在并发渲染中，如果不同组件读取了不同快照，界面可能不一致。useSyncExternalStore 提供订阅与快照协议，帮助 React 检测并协调这种变化。

## 用一个例子建立直觉

```jsx
const value = useSyncExternalStore(
  store.subscribe,
  store.getSnapshot,
  store.getServerSnapshot
);
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [mountSyncExternalStore](source:packages/react-reconciler/src/ReactFiberHooks.js#mountSyncExternalStore) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**getSnapshot 为什么不能每次返回一个全新对象？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

无变化时快照需要保持稳定。每次产生新引用会被认为发生变化，可能造成不断重渲染；有变化时才生成新的不可变快照。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Profiler、Compiler 与优化](03-performance.md)。
