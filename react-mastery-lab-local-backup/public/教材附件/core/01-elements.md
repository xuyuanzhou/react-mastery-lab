# Element、组件与身份

> 本章为平台新增导学教材，非原对话知识库迁移。官方源码基线固定为 React v19.3.0；代码块明确为教学示例或 API 用法。

## 本章目标

读完后能够解释“列表重新排序时用 index 作为 key 有什么风险？”，并在右侧源码中找到相关机制。遇到术语可悬停查看中文解释，点击可打开术语卡片。

## React 到底复用什么？

组件函数描述 UI，Element 描述一次渲染的结果。Reconciliation 在同级范围内比较类型与 key，以决定能否复用已有 Fiber 和状态。key 不会作为普通 prop 自动传入组件。

## 用一个例子建立直觉

```jsx
function List({ items }) {
  return items.map(item => <Row key={item.id} item={item} />);
}
```

先在纸上写出你的预测，再比较本章后面的解释。不要把示例中的简化结构当作 React 官方完整实现。

## 走进官方源码

点击 [reconcileChildrenArray](source:packages/react-reconciler/src/ReactChildFiber.js#reconcileChildrenArray) 打开右侧文件。先找到输入参数、关键字段赋值和返回值，再阅读异常与优化分支。

1. 记录这个函数读了哪些状态、写了哪些状态。
2. 找到“没有工作”或“被跳过”的分支，并解释存在原因。
3. 把真实实现与本章示例对照：哪些情况被教学模型省略了？

官方文件：[GitHub v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactChildFiber.js)。源码 viewer 提供本地缓存；所有行号以本次缓存为准。

## 自检问题

**列表重新排序时用 index 作为 key 有什么风险？**

先用自己的话回答，再看下一节。合格的解释需要说明因果关系，不能只复述字段名称。

## 参考解释

key 跟随位置而非业务对象，状态可能被复用给另一项。输入值、选中状态等会看似移动到错误的数据项。

## 完成标准

能解释本章例子、点击定位对应实现，并提出至少一个反例。完成后点击上方“标记已读”；需要复习的内容可以加入书签。

继续阅读：[Fiber 与 current / WIP 双树](02-fiber.md)。
