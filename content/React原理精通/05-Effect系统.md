# 05. Effect 系统：useEffect / useLayoutEffect

> 源码定位：点击 [commitPassiveMountEffects](source:packages/react-reconciler/src/ReactFiberCommitWork.js#commitPassiveMountEffects)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。
> 学完即练：[对应实验](labs/05-Effect-Commit顺序.md)。先写预测，再观察源码和结果。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Passive Effect` | 被动副作用 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `stale closure` | 过期闭包/陈旧闭包 |
| `Closure` | 闭包 |
| `Flags` | 副作用标记 |
| `Ref` | 引用 |
| `DOM` | 文档对象模型 |
| `Layout` | 布局/回流 |
| `Paint` | 绘制 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 区分 Hook list 与 Effect ring
- 能解释 Insertion/Layout/Passive 三类 effect 的 commit 时机
- 能从 deps 比较解释 cleanup/create 的执行条件

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react-reconciler/src/ReactFiberCommitEffects.js
```

## 本章核心不变量

- Render 只登记 effect，副作用必须在合适 commit 阶段执行
- 旧同步必须先 cleanup 再建立新同步
- 依赖比较只决定是否需要重新同步，不是“生命周期模拟器”

---

## 先用白话理解：Effect 不是“组件渲染完后的万能回调”

Effect 的本质是：**让 React UI 与某个外部系统保持同步**。外部系统可以是网络连接、DOM API、第三方库、定时器、订阅。React 在 Render 中只记录“这个 Effect 需要执行”，不会直接执行副作用；真正的 setup/cleanup 在 Commit 相关阶段发生。

所以学习 Effect 时应问“我要和谁同步、什么时候开始同步、什么时候停止同步”，而不只是背 Mount/Update/Unmount。

---

## 1. Effect 不是生命周期语法糖

更准确的模型：

> Effect 描述“提交完成后，组件需要与某个外部系统进行同步”。

外部系统包括：

```text
DOM API
WebSocket
定时器
事件订阅
网络连接
第三方库
```

## 2. Hook 节点与 Effect 节点不是同一个东西

调用：

```js
useEffect(create, deps)
```

会有两个层面的数据：

```text
Hook 链表节点
  存在 Fiber.memoizedState

Effect 节点
  存在 FunctionComponent.updateQueue 的 effect 链
```

这是很多教程会混淆的地方。

## 3. Effect 数据结构

教学简化：

```js
type Effect = {
  tag,
  create,
  inst,
  deps,
  next,
}
```

FunctionComponent updateQueue 里保存一个环形 Effect list。

## 4. mountEffect

大致：

```text
mountEffect
 ↓
mountEffectImpl
 ↓
mountWorkInProgressHook
 ↓
设置 fiber flags
 ↓
pushSimpleEffect
```

简化：

```js
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook()
  currentlyRenderingFiber.flags |= fiberFlags

  hook.memoizedState = pushSimpleEffect(
    HookHasEffect | hookFlags,
    createEffectInstance(),
    create,
    deps
  )
}
```

重点：

> Render 阶段只是“登记 effect”，不是立即执行 `create`。

## 5. updateEffect 的 deps 比较

大致：

```text
读取旧 Effect.deps
 ↓
areHookInputsEqual(nextDeps, prevDeps)
 ↓
相同 → 不加 HookHasEffect
不同 → 标记本次需要重新执行
```

依赖比较基于类似：

```js
Object.is(nextDeps[i], prevDeps[i])
```

所以：

```js
useEffect(..., [{}])
```

每次都会认为变了。

## 6. cleanup 的真实语义

旧 effect 已执行：

```text
create()
 ↓
返回 destroy
```

下一次依赖改变：

```text
旧 destroy()
 ↓
新 create()
```

Unmount：

```text
destroy()
```

因此 Effect 应该被理解成一对：

```text
start synchronization
stop synchronization
```

## 7. Layout Effect 与 Passive Effect

大致时序：

```text
Render
 ↓
Commit Before Mutation
 ↓
Commit Mutation
   DOM 已改变
 ↓
Commit Layout
   ref
   useLayoutEffect
 ↓
浏览器有机会 Paint
 ↓
flushPassiveEffects
   useEffect
```

### useLayoutEffect

适合：

```text
读取布局
测量 DOM
同步修正位置
防止用户看到中间状态
```

风险：

> 它阻塞 Paint。

### useEffect

通常用于不要求 Paint 前完成的同步。

## 8. 为什么 effect 可能看起来“多执行一次”

开发 StrictMode 下 React 会主动进行额外的开发期检查，帮助暴露：

```text
缺少 cleanup
Render 有副作用
依赖错误
```

不能把开发期行为简单当生产语义。

## 9. Stale Closure

```js
useEffect(() => {
  const id = setInterval(() => {
    console.log(count)
  }, 1000)

  return () => clearInterval(id)
}, [])
```

因为 deps=[]，effect create 来自首次 render，callback 捕获首次 render 的 `count`。

底层不是“Effect 缓存变量”，而是：

```text
Effect.create
  指向某次 render 创建的函数对象
  ↓
函数闭包持有那次 render 的 lexical environment
```

## 10. 读源码时要追的函数

```text
mountEffect
updateEffect
mountEffectImpl
updateEffectImpl
pushSimpleEffect

commitHookEffectListUnmount
commitHookEffectListMount

flushPassiveEffects
flushPassiveEffectsImpl
```

掌握这些，useEffect 原理才算真正闭环。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**

<!-- CHAPTER-CHECK-START -->
## 本章情境自检与参考解析

**先独立作答：** roomId 从 A 变 B 时，连接 Effect 的 cleanup/setup 应如何对应？为何不能在 Render 中连接？

**参考解析：** 旧同步先清理，再为新依赖建立同步；Render 可能重试或放弃，若直接连接会产生幽灵副作用。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
