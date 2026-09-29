# 30. useEffectEvent 与闭包模型：Reactive 与 Non-Reactive Effect Logic

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
