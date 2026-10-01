# 30. lazy、Suspense 与代码分割

> 第四阶段 · 工程实践 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

React.lazy 可延迟加载组件模块，通常结合动态 import 与 Suspense fallback 展示加载期间的占位。lazy 解决的是组件代码加载问题，不会自动解决所有网络数据请求。Suspense 只能处理能够与 Suspense 集成的挂起来源；不要假设在普通 Effect 中 fetch 就能由它自动展示 fallback。

## 实例：把知识应用到组件

```jsx
import { lazy, Suspense, useState } from 'react';
const Settings = lazy(() => import('./Settings.jsx'));
export default function App() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(v => !v)}>设置</button>
    {open && <Suspense fallback={<p>页面加载中…</p>}>
      <Settings />
    </Suspense>}</>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

在组件渲染函数内部反复创建 lazy(import(...))，导致组件身份不稳定；把普通 Effect 请求误当作自动 Suspense 数据源。

## 动手练习

为一个不常访问的“关于”页面配置 lazy，并观察构建后的 JS chunk。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**Suspense 的 fallback 在这个示例中何时出现？**

延迟组件代码还没加载完成并发生挂起时。

## 官方文档与源码连接

- React 官方文档：[lazy、Suspense 与代码分割](https://react.dev/reference/react/lazy)。
- 固定版源码：[ReactFiberBeginWork.js](source:packages/react-reconciler/src/ReactFiberBeginWork.js)。
- 对照建议：正确性依靠自动化测试，而不只靠浏览器手动点击。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[31. 组件测试与行为验证](31-04-engineering-组件测试与行为验证.md)。
