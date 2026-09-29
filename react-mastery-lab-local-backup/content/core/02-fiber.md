# Fiber 与 current / WIP 双树

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“为什么不能在 render 中直接发送请求或修改外部变量？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 先用白话理解 Fiber

Fiber 像一张 UI 工作卡片，记录类型、状态、父子兄弟、更新通道和提交标记。current 指向当前已提交版本；workInProgress 用于准备下一次结果。alternate 连接两个对应节点。它不是完整 DOM 的复制。

## 用一个例子建立直觉

```jsx
// 教学简化结构，不是完整官方类型
const fiber = {
  child: null, sibling: null, return: null,
  alternate: null, memoizedState: null,
  lanes: 0, flags: 0
};
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 关键字段

| 字段 | 直觉 | 阅读时要问 |
| --- | --- | --- |
| child / sibling / return | 子、兄弟、父 | 下一步去哪一个节点？ |
| alternate | 对应工作副本 | 哪棵树是已提交状态？ |
| memoizedState | 状态入口 | 当前 Fiber 是哪种组件？ |
| lanes / childLanes | 本节点与子树工作 | 本次能否跳过？ |
| flags / subtreeFlags | 提交工作标记 | 哪些变化需要提交？ |

## 双缓冲不变量

未完成的 WIP 不能成为已提交界面的事实来源。被中断的 render 可以重做；真正面向外部系统的副作用需要放在受控制的提交或事件路径。两个 Fiber 可以共享某些数据结构，因此双缓冲不是对所有对象的深拷贝。

## 走进官方源码

点击 [createWorkInProgress](source:packages/react-reconciler/src/ReactFiber.js#createWorkInProgress) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiber.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**为什么不能在 render 中直接发送请求或修改外部变量？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

render 可能重做、暂停或被丢弃。外部副作用不能像计算结果一样撤回，应根据具体需求移到事件处理或提交后的同步逻辑中。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Render 工作循环](03-work-loop.md)。
