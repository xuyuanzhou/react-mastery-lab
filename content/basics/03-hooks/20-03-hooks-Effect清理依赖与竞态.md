# 20. Effect 清理、依赖与竞态

> 第三阶段 · Hooks 与状态 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

Effect 可以返回清理函数，用来取消订阅、清除定时器、撤销连接或处理过期请求。依赖数组不是可随意挑选的性能开关，应包含 Effect 使用的响应式依赖。开发模式的 StrictMode 会运行额外的 setup/cleanup 检查，从而暴露未正确清理的代码。异步请求还需避免过期响应覆盖新数据。

## 实例：把知识应用到组件

```jsx
import { useEffect, useState } from 'react';
function User({ id }) {
  const [name, setName] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/users/${id}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('请求失败'); return r.json(); })
      .then(data => setName(data.name))
      .catch(e => { if (e.name !== 'AbortError') console.error(e); });
    return () => controller.abort();
  }, [id]);
  return <p>{name}</p>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

忽略组件的 id 已变化而旧请求仍在进行；将空依赖当作“只执行一次”且忽略开发检查。

## 动手练习

实现搜索建议：快速切换 keyword 时取消上一请求，避免旧结果覆盖新结果。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**Effect 什么时候执行 cleanup？**

下一次相关 Effect 执行前和组件卸载时；开发模式还可能额外执行一次检查循环。

## 官方文档与源码连接

- React 官方文档：[Effect 清理、依赖与竞态](https://react.dev/learn/lifecycle-of-reactive-effects)。
- 固定版源码：[ReactFiberCommitWork.js](source:packages/react-reconciler/src/ReactFiberCommitWork.js)。
- 对照建议：接下来使用 ref 保存不会触发渲染的数据。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[21. useRef 与 DOM 引用](21-03-hooks-useRef与DOM引用.md)。
