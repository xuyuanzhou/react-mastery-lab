# useRef、useMemo 与 useCallback

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“把 state 换成 ref 能避免所有重复渲染吗？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 持久引用和渲染状态有什么区别？

useRef 保存可变容器，修改 current 不会主动安排重新渲染。useMemo 缓存计算结果，useCallback 缓存函数引用；它们是优化工具，不应该承载保证正确性所必需的语义。

## 用一个例子建立直觉

```jsx
const inputRef = useRef(null);
const filtered = useMemo(() => items.filter(matches), [items, matches]);
const focus = useCallback(() => inputRef.current?.focus(), []);
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [updateMemo](source:packages/react-reconciler/src/ReactFiberHooks.js#updateMemo) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**把 state 换成 ref 能避免所有重复渲染吗？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

虽然改 ref 不触发渲染，但界面也不会自动反映新值。界面依赖的数据应该使用 React 状态或外部 store 的订阅机制。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[useReducer 与 Context](05-reducer-context.md)。
