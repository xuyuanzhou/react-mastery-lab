# 32. useId / useDebugValue / useInsertionEffect：库作者常见 Hooks

> 源码定位：点击 [mountId](source:packages/react-reconciler/src/ReactFiberHooks.js#mountId)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

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

<!-- ANSWER-GUIDE-START -->
## 本章自检参考解析

> 建议先遮住本节独立作答。每题至少说出“现象 → 内部机制 → 反例/边界”，再点击本章源码锚点核对。

1. **`useId` 解决可访问性 ID 的跨端一致性，不提供列表身份。** key 必须由列表数据中的稳定标识决定，并在创建子元素的位置提供；Hook 不能放到任意循环中为每一项临时生成 key。用数组下标或每轮新 ID 当 key 都可能让状态附着到错误的项。
2. **`useInsertionEffect` 面向 CSS-in-JS 等库。** 库可能需要在布局相关 Effect 读取样式前注入规则，以避免测量到旧样式或闪烁。它不是普通业务副作用的默认位置，也不适合把它当作“更早的 useEffect”。
3. **`useDebugValue` 只提供调试标签。** 它让 React DevTools 更容易展示自定义 Hook 的状态含义；不会创建新的更新队列，也不会驱动渲染。真实 state 仍来自 `useState`、`useReducer` 或订阅。

更多情境题及答案：[全章节自检题](assessments/全章节自检题.md) · [参考答案](assessments/全章节自检题-参考答案.md)。
<!-- ANSWER-GUIDE-END -->
