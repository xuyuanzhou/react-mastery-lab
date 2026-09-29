# Lab 05：Effect 与 Commit 可观察顺序

## 目标

区分 Render、Mutation、Layout、Browser Paint、Passive Effect，而不是用“生命周期”一词糊在一起。

## Demo

父子组件都注册：

```jsx
useLayoutEffect(() => {
  console.log('layout create')
  return () => console.log('layout destroy')
})

useEffect(() => {
  console.log('passive create')
  return () => console.log('passive destroy')
})
```

再同时使用 callback ref，触发 mount/update/unmount。

## 断点

```text
commitRoot
commitMutationEffects
commitLayoutEffects
commitHookLayoutEffects
flushPassiveEffects
```

## 必须回答

- DOM 在什么时候已经更新？
- layout effect 为什么可以读取新布局？
- passive effect 为什么不应该用来阻止首次闪烁？
- cleanup 为什么属于“同步生命周期”的另一半，而不是简单等于 unmount？
