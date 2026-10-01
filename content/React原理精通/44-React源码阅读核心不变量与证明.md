# 44. React 源码阅读核心不变量与证明

源码版本会变化，但系统必须维持一些 Invariant（不变量）。掌握不变量，比背函数名更接近精通。

## 不变量 1：已提交 UI 必须保持一致

Render 可以中断、重做、丢弃；但 Commit 必须把一套完整结果提交给宿主环境。因此 React 用 current / workInProgress 双树，把候选工作和已提交 UI 隔离。

## 不变量 2：同一函数组件的一组 Hook 必须稳定对应

React 需要在新 Render 中找到“上一次的第 N 个 Hook”。因此 primitive Hooks 的调用拓扑必须稳定。条件 Hook 会破坏映射。

## 不变量 3：被低优先级跳过的 Update 不能丢

否则未来高低优先级重新合并时，最终状态会错误。`baseState/baseQueue` 正是为了保留可重放基线。

## 不变量 4：Reconciliation 必须维护 identity（身份）

State 与 Fiber 身份绑定。`type + key + position` 的匹配决定复用还是 remount（重新挂载）。这就是 key 会影响状态保留的根本原因。

## 不变量 5：Reconciler 不应该硬编码 DOM

否则 React 无法支持 Native 或自定义 Renderer。Host Config（宿主配置）把“计算 UI”与“如何创建/插入宿主节点”隔离。

## 不变量 6：读取外部可变数据必须保证并发一致性

Concurrent Render 期间外部 store 可能变化，React 需要 snapshot 检查与同步恢复机制，这解释了 `useSyncExternalStore` 存在的理由。

## 如何证明你理解

对每个不变量，至少能做到：

1. 给出一个违反它会出错的最小反例。
2. 指出 React 用什么数据结构维护它。
3. 找到 React 19.3 对应源码文件/函数。
4. 用断点观察一次真实执行。
5. 在 Mini React 中实现一个简化版本。

## 把抽象不变量变成可观察证据

| 不变量 | 最小反例 | 可观察的源码证据 |
|---|---|---|
| 未提交树不污染 current | Render 一半时子组件抛错 | 对照 `root.current` 与 WIP，确认切换只在成功 Commit 后 |
| Hook 顺序稳定 | 第二个 `useState` 放入条件分支，再切换条件 | 跟踪 `currentHook` / `workInProgressHook` 推进和 Hook 数量校验 |
| 被跳过的更新不丢 | 同一 Hook 队列先低优先级 `+10`、后高优先级 `×2` | 跟踪 `baseState`、`baseQueue`，最终按原顺序得 22 |
| key 维护身份 | 列表交换位置，分别使用稳定 key 与下标 key | 比较 Fiber 复用与局部 state 归属 |

**自检：** “我在代码中看到了 `alternate`，所以双缓冲已经得到证明”成立吗？**参考答案：** 不成立。字段存在只是实现线索；证明还需要观察失败或中断时 current 保持旧 UI、成功 Commit 后 root 指针切换，并排除在 Render 中直接污染可见宿主树的路径。证据应覆盖正常和反例两种执行。
