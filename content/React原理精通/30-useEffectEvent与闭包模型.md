# 30. useEffectEvent 与闭包模型：Reactive 与 Non-Reactive Effect Logic

> 源码定位：点击 [mountEvent](source:packages/react-reconciler/src/ReactFiberHooks.js#mountEvent)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Effect` | 副作用 |
| `stale closure` | 过期闭包/陈旧闭包 |
| `Closure` | 闭包 |
| `Ref` | 引用 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


> React 19.3 文档包含 `useEffectEvent`。它解决的是“Effect 中某段逻辑需要读取最新值，但不应该因此重新同步整个 Effect”的建模问题。

官方 API 文档：https://react.dev/reference/react/useEffectEvent

## 1. 先理解 stale closure 不是 React bug

每次 render 都产生新的 lexical environment：

```text
Render #1 → count = 0 → callback#1 captures 0
Render #2 → count = 1 → callback#2 captures 1
```

旧 callback 当然仍读取旧 render 的值。

## 2. Effect 的 reactive dependency

Effect 的语义应该是：

> 当用于建立外部同步关系的 reactive value 改变时，停止旧同步并建立新同步。

如果只是通知文本使用了 `theme`，而连接只由 `roomId` 决定：

```jsx
const onConnected = useEffectEvent(() => {
  showNotification('Connected', theme)
})

useEffect(() => {
  const c = connect(roomId)
  c.on('connected', onConnected)
  return () => c.disconnect()
}, [roomId])
```

`theme` 可以由 Effect Event 在调用时读取最新 committed value，但它不成为连接 Effect 的重新同步条件。

## 3. 不应该滥用

`useEffectEvent` 不是“逃避 dependency lint”的工具。真正参与外部同步关系的值仍应该写进 deps。

## 4. 和 ref hack 的区别

过去常见：

```js
const latest = useRef(value)
latest.current = value
```

再从 async callback 读取 `latest.current`。这可以解决某些 latest-value 问题，但会绕过 React 的 reactive model。`useEffectEvent` 更直接表达“这段 Effect 内事件逻辑是 non-reactive”。

## 5. 自检

1. 为什么 `useEffectEvent` 不能简单理解成“自动 useRef”？
2. 为什么它只能在 Effect/Effect Event 中调用，而不是普通事件处理器里随便调用？
3. 哪些值应该留在 Effect deps 中？

<!-- ANSWER-GUIDE-START -->
## 本章自检参考解析

> 建议先遮住本节独立作答。每题至少说出“现象 → 内部机制 → 反例/边界”，再点击本章源码锚点核对。

1. **不等于自动 `useRef`。** Ref 是一个可变容器，开发者自己维护写入时机；Effect Event 是 React 提供的 Effect 内非响应式事件语义。它在被调用时读取当前已提交渲染中的值，但不把读取到的 `theme` 自动加入连接 Effect 的依赖。两者都能处理“读取较新值”，却有不同的调用约束和数据流含义。
2. **调用位置有语义边界。** 它服务于由 Effect 建立的外部订阅、定时器或连接中的回调；普通点击事件应直接用事件处理器读取当次 render 的值。把 Effect Event 当通用稳定回调传给子组件，会让依赖关系与调用时机变得不清楚，也不符合 Hook 的使用约束。
3. **决定外部同步关系的值仍留在 deps。** 例如 `roomId` 改变必须断开旧连接并连接新房间，所以 `[roomId]`；只改变通知外观的 `theme` 可由 Effect Event 在连接事件触发时读取，不需要因此重连。判断方法是：这个值变了，是否必须停止并重建外部资源？

更多情境题及答案：[全章节自检题](assessments/全章节自检题.md) · [参考答案](assessments/全章节自检题-参考答案.md)。
<!-- ANSWER-GUIDE-END -->
