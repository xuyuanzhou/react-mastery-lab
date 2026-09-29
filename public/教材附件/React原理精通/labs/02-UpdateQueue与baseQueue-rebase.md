# Lab 02：UpdateQueue、baseQueue 与 Rebase

## 目标

理解“低优先级更新被跳过”后为什么不能直接删除，以及 `baseState/baseQueue` 怎样保证最终语义正确。

## Demo 思想

构造两个优先级不同的更新：一个同步输入更新，一个 transition 更新。让它们作用于同一 state，并人为制造 transition 仍未完成时又产生高优先级更新。

```jsx
function App() {
  const [text, setText] = useState('')
  const [items, setItems] = useState([])

  function change(e) {
    const value = e.target.value
    setText(value)
    startTransition(() => {
      setItems(expensiveFilter(value))
    })
  }
  // ...
}
```

## 断点

```text
dispatchSetState
updateReducerImpl
requestUpdateLane
enqueueConcurrentHookUpdate
```

重点观察：

```text
hook.memoizedState
hook.baseState
hook.baseQueue
queue.pending
update.lane
renderLanes
```

## 推导题

假设更新序列是：

```text
U1: +1 (低优先级)
U2: ×10 (高优先级)
```

如果本轮只处理 U2，直接永久丢弃 U1 会破坏什么？下一轮要怎样重放才能得到符合更新顺序的结果？

## 验收

你必须能不用源码解释 `baseQueue` 存在的必要性，而不是只说“保存跳过的更新”。
