# 03. 开发 React 必备的 JavaScript

> 第一阶段 · React 入门 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

学习 React 前应掌握 ES Module、箭头函数、数组 map/filter、对象与数组展开、解构、闭包和 async/await。React 经常使用不可变更新：创建新对象或数组，而不是原地修改状态。闭包会捕获创建函数时的变量，这一点对 State 快照和 Effect 非常重要。

## 实例：把知识应用到组件

```js
const users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Lin' }];
const names = users.filter(user => user.id > 1).map(user => user.name);
const first = users[0];
const renamed = { ...first, name: 'Grace' };
const nextUsers = users.map(user => user.id === first.id ? renamed : user);
console.log(names, nextUsers);
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

误以为 const 可以阻止对象内部修改，或直接对 React State 使用 push、splice、属性赋值。

## 动手练习

不修改原数组，给 id=2 的用户增加 active: true，检查新旧数组是否不同。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么不可变更新能帮助 React？**

新引用使变化更容易判断，同时避免修改旧渲染仍在使用的数据快照。

## 官方文档与源码连接

- React 官方文档：[开发 React 必备的 JavaScript](https://react.dev/learn/javascript-in-jsx-with-curly-braces)。
- 固定版源码：[ReactFiberHooks.js → renderWithHooks](source:packages/react-reconciler/src/ReactFiberHooks.js#renderWithHooks)。
- 源码阅读边界：闭包、解构和展开运算符属于 JavaScript；`renderWithHooks` 展示 React 如何运行组件，但不是这些语言特性的实现。
- 对照建议：如果 map、解构、闭包还不熟悉，可优先补齐这一课。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[04. 创建组件与导入导出](04-01-start-创建组件与导入导出.md)。
