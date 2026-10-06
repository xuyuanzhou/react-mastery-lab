# 07. 组件样式与静态资源

> 第一阶段 · React 入门 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

React 不强制使用特定 CSS 方案。普通 CSS、CSS Modules、CSS-in-JS 和工具类都可以依据项目需求选择。常见的基础方案是通过 className 引用 CSS 类，动态少量样式使用 style 对象。图片放在 public 中可按构建工具约定引用，打包处理的资源则可通过 import 导入。

## 实例：把知识应用到组件

```jsx
import './Card.css';
export default function Card({ highlighted, children }) {
  return (
    <article className={'card ' + (highlighted ? 'card--active' : '')}>
      {children}
    </article>
  );
}
// Card.css: .card { padding: 16px; border-radius: 12px; }
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

把 className 写成 class；把所有动态视觉逻辑放进内联 style，导致悬停、媒体查询和主题难以管理。

## 动手练习

为 Card 实现 normal、active 两种状态，添加 :focus-visible 样式并用键盘验证。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**什么时候使用 style，什么时候使用 className？**

复用与交互状态优先使用类名；少量运行时数值可用 style 对象。

## 官方文档与源码连接

- React 官方文档：[组件样式与静态资源](https://react.dev/learn/adding-styles)。
- 固定版源码：[ReactDOMComponent.js → setInitialProperties](source:packages/react-dom-bindings/src/client/ReactDOMComponent.js#setInitialProperties)。
- 对照建议：理解界面是组件树后，就能进入组件复用和数据传递。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[08. 组件树与纯函数渲染](08-01-start-组件树与纯函数渲染.md)。
