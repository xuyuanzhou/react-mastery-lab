# 34. 综合实战：从 Todo 到源码阅读

> 第四阶段 · 工程实践 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

用一个 Todo 应用串联组件拆分、Props、State、受控输入、不可变更新、列表 key、状态提升、自定义 Hook 与测试。推荐先列出界面状态，再确定每份 State 的拥有者，最后加入持久化与性能分析。实现完成后，沿着本项目右侧源码面板观察 useState、子节点协调与 Commit，把“怎么用”连接到“为什么这样工作”。

## 实例：把知识应用到组件

```jsx
import { useState } from 'react';
export default function TodoApp() {
  const [text, setText] = useState('');
  const [tasks, setTasks] = useState([]);
  function add() {
    if (!text.trim()) return;
    setTasks(items => [...items, { id: crypto.randomUUID(), text, done: false }]);
    setText('');
  }
  return <><input value={text} onChange={e => setText(e.target.value)} />
    <button onClick={add}>添加</button>
    <ul>{tasks.map(task => <li key={task.id}>{task.text}</li>)}</ul></>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

一次性把路由、后端、复杂状态库全部加入，反而失去对最基础的渲染与状态变化的观察。

## 动手练习

先实现新增/删除/完成/筛选，再用自定义 Hook 处理 localStorage；编写 3 个行为测试，最后对照源码解释一次新增任务的更新链路。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**这一练习如何连接源码学习？**

点击添加会产生 State 更新、触发渲染、协调带 key 的子节点，并最终在 Commit 阶段修改 DOM。

## 官方文档与源码连接

- React 官方文档：[综合实战：从 Todo 到源码阅读](https://react.dev/learn/thinking-in-react)。
- 固定版源码：[ReactFiberWorkLoop.js](source:packages/react-reconciler/src/ReactFiberWorkLoop.js)。
- 对照建议：下一阶段建议阅读“学习起点”，再依次进入 Fiber、Hooks、调度与并发。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续学习：[React 原理精通主线](../../React原理精通/00P-学习者起点与前置知识总览.md)。
