# Diff、key 与 lastPlacedIndex

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“所有位置改变的节点都会被标记为移动吗？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 复用和移动是两个不同决定

同类型且 key 匹配可以复用，但复用节点仍可能需要移动。数组协调过程中，lastPlacedIndex 记录已处理复用节点的最大旧位置；落在其前面的旧节点可能被标记为 Placement。

## 用一个例子建立直觉

```jsx
// 旧序列: A B C
// 新序列: C A B
// C: oldIndex=2，lastPlacedIndex 变成 2
// A: oldIndex=0，需要移动
// B: oldIndex=1，需要移动
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [placeChild](source:packages/react-reconciler/src/ReactChildFiber.js#placeChild) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactChildFiber.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**所有位置改变的节点都会被标记为移动吗？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

不一定。上例 C 新位置变了，但算法可以通过把 A、B 移到它后面得到正确顺序。协调算法并不追求所有情况的全局最少操作。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Hooks Dispatcher 与链表](../hooks/01-dispatcher.md)。
