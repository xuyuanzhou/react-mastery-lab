# 00B. JSX → React Element → Component → Fiber → Host Instance

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Host Instance` | 宿主实例/真实平台节点 |
| `Host Config` | 宿主配置/渲染器平台适配层 |
| `alternate` | 双树对应指针 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Key` | 列表身份键 |
| `Flags` | 副作用标记 |
| `beginWork` | 开始处理 Fiber |
| `Suspense` | 异步等待边界 |
| `Server Components` | 服务端组件 |
| `Ref` | 引用 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 这一章的目标是消灭最常见的概念混淆：JSX、React Element、组件、Fiber、DOM 节点不是同一个东西。

## 本章掌握标准

学完后必须能脱稿解释：

```text
JSX 是语法层
React Element 是描述层
Component 是计算 UI 的用户代码
Fiber 是 Reconciler 的运行时工作节点
Host Instance 是 Renderer 对应的真实平台对象
```

## 1. JSX 不是 Virtual DOM

例如：

```jsx
<button className="primary">Save</button>
```

现代 JSX transform 大致会转成：

```js
jsx('button', {
  className: 'primary',
  children: 'Save',
})
```

这里得到的是 React Element 描述，不是 DOM。

### 稳定模型

```text
JSX source
  ↓ compile
jsx/jsxs runtime call
  ↓
React Element
```

React Element 可以理解为不可变的 UI 描述记录：

```js
{
  type,
  key,
  props,
  // 内部标记字段省略
}
```

> 不要把这里的对象结构背成公共 API。重要的是：Element 是“描述”，不是“实例”。

## 2. Component 与 Element 的关系

```jsx
function UserCard({ user }) {
  return <section>{user.name}</section>
}

<UserCard user={user} />
```

`<UserCard />` 首先产生的仍然是一个 Element：

```text
type = UserCard
props = { user }
```

真正执行 `UserCard(props)`，发生在 Fiber Render Phase 中处理 FunctionComponent 时。

因此：

```text
创建 Element ≠ 执行组件
```

这对理解 lazy、Suspense、memo、Server Components 都非常重要。

## 3. React Element 为什么不是 Fiber

Element：

```text
一次 render 的声明性输入
通常短生命周期
描述“我想要什么”
```

Fiber：

```text
跨 render 存在的运行时节点
保存状态、树关系、优先级、flags、alternate
描述“React 正在如何处理它”
```

同一个逻辑组件在多次 render 中会产生新的 Element 描述，但 React 尝试根据身份规则复用对应 Fiber。

## 4. Fiber 与 Host Instance

对于 React DOM：

```text
HostComponent Fiber(type='div')
  ↓ stateNode
HTMLDivElement
```

对于 FunctionComponent：

```text
FunctionComponent Fiber
  ↓
通常没有一个与组件本身对应的 DOM 实例
```

这解释了为什么函数组件不等于 DOM 节点，也解释了 ref 语义为什么必须明确“你到底引用什么”。

## 5. Renderer 边界

React Reconciler 不应该知道浏览器的：

```text
document.createElement
appendChild
setAttribute
```

它通过 Host Config / Renderer 能力调用宿主环境。

概念：

```text
Reconciler
  ├─ create work
  ├─ reconcile identity
  ├─ schedule
  └─ commit flags
       ↓ Host Config
React DOM Renderer
       ↓
DOM API
```

这就是为什么 React 可以拥有 React DOM、React Native、自定义 renderer。

## 6. 组件身份：真正连接 Element 与 Fiber 的规则

React 不通过“变量名”识别组件。

核心身份由以下因素共同决定：

```text
type
key
在父级 children 中的位置/结构关系
```

当身份匹配：

```text
old Fiber 可复用
state 可保留
```

身份变化：

```text
旧 Fiber 删除
新 Fiber mount
state 重置
```

所以 `key` 不只是“列表优化提示”，它是身份系统的一部分。

## 7. 一张必须记住的总图

```text
source JSX
   ↓ compiler
React Element
   ↓ Reconciler
Fiber current/WIP
   ↓ Commit / Host Config
Host Instance (DOM)
   ↓ Browser rendering
pixels
```

每一层都解决不同问题。

## 8. React 19.3 源码锚点

```text
packages/react/src/jsx/ReactJSXElement.js
packages/react/src/ReactClient.js
packages/react-reconciler/src/ReactFiber.js
packages/react-reconciler/src/ReactChildFiber.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js
```

## 9. 实验

创建：

```jsx
function Child() {
  const [n] = useState(() => Math.random())
  return <span>{n}</span>
}

function App({ swap }) {
  return swap
    ? <Child key="B" />
    : <Child key="A" />
}
```

观察：

```text
Element 每次 render 都是新描述
key 变化 → Fiber identity 变化
state 重新初始化
DOM 可能被替换/重新挂载
```

然后把 key 固定，比较 state 是否保留。

## 10. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

你必须能回答：

```text
为什么 JSX 创建了新对象，组件 state 却可能保留？
为什么函数组件没有 instance 仍能有 state？
为什么 React 可以支持非 DOM renderer？
为什么 key 改变会重置 state？
```
