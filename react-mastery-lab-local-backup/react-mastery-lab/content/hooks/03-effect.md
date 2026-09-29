# Effect、依赖与清理

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“为什么开发环境可能执行 setup → cleanup → setup？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## Effect 是与外部系统同步

Effect 声明已提交状态如何影响外部系统。依赖变化时，先清理旧的同步关系，再建立新的关系；卸载时清理。依赖使用 Object.is 比较。useLayoutEffect 和 useEffect 的时机不同。

## 用一个例子建立直觉

```jsx
useEffect(() => {
  const connection = connect(roomId);
  connection.open();
  return () => connection.close();
}, [roomId]);
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [commitHookEffectListMount](source:packages/react-reconciler/src/ReactFiberCommitEffects.js#commitHookEffectListMount) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberCommitEffects.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**为什么开发环境可能执行 setup → cleanup → setup？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

StrictMode 会用额外检查暴露缺少清理等问题。正确实现应在重复建立与拆除后仍保持外部系统状态一致；不是用 ref 强行禁止第二次运行。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[useRef、useMemo 与 useCallback](04-memo-ref.md)。
