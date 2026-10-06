# 32. 语义化与无障碍

> 第四阶段 · 工程实践 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

React 的 UI 首先仍然是网页，HTML 的原生语义与可访问行为同样重要。优先使用 button、label、form、nav 等正确元素，图像提供有意义的 alt，输入控件关联 label，键盘能访问关键操作。动态状态需要合理的状态文案；ARIA 用来补足语义而非替代原生元素。

## 实例：把知识应用到组件

```jsx
export default function Subscribe() {
  return <form onSubmit={e => e.preventDefault()}>
    <label htmlFor="email">电子邮箱</label>
    <input id="email" name="email" type="email" required />
    <button type="submit">订阅</button>
    <p role="status" aria-live="polite">尚未提交</p>
  </form>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

用 div onClick 假装按钮却无法键盘操作；只有 placeholder 而没有输入标签。

## 动手练习

用 Tab 与 Enter 键完整操作一个弹窗表单，检查焦点顺序、错误提示和关闭后焦点恢复。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**什么时候优先选原生 HTML？**

只要原生元素能表达操作和语义，就优先使用它，再按需要补充 ARIA。

## 官方文档与源码连接

- React 官方文档：[语义化与无障碍](https://react.dev/reference/react-dom/components/common)。
- 固定版源码：[ReactDOMComponent.js → setInitialProperties](source:packages/react-dom-bindings/src/client/ReactDOMComponent.js#setInitialProperties)。
- 源码阅读边界：语义化与无障碍首先依赖 HTML 和交互设计；`setInitialProperties` 设置 DOM 属性，但不能自动保证界面对键盘或辅助技术可用。
- 对照建议：学完可访问性，再用性能工具识别真正的瓶颈。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[33. 性能分析、渲染边界与 Compiler](33-04-engineering-性能分析渲染边界与Compiler.md)。
