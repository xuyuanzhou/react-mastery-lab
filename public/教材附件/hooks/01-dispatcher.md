# Hooks Dispatcher 与链表

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“为什么不能在普通回调里调用 useState？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 同一个 useState 如何区分挂载和更新？

公开的 useState 委托给当前 Dispatcher。渲染函数组件时，React 选择相应分派表；mount 阶段建立 Hook 链，update 阶段读取并复用对应状态。Hook 的身份来自调用顺序，而非变量名。

## 用一个例子建立直觉

```jsx
const [name, setName] = useState('Ada');
const inputRef = useRef(null);
// Fiber.memoizedState → Hook(name) → Hook(inputRef)
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [renderWithHooks](source:packages/react-reconciler/src/ReactFiberHooks.js#renderWithHooks) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**为什么不能在普通回调里调用 useState？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

常规 Hook 依赖当前正在渲染的函数组件与固定调用顺序。普通回调不是组件渲染上下文。应在顶层声明，再在回调里调用 setter。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[useState 与 UpdateQueue](02-state-queue.md)。
