# 26. Hooks 规则与 StrictMode

> 第三阶段 · Hooks 与状态 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

普通 Hooks 必须在 React 函数组件或自定义 Hook 的顶层调用，不能放到循环、条件、嵌套函数和普通回调中；这样 React 才能按调用顺序关联每个 Hook 的状态。React 的特殊 use API 有其独立规则，不应与普通 Hooks 混淆。StrictMode 仅在开发阶段增加渲染、Effect 等检查，帮助提前发现不纯逻辑和清理问题。

## 实例：把知识应用到组件

```jsx
import { useState } from 'react';
function Panel({ enabled }) {
  const [count, setCount] = useState(0); // 始终位于顶层
  if (!enabled) return null; // Hook 调用之后再提前返回
  return <button onClick={() => setCount(n => n + 1)}>{count}</button>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

写 if (enabled) useState(0)，或在点击事件内部调用 useEffect；不同渲染的 Hook 顺序可能不一致。

## 动手练习

找出并修复一个把 useEffect 放进 if 分支的组件；在 StrictMode 下检查订阅是否清理。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么 React 依赖普通 Hook 的固定调用顺序？**

React 通过渲染过程中的 Hook 顺序关联和复用之前保存的 Hook 状态。

## 官方文档与源码连接

- React 官方文档：[Hooks 规则与 StrictMode](https://react.dev/reference/rules/rules-of-hooks)。
- 固定版源码：[ReactFiberHooks.js → renderWithHooks](source:packages/react-reconciler/src/ReactFiberHooks.js#renderWithHooks)。
- 对照建议：完成基础 Hooks 后，进入路由、请求和测试等工程实践。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[27. React Router 与页面导航](../04-engineering/27-04-engineering-ReactRouter与页面导航.md)。
