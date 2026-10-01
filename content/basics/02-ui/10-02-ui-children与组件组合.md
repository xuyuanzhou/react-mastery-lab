# 10. children 与组件组合

> 第二阶段 · 组件与交互 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

JSX 标签之间的内容会作为 children 传入组件。children 允许父组件决定内容、子组件决定布局，是构建 Card、Modal、Layout 等通用容器的基础。组合通常比通过大量布尔 Props 控制每个细节更灵活；不要为了传递一个简单视图过早建立复杂抽象。

## 实例：把知识应用到组件

```jsx
function Card({ title, children }) {
  return <section className="card"><h2>{title}</h2>{children}</section>;
}
export default function App() {
  return <Card title="个人信息"><p>姓名：Ada</p><button>编辑</button></Card>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

把 children 理解为字符串，或者每新增一种卡片内容就复制一个几乎相同的组件。

## 动手练习

实现一个 Dialog：标题为普通 Props，底部按钮通过 children 或专门的 footer 属性传入。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**children 如何参与单向数据流？**

它仍然是父组件传递给子组件的只读 React 节点。

## 官方文档与源码连接

- React 官方文档：[children 与组件组合](https://react.dev/learn/passing-props-to-a-component)。
- 固定版源码：[ReactJSXElement.js](source:packages/react/src/jsx/ReactJSXElement.js)。
- 对照建议：学完组合后，继续让组件根据条件决定渲染内容。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[11. 条件渲染与界面状态](11-02-ui-条件渲染与界面状态.md)。
