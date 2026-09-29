# Lab 01：Hook 身份、Dispatcher 与 renderWithHooks

## 目标

不是验证“Hook 不能写 if”，而是验证：**Hook 的逻辑身份依赖当前 Fiber 上 Hook 链表的遍历位置。**

## Demo

```jsx
function App({flag}) {
  const [a, setA] = useState('A')
  if (flag) {
    // 实验阶段故意违反 Rules of Hooks
    const [b] = useState('B')
  }
  const [c, setC] = useState('C')
  return <button onClick={() => setA(x => x + '!')}>{a}-{c}</button>
}
```

不要把这段代码放进生产项目；它就是为了制造身份错位。

## 断点

```text
renderWithHooks
mountWorkInProgressHook
updateWorkInProgressHook
mountState
updateState
```

## 观察表

| 时刻 | currentlyRenderingFiber.memoizedState | currentHook | workInProgressHook | Dispatcher |
|---|---|---|---|---|
| mount 第一个 useState 前 | | | | |
| mount 第二个 Hook 后 | | | | |
| update 第一个 useState | | | | |
| flag 变化后的 update | | | | |

## 必须得到的结论

1. `useState` 公共 API 自己不决定 mount/update，实现由当前 Dispatcher 选择。
2. Hook 节点之间通过 `next` 串联。
3. update 时 React 以顺序去匹配 current Hook，而不是按变量名匹配。
4. Rules of Hooks 是运行时数据结构约束的 API 化表达。

## 深挖

再研究一次 render-phase update：在组件执行过程中调用 state setter，观察 `renderWithHooksAgain` 如何再次执行组件，并思考“重放时为什么不能无限循环”。
