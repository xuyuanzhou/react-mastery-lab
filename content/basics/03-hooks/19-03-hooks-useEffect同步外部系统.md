# 19. useEffect：同步外部系统

> 第三阶段 · Hooks 与状态 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

Effect 用于让组件和 React 之外的系统同步，例如订阅、计时器、浏览器 API、外部网络连接。它在提交后执行，不是从 Props 计算派生数据的首选工具。依赖数组中的响应式值变化时，React 会先按需要清理前一次 Effect，再执行新的 Effect。每个 Effect 尽量承担单一同步目的。

## 实例：把知识应用到组件

```jsx
import { useEffect, useState } from 'react';
export default function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <time>{now.toLocaleTimeString()}</time>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

使用 Effect 计算可以在渲染期间直接求出的 total，或漏写实际依赖导致旧值。

## 动手练习

写一个在线状态指示器，监听 online/offline 浏览器事件，并在卸载时解除订阅。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么不建议把所有业务逻辑都放进 Effect？**

Effect 的职责是外部同步；派生数据和用户触发逻辑通常在渲染或事件处理里更直接。

## 官方文档与源码连接

- React 官方文档：[useEffect：同步外部系统](https://react.dev/learn/synchronizing-with-effects)。
- 固定版源码：[ReactFiberCommitWork.js → commitPassiveMountEffects](source:packages/react-reconciler/src/ReactFiberCommitWork.js#commitPassiveMountEffects)。
- 对照建议：Effect 的正确性离不开对清理和依赖的理解。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[20. Effect 清理、依赖与竞态](20-03-hooks-Effect清理依赖与竞态.md)。
