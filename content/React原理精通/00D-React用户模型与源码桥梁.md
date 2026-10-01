# 00D. React 用户模型：进入源码前先解释现象

> 建议在前置知识之后、Fiber 之前阅读。本章使用公共 API 建立可观察的事实；后续章节再解释它们在 React v19.3.0 源码中如何实现。

## 本章完成标准

不用说出任何内部函数名，也能预测下面四个实验的屏幕结果；能把“组件函数执行”“DOM 改变”“浏览器绘制”分开描述。

## 1. Render 是计算下一版 UI，Commit 才应用结果

一次更新可以先粗略画成：

```text
事件或外部变化 → 记录更新 → Render：计算下一版 UI → Commit：修改宿主环境 → 浏览器绘制
```

Render 可能重试，也可能被放弃，所以组件函数必须保持纯粹：相同的输入应产生相同的 UI 描述，不要在函数体里直接发请求或改 DOM。**一次 Render 不保证一定 Commit；Commit 也不等于浏览器已经 Paint。**

预测：若组件函数执行两次，但最终只有一次 DOM 更新，能否断言“React 出错、重复渲染”？不能。先分别记录函数执行、Commit 和浏览器绘制。开发环境 StrictMode 还可能故意额外调用以帮助发现不纯代码，不能直接拿它推断生产环境次数。

后续对应：[Render 工作循环](02-Render工作循环.md)、[Commit 阶段](07-Commit阶段.md)、[浏览器像素流水线](09-浏览器渲染与React性能.md)。

## 2. State 是本轮 Render 的快照

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => {
    setCount(count + 1);
    setCount(count + 1);
    console.log(count);
  }}>{count}</button>;
}
```

首次点击时，日志仍为 `0`；两次表达式读取的是同一个 `count` 快照。它们提交的是两条“设为 1”的更新，结果通常是 `1`。若要按前一条结果连续累加，使用两次 `setCount(n => n + 1)`，结果为 `2`。

先解释行为，再进入 [Hook 链表](03-Hooks-Dispatcher与链表.md) 和 [UpdateQueue](04-useState与UpdateQueue.md)。不要把 setter 理解成对当前函数局部变量赋值。

## 3. State 跟组件在树中的身份走

```jsx
{selected === 'A' ? <Counter key="A" /> : <Counter key="B" />}
```

切换 `selected` 会换掉 key，对 React 而言这是不同身份，旧 Counter 的状态不会自动转给新 Counter。反过来，在同一父级、相同类型和 key 的对应位置更新 props，状态通常会保留。每次生成新的 JSX 对象不意味着每次都要重建组件状态。

动手验证：分别尝试“只改 props”“改 key”“在列表头部插入且使用 index key”，记录组件 state 属于哪个业务实体。接着阅读 [Fiber 与双缓冲](01-Fiber数据结构与双缓冲.md) 和 [Diff/key](06-Reconciliation与Diff.md)。

## 4. Effect 用于与 React 外部系统同步

```jsx
useEffect(() => {
  const connection = connect(roomId);
  return () => connection.disconnect();
}, [roomId]);
```

这里的关系是：`roomId` 改变后，清理旧连接，再建立新连接。Effect 不是“所有计算都放进去”的容器，也不是 `componentDidMount` 的同义词。若只需从 props/state 计算一个值，先直接在 Render 中计算；若必须同步网络连接、订阅或非 React 控件，再考虑 Effect。开发环境 StrictMode 的额外 setup/cleanup 是检查清理是否正确的工具。

后续对应：[Effect 系统](05-Effect系统.md) 与 [StrictMode](24-StrictMode与RulesOfReact.md)。

## 进入源码的四个问题

1. 本轮 state 快照实际保存在哪里？
2. React 如何认出“同一个”组件和 Hook？
3. 一次未完成或被放弃的 Render 为什么不会直接改 DOM？
4. 哪些工作可以重做，哪些工作只能在 Commit 发生？

先写下自己的答案。读完 Fiber、Hook、Diff、Commit 后返回本页修正，不要求第一次就答对。可从 [createRoot](source:packages/react-dom/src/client/ReactDOMRoot.js#createRoot) 开始追踪首次渲染。

公共 API 语义可对照 React 官方的 [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)、[Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)、[Render and Commit](https://react.dev/learn/render-and-commit) 与 [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)。
