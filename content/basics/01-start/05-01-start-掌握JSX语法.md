# 05. 掌握 JSX 语法

> 第一阶段 · React 入门 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

JSX 是 JavaScript 的语法扩展。它类似 HTML，却要求标签闭合、组件返回单个根节点，使用 className、htmlFor 等 JSX 属性名称。Fragment <>...</> 能在不增加额外 DOM 容器的情况下组合多个节点。JSX 是对 React Element 的描述，不是浏览器直接执行的 HTML。

## 实例：把知识应用到组件

```jsx
export default function Profile() {
  return (
    <>
      <label htmlFor="nickname">昵称</label>
      <input id="nickname" placeholder="请输入" />
      <img src="/avatar.png" alt="用户头像" />
    </>
  );
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

忘记闭合 input、img 等标签；在 JSX 中写 class=；返回多个并列标签但没有 Fragment。

## 动手练习

写一个由 h1、p、button 组成的 Profile，分别尝试 div 根节点与 Fragment。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么 JSX 不是 HTML？**

它经过构建工具转换成 JavaScript 表达式，并遵循 JavaScript 与 React 的属性和组件规则。

## 官方文档与源码连接

- React 官方文档：[掌握 JSX 语法](https://react.dev/learn/writing-markup-with-jsx)。
- 固定版源码：[ReactJSXElement.js → jsxDEV](source:packages/react/src/jsx/ReactJSXElement.js#jsxDEV)。
- 对照建议：下一课理解花括号和样式如何让静态 JSX 动起来。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[06. JSX 中的表达式与属性](06-01-start-JSX中的表达式与属性.md)。
