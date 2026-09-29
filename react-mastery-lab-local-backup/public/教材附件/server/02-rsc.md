# RSC、Flight 与客户端边界

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“这个 Vite 学习平台本身运行 RSC 吗？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## RSC 和 SSR 解决的不是同一个问题

RSC 允许部分组件在服务端执行并序列化其结果与客户端组件引用。SSR 关注 HTML 输出。两者可协作：RSC 的结果可参与服务端 HTML 渲染，也可以用于后续导航。客户端边界定义哪些模块需要在客户端运行。

## 用一个例子建立直觉

```jsx
// 客户端模块边界示意
'use client';
import { useState } from 'react';
export function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{String(liked)}</button>;
}
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [ReactFlightServer.js](source:packages/react-server/src/ReactFlightServer.js#L1) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-server/src/ReactFlightServer.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**这个 Vite 学习平台本身运行 RSC 吗？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

不运行。本平台是静态部署的教材和源码阅读器；RSC 的真实集成通常由支持它的框架承担。右侧可阅读协议实现，但不把教学示意冒充运行时实验。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[React 的设计约束地图](../architecture/01-design.md)。
