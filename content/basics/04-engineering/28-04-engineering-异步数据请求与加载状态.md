# 28. 异步数据请求与加载状态

> 第四阶段 · 工程实践 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

客户端请求需要明确区分加载、成功、空数据、失败与取消。对于需要缓存、预取、服务端渲染或避免瀑布请求的正式应用，应优先评估框架或专门的数据请求库。这里用原生 fetch 与 Effect 示范基础机制，检查响应状态并使用 AbortController 取消过期请求。

## 实例：把知识应用到组件

```jsx
import { useEffect, useState } from 'react';
function Post({ id }) {
  const [view, setView] = useState({ status: 'loading', data: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setView({ status: 'loading', data: null, error: '' });
    fetch(`/api/posts/${id}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(data => setView({ status: 'success', data, error: '' }))
      .catch(e => { if (e.name !== 'AbortError') setView({ status: 'error', data: null, error: e.message }); });
    return () => controller.abort();
  }, [id]);
  if (view.status === 'loading') return <p>加载中…</p>;
  if (view.status === 'error') return <p role="alert">{view.error}</p>;
  return <h3>{view.data?.title ?? '无内容'}</h3>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

把网络请求写在组件函数中每次渲染都执行，或没有判断 HTTP 错误和过期响应。

## 动手练习

增加请求重试按钮和空数据展示；切换 id 时验证旧请求不会覆盖新结果。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**什么情况下不建议手写 Effect 请求层？**

需要缓存、请求去重、服务端能力或复杂数据依赖时，框架/请求库通常更合适。

## 官方文档与源码连接

- React 官方文档：[异步数据请求与加载状态](https://react.dev/learn/you-might-not-need-an-effect)。
- 固定版源码：[ReactFiberCommitWork.js → commitPassiveMountEffects](source:packages/react-reconciler/src/ReactFiberCommitWork.js#commitPassiveMountEffects)。
- 源码阅读边界：`fetch` 与 `AbortController` 是浏览器 API；`commitPassiveMountEffects` 只用于观察 Effect 在提交后的处理，不是请求库。
- 对照建议：下一课给组件、Props、事件加上 TypeScript 类型。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[29. React 与 TypeScript](29-04-engineering-React与TypeScript.md)。
