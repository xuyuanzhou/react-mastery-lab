# 33. 性能分析、渲染边界与 Compiler

> 第四阶段 · 工程实践 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

性能优化应基于测量：使用浏览器性能面板和 React DevTools Profiler 识别昂贵渲染。组件拆分、减少不必要的共享状态、稳定列表 key 和避免重复请求往往比盲目记忆化更有价值。React Compiler 可在符合配置和约束的项目中进行自动优化，但不能把它当作默认开启或替代性能测量的理由。

## 实例：把知识应用到组件

```jsx
import { Profiler } from 'react';
export default function Measured({ children }) {
  return <Profiler id="panel" onRender={(id, phase, actualDuration) => {
    console.log(id, phase, actualDuration);
  }}>{children}</Profiler>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

看到组件渲染就认为有性能问题，或为了消除所有渲染而牺牲正确性和代码复杂度。

## 动手练习

用 Profiler 对比“整页共享状态”和“状态靠近使用者”两种实现，记录渲染时间与触发范围。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么“减少重新渲染次数”不是唯一目标？**

最终目标是用户可感知的响应速度、正确性和维护成本，需要看实际瓶颈。

## 官方文档与源码连接

- React 官方文档：[性能分析、渲染边界与 Compiler](https://react.dev/learn/react-compiler/introduction)。
- 固定版源码：[ReactFiberBeginWork.js](source:packages/react-reconciler/src/ReactFiberBeginWork.js)。
- 对照建议：完成基础阶段后可以进入综合实战和源码主线。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[34. 综合实战：从 Todo 到源码阅读](34-04-engineering-综合实战从Todo到源码阅读.md)。
