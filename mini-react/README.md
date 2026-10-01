# 可运行的 Mini React 教学实现

这是仓库内**真正可运行、可测试、可点击阅读**的简化实现。它与 React v19.3.0 官方源码分开存放，目标是验证机制，不是替代 `react` 包。

运行：

```bash
npm run mini:demo
npm run mini:test
```

从 [入口](../content/React原理精通/mini-react/README.md)进入课程后，可以点击右侧「本项目源码」查看以下文件：

| 文件 | 重点 |
|---|---|
| `src/element.mjs` | Element 描述与 child 标准化 |
| `src/runtime.mjs` | Fiber DFS、current/WIP、Hook、Effect、Commit |
| `src/queue.mjs` | pending 环形链表、Lane 跳过与 rebase |
| `src/host.mjs` | JSON / DOM Host 分离 |
| `test/runtime.test.mjs` | 用行为验证不变量 |

已实现：Element、Fiber `child/sibling/return`、分片 Render、`runAsync` 的 MessageChannel 自动分片、current/WIP、按 key/type 的身份复用、Commit 才公布 Host 结果、`useState` Hook 链、环形 UpdateQueue、两种 Lane 的 rebase、简化 layout/passive Effect、Context、简化 Suspense、JSON/DOM Host、时间/轨迹记录。

刻意未复刻：React 的完整 Scheduler、DOM 事件系统、受控输入、Context 依赖传播/bailout、Render 阶段更新、真实 Suspense/Hydration/RSC、React Compiler。`flush({maxUnits})` 是手动可复现的工作切片，`runAsync({maxUnitsPerSlice})` 用 MessageChannel 把工作分段，但没有浏览器帧预算或 React Scheduler 的优先级策略；`TransitionLane` 仅代表教学优先级。DOM Host 在 Commit 时重组子节点。所有这些差异都应与右侧官方 v19.3.0 源码逐项对照，不应把 Mini React 的函数名和时序当成官方行为。
