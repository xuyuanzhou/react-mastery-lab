# SSR、流式输出与 Hydration

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“Hydration 是普通的第一次 createRoot 渲染吗？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 服务器 HTML 如何变成可交互的应用？

SSR 把组件输出为 HTML，让浏览器先展示内容。Hydration 在客户端把组件逻辑、状态树与已有 DOM 对接。首次客户端输出应与服务端一致；时间、随机数和客户端独有条件容易造成不匹配。

## 用一个例子建立直觉

```jsx
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />);
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [hydrateRoot](source:packages/react-dom/src/client/ReactDOMRoot.js#hydrateRoot) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/client/ReactDOMRoot.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**Hydration 是普通的第一次 createRoot 渲染吗？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

不是。它尝试使用已有服务端 DOM，并有匹配、错误恢复和选择性水合相关逻辑。直接把它当作从空容器创建会错过关键约束。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[RSC、Flight 与客户端边界](02-rsc.md)。
