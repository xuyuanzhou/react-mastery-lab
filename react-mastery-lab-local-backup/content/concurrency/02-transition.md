# Transition 与可中断渲染

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“Transition 会缩短算法本身的执行时间吗？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 让输入响应和昂贵结果更新分开

Transition 标记一类可被更紧急工作打断的更新。它不会让你的回调在后台线程执行。输入框本身的控制状态通常保持紧急，昂贵的派生结果可使用 Transition 或 deferred value。

## 用一个例子建立直觉

```jsx
const [text, setText] = useState('');
const deferredText = useDeferredValue(text);
// 输入使用 text，昂贵列表使用 deferredText。
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [startTransition](source:packages/react-reconciler/src/ReactFiberHooks.js#startTransition) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**Transition 会缩短算法本身的执行时间吗？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

不会。它改变安排工作的方式和可中断边界。仍需避免单个组件中无法让出的超长计算，并对昂贵算法做真实优化。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Suspense 与重试](03-suspense.md)。
