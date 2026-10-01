# 19. Error Boundary 与错误恢复：Render Error、Commit Error、Root Recovery

> 源码定位：点击 [createClassErrorUpdate](source:packages/react-reconciler/src/ReactFiberThrow.js#createClassErrorUpdate)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Commit Phase` | 提交阶段 |
| `Passive Effect` | 被动副作用 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Suspense` | 异步等待边界 |
| `Thenable` | 类 Promise 对象 |
| `Hydration` | 水合/复用服务端 DOM |
| `Ref` | 引用 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。**

## 本章掌握标准

你必须区分：

```text
Render Phase error
Suspense suspension
Commit Phase error
Hydration recoverable error
Root-level uncaught error
```

并知道它们为什么不能走完全相同的恢复路径。

## 源码锚点

```text
packages/react-reconciler/src/ReactFiberThrow.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react-reconciler/src/ReactFiberClassComponent.js
packages/react-reconciler/src/ReactFiberRoot.js
```

## 核心不变量

- 未完成 Render 产生的候选树可以丢弃，因此 render error 有机会重新选择 fallback。
- Commit 已经开始修改宿主环境，错误恢复必须更加谨慎。
- Suspense 的“暂时未就绪”不能和业务异常混淆。
- Error Boundary 只能捕获它架构上覆盖的子树/阶段，不是 JavaScript 全局 try/catch。

## 1. throw 是 React Render 控制流的一部分

Render 期间：

```text
Component()
→ throws value
→ WorkLoop 捕获
→ 判断 suspension / error
→ 沿 return 链寻找可处理 boundary
```

所以“组件 throw”并不自动等于整个应用崩溃。

## 2. Error Boundary 的两个 Class API

```text
static getDerivedStateFromError(error)
componentDidCatch(error, info)
```

可以理解为：

```text
Render recovery：计算 fallback state
Commit/reporting：记录错误/组件栈
```

这也是为什么两个 API 不应该简单合并成一个。

## 3. Render Error 的捕获路径

假设：

```text
App
└─ Boundary
   └─ Widget ← throw Error
```

React 会沿 Fiber.return 向上寻找能捕获的 Class boundary。

找到后，概念上：

```text
标记 boundary 需要 capture
→ enqueue error recovery update
→ 重新 render boundary
→ 输出 fallback
```

这是“Render 可重放”带来的恢复能力。

## 4. 为什么 Error Boundary 不能捕获自己 render 的错误

Boundary 自己 render fallback 时再 throw：

```text
当前 boundary 本身已经失败
```

React 只能继续向更高层找另一个 boundary/root。

这与 JS try/catch 中“catch 包住自己后续逻辑”的直觉不同。

## 5. Suspense 与 Error Boundary

```text
pending thenable → Suspense path
rejected thenable / Error → Error path
```

`use()` 读取 rejected thenable 时会抛 rejected reason，因此可进入 Error Boundary。

这说明一个资源具有三态：

```text
pending → Suspense
fulfilled → value
rejected → Error Boundary
```

## 6. Commit Phase Error

Commit 中可能执行：

```text
ref callback
class lifecycle
layout effect
passive effect
```

这些用户代码也可能 throw。

但此时 DOM 可能已经被部分修改，因此不能简单“撤销所有 mutation 然后重新 render”。

React 有专门 commit error capture 路径，把错误上报到最近可处理 boundary/root，并安排后续恢复。

关键思想：

> Render recovery 与 Commit recovery 的约束不同，因为是否已经产生外部可观察副作用不同。

## 7. Root Error Callbacks

现代 root 创建 API 可以有错误相关回调，例如不同类型的 caught/uncaught/recoverable error 报告能力会随版本演进。

架构层要区分：

```text
caught：有 boundary 处理
uncaught：最终没有 boundary
recoverable：React 能自行恢复但值得记录，例如某些 hydration 情况
```

## 8. Hydration Error

Hydration mismatch 不是普通组件业务 error。

React 可能：

```text
放弃某个 hydration 路径
→ 切换为 client rendering
→ 报 recoverable error
```

因此错误恢复还和 Renderer/Hydration 状态机有关。

## 9. 实验

分别让错误发生在：

```text
child render
useLayoutEffect
useEffect
ref callback
Event handler
setTimeout callback
```

观察 Error Boundary 哪些能捕获、哪些不能。

特别注意：

```text
Event handler 的异常不是 Render/Commit 树构建错误
```

不要假设 Error Boundary 是全局异常捕获器。

## 10. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么 Render error 更容易通过重新 render recovery？
2. 为什么 Commit error 不能简单 rollback DOM？
3. Suspense pending 和 rejected 为什么进入不同 boundary？
4. 为什么 Event handler error 不等价于 child render error？

<!-- CHAPTER-CHECK-START -->
## 本章情境自检与参考解析

**先独立作答：** Render 中抛错与 Commit 中执行副作用时报错，Error Boundary 能否按完全相同路径恢复？

**参考解析：** 不能；错误发生阶段不同，捕获和恢复路径不同，不能把所有异常当作普通组件 Render 错误。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
