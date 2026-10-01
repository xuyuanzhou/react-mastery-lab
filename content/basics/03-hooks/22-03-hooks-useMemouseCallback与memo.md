# 22. useMemo、useCallback 与 memo

> 第三阶段 · Hooks 与状态 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

useMemo 在依赖未变化时复用一次计算的结果；useCallback 复用函数引用；memo 可在 Props 相等时尝试跳过组件重新渲染。它们是性能优化手段，不保证业务正确性。先通过 Profiler 确认瓶颈，再评估是否需要缓存；简单计算通常不必包 useMemo。React Compiler 的可用性取决于项目构建配置，不能假定所有项目默认启用。

## 实例：把知识应用到组件

```jsx
import { memo, useMemo, useState } from 'react';
const List = memo(function List({ items }) {
  return <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
});
export default function App({ users }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => users.filter(u =>
    u.name.includes(query)), [users, query]);
  return <><input value={query} onChange={e => setQuery(e.target.value)} />
    <List items={filtered} /></>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

到处无条件加 useMemo/useCallback，或为了“缓存”把有副作用的代码写入 useMemo。

## 动手练习

用 React DevTools Profiler 测量大量列表筛选前后渲染耗时，再决定是否保留缓存。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**useMemo 能否替代必要的状态更新？**

不能。它是对计算结果的缓存，不是独立状态，也不是正确性的保障。

## 官方文档与源码连接

- React 官方文档：[useMemo、useCallback 与 memo](https://react.dev/reference/react/useMemo)。
- 固定版源码：[ReactFiberBeginWork.js](source:packages/react-reconciler/src/ReactFiberBeginWork.js)。
- 对照建议：当状态更新变得复杂时，可以使用 reducer 建模。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[23. useReducer 与状态机思维](23-03-hooks-useReducer与状态机思维.md)。
