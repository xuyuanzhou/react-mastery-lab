# 24. StrictMode 与 Rules of React：用“可重放”检查程序正确性

> 源码定位：点击 [renderWithHooks](source:packages/react-reconciler/src/ReactFiberHooks.js#renderWithHooks)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Hook Linked List` | Hook 链表 |
| `Update` | 更新对象 |
| `Ref` | 引用 |
| `Rules of React` | React 规则 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `Mount` | 挂载 |
| `Unmount` | 卸载 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** StrictMode 的很多“重复执行”行为仅在开发环境用于暴露不安全代码。

## 本章掌握标准

你应该能解释：

```text
为什么组件可能 double render
为什么 Effect 可能 setup → cleanup → setup
为什么 ref callback 可能重复 attach/detach
为什么这不是 production 性能模型
```

## 源码锚点

```text
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react/src/ReactStrictModeWarnings.js（具体文件随版本演进）
```

## 1. StrictMode 的架构目标

它不是“让代码更严格”的简单 lint。

它会主动模拟未来/并发 React 可能出现的重放场景，以验证：

```text
Render 是否 pure
Effect cleanup 是否完整
Ref cleanup 是否完整
legacy APIs 是否存在风险
```

## 2. Double Render 的真正问题

如果：

```jsx
function Component() {
  externalList.push('render')
  return ...
}
```

重复 render 会暴露：

```text
Render 有外部 mutation
```

正确组件即使执行两次，若未 Commit，不应产生额外外部可观察结果。

## 3. renderWithHooksAgain

现代 Hooks 源码有专门的 rerender path，用于：

```text
render-phase updates
StrictMode DEV double invocation
某些 replay 场景
```

这说明“函数组件一次 update 只调用函数一次”从来不是可依赖契约。

## 4. Effect Reconnect 检查

开发环境可能出现：

```text
setup
→ cleanup
→ setup
```

React 在问：

> 如果组件短暂离开/隐藏/恢复，你的外部同步能否正确断开并重连？

如果第二次 setup 导致重复 socket/listener：

```text
说明 cleanup 不完整
```

而不是“StrictMode 有 bug”。

## 5. Rules of Hooks 是数据结构约束

```text
Top-level Hook order stable
```

根源：Hook linked list 顺序身份。

Lint 规则只是静态提前检查这个运行时不变量。

## 6. Rules of React 比 Rules of Hooks 更广

Compiler 时代尤其要理解：

```text
Components/Hooks must be pure
props/state immutable snapshots
side effects outside render
Hook calls only from React functions
refs 不应被当作 render reactive state 随意读写
```

这些规则共同使：

```text
replay
concurrency
compiler optimization
server/client execution
```

成为可能。

## 7. StrictMode 与 Activity/Offscreen 的联系

未来 UI 可能：

```text
visible
hidden but state-preserved
visible again
```

Effect 必须能够 disconnect/reconnect。

StrictMode 的开发检查正是在训练代码适应这种生命周期，而不是只适应 mount/unmount。

## 8. 实验

创建三个错误例子：

```text
render 修改全局数组
Effect addEventListener 但不 remove
ref callback 注册外部对象但无 cleanup
```

在 StrictMode 下观察，再修复。

## 9. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么“只在生产不重复”不能成为写不纯 Render 的理由？
2. StrictMode 为什么和 Concurrent Render 的可重放哲学一致？
3. Effect double-connect 暴露的是哪类 bug？

<!-- CHAPTER-CHECK-START -->
## 本章情境自检与参考解析

**先独立作答：** StrictMode 在开发环境额外运行 setup/cleanup，暴露出重复订阅；应修复什么？

**参考解析：** 让 cleanup 对称撤销 setup，保持 Render 纯粹；不能靠关闭 StrictMode 掩盖泄漏。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
