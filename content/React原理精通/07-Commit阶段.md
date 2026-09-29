# 07. Commit：从 Fiber flags 到真实 DOM

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Mutation Phase` | DOM 变更阶段 |
| `Passive Effect` | 被动副作用 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Update` | 更新对象 |
| `Placement` | 插入标记 |
| `Deletion` | 删除标记 |
| `Flags` | 副作用标记 |
| `completeWork` | 完成 Fiber 工作 |
| `Ref` | 引用 |
| `DOM` | 文档对象模型 |
| `Layout` | 布局/回流 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能区分 before-mutation / mutation / layout / passive
- 能指出 DOM/ref/layout effect 的发生顺序
- 能解释为什么 Commit 与 Render 的中断语义不同

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react-reconciler/src/ReactFiberCommitEffects.js
packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js
```

## 本章核心不变量

- Commit 必须让宿主 UI 从一个一致状态过渡到另一个一致状态
- Ref 与 Layout effect 必须观察到正确宿主树
- 被删除 Fiber 的资源必须按阶段清理

---

## 先用白话理解：为什么还需要 Commit

Render 已经算出“哪里要插入、更新、删除”，但这些结果还只是 Fiber 上的 flags（标记）。Commit 才把这些标记变成真实的宿主操作：插 DOM、删 DOM、更新属性、挂 ref、执行 layout effect 等。

把 Render 与 Commit 分开，是并发架构成立的关键：草稿可以重做，但真实世界的 DOM 修改不能随意回滚重放。

---

## 1. Render 与 Commit 的边界

Render：

```text
计算
可中断
可重做
不应该有不可逆副作用
```

Commit：

```text
应用最终结果
修改外部世界
必须保证一致性
```

## 2. commitRoot

当 Render 得到 `finishedWork`：

```text
root.finishedWork = completedWip
```

随后进入 commit。

你可以把 Commit 主体理解成几个阶段：

```text
Before Mutation
Mutation
Layout
Passive（异步/稍后 flush）
```

## 3. Mutation Phase

典型工作：

```text
Placement → 插入 DOM
Update → 更新 DOM props/text
ChildDeletion → 删除 DOM / 处理卸载
```

FunctionComponent 本身没有 DOM，但其子树 HostComponent 会执行真实宿主操作。

## 4. Placement

`Placement` 并不等于“创建 DOM”。

HostComponent 的 DOM 往往在 completeWork mount 路径就已创建。

Commit Placement 更接近：

```text
找到宿主父节点
找到正确宿主 sibling
调用 insertBefore/appendChild
```

这是一个很容易混淆的点。

## 5. Update

对于 DOM：

```text
Render/completeWork:
比较 oldProps/newProps
准备更新

Commit:
真正调用宿主层 mutation
```

不同 React 版本内部具体表示会变化，但职责边界稳定。

## 6. Ref

Ref 的 detach/attach 时机与 Mutation/Layout 阶段相关。

重要理解：

```text
Render 期间不能依赖 ref.current 表示最终 DOM
Commit 后 ref 才与最终宿主实例一致
```

## 7. Layout Effects

DOM mutation 已完成后：

```text
useLayoutEffect
class componentDidMount/componentDidUpdate
某些 ref attach
```

可以同步读取最终 DOM layout。

所以：

```js
useLayoutEffect(() => {
  const rect = ref.current.getBoundingClientRect()
})
```

能读取最新 DOM。

## 8. Passive Effects

`useEffect` 通常不在 Mutation/Layout 主提交中直接同步完成全部用户 effect，而是标记并安排后续 passive flush。

关键链：

```text
commitRoot
 ↓
schedule passive effects
 ↓
flushPassiveEffects
 ↓
commitPassiveUnmountEffects
 ↓
commitPassiveMountEffects
```

## 9. 删除组件

Unmount 不只是 removeChild。

React 还要处理：

```text
Effect cleanup
Ref detach
Class unmount lifecycle
DOM 删除
Fiber 关系清理
```

因此删除是一整套 commit traversal。

## 10. 为什么 Commit 不像 Render 一样随意中断

假设 DOM 已经改了一半：

```text
Header 新版
Content 旧版
Footer 旧版
```

如果这时随意暂停，用户会看到不一致 UI，且副作用很难回滚。

所以现代 React 的并发核心主要发生在 Render，而 Commit 要保持原子性/一致性。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**
