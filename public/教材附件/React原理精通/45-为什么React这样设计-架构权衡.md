# 45. 为什么 React 这样设计：架构权衡

## 1. 为什么不用“直接修改 DOM”作为核心 API

直接 DOM 操作本身并不一定慢；问题是大型 UI 中状态与 DOM 的同步复杂度。React 用声明式 UI + Reconciliation 把“期望 UI”与“增量宿主修改”分离。

代价：运行时需要 Fiber、Diff、调度、内存结构；收益：组件化状态模型、一致更新、并发能力、跨 Renderer。

## 2. 为什么 Fiber 不是简单递归树

递归实现更直观，但执行进度存在 JS 调用栈中，难以让用户态调度器控制。Fiber 把 continuation（后续工作）显式存成对象关系，换来可调度性。

代价：实现复杂度和内存开销显著上升。

## 3. 为什么 Hooks 用顺序而不是名字

Hook 是普通函数调用，不需要编译器为每个调用生成稳定 ID；按调用顺序可以非常轻量地挂接链表状态。

代价：产生 Rules of Hooks（Hook 规则），必须保持调用拓扑稳定。

## 4. 为什么 Effect 不等于生命周期

Class 生命周期以“组件阶段”为中心；Effect 以“同步一个外部系统”为中心。一个组件可以有多个完全独立的 Effect，每个 Effect 都有自己的 setup/cleanup 生命周期。

## 5. 为什么 Lane 比单一 priority 更复杂

系统不仅要知道“谁更急”，还要表达多个更新集合、合并、跳过、entangle（纠缠）、transition、retry 等关系。Lane 的 bitmask 集合模型适合这些运算。

## 6. 为什么 Concurrent Render 不等于多线程

React 主体仍通常在 JS 主线程执行。Concurrent 的核心是可中断、可恢复、可重做的调度语义，不是同时在多个 CPU 核心执行组件。

## 7. 为什么现代 React 把更多工作前移到 Compiler / Server

运行时优化有成本。Compiler 可以静态分析哪些值/计算可缓存；Server Components 可以把部分组件执行与依赖留在服务器。整体方向是把“不必须在客户端完成的工作”移出客户端关键路径。
