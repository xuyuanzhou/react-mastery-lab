# 31. useTransition / useDeferredValue：把“紧急程度”建模进更新

> 源码定位：点击 [mountTransition](source:packages/react-reconciler/src/ReactFiberHooks.js#mountTransition)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

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

<!-- ANSWER-GUIDE-START -->
## 本章自检参考解析

> 建议先遮住本节独立作答。每题至少说出“现象 → 内部机制 → 反例/边界”，再点击本章源码锚点核对。

1. **Transition 不是定时器。** `startTransition` 给其中的 state 更新标记非紧急优先级，使 React 在工作选择与可中断 Render 中处理它；并没有承诺“等待 N 毫秒才运行”。`setTimeout` 只推迟回调执行，不能给之后的 React 更新提供相同的优先级语义。
2. **输入和结果可暂时来自不同进度。** `query` 的紧急更新先提交，使输入框显示新字符；`deferredQuery` 的消费端暂时保留旧值，昂贵列表稍后追上。这是有意的暂态，要在界面上提示列表正在更新，不能把旧结果误认为新查询的最终答案。
3. **队列必须保持原始顺序。** 若低优先级更新 U1 被跳过，而后面的高优先级 U2 先用于本轮显示，React 仍需保留 U1 和必要的重放信息；下次以正确的 baseState/baseQueue 重算，结果要等价于按 U1→U2 顺序执行。否则混合优先级会改写业务语义。

更多情境题及答案：[全章节自检题](assessments/全章节自检题.md) · [参考答案](assessments/全章节自检题-参考答案.md)。
<!-- ANSWER-GUIDE-END -->
