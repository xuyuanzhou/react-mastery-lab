# 20. React Server Components 与 Flight：组件模型跨机器后的协议

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Suspense` | 异步等待边界 |
| `Thenable` | 类 Promise 对象 |
| `Hydration` | 水合/复用服务端 DOM |
| `SSR` | 服务端渲染 |
| `Server Components` | 服务端组件 |
| `RSC` | React 服务端组件 |
| `Flight` | RSC 传输协议/数据格式 |
| `Ref` | 引用 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `Bundler` | 打包器 |
| `Bundle` | 打包产物 |
| `Module Graph` | 模块依赖图 |
| `React Element` | React 元素/虚拟 UI 描述对象 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** RSC 是现代 React “两台计算机上的 React”架构核心之一，不应与 SSR 混同。

## 本章掌握标准

你需要能解释：

```text
Server Component
Client Component
'use client'
Server Reference / Action
Client Reference
Flight payload
RSC render
SSR/Fizz render
Hydration
```

如何组成同一个应用链路。

## 源码锚点

```text
packages/react-server/src/
packages/react-server-dom-webpack/src/
packages/react-client/src/
packages/react-server/src/ReactFlightServer.js
packages/react-client/src/ReactFlightClient.js
packages/react-server-dom-webpack/package.json
```

> 具体 bundler adapter 还有 webpack/turbopack/parcel 等集成。理解协议核心比背 bundler 文件重要。

## 核心不变量

- Server Component 的执行结果必须可序列化为 Client 能理解的 React/引用协议。
- Client Component 代码不应因为被 Server Component 引用就直接在服务器 Flight 执行成普通函数结果。
- 模块引用、数据值、Promise/stream/error 等必须有协议级身份。
- RSC payload 与 HTML 是不同输出层。

## 1. 为什么需要 RSC

传统 React：

```text
组件代码主要在浏览器执行
```

即使 SSR：

```text
服务器执行一次得到 HTML
客户端仍需要对应组件 JS 来 hydrate
```

RSC 提出：

> 有些组件可以只在服务器执行，它们的代码无需成为客户端交互 bundle 的一部分。

## 2. 'use client' 是模块图边界

它不只是“这个组件要 hydration”。

更准确：

```text
'use client'
→ 这个模块及其客户端依赖进入 Client module graph
→ Server 侧引用它时生成 Client Reference
```

Server Component 可以渲染：

```jsx
<ClientWidget prop={serializableValue} />
```

但不会在 Flight server 中把 ClientWidget 当普通 server function 完整执行。

## 3. Flight 传输的不是 HTML

概念：

```text
RSC tree
→ Flight rows/chunks
→ values + element descriptions + module references + promise references
→ Client decoder
→ React model
```

所以：

```text
Fizz = HTML renderer protocol
Flight = React component/data model protocol
```

## 4. RSC 与 SSR 如何组合

典型框架链路：

```text
Server Components execute
  ↓
Flight model
  ↓
server renderer uses model to build React tree
  ↓
Fizz streams HTML
  ↓
Browser shows HTML
  ↓
Client also receives/decodes Flight payload
  ↓
Client Component JS loads
  ↓
Hydration / later navigations
```

同一个请求可能同时涉及两个 stream。

## 5. Client Reference

Server 不能把浏览器组件函数体直接序列化传输。

它发送的是类似：

```text
module id
export name
chunk metadata
```

Client decoder/bundler runtime 再找到真实模块。

所以 RSC 强依赖 bundler/framework integration。

## 6. 可序列化边界

从 Server → Client 传 props 时，不是任意 JS 对象都天然可传。

需要理解协议支持：

```text
primitive
structured values
React elements/model
Promises/thenables（协议支持的形式）
references
server functions/actions
```

不能把浏览器闭包或任意 class instance 直接想当然地传过去。

## 7. Server Actions / Server References

客户端可以持有一个“服务端函数引用”，调用时由框架/Flight 协议把：

```text
reference id
arguments
```

发回服务器执行。

因此：

```text
function 本体不从服务器下载到客户端
客户端持有的是 capability/reference
```

这是分布式系统思维，而不只是 React API。

## 8. cache / cacheSignal

Server Components 需要在一次/多次服务端 render 中协调异步资源与缓存生命周期。

现代 React 提供 server-oriented cache 能力。

理解重点：

```text
request/render scoped resource reuse
abort / cache lifetime
Suspense integration
```

## 9. RSC 与安全边界

架构师必须记住：

```text
“只在 server 执行”不自动等于“所有数据都安全”
```

仍然要控制：

```text
传给 Client Component 的 props
Server Action 参数校验
授权
序列化数据
错误消息
```

RSC 是执行边界，不代替安全模型。

## 10. 读取源码的方法

不要从 `react-server-dom-webpack` 所有文件开始扫。

第一条线：

```text
ReactFlightServer
→ request/task/chunk
→ serialize model
```

第二条线：

```text
ReactFlightClient
→ parse chunk
→ resolve model/reference
```

第三条线：

```text
bundler adapter
→ Client Reference metadata
```

## 11. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. RSC payload 为什么不能叫 HTML？
2. `'use client'` 为什么是模块图边界，不只是 runtime if？
3. Server Component 引用 Client Component 时服务器到底传什么？
4. RSC + SSR 为什么可以同时存在？
5. Server Action 为什么更像 RPC capability 而不是“函数序列化”？
