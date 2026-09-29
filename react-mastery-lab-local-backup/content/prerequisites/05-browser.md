# DOM、CSSOM 与浏览器渲染

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“useLayoutEffect 为什么可能影响首帧？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## DOM 更新为什么还不是屏幕像素？

DOM 表达结构，样式计算确定 CSS 结果，Layout 决定几何信息，Paint 生成绘制内容，Composite 组合图层。一次修改可能跳过其中若干阶段。读取布局信息可能迫使浏览器提前计算。

## 用一个例子建立直觉

```jsx
const node = document.querySelector('button');
node.style.width = '200px';
const box = node.getBoundingClientRect();
// 写入布局相关样式后紧接读取，可能触发同步布局。
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [commitLayoutEffects](source:packages/react-reconciler/src/ReactFiberCommitWork.js#commitLayoutEffects) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberCommitWork.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**useLayoutEffect 为什么可能影响首帧？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

它在提交过程中执行。大量计算、布局读取或同步更新会延迟浏览器获得绘制机会。应只把绘制前确有必要的逻辑放进其中。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[JSX、模块与 AST](06-jsx.md)。
