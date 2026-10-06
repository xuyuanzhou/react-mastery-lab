# 02. 使用 Vite 创建 React 项目

> 第一阶段 · React 入门 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

在本课程中使用 Vite 创建客户端 React 学习项目。Vite 负责开发服务器与资源打包；React 和 react-dom 负责组件和浏览器渲染。官方文档建议正式产品按需求评估框架；Create React App 已弃用，不应把它当作新项目的默认选择。

## 实例：把知识应用到组件

```bash
npm create vite@latest my-react-app -- --template react-ts
cd my-react-app
npm install
npm run dev
# 完成后：npm run build && npm run preview
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

把 index.html 当成最终部署文件直接双击，或在 GitHub Pages 子路径部署时使用错误的绝对资源路径。

## 动手练习

创建一个全新的 react-ts 项目，找到 index.html、src/main.tsx、src/App.tsx，解释各自作用。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**Vite 与 React 分别做什么？**

Vite 提供开发和构建链路；React 提供组件模型，React DOM 负责将结果提交到浏览器。

## 官方文档与源码连接

- React 官方文档：[使用 Vite 创建 React 项目](https://react.dev/learn/build-a-react-app-from-scratch)。
- 固定版源码：[ReactDOMRoot.js → createRoot](source:packages/react-dom/src/client/ReactDOMRoot.js#createRoot)。
- 源码阅读边界：Vite 负责开发服务器与打包；`createRoot` 是 React DOM 的挂载入口，并不实现 Vite。对照本项目的 [Vite 配置](project:vite.config.ts) 和 [React 入口](project:src/main.tsx)，画出 `index.html → main.tsx → createRoot`。
- 对照建议：本项目使用 HashRouter 和相对 base 路径，适配仓库子路径部署。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[03. 开发 React 必备的 JavaScript](03-01-start-开发React必备的JavaScript.md)。
