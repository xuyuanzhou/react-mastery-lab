# 21. useSyncExternalStore：外部可变状态、Snapshot 与 Tearing

> 源码定位：点击 [mountSyncExternalStore](source:packages/react-reconciler/src/ReactFiberHooks.js#mountSyncExternalStore)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。
> 学完即练：[对应实验](labs/08-ExternalStore-Tearing.md)。先写预测，再观察源码和结果。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Concurrent Rendering` | 并发渲染 |
| `Hydration` | 水合/复用服务端 DOM |
| `SSR` | 服务端渲染 |
| `Context` | 上下文 |
| `Tearing` | 撕裂/并发读取不一致 |
| `External Store` | 外部状态仓库 |
| `Mount` | 挂载 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 这是理解“Concurrent React 为什么不能随便订阅外部全局变量”的关键章节。

## 本章掌握标准

你要能解释：

```text
为什么 useEffect + setState 订阅 store 在并发模型中可能不够
什么是 tearing
getSnapshot 为什么必须稳定
subscribe 与 snapshot 的协议
SSR 为什么需要 getServerSnapshot
```

## 源码锚点

```text
packages/react/src/ReactHooks.js
packages/react-reconciler/src/ReactFiberHooks.js
```

关键词：

```text
mountSyncExternalStore
updateSyncExternalStore
subscribeToStore
updateStoreInstance
pushStoreConsistencyCheck
```

## 1. 外部 Store 为什么特殊

React 自己的 state：

```text
UpdateQueue + Lane
→ React 知道状态版本
→ Render 基于某个一致 snapshot
```

外部 mutable store：

```js
store.value = ...
```

可能在 React 两次 Fiber unit 之间随时变化。

## 2. 什么是 Tearing

假设同一次并发 Render：

```text
Component A 读取 store = 1
React yield
外部 store 变为 2
Component B 读取 store = 2
```

如果最终把 A(1) + B(2) 一起 commit：

> 同一帧 UI 来自两个不同 store 版本。

这就是 tearing。

## 3. 为什么 getSnapshot 是核心

API：

```js
useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)
```

不是：

```text
“给 React 一个 getValue()”
```

而是提供一个可比较的 snapshot 协议。

React 可以在 render/commit 附近重新检查：

```text
之前读取的 snapshot
vs
现在 store snapshot
```

若不一致，需要重新同步更新，避免提交撕裂 UI。

## 4. getSnapshot 必须缓存稳定结果

错误：

```js
getSnapshot() {
  return { todos: store.todos }
}
```

每次都返回新对象，会让 React 认为 snapshot 一直变化。

正确方式：

```text
如果底层 store 没变
→ getSnapshot 返回 Object.is 相等的值/缓存对象
```

## 5. subscribe 的语义

```js
subscribe(callback)
```

必须：

```text
注册 store change listener
返回 unsubscribe
```

React 用它把外部更新重新转成 React 可调度工作。

## 6. 为什么叫 Sync External Store

“Sync”不是说所有 UI 都同步 render。

重点是：

> 外部 store 的可观察值必须与 React commit 保持同步一致，不能让 concurrent rendering 产生 tearing。

某些外部 store 更新需要更保守的同步检查，这是为了 correctness。

## 7. SSR 的 getServerSnapshot

服务端和 hydration 首次客户端读取需要同一个可匹配初始 snapshot。

否则：

```text
server HTML = snapshot A
client hydration first snapshot = B
```

可能导致 hydration mismatch 或 UI 不一致。

## 8. 与 Context / Redux / Zustand 的关系

状态库可以内部使用 `useSyncExternalStore` 或等价协议来接入 Concurrent React。

架构上：

```text
Context：React 自己知道 value dependency
External Store：值活在 React 外，必须提供 snapshot/subscribe 协议
```

## 9. 实验：制造 tearing 思维实验

写一个外部 store，让 `getSnapshot` 在 render 期间故意变化，观察 React 的一致性检查/重渲染行为。

断点：

```text
updateSyncExternalStore
pushStoreConsistencyCheck
updateStoreInstance
```

## 10. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么 `useEffect(() => store.subscribe(...))` 的简单实现可能在 concurrent 模型下有一致性窗口？
2. getSnapshot 为什么不能每次返回新对象？
3. React 自己的 useState 为什么较少面临同样 tearing 问题？
4. getServerSnapshot 与 hydration 有什么关系？

<!-- CHAPTER-CHECK-START -->
## 本章情境自检与参考解析

**先独立作答：** 外部 store 在 Render 与订阅建立之间变化，为什么只在 Effect 中 subscribe 可能不够？

**参考解析：** 会有一致性窗口；useSyncExternalStore 结合 snapshot、订阅和一致性检查，要求稳定的 getSnapshot 结果。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
