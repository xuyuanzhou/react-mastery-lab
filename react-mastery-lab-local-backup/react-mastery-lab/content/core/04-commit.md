# Render 与 Commit 的边界

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“能根据 render 日志数量判断 DOM 更新次数吗？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 什么时刻界面真正变化？

Render 计算新树并记录 flags，Commit 把完成的工作应用到 DOM 等宿主环境。mutation、layout 与 passive effect 属于不同处理步骤。不要把一次组件函数执行当成一次可见提交。

## 用一个例子建立直觉

```jsx
function Example() {
  console.log('render');
  useLayoutEffect(() => console.log('layout'));
  useEffect(() => console.log('passive'));
  return <div>Hello</div>;
}
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [commitRoot](source:packages/react-reconciler/src/ReactFiberWorkLoop.js#commitRoot) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**能根据 render 日志数量判断 DOM 更新次数吗？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

不能。开发模式检查、重试、并发中断都可能让 render 次数多于提交次数。结合 Profiler 与提交阶段观测。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Diff、key 与 lastPlacedIndex](05-diff.md)。
