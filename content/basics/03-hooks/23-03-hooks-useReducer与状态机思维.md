# 23. useReducer 与状态机思维

> 第三阶段 · Hooks 与状态 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

useReducer 将状态更新集中到纯 reducer 函数中，事件发出 action，reducer 返回新的状态。适用于多个相关状态或更新规则较多的场景。action 应表达发生了什么，而不是直接操作组件内部 DOM。reducer 必须纯净、不得直接修改原状态。

## 实例：把知识应用到组件

```jsx
import { useReducer } from 'react';
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + 1 };
    case 'reset': return { ...state, count: 0 };
    default: return state;
  }
}
export default function App() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return <><p>{state.count}</p>
    <button onClick={() => dispatch({ type: 'increment' })}>+1</button>
    <button onClick={() => dispatch({ type: 'reset' })}>重置</button></>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

在 reducer 内发网络请求，或直接写 state.count++ 并返回相同对象引用。

## 动手练习

为购物车设计 add/remove/changeQuantity 三种 action，确保 reducer 保持纯函数。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**reducer 和 dispatch 的职责如何分工？**

dispatch 提交发生的事件，reducer 根据旧状态与 action 计算新状态。

## 官方文档与源码连接

- React 官方文档：[useReducer 与状态机思维](https://react.dev/learn/extracting-state-logic-into-a-reducer)。
- 固定版源码：[ReactFiberHooks.js](source:packages/react-reconciler/src/ReactFiberHooks.js)。
- 对照建议：跨多层组件共享数据时，还需要理解 Context。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[24. Context 与跨层级共享](24-03-hooks-Context与跨层级共享.md)。
