# 24. Context 与跨层级共享

> 第三阶段 · Hooks 与状态 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

Context 允许祖先组件向后代提供数据，无需在每一层手动转发 Props。常见用途是主题、语言和当前用户等跨层级环境信息。Context 值变化会影响读取该 Context 的消费者，不能把它当作天然不会触发渲染的全局缓存。React 19 支持直接使用 Context 作为 Provider，旧的 .Provider 形式仍可阅读。

## 实例：把知识应用到组件

```jsx
import { createContext, useContext, useState } from 'react';
const ThemeContext = createContext('light');
function Label() { return <p>主题：{useContext(ThemeContext)}</p>; }
export default function App() {
  const [theme, setTheme] = useState('light');
  return <ThemeContext.Provider value={theme}>
    <Label /><button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      切换主题</button>
  </ThemeContext.Provider>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

把所有局部状态都提升为 Context，或每次渲染都提供不必要的新对象引用而引发大范围更新。

## 动手练习

实现多级组件主题切换，并将主题读取封装成 useTheme 自定义 Hook。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**Context 是否替代所有 Props？**

不是。组件局部依赖仍建议使用 Props；跨多层共享数据时 Context 更合适。

## 官方文档与源码连接

- React 官方文档：[Context 与跨层级共享](https://react.dev/learn/passing-data-deeply-with-context)。
- 固定版源码：[ReactFiberNewContext.js → readContext](source:packages/react-reconciler/src/ReactFiberNewContext.js#readContext)。
- 对照建议：下节把重复的状态与 Effect 逻辑提取到自定义 Hook。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[25. 自定义 Hook 与逻辑复用](25-03-hooks-自定义Hook与逻辑复用.md)。
