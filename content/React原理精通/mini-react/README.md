# Mini React：用实现验证 React 架构理解

> 目标不是造一个可用于生产的 React，而是用最少代码复现最重要的**不变量**。下面的 Phase 是完整练习路线；仓库中的可运行版本实现了核心子集，未实现的阶段明确标注为后续练习，不冒充 React v19.3.0 官方实现。

## 先点击仓库内的真实源码

这是可运行代码，不再只是伪代码。点击以下链接会把右侧切换到「本项目源码」并定位函数：

1. [createElement：先产生 UI 描述](project:mini-react/src/element.mjs#createElement)
2. [createRoot：保存 current 与待处理工作](project:mini-react/src/runtime.mjs#createRoot)
3. [reconcileChildren：按 key/type 匹配 Fiber](project:mini-react/src/runtime.mjs#reconcileChildren)
4. [performUnitOfWork：显式 DFS](project:mini-react/src/runtime.mjs#performUnitOfWork)
5. [useState：Hook 链与更新入队](project:mini-react/src/runtime.mjs#useState)
6. [enqueue 与 processQueue：环形队列和 Rebase](project:mini-react/src/queue.mjs#processQueue)
7. [commitRoot：完成后才修改 Host](project:mini-react/src/runtime.mjs#commitRoot)
8. [JSON/DOM Host 接口](project:mini-react/src/host.mjs#createJsonHost) 与 [行为测试](project:mini-react/test/runtime.test.mjs#L1)

本地执行 `npm run mini:demo` 看 1 → 2 → 22 的结果，执行 `npm run mini:test` 跑完整测试。在 [createRoot](project:mini-react/src/runtime.mjs#createRoot) 中还可找到 `runAsync({ maxUnitsPerSlice })`：它用 MessageChannel 分段执行，测试会在两段之间插入更紧急的更新。源码固定在仓库 `mini-react/`，构建时自动加入本项目源码索引。

| 已实现并有测试 | 仍需作为练习扩展 |
|---|---|
| Element、Fiber DFS、current/WIP、key/type 身份、Commit、Hook 链、UpdateQueue、两种 Lane 的 Rebase、MessageChannel 简化分片、Effect、Context、简化 Suspense、JSON/DOM Host、轨迹记录 | React 的完整 Scheduler/帧预算、完整 bailout、React DOM 事件与受控输入、真实 Hydration/RSC、完整 Profiler 与 Compiler |

教学版用手动 `flush({ maxUnits })` 或 `runAsync({ maxUnitsPerSlice })` 展示可切片 Render；Commit 会重组 Host children；Suspense 只演示 pending → fallback → ping → retry。这些都不是官方源码的逐行简写。学完每个函数要再切回「React 官方源码」核对真实实现。

## 总原则

你的 Mini React 不需要复制 React 19.3 的所有优化，但必须保持模型正确：

```text
描述与 Host 分离
Render 与 Commit 分离
current 与 WIP 分离
Hook 状态跨函数调用持久化
Update 可以排队
低优先级 Update 可被跳过且以后重放
Render 可以被切片
Commit 产生可观察变化
identity 决定 state preservation
```

## Phase 0：测试基座

先准备：

```text
createRoot
render helper
fake host tree 或 jsdom
assert tree
assert render count
assert effect log
```

任何后续功能都必须有回归测试。

## Phase 1：JSX / React Element

实现：

```js
createElement(type, config, ...children)
```

Element 至少区分：

```text
type
key
props
```

测试：key 不进入普通 props；文本 child 能标准化。

**不变量：Element 是描述，不是 Host Node。**

## Phase 2：Fiber Tree 与显式 DFS

Fiber 至少：

```js
{
  tag,
  type,
  key,
  stateNode,
  return,
  child,
  sibling,
  alternate,
  pendingProps,
  memoizedProps,
  memoizedState,
  flags,
}
```

实现：

```text
performUnitOfWork
beginWork
completeUnitOfWork
completeWork
```

测试：给固定树打印 begin/complete 顺序，必须与手算 DFS 一致。

**不变量：遍历进度保存在显式结构中，而不是只能依赖递归 call stack。**

## Phase 3：Current / WIP 双缓冲

实现：

```text
root.current
createWorkInProgress
alternate
```

Render 时不能修改 current 的已提交 Host 结果。

测试：故意让 Render 中途抛错，current host tree 仍保持上一次提交结果。

## Phase 4：Reconciliation + Flags

先支持单节点，再支持数组。

Flags：

```text
Placement
Update
Deletion
```

Render 只记录 flags，Commit 才操作 Host。

测试：

```text
旧 A → 新 A（复用）
A → B（替换）
[A,B,C] → [B,A,D]（稳定 key）
```

## Phase 5：Commit

实现最少 Host API：

```text
createInstance
appendChild
insertBefore
removeChild
commitUpdate
```

测试：Render 完成但 Commit 未执行前，用户可观察 host tree 不应变化。

## Phase 6：Hooks Dispatcher + Hook List

实现：

```text
currentlyRenderingFiber
workInProgressHook
currentHook
mount dispatcher
update dispatcher
```

先实现 `useState` 的 Hook node：

```js
{
  memoizedState,
  baseState,
  baseQueue,
  queue,
  next,
}
```

测试：

```jsx
const [a, setA] = useState('A')
const [b, setB] = useState('B')
```

反复 render 后不能串状态。

## Phase 7：UpdateQueue

先实现 pending 环形链表：

```text
U3(pending)
 ↓next
U1 → U2 → U3
```

支持 value update 与 function update。

测试：

```js
setCount(c => c + 1)
setCount(c => c + 1)
setCount(c => c + 1)
```

最终必须是 +3。

## Phase 8：Lane 简化模型 + Rebase

用 bitmask：

```js
const SyncLane = 0b01
const TransitionLane = 0b10
```

Update 携带 lane；本轮只消费 renderLanes 中的 Update。

实现：

```text
baseState
baseQueue
clone skipped update
replay
```

测试必须覆盖：低优先级 U1 被跳过、高优先级 U2 执行、后续 Transition render 重放后语义仍正确。

**这是 Mini React 从“玩具 Hook”进入真正 React 模型的分水岭。**

## Phase 9：Scheduler / Yield

不复制 React Scheduler，只实现 cooperative scheduling：

```text
MessageChannel
performance.now()
shouldYield
```

让 `workLoopConcurrent` 在 deadline 前处理部分 Fiber，之后保存 `workInProgress`。

测试：大树 Render 中插入高优先级输入任务，证明系统能让出主线程并继续。

## Phase 10：Effects

明确两层：

```text
Hook list：保持 Hook identity
Effect structure：Commit 阶段执行 create/destroy
```

支持：

```text
deps Object.is compare
layout effect
passive effect
cleanup
```

测试 mount/update/unmount。

## Phase 11：Context + Bailout

实现简单 Provider stack、context dependency；实现 props/state/lanes 下的 bailout。

关键测试：父组件 render 不意味着所有 child 都必须执行；但 childLanes 有工作时不能错误跳过子树。

## Phase 12：Suspense 简化模型

允许 read resource 返回：

```text
fulfilled → value
pending → internal suspension signal + tracked thenable
rejected → error
```

边界捕获 suspension，渲染 fallback；thenable settle 后 ping root。

不要只实现 `catch (promise)`，而是模仿“资源状态 + 控制流 + retry lane”的分层思想。

## Phase 13：Custom Renderer 分离

把 DOM/JSON host 操作抽出成 Host Config，Reconciler 不允许直接调用 DOM API。

测试同一 Reconciler 可以接：

```text
DOM host
JSON host
```

## Phase 14：Profiler instrumentation

在 begin/complete/commit 关键位置打时间戳，输出：

```text
component render duration
root render duration
commit duration
```

用一个真实性能实验证明：减少 React render 与减少 browser layout 是不同优化。

## 最终架构图

```text
User API
  ↓
Element
  ↓
Fiber Reconciler
  ├─ Hooks / UpdateQueue
  ├─ Lanes
  ├─ WorkLoop
  ├─ Reconciliation
  └─ Flags
       ↓
Commit
       ↓
Host Config
       ↓
DOM / JSON / Other Host
```

## 最终验收

你的 Mini React 至少要用测试证明：

1. Hook identity 由固定调用序列维护。
2. state 是 render snapshot，dispatch 是 enqueue + schedule。
3. 不同 lane 更新可以被跳过并正确 rebase。
4. current 不被未 Commit 的 WIP 污染。
5. key/type 决定 Fiber identity 与 state preservation。
6. Render 可 yield，Commit 才产生 Host 可观察变化。
7. Effect cleanup/create 有明确 phase。
8. Renderer 与 Reconciler 可以替换 Host 而分离。

当你能独立实现并解释这些测试失败时，源码理解已经远高于“读过 React 源码”。
