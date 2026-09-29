# 11. Context：依赖记录、传播与为什么会重渲染

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `beginWork` | 开始处理 Fiber |
| `Context` | 上下文 |
| `Provider` | 上下文提供者 |
| `Consumer` | 上下文消费者 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能解释 context dependency 是如何记录到 consumer Fiber 的
- 能解释 provider value 变化如何传播
- 能分析 Context 扇出与 selector/store 模式的取舍

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberNewContext.js
packages/react-reconciler/src/ReactFiberBeginWork.js
```

## 本章核心不变量

- consumer 必须记录自己读取了哪些 context
- provider 更新必须能够穿透普通 props bailout 到达依赖者
- context 值身份变化与业务值变化不是一回事

---

## 1. Context 不是“全局变量”

Context 的关键是：

```text
Provider 写入当前值
Consumer / useContext 读取
Fiber 记录自己依赖了哪个 Context
Provider 值改变时，把相关 Fiber 标记为有工作
```

## 2. createContext

概念结构：

```js
{
  _currentValue,
  _currentValue2,
  Provider,
  Consumer
}
```

不同 renderer/并发场景内部细节会变化，但核心是维护“当前 context 值”。

## 3. Provider 的栈

Fiber DFS 进入 Provider：

```text
pushProvider
  保存旧值
  设置新值
```

离开 Provider：

```text
popProvider
  恢复旧值
```

因此嵌套 Provider 可以正确作用于不同子树。

## 4. readContext

调用：

```js
const theme = useContext(ThemeContext)
```

不仅仅返回 `_currentValue`。

React 还要把：

```text
当前 FunctionComponent Fiber
依赖 ThemeContext
```

记录下来。

概念：

```js
fiber.dependencies = {
  firstContext: {
    context,
    memoizedValue,
    next
  }
}
```

## 5. Provider 更新

当新旧 value 发生变化：

```text
Provider Fiber
 ↓
找到依赖此 Context 的 descendants
 ↓
把对应 lanes 合并到 consumer Fiber
 ↓
向父路径传播 childLanes
```

最终 consumer 即使 props 没变，也可能需要重新 render。

## 6. 为什么 React.memo 挡不住 useContext 更新

```jsx
const Child = memo(() => {
  const theme = useContext(ThemeContext)
  return ...
})
```

`memo` 只解决一部分 props bailout。

但 Child 自己依赖 Context：

```text
Context changed
→ Child Fiber 有 lane
→ 仍需 render
```

## 7. Provider value 对象为什么容易造成扇出

```jsx
<Ctx.Provider value={{ user, logout }}>
```

父组件每次 render 都新建对象：

```text
oldValue !== newValue
```

所有相关 consumer 可能被认为 Context 值变化。

所以稳定 value 有时有价值：

```js
const value = useMemo(() => ({ user, logout }), [user, logout])
```

但更重要的是：

```text
合理拆 Context
降低 provider 更新频率
避免把高频字段和低频字段塞在同一个 Context
```

## 8. 源码阅读关键词

```text
createContext
readContext
prepareToReadContext
pushProvider
popProvider
propagateContextChanges
scheduleContextWorkOnParentPath
```

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**
