# 14. useState：组件的记忆

> 第二阶段 · 组件与交互 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

useState 在组件中声明可随交互变化的状态，返回当前值与设置函数。调用 setter 会请求下一次渲染，而不是马上改变当前闭包里的变量。状态和组件在 UI 树中的位置相关，而不是跟函数变量名绑定；不同实例各自保存自己的状态。

## 实例：把知识应用到组件

```jsx
import { useState } from 'react';
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(value => value + 1)}>
    点击 {count} 次
  </button>;
}
export default function App() { return <><Counter /><Counter /></>; }
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

用普通局部变量存储计数，或直接写 count++；这些操作不会请求 React 正确重新渲染。

## 动手练习

让两个 Counter 支持各自重置，并验证它们的状态互不影响。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**useState 返回的两个值是什么？**

当前渲染的 State 快照和一个用于请求状态更新的 setter。

## 官方文档与源码连接

- React 官方文档：[useState：组件的记忆](https://react.dev/learn/state-a-components-memory)。
- 固定版源码：[ReactFiberHooks.js → mountState](source:packages/react-reconciler/src/ReactFiberHooks.js#mountState)。
- 对照建议：理解 State 后，继续研究快照与批量更新的常见陷阱。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[15. State 快照与批量更新](15-02-ui-State快照与批量更新.md)。
