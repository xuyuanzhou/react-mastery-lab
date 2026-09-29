# 32. useId / useDebugValue / useInsertionEffect：库作者常见 Hooks

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Passive Effect` | 被动副作用 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Key` | 列表身份键 |
| `Hydration` | 水合/复用服务端 DOM |
| `SSR` | 服务端渲染 |
| `Layout` | 布局/回流 |
| `Paint` | 绘制 |
<!-- TERMS-AUTO-END -->


## useId

`useId` 用于生成在 SSR/Hydration 场景可协调的稳定 ID，常用于 accessibility attribute 关联。不要用它生成列表 key；key 表达业务 identity，而 `useId` 解决的是组件实例渲染标识。

## useDebugValue

Custom Hook 可以用它给 React DevTools 提供更可读的调试标签。它不会替代业务日志，也不应该改变 Hook 行为。

## useInsertionEffect

它面向 CSS-in-JS 等库，在布局 Effect 读取 layout 之前把样式插入正确位置。它不是更“快”的 `useLayoutEffect`，应用业务代码极少需要它。

典型顺序可概念化为：

```text
Commit mutation / insertion-related work
→ insertion effects
→ layout effects
→ browser paint
→ passive effects
```

具体内部子阶段应以当前源码为准，不把教学顺序当作所有 edge case 的逐指令时间线。

## 自检

1. 为什么 `useId` 不能当列表 key 生成器？
2. `useInsertionEffect` 主要解决哪类库级问题？
3. `useDebugValue` 为什么不属于状态机制？
