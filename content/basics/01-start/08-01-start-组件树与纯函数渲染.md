# 08. 组件树与纯函数渲染

> 第一阶段 · React 入门 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 能画出父组件到子组件的调用关系，区分组件函数执行、React 提交 DOM 和浏览器绘制。
- 能判断一次渲染是否只依赖 Props、State、Context，并识别外部变量修改等不纯行为。
- 能解释 StrictMode 的开发检查为什么可能重复调用组件，以及为什么日志次数不等于页面提交次数。

## 核心知识

**组件树**是组件之间的父子关系。例如 `App` 返回 `Cart`，`Cart` 返回 `Total`，就形成 `App → Cart → Total`。React 可以调用这些组件函数来计算下一版界面。这个计算阶段叫 **Render（渲染）**；之后 React 才在 **Commit（提交）** 阶段修改真实 DOM。浏览器再进行布局和绘制。因此“组件函数执行了”不等于“屏幕已经变化了”。

**纯渲染**要求相同的 Props、State 和 Context 输入产生相同的结果，并且渲染过程不修改外部对象。这样 React 才能在必要时重新计算，甚至放弃一轮尚未提交的计算。组件可以修改**本次调用中新建**的局部数组或对象，因为它们尚未被外部共享；不能修改从 Props 收到的数组、模块级变量或浏览器状态。`Math.random()`、`Date.now()` 等不稳定值也不应直接决定需要稳定保存的渲染状态。

用户点击造成的写入放在事件处理函数里。与网络、定时器或浏览器 API 保持同步的操作，按其生命周期放在 Effect 中并提供清理；能够由现有输入算出的值直接在渲染时计算，不必用 Effect 再同步一份 State。

## 实例：把知识应用到组件

```jsx
import { useState } from 'react';

function Total({ prices }) {
  // sum 只由本次收到的 prices 算出，无须再存一份 State。
  const sum = prices.reduce((result, price) => result + price, 0);
  return <strong>总额：{sum}</strong>;
}

function Cart({ prices }) {
  // 这个数组在本次调用中新建，修改它不会影响外部输入。
  const labels = [];
  prices.forEach((price) => labels.push(`${price} 元`));
  return <section><p>{labels.join('、')}</p><Total prices={prices} /></section>;
}

export default function App() {
  const [prices, setPrices] = useState([12, 25, 8]);
  return <>
    <button onClick={() => setPrices([...prices, 5])}>加入 5 元商品</button>
    <Cart prices={prices} />
  </>;
}
```

初始显示 `12 元、25 元、8 元` 和总额 `45`。点击一次后，事件处理函数创建新数组，下一轮渲染显示第四项和总额 `50`。沿组件树看，`App` 把数组交给 `Cart`，`Cart` 再交给 `Total`；每层都只根据本次输入计算结果。代码可直接放进 Vite 的 `App.jsx` 运行。这里用到的 `useState` 会在后续章节细讲，暂时把它看成“记住购物车数组并请求重新渲染”。

## 常见错误与正确做法

- `prices.push(5)` 会修改来自 Props 的数组；即使暂时显示正确，也破坏了上一轮输入的快照。应由拥有 State 的 `App` 在事件里调用 `setPrices([...prices, 5])`。
- 在组件函数中写 `localStorage`、发送请求或修改模块级计数器，会让“只计算界面”的渲染产生外部影响。请求通常由事件或 Effect 触发，并处理取消或竞态。
- 把 `labels.push(...)` 一概判为错误也不准确：`labels` 是本次渲染刚创建的局部数组，没有修改共享数据。判断关键是**数据是否属于本次调用**。

## 动手练习

1. 在上述组件中给 `Total` 加一行 `console.log('Total render')`，预测首次挂载和点击后的界面总额。开发环境若启用了 StrictMode，再观察日志可能出现的额外次数。记录“函数调用”和“页面结果”两个不同的数。
2. 故意把点击处理改为 `prices.push(5); setPrices(prices)`，预测为什么可能不更新；随后恢复不可变写法。不要把这个错误版本留在正式代码里。
3. 尝试在 `Cart` 中写 `prices.sort()`，再改成 `const sorted = [...prices].sort()`。解释哪一行修改了父组件持有的输入。

**核对思路：** 点击一次后的正确总额是 `50`。React 对 State 比较时，相同数组引用可能使更新被跳过；`push` 还会污染旧快照。`sort()` 原地修改数组，复制后的 `sort()` 只修改新数组。StrictMode 的开发日志可能多于生产环境，但不能仅凭日志推断发生了多少次 DOM 提交。

## 自检问题

**问 1：为什么开发模式 StrictMode 可能多次执行组件函数？**

答：React 用额外的组件调用暴露“渲染时修改外部数据”等不纯问题。如果第二次调用得到不同结果，说明函数不是只由输入决定。开发检查不等于多次提交同一结果；生产构建不执行这项额外检查。

**问 2：`Cart` 里的 `labels.push()` 为什么可以，`prices.push()` 为什么不可以？**

答：`labels` 是每次调用中新建的局部数组；`prices` 是父组件传入的共享输入。修改 `prices` 会影响旧快照和其他读取者。

**问 3：为什么不要把总额再存入一个 State 并用 Effect 更新？**

答：总额已能从 `prices` 直接算出。另存 State 会产生两个需要保持一致的数据源，还可能多一次渲染。此例计算量很小，直接求和最清楚。

## 官方文档与源码连接

- React 官方文档：[组件树与纯函数渲染](https://react.dev/learn/keeping-components-pure)。
- 固定版源码：[ReactFiberBeginWork.js → updateFunctionComponent](source:packages/react-reconciler/src/ReactFiberBeginWork.js#updateFunctionComponent)。
- 源码阅读提示：在 `updateFunctionComponent` 中找到 `renderWithHooks` 与随后协调子节点的调用。它能帮助你区分“调用组件以计算下一版子树”和“提交 DOM”；前者发生在 Begin Work，后者在 Commit 阶段。
- 对照建议：接下来学习 Props 和 children 构建可复用组件，再学习 State 快照。

## 完成标准

能预测一次点击后的 `45 → 50`，说明局部可变与共享输入可变的区别，并指着右侧源码解释组件函数调用处于 Render 阶段。读完后可点击「标记已读」，需要回顾的内容可以收藏。

继续阅读：[09. Props 与单向数据流](../02-ui/09-02-ui-Props与单向数据流.md)。
