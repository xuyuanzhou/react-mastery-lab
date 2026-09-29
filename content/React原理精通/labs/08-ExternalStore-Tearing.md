# Lab 08：External Store 与 Tearing

## 目标

证明为什么“在 useEffect 里 subscribe + setState”并不足以构成并发安全的外部 Store 读取协议。

## 实验

先实现一个最朴素 store：

```js
let value = 0
const listeners = new Set()
export const store = {
  getSnapshot: () => value,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
  set(v) { value = v; listeners.forEach(fn => fn()) }
}
```

分别用：

```text
useEffect + useState
vs
useSyncExternalStore
```

接入同一个 store，并在 transition / concurrent update 下观察多个组件是否可能读取不同 snapshot。

## 核心问题

`getSnapshot` 为什么必须具有缓存/稳定语义？React 为什么需要在 commit 前后验证外部世界没有发生破坏一致性的变化？
