# 09. Debugger、Source Map 与源码断点

> 目标：分清“阅读源码”“查看构建产物”“调试真实 React Runtime”三个动作。

## 1. 为什么断点位置会和 GitHub 源码不一样

应用运行的通常是经过构建工具转换后的代码：

```text
React 仓库源码
↓ React 自身构建
npm 发布包
↓ 应用 Bundler
浏览器 bundle/chunk
```

Source Map（源码映射）保存“生成代码位置 ↔ 原源码位置”的映射，让 DevTools 尽可能把断点和调用栈还原到源码。

## 2. 本学习平台的源码面板是什么

右侧源码工作台展示固定 tag `v19.3.0` 的官方源码缓存，并支持函数定位。它属于**阅读工具**，不是正在执行的 React 进程。

真正的 Runtime 调试需要：

- React development build；
- 可映射到源码的 Source Map；
- Browser DevTools / debugger；
- 一个能触发目标路径的最小 Demo。

## 3. 推荐断点

先用一个只有 `useState` 的 Counter：

```text
createRoot
updateContainer
scheduleUpdateOnFiber
renderWithHooks
dispatchSetState
beginWork
completeWork
commitRoot
```

第一次不要同时加入 Suspense、Context、Transition 和复杂列表。

## 4. 每次停住只记录四件事

1. 当前函数输入参数；
2. 当前 Fiber / Root / Hook / Queue 的关键字段；
3. 当前 lanes；
4. 下一步调用或返回到哪里。

这比“把整段源码看一遍”有效得多。

## 自检

- Source Map 会改变 React 运行逻辑吗？
- 本站右侧源码面板为什么不等于真实断点？
- 为什么调试应使用最小复现而不是直接启动大型业务项目？

## 参考答案

1. Source Map 只帮助把构建产物的位置映射回更易读的源文件/行号；不会改变 React 的控制流、数据结构或调度语义。映射质量取决于发布包和构建配置，不能保证每个 GitHub 源码行都有一对一的浏览器断点位置。
2. 右侧面板展示的是固定 tag 的**静态文件**，没有在执行当前页面的 React 调用栈。真实断点必须附着到运行中的代码，并匹配版本、构建产物、Source Map 和触发条件。
3. 大型项目有更多组件、更新、Feature Flag、异步事件，调用栈和日志会掩盖目标路径。最小 Counter 让你能预测一次点击应发生什么，观察差异时也更容易排除无关更新。
