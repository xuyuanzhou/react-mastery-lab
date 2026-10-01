# 36. 浏览器 Event Loop 与 React 调度边界

> 源码定位：点击 [ensureRootIsScheduled](source:packages/react-reconciler/src/ReactFiberRootScheduler.js#ensureRootIsScheduled)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Priority` | 优先级 |
| `Concurrent Rendering` | 并发渲染 |
| `Paint` | 绘制 |
| `Event Loop` | 事件循环 |
| `Microtask` | 微任务 |
<!-- TERMS-AUTO-END -->


## 1. 三个系统不要混在一起

```text
JavaScript Event Loop
React Scheduler
React Reconciler/Lanes
```

Event Loop 是宿主平台机制；Scheduler 是 React 的合作式任务调度工具；Lanes 是 reconciler 内部的更新优先级/集合模型。

## 2. 宏任务 / 微任务 / Paint

典型浏览器循环可粗略理解：

```text
执行一个 task
→ 清空 microtasks
→ 浏览器获得机会做 rendering update
→ 下一 task
```

但浏览器是否 paint 以及精确时机由宿主决定，不能把“每个宏任务后必定 paint”当定律。

## 3. Root Scheduler 为什么使用 microtask

React 可以先把同一事件循环片段内多个 root/update 的调度信息聚合，再在 microtask 中计算每个 root 下一步要做什么。这和“微任务优先级比 React lane 高”是两件不同的事。

## 4. MessageChannel / Scheduler host loop

Scheduler 常通过宿主回调机制获得执行机会，并通过 deadline/`shouldYield` 做 cooperative yielding。它不能真正抢占正在执行的一段 JavaScript；所谓“中断”发生在 React 主动检查让出点之后。

## 5. 自检

1. 为什么 React concurrent rendering 不是 OS 线程抢占？
2. microtask 和 lane priority 为什么不能直接类比？
3. 一个很慢的用户函数为什么仍能卡住 Concurrent React？

<!-- ANSWER-GUIDE-START -->
## 本章自检参考解析

> 建议先遮住本节独立作答。每题至少说出“现象 → 内部机制 → 反例/边界”，再点击本章源码锚点核对。

1. **Concurrent React 运行在普通 JavaScript 主线程上。** React 在自己掌控的 Fiber 工作单元之间检查是否让出，然后由浏览器调度下一段；操作系统不会在任意 JS 指令中途替它抢占并恢复。
2. **Microtask 是浏览器事件循环中的队列时机，Lane 是 React 更新选择的优先级集合。** 某个 microtask 可以安排不同 Lane 的工作；某个 Lane 的工作也不等于“一定在 microtask 完成”。把它们一一对应会错判 commit 与浏览器绘制顺序。
3. **长同步函数没有可让出的边界。** 如果组件 Render 中执行 200ms 计算，React 进入该函数后无法在中间检查 `shouldYield()`；用户输入仍会卡住。应拆分计算、缓存、移出主线程或减少工作量，并用 Performance 面板验证。

更多情境题及答案：[全章节自检题](assessments/全章节自检题.md) · [参考答案](assessments/全章节自检题-参考答案.md)。
<!-- ANSWER-GUIDE-END -->
