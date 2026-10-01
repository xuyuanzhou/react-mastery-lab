# 15. SSR、Fizz Streaming、Hydration、Selective Hydration 与 PPR

> 源码定位：点击 [enterHydrationState](source:packages/react-reconciler/src/ReactFiberHydrationContext.js#enterHydrationState)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。
> 学完即练：[对应实验](labs/07-Hydration与EventReplay.md)。先写预测，再观察源码和结果。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `hydrateRoot` | 水合根节点 |
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Host Instance` | 宿主实例/真实平台节点 |
| `Hook` | 钩子 |
| `Priority` | 优先级 |
| `Key` | 列表身份键 |
| `Suspense` | 异步等待边界 |
| `Hydration` | 水合/复用服务端 DOM |
| `SSR` | 服务端渲染 |
| `Server Components` | 服务端组件 |
| `RSC` | React 服务端组件 |
| `Flight` | RSC 传输协议/数据格式 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** Server Components 单独见 `20-ServerComponents与Flight.md`。

## 本章掌握标准

你必须能够区分：

```text
CSR
SSR
Streaming SSR (Fizz)
Hydration
Selective Hydration
Partial Pre-rendering
React Server Components
```

并解释它们如何组合，而不是互相替代。

## React 19.3 源码锚点

```text
packages/react-dom/src/client/ReactDOMRoot.js
packages/react-reconciler/src/ReactFiberHydrationContext.js
packages/react-server/src/ReactFizzServer.js
packages/react-dom-bindings/src/server/ReactFizzConfigDOM.js
packages/react-dom-bindings/src/events/ReactDOMEventReplaying.js
```

## 核心不变量

- Hydration 必须尽可能复用并验证服务端已有 Host 节点。
- 首次客户端 React tree 与服务端输出必须具有可匹配语义。
- 未完成 hydration 的区域发生交互时，事件不能被无声丢失。
- Streaming boundary 必须保证客户端能识别、补全和接管。

---

## 先用白话理解：SSR 和 Hydration 不是一回事

SSR（服务器端渲染）解决“服务器先生成 HTML”；Hydration（水合）解决“浏览器已经有这份 HTML 了，React 如何把它接管为可交互应用而不是全部重新创建”。

因此 Hydration 的关键不是“再 render 一次”，而是**复用现有 DOM，并把 Fiber/事件/状态逻辑与这些节点建立对应关系**。如果服务端和客户端输出不一致，就会出现 hydration mismatch（水合不匹配）。

---

## 1. CSR 与 SSR 解决的是不同阶段问题

纯 CSR：

```text
HTML shell
→ JS 下载
→ React 执行
→ DOM 创建
→ 用户看到完整 UI
```

SSR：

```text
服务器执行 React server renderer
→ HTML 先到浏览器
→ 用户更早看到内容
→ JS 到达
→ hydrateRoot 接管
```

SSR 的价值主要在初始 HTML / streaming / 服务端数据协同；它不等于“客户端不需要 React”。

## 2. Fizz：React 的现代 Streaming Server Renderer

现代 React 服务端渲染不是简单：

```js
renderToString(App)
```

Fizz 设计围绕 streaming：

```text
request
→ shell
→ segment
→ Suspense boundary
→ completed chunks
→ destination stream
```

核心目标：

> 不让一个慢数据边界阻塞整个 HTML 响应。

## 3. Suspense 是 Server Streaming 的切分点

例如：

```jsx
<App>
  <Header />
  <Suspense fallback={<FeedSkeleton />}>
    <Feed />
  </Suspense>
  <Footer />
</App>
```

服务端可以：

```text
先发 Header + fallback + Footer
Feed 准备好
再把对应 boundary 内容流式发送
```

这就是 Suspense 为什么是跨客户端/服务端的架构原语。

## 4. Hydration 不等于“重新 render 后替换 DOM”

Hydration 的理想路径：

```text
Server DOM 已存在
       +
Client React Element/Fiber
       ↓
claim / match existing host instances
       ↓
Fiber.stateNode → existing DOM
       ↓
注册事件/建立运行时状态
```

如果 Hydration 每次都把 DOM 全删重建，SSR 的很多收益会被浪费。

## 5. Hydration Cursor

React 需要维护“下一个可 hydration 的宿主节点”位置。

概念：

```text
isHydrating
nextHydratableInstance
hydrationParentFiber
```

处理 Fiber 时尝试：

```text
当前 React Host Fiber
↔
当前 existing DOM candidate
```

如果匹配：claim。
如果不匹配：进入 mismatch / recovery 路径。

## 6. Hydration mismatch 为什么危险

典型来源：

```text
Date.now()
Math.random()
服务端与客户端不同 locale/timezone
读取 window.innerWidth 决定 JSX
浏览器 extension 修改 DOM
错误 HTML nesting
服务端/客户端数据快照不一致
```

不要把 mismatch 只当“警告难看”。

本质是：

> React 无法证明“现有 DOM 就是客户端 Fiber 所期望接管的宿主状态”。

## 7. useId 为什么和 SSR 有关系

如果客户端生成 id 的方式依赖随机数或单纯全局递增，Streaming/并发顺序变化可能导致服务端和客户端不一致。

`useId` 的设计需要与组件树身份/服务端输出保持可重现关系。

所以 `useId` 不是“UUID Hook”。

## 8. Selective Hydration

页面可以有大量服务端 HTML，但客户端不一定要同步一次性 hydrate 全部区域。

Suspense boundary 提供了天然分区。

当用户与尚未 hydrate 的区域交互时，React 可以提高对应区域的 hydration 紧迫性。

概念：

```text
server HTML 可见
↓
某 boundary 尚未 hydrate
↓
user click
↓
事件系统发现 blocked target
↓
尝试提高/触发 selective hydration
↓
hydration 完成
↓
replay event
```

## 9. Event Replay

这是事件系统与 Hydration 的交叉章节。

问题：

```text
按钮 HTML 已经显示
JS 尚未完成 hydration
用户点击
```

如果直接丢掉这次点击，SSR 页面“看起来能用但实际不能用”。

React 因此需要记录可 replay 的事件，在目标区域可交互后重新 dispatch。

源码：

```text
ReactDOMEventReplaying.js
```

## 10. Streaming + Hydration 的大图

```text
Server:
React tree
→ Fizz render
→ shell + boundary chunks
→ network stream

Browser:
HTML parser
→ DOM progressively appears

Client React:
hydrateRoot
→ match existing DOM
→ boundary-level hydration
→ event replay / selective priority
```

三条时间线是并行交织的，不是简单串行。

## 11. React 19.2+ Partial Pre-rendering

PPR 的核心问题：

> 页面中哪些部分可以提前静态产出，哪些部分必须等请求时/后续数据？

React 19.2 提供了 Partial Pre-rendering 相关能力，使服务端渲染可以把“预渲染阶段”和“恢复/继续阶段”拆开。

理解它时应该连接：

```text
Fizz
Suspense boundaries
resumable server work
static shell
request-time dynamic completion
```

而不是简单把 PPR 当成“SSR 缓存”。

## 12. React 19.3 browser()

React DOM 19.3 新增 `browser()`：可与 `use(browser())` + Suspense 结合，把某棵子树明确标记为 browser-only。

架构意义：

```text
Server render 遇到“必须浏览器才成立”的 subtree
→ 不把它伪装成普通 server error
→ boundary 延迟到 browser
```

这是服务端/客户端执行环境边界进一步显式化。

## 13. SSR 与 RSC 的区别

```text
SSR：
组件执行后产出 HTML 流
目标是浏览器 DOM 初始内容

RSC：
Server Component 执行后产出 Flight 数据模型
目标是把组件树/模块引用结果传给 Client Renderer
```

它们可以组合：

```text
RSC payload
  ↓
组成 React tree
  ↓
SSR/Fizz 输出 HTML
```

但两者绝不是同一个协议。

## 14. Hydration 实验

故意写：

```jsx
function App() {
  return <div>{Date.now()}</div>
}
```

做 SSR + hydration。

观察：

```text
server HTML value
client first render value
mismatch/recovery
```

然后改为把 server timestamp 作为初始 props 传入，再观察。

## 15. 断点建议

```text
hydrateRoot
enterHydrationState
tryToClaimNextHydratableInstance / 对应 claim 路径
throwOnHydrationMismatch
popHydrationState
queueIfContinuousEvent / replay 相关函数
```

记录：

```text
hydration parent
next hydratable node
Fiber type/key
actual DOM node
blocked event target
```

## 16. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么 hydration 必须有 cursor，而普通 mount 不需要？
2. 为什么 HTML 已可见不代表页面已可交互？
3. Event Replay 与 Selective Hydration 为什么必须配合？
4. `useId` 为什么不能简单用 `Math.random()`？
5. Fizz 与 RSC 分别传输什么？

<!-- CHAPTER-CHECK-START -->
## 本章情境自检与参考解析

**先独立作答：** 服务端 HTML 已经可见，但按钮尚不能可靠响应；分别说明 SSR、Hydration、Event Replay 的职责。

**参考解析：** SSR 提供可见 HTML；Hydration 认领既有 DOM 并建立客户端运行时；受阻事件可触发选择性水合与合适的重放。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
