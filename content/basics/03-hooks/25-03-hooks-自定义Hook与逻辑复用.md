# 25. 自定义 Hook 与逻辑复用

> 第三阶段 · Hooks 与状态 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

自定义 Hook 是以 use 开头的函数，可组合其他 Hooks 复用有状态的逻辑。两个组件分别调用同一个自定义 Hook，通常会拥有独立状态；它复用的是逻辑，不自动共享存储。Hook 应遵循顶层调用规则，参数设计应使依赖关系清晰，并负责清理内部订阅。

## 实例：把知识应用到组件

```jsx
import { useEffect, useState } from 'react';
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  return online;
}
export default function Status() { return <p>{useOnline() ? '在线' : '离线'}</p>; }
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

把普通工具函数随意命名为 useX，或误以为调用两次同一个 Hook 就会自动共享状态。

## 动手练习

封装 useLocalStorage(key, initialValue)，支持读取、更新和异常保护，并区分多个键。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**自定义 Hook 的状态在什么情况下共享？**

仅复用 Hook 不会共享；需要借助上层 State、Context 或外部存储来实现共享。

## 官方文档与源码连接

- React 官方文档：[自定义 Hook 与逻辑复用](https://react.dev/learn/reusing-logic-with-custom-hooks)。
- 固定版源码：[ReactFiberHooks.js → renderWithHooks](source:packages/react-reconciler/src/ReactFiberHooks.js#renderWithHooks)。
- 对照建议：最后梳理 Hooks 规则与开发环境检查机制。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[26. Hooks 规则与 StrictMode](26-03-hooks-Hooks规则与StrictMode.md)。
