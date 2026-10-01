# 15. State 快照与批量更新

> 第二阶段 · 组件与交互 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

每次渲染都有自己的 State 快照。一个事件处理函数读取的是它被创建时对应的快照，多次 setCount(count + 1) 可能提交相同目标值。依赖前一个值的计算应使用函数式更新 setCount(n => n + 1)。React 会在适当边界批量处理更新；不应假设 setter 后立即获得新值。

## 实例：把知识应用到组件

```jsx
import { useState } from 'react';
export default function Triple() {
  const [count, setCount] = useState(0);
  function addThree() {
    setCount(n => n + 1);
    setCount(n => n + 1);
    setCount(n => n + 1);
  }
  return <button onClick={addThree}>{count}，加 3</button>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

在一次点击中连续写三次 setCount(count + 1) 并期待加 3，或 setter 后立即 console.log(count) 期待新值。

## 动手练习

分别使用直接值和函数式更新实现“三连加”，记录两者的最终结果并解释。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**函数式更新中的 n 是哪里来的？**

它来自 React 顺序处理更新队列时计算得到的前一状态。

## 官方文档与源码连接

- React 官方文档：[State 快照与批量更新](https://react.dev/learn/queueing-a-series-of-state-updates)。
- 固定版源码：[ReactFiberHooks.js](source:packages/react-reconciler/src/ReactFiberHooks.js)。
- 对照建议：下一课将同样的思想用到对象与数组。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[16. 不可变更新对象与数组](16-02-ui-不可变更新对象与数组.md)。
