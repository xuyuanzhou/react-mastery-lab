# 21. useRef 与 DOM 引用

> 第三阶段 · Hooks 与状态 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

useRef 返回稳定的对象，current 字段可跨渲染保存值但修改它不会触发重新渲染。它适合保存 DOM 节点、计时器句柄和命令式外部对象，不适合作为需要展示的界面状态。DOM ref 通常在提交后才可使用；操作 DOM 应尽量局限于焦点、滚动、播放等命令式需求。

## 实例：把知识应用到组件

```jsx
import { useRef } from 'react';
export default function Search() {
  const inputRef = useRef(null);
  return <><input ref={inputRef} />
    <button onClick={() => inputRef.current?.focus()}>聚焦</button></>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

修改 ref.current 后期待界面自动更新；在初次渲染期间直接读取尚未挂载的 DOM。

## 动手练习

实现一个音视频控制器，使用 ref 调用播放/暂停，并用 State 渲染播放状态。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**什么时候选 useState，什么时候选 useRef？**

会影响可见 UI 且需要重新渲染的值用 State；命令式句柄或不参与渲染的值用 Ref。

## 官方文档与源码连接

- React 官方文档：[useRef 与 DOM 引用](https://react.dev/learn/referencing-values-with-refs)。
- 固定版源码：[ReactFiberHooks.js](source:packages/react-reconciler/src/ReactFiberHooks.js)。
- 对照建议：理解 Ref 后，再评估 memo 相关性能工具。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[22. useMemo、useCallback 与 memo](22-03-hooks-useMemouseCallback与memo.md)。
