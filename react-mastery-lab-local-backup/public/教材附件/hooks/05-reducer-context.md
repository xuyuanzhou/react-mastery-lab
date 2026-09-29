# useReducer 与 Context

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“一个巨大的 Context 为什么容易带来多余工作？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 状态转换和数据传递分别解决什么？

useReducer 把状态转换集中到 reducer；Context 让后代读取上层提供的值，避免逐层传递。Context 值变化可以让消费者更新，memo 并不阻止组件收到它订阅的 context 更新。

## 用一个例子建立直觉

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 };
    default: return state;
  }
}
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [readContext](source:packages/react-reconciler/src/ReactFiberNewContext.js#readContext) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberNewContext.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**一个巨大的 Context 为什么容易带来多余工作？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

很多消费者依赖同一个值的身份。频繁创建新对象会扩大变化传播面；按变化频率和使用范围拆分、稳定必要引用并用测量验证。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Lane 与 Root Scheduler](../concurrency/01-lanes.md)。
