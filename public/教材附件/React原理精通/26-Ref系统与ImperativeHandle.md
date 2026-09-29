# 26. Ref 系统：Object Ref、Callback Ref、Commit Attach/Detach 与 Imperative Handle

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
| `Ref` | 引用 |
| `Imperative Handle` | 命令式句柄 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `DOM` | 文档对象模型 |
| `Layout` | 布局/回流 |
| `Fragment` | 片段 |
| `Mount` | 挂载 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** React 19 支持 ref 作为 function component 的 prop 使用，Ref 心智模型比“拿 DOM”更广。

## 本章掌握标准

你需要能区分：

```text
useRef 的 Hook state
Host ref attach/detach
callback ref
forwardRef 历史角色
ref as prop
useImperativeHandle
Fragment refs
```

## 源码锚点

```text
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberCommitEffects.js
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react/src/ReactForwardRef.js
```

## 1. useRef 本身只是稳定容器

```js
const ref = useRef(initial)
```

Hook 保存：

```text
memoizedState → { current: initial }
```

后续 render 复用同一个对象身份。

修改：

```js
ref.current = x
```

不创建 state Update，因此不触发 Render。

## 2. DOM ref 是 Commit 行为

```jsx
<div ref={ref} />
```

Render 只能记录：

```text
这个 Fiber 有 ref
```

真实：

```text
ref.current = DOM node
```

必须等 Host node 已经创建/提交到正确阶段。

所以 attach/detach 属于 Commit 语义。

## 3. Callback Ref

```jsx
<div ref={node => { ... }} />
```

它本质上是 commit callback。

因此必须能够正确处理：

```text
attach(node)
detach(null or cleanup semantics)
StrictMode DEV reconnect
```

不能把 callback ref 当 render callback。

## 4. useImperativeHandle

组件不一定想把完整 DOM/API 暴露给父级。

```js
useImperativeHandle(ref, () => ({
  focus() { inputRef.current.focus() }
}))
```

它建立：

```text
Parent Ref
→ controlled public imperative interface
→ internal host nodes hidden
```

架构上属于封装边界，而不只是 Hook 技巧。

## 5. React 19 的 ref as prop

现代 function component 可以直接接收 `ref` prop（配合相应 React 19 语义），这降低了 `forwardRef` 的必要性。

学习源码时要区分：

```text
历史 public API forwarding mechanism
vs
Fiber commit ref machinery
```

后者仍然存在。

## 6. Fragment Refs

React 19.3 稳定 Fragment refs。

它说明 Public Ref Instance 不再必须一一对应单 Host node。

理解重点：

```text
一个 Fiber/public abstraction
可以代表一组平台节点行为
```

## 7. 为什么 render 时读取 ref.current 常常危险

Ref 是 mutable escape hatch。

如果 Render 依赖：

```js
if (ref.current...) return ...
```

React 无法像 state/props 那样追踪这个依赖的更新。

而 concurrent/replay render 中，mutable external value 还可能产生不一致。

因此 Ref 更适合：

```text
imperative handle
DOM access after commit
保存不驱动 UI 的 mutable value
```

## 8. 实验

断点：

```text
commitAttachRef
safelyDetachRef
mountImperativeHandle
updateImperativeHandle
```

观察：

```text
ref.current 在 render/layout/passive 各阶段是什么
```

## 9. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. useRef 为什么不触发 render？
2. 为什么 host ref attach 必须在 Commit？
3. useImperativeHandle 解决的是状态问题还是封装问题？
4. Fragment refs 为什么证明 ref 不必等于单 DOM node？
