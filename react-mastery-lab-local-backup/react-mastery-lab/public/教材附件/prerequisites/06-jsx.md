# JSX、模块与 AST

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“React Element 和 Fiber 是同一种东西吗？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## JSX 如何进入 React？

JSX 是语法，不是字符串模板。编译器把它变成创建 React Element 的调用。Element 描述 UI；Fiber 保存协调过程中的工作状态；真实 DOM 由宿主渲染器管理。

## 用一个例子建立直觉

```jsx
// JSX
const view = <button disabled>Save</button>;
// 自动 JSX runtime 的概念等价形式
const view2 = jsx('button', { disabled: true, children: 'Save' });
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [jsxProd](source:packages/react/src/jsx/ReactJSXElement.js#jsxProd) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react/src/jsx/ReactJSXElement.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**React Element 和 Fiber 是同一种东西吗？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

不是。Element 更接近描述数据，Fiber 带有状态、树指针、优先级和副作用标记，用于多轮渲染之间维护工作。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Flow 与源码调试](07-flow.md)。
