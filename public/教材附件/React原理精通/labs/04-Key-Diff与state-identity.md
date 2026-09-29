# Lab 04：Key、Diff 与 State Identity

## 目标

把“key 用于性能优化”这个不完整说法彻底改掉：**key 首先参与同级元素的身份判断，从而影响 Fiber 复用、移动和 state 保留。**

## Demo A：index key

构造可编辑 Todo：

```text
[A(input=A), B(input=B), C(input=C)]
```

用 index 作为 key，在头部插入 X，观察输入状态跟谁走。

## Demo B：stable key

改成业务 id，再重复。

## 断点

```text
reconcileChildrenArray
updateSlot
updateFromMap
placeChild
deleteChild
```

观察：

```text
oldFiber.key
newChild.key
oldFiber.index
newIdx
lastPlacedIndex
newFiber.alternate
newFiber.flags
```

## 验收

你应该能解释三件不同的问题：

1. 一个 Fiber 是否被复用？
2. 一个 DOM 节点是否需要移动？
3. 一个组件 state 是否保留？

它们相关，但不是同一个问题。
