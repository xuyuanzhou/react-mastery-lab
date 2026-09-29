# JavaScript 执行模型与闭包

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“连续调用两次 setCount(count + 1) 为什么不等于加二？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## 函数为什么能记住旧状态？

组件函数每执行一次，就创建一套新的局部变量。回调函数通过 closure 保留创建时的词法环境。setState 安排后续渲染，不会直接修改当前函数里的局部变量。

## 用一个例子建立直觉

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  function handleClick() {
    setCount(count + 1);
    console.log(count); // 仍然是本轮渲染的快照
  }
  return <button onClick={handleClick}>{count}</button>;
}
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [dispatchSetState](source:packages/react-reconciler/src/ReactFiberHooks.js#dispatchSetState) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**连续调用两次 setCount(count + 1) 为什么不等于加二？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

两次表达式都基于同一个 count 快照。使用 setCount(n => n + 1) 才让每个更新依次接收队列前一个计算结果。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[链表、树与队列](02-linked-list.md)。
