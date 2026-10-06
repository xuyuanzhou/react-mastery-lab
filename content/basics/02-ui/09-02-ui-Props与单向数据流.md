# 09. Props 与单向数据流

> 第二阶段 · 组件与交互 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

Props 是父组件传给子组件的只读输入。可以传字符串、数字、函数、对象和 React 节点；子组件通过参数解构或 props 对象访问。数据向下流动，子组件若想请求修改，应调用父组件传入的事件回调。默认参数可以为可选属性提供合理默认值。

## 实例：把知识应用到组件

```jsx
function Product({ name, price = 0, onBuy }) {
  return <button onClick={() => onBuy(name)}>{name} · ¥{price}</button>;
}
export default function Shop() {
  return <Product name="机械键盘" price={299} onBuy={name => alert(name)} />;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

把 props.price 直接赋新值，或在子组件内部无声修改父组件传入的对象。

## 动手练习

将 Product 增加 disabled 属性，在缺货时禁用购买按钮。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**子组件怎样更新父组件里的数据？**

通过父组件传入回调通知，由父组件更新自己管理的 State。

## 官方文档与源码连接

- React 官方文档：[Props 与单向数据流](https://react.dev/learn/passing-props-to-a-component)。
- 固定版源码：[ReactFiberBeginWork.js → updateFunctionComponent](source:packages/react-reconciler/src/ReactFiberBeginWork.js#updateFunctionComponent)。
- 对照建议：下一课使用 children 完成容器与内容组合。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[10. children 与组件组合](10-02-ui-children与组件组合.md)。
