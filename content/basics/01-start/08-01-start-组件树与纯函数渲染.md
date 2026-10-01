# 08. 组件树与纯函数渲染

> 第一阶段 · React 入门 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

React 假设组件在相同 Props、State 和 Context 输入下会产生相同的渲染结果。渲染期间不要修改外部变量、发起副作用或调用不稳定的随机结果来决定持久状态。纯渲染可以被 React 重试、打断或多次调用，帮助调度器安全地工作。事件处理函数和 Effect 是安置外部副作用的位置。

## 实例：把知识应用到组件

```jsx
function Total({ prices }) {
  const sum = prices.reduce((result, price) => result + price, 0);
  return <strong>总额：{sum}</strong>;
}
export default function App() {
  return <Total prices={[12, 25, 8]} />;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

在组件函数里执行 items.push()、直接写 localStorage，或将 let counter 定义在组件外并在渲染时自增。

## 动手练习

将一个在 render 时修改全局数组的组件改写为纯组件，副作用转移到用户事件。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么开发模式 StrictMode 可能多次执行渲染？**

它利用额外检查暴露不纯的渲染和清理错误；生产环境不执行这些开发专用检查。

## 官方文档与源码连接

- React 官方文档：[组件树与纯函数渲染](https://react.dev/learn/keeping-components-pure)。
- 固定版源码：[ReactFiberBeginWork.js](source:packages/react-reconciler/src/ReactFiberBeginWork.js)。
- 对照建议：接下来学习 Props 和 children 构建可复用组件。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[09. Props 与单向数据流](../02-ui/09-02-ui-Props与单向数据流.md)。
