# 04. 创建组件与导入导出

> 第一阶段 · React 入门 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

函数组件是一个以大写字母开头的 JavaScript 函数，它接收 Props 并返回 React 节点。组件应描述单一职责，通过 ES Module 进行导出与导入。一个文件可以声明多个组件，但复杂页面应根据职责拆分。组件不是手工调用的普通渲染函数，而是通过 JSX 交给 React 管理。

## 实例：把知识应用到组件

```jsx
// Avatar.jsx
export default function Avatar({ name }) {
  return <div className="avatar">{name.slice(0, 1)}</div>;
}
// App.jsx
import Avatar from './Avatar.jsx';
export default function App() {
  return <section><Avatar name="Ada" /><Avatar name="Lin" /></section>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

组件名使用小写、把 <Avatar /> 写成 Avatar()，或在事件里直接调用组件函数；这些写法会破坏组件身份和 Hook 规则。

## 动手练习

拆出 UserCard 与 Avatar 两个组件，让 UserCard 负责展示姓名和头像。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么应该使用 <Avatar /> 而不是 Avatar()？**

JSX 将组件身份交给 React，React 才能正确维护该组件的状态和生命周期。

## 官方文档与源码连接

- React 官方文档：[创建组件与导入导出](https://react.dev/learn/your-first-component)。
- 固定版源码：[ReactFiberBeginWork.js → updateFunctionComponent](source:packages/react-reconciler/src/ReactFiberBeginWork.js#updateFunctionComponent)。
- 对照建议：接下来用 JSX 把 UI 结构写到 JavaScript 中。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[05. 掌握 JSX 语法](05-01-start-掌握JSX语法.md)。
