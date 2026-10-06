# 06. JSX 中的表达式与属性

> 第一阶段 · React 入门 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

JSX 花括号可以嵌入 JavaScript 表达式，包括变量、三元表达式、函数返回值和对象属性。字符串属性可以写引号，动态值写花括号。style 接收 JavaScript 对象，键名通常使用驼峰命名。不要在 JSX 中直接塞入 if 或 for 语句，改为在返回前处理或使用表达式。

## 实例：把知识应用到组件

```jsx
const user = { name: 'Ada', score: 96 };
export default function Badge() {
  const level = user.score >= 90 ? '优秀' : '继续努力';
  return (
    <p title={user.name} style={{ fontWeight: 600, marginTop: 8 }}>
      {user.name} · {level} · {user.score + 4}
    </p>
  );
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

写 style="color: red"、在花括号里放语句，或把普通对象直接当作 JSX 子节点渲染。

## 动手练习

实现一个 Price 组件：接收 price 和 currency，用 Intl.NumberFormat 格式化显示。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**JSX 中什么时候使用引号，什么时候使用花括号？**

静态字符串用引号，JavaScript 计算结果或变量用花括号。

## 官方文档与源码连接

- React 官方文档：[JSX 中的表达式与属性](https://react.dev/learn/javascript-in-jsx-with-curly-braces)。
- 固定版源码：[ReactJSXElement.js → jsxDEVImpl](source:packages/react/src/jsx/ReactJSXElement.js#jsxDEVImpl)。
- 对照建议：掌握表达式后，再建立可维护的组件样式方案。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[07. 组件样式与静态资源](07-01-start-组件样式与静态资源.md)。
