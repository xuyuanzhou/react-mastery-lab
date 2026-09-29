# 31. useTransition / useDeferredValue：把“紧急程度”建模进更新

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Scheduler` | 调度器 |
| `Transition` | 过渡更新 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


源码锚点：

- [`ReactFiberHooks.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)
- [`ReactFiberLane.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberLane.js)
- [`ReactFiberRootScheduler.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberRootScheduler.js)

## 1. Transition 不等于 setTimeout

`startTransition` 的目标不是“延迟 N 毫秒”，而是把某些更新标记为 non-blocking transition work，让输入等更紧急工作可以先完成。

```text
Input update → urgent lane
Result list update inside transition → transition lane
```

当两者竞争时，React 可以中断/重启较低紧急度的 render。

## 2. useTransition

```jsx
const [isPending, startTransition] = useTransition()
```

`isPending` 让 UI 能表达“transition 仍未完成”。它不是网络请求 loading 的通用替代物；它描述的是 React transition 的 pending 状态。

## 3. useDeferredValue

```jsx
const deferredQuery = useDeferredValue(query)
```

可以把它理解为：当前 UI 先接收新 `query`，但某个消费端允许暂时继续使用旧值，React 再以较低紧急度追上。

## 4. 两者差异

```text
useTransition：你控制“哪次 state update 是 transition”
useDeferredValue：你控制“某个 value 的消费可以延后”
```

## 5. 并发不变量

低优先级 render 可能：

```text
开始 → 被输入打断 → 放弃 WIP → 高优先级 commit → 重新 render transition
```

因此 render 必须可重入、可重做且无外部副作用。

## 6. 自检

1. 为什么 Transition 不是定时器？
2. `useDeferredValue` 为什么可能显示“旧值 + 新的其他 UI”？
3. 为什么并发渲染要求 UpdateQueue 能 rebase？
