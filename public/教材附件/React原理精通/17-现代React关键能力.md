# 17. 现代 React 总览：从 Fiber Runtime 到 Async UI、Server 与 Compiler

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Host Config` | 宿主配置/渲染器平台适配层 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Transition` | 过渡更新 |
| `Memoization` | 记忆化/缓存计算结果 |
<!-- TERMS-AUTO-END -->


> **源码/产品基线：React 19.3 + React Compiler 1.x。** 这一章只建立地图；具体机制分别在后续专题深入。

## 1. 现代 React 的能力树

现代 React 不能再只用：

```text
Component + Hooks + Virtual DOM
```

来概括。

更准确：

```text
Declarative Component Model
        ↓
Fiber Reconciler
        ↓
Lanes / Root Scheduler
        ↓
Concurrent Render
        ↓
Suspense / Activity / Transition
        ↓
DOM Renderer + Events + ViewTransition
        ↓
Fizz SSR / Hydration / PPR
        ↓
RSC / Flight
        ↓
Compiler / Rules of React
```

## 2. Transition：不是 debounce，也不是后台线程

`startTransition` / `useTransition` 改变的是 React 更新语义：

```text
urgent work
可以优先提交

transition work
可以延迟、中断、重启
```

React 19.3 中无关 transition 能更独立地渲染，说明具体 lane 协调策略仍会演进。

稳定结论只有：

> Transition 是 React Scheduler/Reconciler 中的非紧急更新语义。

## 3. useDeferredValue

它把“当前 value”与“允许滞后的 UI value”分开。

```text
input state = 最新
expensive result = deferred snapshot
```

它不是 setTimeout；底层仍然通过 lane/deferred work 与 Suspense 协调。

## 4. Activity

React 19.2 引入 `<Activity>`，用于控制 UI 区域的可见/后台状态和优先级。

理解它要联系：

```text
Offscreen-like state retention
hidden subtree
state preservation
effect connect/disconnect
background pre-render
```

它说明 React 的生命周期已经不只是：

```text
mount → update → unmount
```

还存在“保留但隐藏/后台”的状态。

## 5. useEffectEvent

用于把 Effect 中的某些“事件式逻辑”从 reactive dependency 中分离。

核心问题：

```text
Effect 的连接条件 = roomId
通知样式 = theme
```

如果 theme 变化不应导致重新连接，就需要把“同步过程”和“被同步系统触发的事件逻辑”分开建模。

它不是“绕过 exhaustive-deps 的逃生口”。

## 6. use()

`use()` 可以读取：

```text
thenable
context 等 React 支持的 usable
```

它的重要性是把“读取资源可能 suspend”纳入 React Render 控制流。

在 19.3 的 thenable 路径中，React 使用内部 opaque suspension exception，而不是把真实 thenable 直接暴露为 throw 值。

## 7. Actions / useActionState / useOptimistic

现代 React 将 mutation flow 建模为：

```text
start async action
→ pending
→ optimistic UI
→ server/client mutation
→ success commit or error recovery
```

这让表单、Transition、异步状态、错误边界之间可以更一致地协作。

## 8. ViewTransition

React 19.3 将 `<ViewTransition>` 稳定化。

它不是简单 CSS wrapper，而是把 React 的 Transition commit 与浏览器 View Transition API 协调。

架构连接：

```text
React knows old/new tree
+ Transition semantics
+ commit lifecycle
+ browser view transition capture
```

因此 ViewTransition 必须放在 Commit/Scheduler 语境下理解。

## 9. Fragment Refs

React 19.3 稳定 Fragment refs，让一组没有额外 wrapper DOM 的子节点可以暴露组合式平台行为。

它改变的是：

```text
“ref 必须指向单一 host node”
```

这个长期假设的一部分。

学习时要区分：

```text
Fiber identity
Host node(s)
Public ref instance
```

## 10. browser()

React DOM 19.3 新增 `browser()`，可和 `use()` + Suspense 结合表达 browser-only subtree。

这把：

```text
“这段代码在服务端不成立”
```

从随意 `typeof window` 条件分支提升为更明确的 server/client render 语义。

## 11. React Compiler 1.x

React Compiler 已是稳定能力。

不要只记：

```text
“自动 useMemo”
```

更准确：

```text
JavaScript/JSX AST
→ Compiler HIR
→ control-flow/data-flow/mutation analysis
→ Rules of React validation
→ safe memoization transformation
→ runtime helpers
```

它能自动 memo 的根本前提是组件遵守 React 的纯度与数据流规则。

## 12. Performance Tracks

React 19.2 提供 React Performance Tracks，用浏览器 Performance 时间线展示：

```text
React work
Scheduler work
Components
network/server interactions（取决于工具环境）
```

源码精通不应该只会读内部函数，还应该能用生产级 profiling 工具验证性能假设。

## 13. PPR / Streaming / RSC

现代 React 的 server 架构是多层协议：

```text
RSC/Flight：组件数据模型
Fizz：HTML streaming renderer
Hydration：客户端接管 server DOM
PPR：预渲染与后续恢复
```

它们不是四种互斥渲染模式，而是可以组合的层。

## 14. 正确学习顺序

```text
Fiber / Render / Commit
→ Hooks / queues
→ Lane / Root Scheduler
→ Suspense / Transition / Activity
→ Event / DOM renderer
→ SSR / Hydration
→ RSC / Flight
→ Compiler
```

如果从 Actions、RSC 或 Compiler 直接开始，很容易只会 API 而没有 runtime model。

## 15. 精通标准

当看到一个新 React API，你应该自动问：

```text
它在 Render 还是 Commit 起作用？
它把数据存在哪？
它是否创建 Update？
Update 属于什么 lane？
是否可能 suspend/retry？
是否影响 Host Config / DOM？
服务端是否有另一条实现？
Compiler 是否会改写它周围的数据流？
```

能用这组问题分析未来 API，才算真正具备架构级 React 能力。
