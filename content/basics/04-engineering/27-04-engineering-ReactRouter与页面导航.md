# 27. React Router 与页面导航

> 第四阶段 · 工程实践 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

React 本身不内置页面路由。本课程工程使用 React Router v7 的 `react-router-dom` 兼容导出与 `HashRouter`：根据 URL 中的 hash 维护前端页面路径，适合没有服务端重写支持的 GitHub Pages。使用 `Link` 进行应用内跳转，用 `useParams` 读取动态参数。React Router v8 已不再提供 `react-router-dom` 包；新项目要按实际安装版本选择导入路径，不能直接照搬本项目的旧导入。

## 实例：把知识应用到组件

```jsx
import { HashRouter, Routes, Route, Link, useParams } from 'react-router-dom';
function User() { const { id } = useParams(); return <h2>用户 {id}</h2>; }
export default function App() {
  return <HashRouter><nav><Link to="/users/42">打开用户</Link></nav>
    <Routes><Route path="/users/:id" element={<User />} /></Routes>
  </HashRouter>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

用普通 a href 导致 SPA 不必要的整页刷新，或在 GitHub Pages 使用 BrowserRouter 却没有配置后端回退。

## 动手练习

实现主页 / 与详情 /users/:id 两个路由，并加入一个不存在路径的 404 页面。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么本项目选择 HashRouter？**

静态文件托管不需要将所有子路径都重写到 index.html，刷新深层路径更稳定。

## 官方文档与源码连接

- React Router 官方文档：[v7 声明式路由安装](https://reactrouter.com/7.18.4/start/declarative/installation)；本项目的[路由配置](project:src/app/routes.ts)可在右侧直接查看。
- React 固定版源码：[ReactDOMRoot.js](source:packages/react-dom/src/client/ReactDOMRoot.js)只负责 React 根的创建，不实现路由匹配。路由逻辑应到 React Router 项目和本工程的路由文件查证。
- 对照建议：页面有了路由后，还需要处理真实请求的状态。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[28. 异步数据请求与加载状态](28-04-engineering-异步数据请求与加载状态.md)。
