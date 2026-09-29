# 27. Automatic Batching、Root Microtask 与 flushSync

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `createRoot` | 创建 React 根 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Render Snapshot` | 渲染快照 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Suspense` | 异步等待边界 |
| `SSR` | 服务端渲染 |
| `Batching` | 批处理 |
| `Automatic Batching` | 自动批处理 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** Batching 是更新调度体系的结果，不应该简化成“React event handler 结束后统一 setState”。

## 本章掌握标准

你要能解释：

```text
为什么多个 setState 常只产生一次可见 commit
为什么 modern createRoot batching 范围更广
Root Scheduler microtask 做什么
flushSync 为什么是 escape hatch
为什么 batching 不等于 queue 中只剩一个 update
```

## 源码锚点

```text
packages/react-reconciler/src/ReactFiberRootScheduler.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-dom/src/shared/ReactDOMFlushSync.js
```

## 1. Batching 不等于“合并 state 值”

```js
setA(1)
setB(2)
setC(3)
```

可能 batch 成较少的 Render/Commit。

但三个 Update 仍可能分别存在于各自 queue 中。

因此：

```text
Batching = 调度/提交边界优化
不是 = 把所有 Update 对象压成一个
```

## 2. React 18+ Automatic Batching 的心智模型

现代 Root 中，同一 browser task 内来自：

```text
React event
Promise callback
setTimeout 等
```

的多个更新，在适当条件下可以被统一批处理。

不要再背旧规则：

```text
“只有 SyntheticEvent batching”
```

## 3. React 19.3 Root microtask

`ensureRootIsScheduled`：

```text
root 加入 schedule
→ 确保 microtask
```

microtask 中：

```text
processRootScheduleInMicrotask
→ 扫描 scheduled roots
→ scheduleTaskForRootDuringMicrotask
→ 选择 next lanes
```

这给同一 task 内的更新提供一个自然收集窗口。

## 4. 为什么不能说“batching 就是 microtask”

因为 batching correctness 还依赖：

```text
UpdateQueue
lanes
execution context
sync callback handling
Root pending state
commit scheduling
```

microtask 是调度边界，不是全部实现。

## 5. State snapshot 与 batching

```js
setCount(count + 1)
setCount(count + 1)
setCount(count + 1)
```

三次 action 都基于当前 render snapshot 的 `count`。

最终常只得到 +1，不是因为 batching “丢了两个 update”，而是因为三个 action 都是替换为同一个值。

函数式：

```js
setCount(c => c + 1)
```

让 queue 在 reducer 处理时以上一个计算结果为输入。

## 6. flushSync

`flushSync` 的语义：

> 请求 React 在这个边界内把可同步处理的工作尽快 flush，使调用返回时 DOM 更接近已提交状态。

典型需要：

```text
和第三方 imperative browser API 协调
必须立即测量刚 setState 后的 DOM
```

但它会破坏正常调度优化，可能迫使 Suspense fallback 或额外工作，因此不能当常规“解决异步 setState”的工具。

## 7. 实验

分别在：

```text
click handler
Promise.then
setTimeout
flushSync
```

中连续 setState，记录：

```text
render count
commit count
DOM 读取时机
```

## 8. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么 batching 后 UpdateQueue 仍然需要保存多个 Update？
2. 三次 `setCount(count+1)` 只 +1 与 batching 的真正关系是什么？
3. Root microtask 为什么有助于 batching，但为什么 batching 又不等于 microtask？
4. flushSync 为什么是 escape hatch？
