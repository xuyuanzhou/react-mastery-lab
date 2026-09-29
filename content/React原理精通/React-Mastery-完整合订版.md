# React 原理精通：完整合订版

> 源码主基线：React v19.3.0。建议优先使用分章节文档和源码点击学习器；合订版用于全文检索。


---

<!-- SOURCE: 00P-学习者起点与前置知识总览.md -->

# 00P. 学习者起点与前置知识总览

> 这套教材**不要求你一开始就懂 Fiber、调度器、编译器、浏览器渲染原理**。你只需要会基本的 JavaScript、写过一些 React 组件即可。其余知识在进入对应源码之前补齐。

## 1. 为什么很多人“看不懂 React 源码”

通常不是 React 本身太难，而是源码同时依赖了多层知识：

```text
JavaScript 执行模型
+ 数据结构
+ 浏览器运行机制
+ 编译 / 打包
+ React 自己的架构
```

例如你看到：

```js
hook.next = newHook;
```

如果你不了解**链表（Linked List，链式数据结构）**，会把注意力花在语法上；而真正要研究的是 React 为什么选择链表保存 Hook。

看到：

```js
if ((lanes & renderLanes) !== 0) { ... }
```

如果没有位运算基础，就很难理解 Lane（更新车道 / 优先级集合）。

因此学习路线必须先消除这些“非 React 障碍”。

## 2. 最低起点

开始学习前，只要求：

- 会 `let/const`、函数、对象、数组
- 知道 `import/export`
- 写过 `useState/useEffect`
- 知道 DOM 是浏览器里的页面节点

不会下面这些完全没关系，本教材会补：

- Closure（闭包）
- Call Stack（调用栈）
- Event Loop（事件循环）
- Linked List（链表）
- Tree / DFS（树 / 深度优先遍历）
- Bitmask（位掩码）
- AST（抽象语法树）
- Babel / SWC / Vite / Webpack
- Source Map（源码映射）
- Flow（React 源码类型系统）
- DOM / CSSOM / Layout / Paint

## 3. 前置知识学习顺序

1. [JavaScript 执行模型与闭包](prerequisites/01-JavaScript%E6%89%A7%E8%A1%8C%E6%A8%A1%E5%9E%8B%E4%B8%8E%E9%97%AD%E5%8C%85.md)
2. [链表、树、队列与位运算](prerequisites/02-%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84-%E9%93%BE%E8%A1%A8%E6%A0%91%E9%98%9F%E5%88%97%E4%B8%8E%E4%BD%8D%E8%BF%90%E7%AE%97.md)
3. [浏览器 DOM/CSSOM 与渲染流水线](prerequisites/03-%E6%B5%8F%E8%A7%88%E5%99%A8-DOM-CSSOM%E4%B8%8E%E6%B8%B2%E6%9F%93%E6%B5%81%E6%B0%B4%E7%BA%BF.md)
4. [Event Loop、宏任务与微任务](prerequisites/04-EventLoop-%E5%AE%8F%E4%BB%BB%E5%8A%A1%E5%BE%AE%E4%BB%BB%E5%8A%A1.md)
5. [ESM、CommonJS、打包与 Tree Shaking](prerequisites/05-%E6%A8%A1%E5%9D%97%E7%B3%BB%E7%BB%9F%E4%B8%8E%E6%89%93%E5%8C%85.md)
6. [JSX、Babel/SWC 与 AST](prerequisites/06-JSX-Babel-SWC%E4%B8%8EAST.md)
7. [Flow 类型与 React 源码语法](prerequisites/07-Flow%E4%B8%8EReact%E6%BA%90%E7%A0%81%E8%AF%AD%E6%B3%95.md)
8. [React Monorepo 与 packages 地图](prerequisites/08-React-Monorepo%E4%B8%8Epackages%E5%9C%B0%E5%9B%BE.md)
9. [Debugger、Source Map 与源码断点](prerequisites/09-Debugger-SourceMap%E4%B8%8E%E6%96%AD%E7%82%B9.md)
10. [性能基础：帧预算、长任务与主线程](prerequisites/10-%E6%80%A7%E8%83%BD%E5%9F%BA%E7%A1%80-%E5%B8%A7%E9%A2%84%E7%AE%97%E4%B8%8E%E9%95%BF%E4%BB%BB%E5%8A%A1.md)

## 4. 学习规则

每个 React 概念都按同一套问题学习：

```text
它解决什么问题？
↓
如果没有它，会发生什么？
↓
它依赖什么数据结构？
↓
一次真实执行中状态怎么变化？
↓
源码入口在哪？
↓
怎么用断点证明？
↓
它有什么代价与边界？
```

只背“Fiber 可中断”“Hook 是链表”不算掌握；能把上述因果关系讲清楚，才算进入源码级理解。


---

<!-- SOURCE: prerequisites/01-JavaScript执行模型与闭包.md -->

# 前置 01. JavaScript 执行模型与闭包

## 1. Execution Context（执行上下文）是什么

当 JavaScript 执行一个函数时，会为这次调用建立一份运行环境，其中包含参数、局部变量、外部词法环境引用等。函数执行结束后，普通局部变量通常可以被回收；但如果某个内部函数仍然引用它们，这些数据就必须继续保留。

这就是理解 React Function Component（函数组件）最重要的基础。

```js
function createCounter() {
  let count = 0;
  return () => ++count;
}
const next = createCounter();
next(); // 1
next(); // 2
```

`next` 仍然能访问 `count`，因为它形成了 Closure（闭包）。

## 2. React 为什么特别依赖闭包知识

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    console.log(count);
    setCount(count + 1);
    console.log(count);
  }
}
```

两个 `console.log` 都读取**本次 Render（渲染计算）闭包中的 `count`**。`setCount` 并没有修改这个局部变量，而是向 React 的 Update Queue（更新队列）提交一个更新，并请求下一次 Render。

因此：

```text
Render #1 → count = 0 → 产生闭包 A
Render #2 → count = 1 → 产生闭包 B
```

A 和 B 是不同的词法环境。

## 3. Call Stack（调用栈）

普通递归依赖 JavaScript 调用栈：

```js
function walk(node) {
  if (node.child) walk(node.child);
  if (node.sibling) walk(node.sibling);
}
```

一旦深度递归开始，执行进度隐含在调用栈里。React Fiber 的一个关键设计就是把遍历进度显式保存到 Fiber 的 `child/sibling/return` 指针中，从而让 React 自己决定下一步做哪个工作单元。

## 4. 必会结论

- 函数组件每次 Render 都重新执行函数。
- 局部变量属于那一次函数调用，不是“组件实例字段”。
- callback 会捕获创建它的那一次 Render 的变量。
- Fiber / Hook 才负责跨 Render 保存 React 状态。
- stale closure（陈旧闭包）首先是 JavaScript 机制，其次才是 React 使用方式问题。

## 5. 自检

解释：为什么 `useEffect(() => setInterval(() => console.log(count), 1000), [])` 常常一直看到初始 `count`？

**答案**：Effect 在初次 Render 创建 callback；该 callback 闭包捕获初次 Render 的 `count`。依赖为空时 Effect 不因后续 `count` 变化而重新建立，所以 interval 一直调用旧闭包。


---

<!-- SOURCE: prerequisites/02-数据结构-链表树队列与位运算.md -->

# 前置 02. 链表、树、队列与位运算

## 1. Linked List（链表）

链表节点通过指针连接：

```js
const a = {value: 'A', next: null};
const b = {value: 'B', next: null};
a.next = b;
```

React Hooks（钩子）在函数组件 Fiber 的 `memoizedState` 上形成链表：

```text
Fiber.memoizedState
       ↓
     Hook1 → Hook2 → Hook3 → null
```

为什么这和“Hook 必须按固定顺序调用”有关？因为 React 更新时主要按链表位置把“这次第 N 个 Hook”与“上次第 N 个 Hook”对应起来。

## 2. Circular Linked List（环形链表）

Update Queue 中的 pending updates 常用环形单链表组织：

```text
U1 → U2 → U3
↑         ↓
└─────────┘
```

只保存尾节点 `pending = U3` 时，`pending.next` 就是头节点 U1。尾插可以保持 O(1)。

## 3. Tree 与 DFS（树与深度优先遍历）

Fiber 不是用 `children[]` 作为唯一遍历结构，而是：

```text
child   → 第一个子节点
sibling → 下一个兄弟
return  → 父节点
```

这三个指针足以进行 DFS（Depth-First Search，深度优先遍历）并在任意工作单元后恢复进度。

## 4. Queue（队列）为什么不是简单 FIFO

React 的更新有 Priority（优先级）。高优先级更新可以先执行，低优先级更新暂时跳过，因此 Update Queue 不能只“从头删除已经执行过的节点”。React 需要 `baseState/baseQueue` 保存可重新计算的基线，这叫 Rebase（重基 / 重新基于某个状态计算）。

## 5. Bitmask（位掩码）与 Lane

二进制每一位都可以表示一个集合成员：

```text
0001
0010
0100
1000
```

合并：

```js
const merged = a | b;
```

判断是否有交集：

```js
const hasAny = (a & b) !== 0;
```

React Lane（更新车道）大量使用这种集合运算，因为更新优先级需要快速合并、判断、删除、选择。

## 6. 自检

如果 `renderLanes = 0100`，某 Update 的 `lane = 0010`，为什么本轮可能跳过它？

**答案**：`0010 & 0100 === 0`，说明该更新不属于当前正在处理的 lane 集合；它需要保留到后续适合的 Render 中。


---

<!-- SOURCE: prerequisites/03-浏览器-DOM-CSSOM与渲染流水线.md -->

# 前置 03. 浏览器 DOM/CSSOM 与渲染流水线

## 1. React 不负责把像素画到屏幕

React DOM 最终做的是调用浏览器 DOM API：

```js
document.createElement('div');
parent.appendChild(node);
```

此后浏览器才进入自己的 Rendering Pipeline（渲染流水线）。

## 2. DOM 与 CSSOM

- DOM（Document Object Model，文档对象模型）：HTML 的节点结构。
- CSSOM（CSS Object Model，CSS 对象模型）：浏览器解析 CSS 后得到的规则模型。

浏览器根据 DOM + CSS 计算每个可见节点的样式与几何信息。

## 3. Style → Layout → Paint → Composite

```text
Style Recalculation（样式计算）
↓
Layout / Reflow（布局 / 回流）
↓
Paint（绘制绘制指令）
↓
Rasterization（栅格化为像素纹理）
↓
Composite（图层合成）
↓
屏幕
```

`root.render()` 完成 React Commit，并不等于浏览器已经 Paint。

## 4. 为什么 useLayoutEffect 和 useEffect 时机不同

`useLayoutEffect` 属于 Commit 中的 Layout Effect（布局副作用）阶段，通常在浏览器下一次绘制前同步执行；它可以读取 DOM 布局并同步修改，因此会阻塞 Paint。

`useEffect` 属于 Passive Effect（被动副作用），通常在提交后的异步阶段执行，不应被当作布局测量工具。

## 5. 性能含义

修改 `width/height` 可能触发布局；大量读取 `getBoundingClientRect()` 与写样式交替可能造成 Forced Synchronous Layout（强制同步布局）。`transform/opacity` 在适当条件下可主要走合成路径，但不能把它简化成“永远不会 Paint”。


---

<!-- SOURCE: prerequisites/04-EventLoop-宏任务微任务.md -->

# 前置 04. Event Loop、宏任务与微任务

## 1. 为什么 React 调度源码会出现 microtask

浏览器主线程一次只能执行一段 JavaScript。Event Loop（事件循环）决定任务、微任务、渲染机会如何交替。

简化模型：

```text
Task（任务，例如 click / timer）
↓
执行 JS
↓
Microtask checkpoint（清空微任务）
↓
浏览器可能进行 Render Opportunity（渲染机会）
↓
下一 Task
```

## 2. Microtask（微任务）

常见来源：

```js
Promise.resolve().then(...)
queueMicrotask(...)
```

微任务通常会在当前任务结束后、进入下一个任务前执行。

## 3. React Root Scheduler 为什么使用 microtask

React 19.3 的 Root Scheduler 会先把有工作的 Root 加入调度集合，并保证一个 microtask。在 microtask 中统一检查 Root、选择 lanes、决定同步工作或调度 Scheduler callback。

这有利于把同一事件循环阶段产生的多个更新集中处理，而不是每次 setter 都立即完整渲染。

## 4. Scheduler 不是浏览器 Event Loop

React `scheduler` 是用户态调度库；它最终仍必须借助浏览器提供的任务机制获得执行机会。要区分：

```text
浏览器 Event Loop：平台规则
React Scheduler：React 使用的平台上层调度策略
Lane：Reconciler 内部的更新优先级集合模型
```


---

<!-- SOURCE: prerequisites/05-模块系统与打包.md -->

# 前置 05. ESM、CommonJS、打包与 Tree Shaking

## 1. ESM（ECMAScript Modules）

```js
import {createRoot} from 'react-dom/client';
export function App() {}
```

浏览器或构建工具会建立 Module Graph（模块依赖图）。

## 2. 为什么源码中的 import 路径和 npm 包不一样

React 是 Monorepo（单仓多包）。源码里会看到：

```js
import ReactSharedInternals from 'shared/ReactSharedInternals';
```

这不是普通业务项目的相对路径，而是 React 构建系统理解的内部包引用。

## 3. Bundler（打包器）做什么

Vite、Webpack、Rollup 等会解析依赖、转换语法、处理资源，并为生产构建做代码拆分、压缩和 Tree Shaking（摇树优化 / 删除未使用导出）。

## 4. React 源码和你 npm 安装的代码为什么长得不完全一样

源码会经过：

```text
Flow 类型剥离
Feature Flags（特性开关）
DEV / PROD 分支
模块打包
压缩 / minify
```

因此“npm 包里的生产代码”和 GitHub 原始源码不是逐字对应，但设计主线相同。


---

<!-- SOURCE: prerequisites/06-JSX-Babel-SWC与AST.md -->

# 前置 06. JSX、Babel/SWC 与 AST

## 1. JSX 不是 HTML

```jsx
<div className="box">Hello</div>
```

现代转换概念上变成：

```js
jsx('div', {className: 'box', children: 'Hello'});
```

## 2. AST（Abstract Syntax Tree，抽象语法树）

编译器通常先 Parse（解析）源码为 AST：

```text
JSXElement
├─ openingElement
├─ attributes
└─ children
```

Transformation（转换）阶段修改 AST，Generator（代码生成）再输出 JavaScript。

## 3. Babel / SWC / esbuild 的角色

它们不是 React Runtime（React 运行时）。它们在代码进入浏览器前进行语法转换；浏览器运行时执行转换后的 `jsx()` 调用，产生 React Element。

## 4. React Compiler 为什么和普通 JSX Transform 不同

普通 JSX Transform 主要把语法变成可执行 JS；React Compiler 会分析组件数据流、响应式依赖与可缓存区域，并生成优化后的代码。它属于更高层语义优化。


---

<!-- SOURCE: prerequisites/07-Flow与React源码语法.md -->

# 前置 07. Flow 与 React 源码语法

React 源码大量使用 Flow 类型。Flow 和 TypeScript 目的相似：给 JavaScript 添加静态类型检查，但语法细节不同。

## 1. 常见语法

```js
type Hook = {
  memoizedState: any,
  baseState: any,
  next: Hook | null,
};
```

意思是定义一个名为 `Hook` 的对象类型。

```js
function foo(x: number): string {
  return String(x);
}
```

参数是 number，返回 string。

```js
let value: ?string;
```

Flow 的 `?string` 可理解为 `string | null | undefined`。

## 2. `mixed` 与 `any`

`mixed` 表示未知类型，使用前通常需要收窄；`any` 会弱化检查。

## 3. 阅读原则

第一次读源码不要在 Flow 上停太久。先把：

```text
函数名
输入参数
修改的数据结构
返回值 / 下一调用
```

读通，再回来理解精确类型。


---

<!-- SOURCE: prerequisites/08-React-Monorepo与packages地图.md -->

# 前置 08. React Monorepo 与 packages 地图

## 1. Monorepo（单仓多包）

React 官方仓库同时包含多个包。最重要的学习地图：

```text
packages/react
  公共 React API、Hooks 门面、Element 创建

packages/react-dom
  React DOM 公共入口

packages/react-dom-bindings
  DOM Renderer（DOM 渲染器）具体实现

packages/react-reconciler
  Fiber、Hooks、Lane、WorkLoop、Diff、Commit

packages/scheduler
  Scheduler（调度器）

packages/shared
  共享工具、Symbol、Feature Flags 等

packages/react-server*
  Server Components / Flight 等服务端相关实现
```

## 2. 学源码为什么先看包边界

当你看到 `createInstance()` 时，要知道它是 Host Config（宿主配置）能力，React DOM 会把它落实为 `document.createElement`；而 Reconciler 本身并不知道“DOM”是什么。

## 3. 三层必须区分

```text
React Core（公共模型/API）
↓
Reconciler（协调器：算出做什么）
↓
Renderer（渲染器：把动作落实到宿主平台）
```

这也是为什么 React 可以有 DOM、Native、自定义 Renderer。


---

<!-- SOURCE: prerequisites/09-Debugger-SourceMap与断点.md -->

# 前置 09. Debugger、Source Map 与源码断点

## 1. Debugger（调试器）学习目标

你要能完成：

- 打断点
- Step Into（进入函数）
- Step Over（单步跳过）
- Step Out（跳出函数）
- 查看 Call Stack（调用栈）
- Watch（监视变量）
- Conditional Breakpoint（条件断点）

## 2. Source Map（源码映射）

构建后的 JS 往往与源文件不同。Source Map 记录生成代码到源代码的位置映射，让 DevTools 可以显示原始模块、行号与变量位置。

## 3. React 源码调试时重点 Watch

```text
workInProgress
current
renderLanes
root.pendingLanes
fiber.memoizedState
hook.memoizedState
hook.baseState
hook.baseQueue
queue.pending
fiber.flags
fiber.subtreeFlags
```

## 4. 不要只看调用栈

真正理解源码时要同时观察**对象在每一步怎么变**。调用栈回答“谁调用谁”，数据状态回答“React 为什么这样走”。


---

<!-- SOURCE: prerequisites/10-性能基础-帧预算与长任务.md -->

# 前置 10. 性能基础：帧预算、长任务与主线程

## 1. Main Thread（主线程）

浏览器的 JavaScript、样式计算、布局等很多工作共享主线程。JavaScript 长时间占用主线程，会直接影响输入响应与绘制机会。

## 2. Frame（帧）与帧预算

60Hz 屏幕每帧约 16.7ms，但实际可给 JavaScript 的时间通常更少，因为浏览器还要做样式、布局、绘制、合成等工作。

## 3. Long Task（长任务）

一个长时间不可中断的 JS 任务会阻塞用户输入与渲染。Fiber / Concurrent Rendering 的重要背景正是：Render Phase（渲染计算阶段）的大工作需要有机会被拆分、暂停、恢复或重新开始。

## 4. React 性能不能只看 render 次数

一次额外 Render 可能很便宜；真正慢的可能是：

- 组件计算
- DOM mutation
- Layout
- Paint
- 大量事件处理
- 网络与数据序列化

性能优化必须测量，不能把 `memo` 当成默认答案。


---

<!-- SOURCE: 00-整体架构与历史演进.md -->

# 00. React 整体架构与历史演进

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Passive Effect` | 被动副作用 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Scheduler` | 调度器 |
| `beginWork` | 开始处理 Fiber |
| `completeWork` | 完成 Fiber 工作 |
| `Context` | 上下文 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能区分 React 公共 API、Reconciler、Renderer、Scheduler 的职责
- 能解释 Stack Reconciler → Fiber 的架构动机
- 能把一次更新放进 Trigger → Render → Commit → Browser 的总图中

## React 19.3 源码锚点

```text
packages/react/src/ReactHooks.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberRootScheduler.js
```

## 本章核心不变量

- Render 的输出在 Commit 前不能被视为用户可见事实
- Renderer 负责宿主环境，Reconciler 不应绑定 DOM
- 可中断的是 Render 工作，不是“任意 React 代码”

---

## 1. 先理解 React 的职责边界

React 不是浏览器。React 主要做三件事：

```text
描述 UI
  ↓
计算下一棵 UI
  ↓
把必要变化提交给 Renderer
```

对于 React DOM，Renderer 最终调用 DOM API。真正的 Layout / Paint / Composite 仍然由浏览器负责。

现代 React 可以粗略分为：

```text
react
  用户 API

react-reconciler
  Fiber / Hooks / Reconciliation / WorkLoop / Commit / Lane

scheduler
  通用任务调度

react-dom / react-dom-bindings
  浏览器 Renderer
```

## 2. React 15：Stack Reconciler

React 15 时代没有 Hooks。状态组件主要依赖 Class 实例：

```jsx
class Counter extends React.Component {
  state = { count: 0 }

  render() {
    return <button>{this.state.count}</button>
  }
}
```

心智模型：

```text
new Counter(props)
      ↓
instance.state
instance.props
instance.render()
```

旧 reconciler 的核心问题不是“Class 很丑”，而是**工作模型过度依赖同步递归和 JS 调用栈**。

```text
App.render
  └─ List.render
      └─ Item.render
          └─ ...
```

一旦一轮大更新开始，很难在中间停下来给浏览器处理更紧急的输入。

## 3. React 16：Fiber

Fiber 的核心价值：

> 把一次大递归工作改造成可由 React 自己遍历和调度的工作单元。

传统递归：

```js
function walk(node) {
  walk(node.child)
  walk(node.sibling)
}
```

Fiber 思路：

```js
let nextUnit = root

while (nextUnit !== null) {
  nextUnit = performUnitOfWork(nextUnit)
}
```

React 不再把“下一步干什么”完全交给 JS call stack，而是自己保存遍历状态。

Fiber 于是成为：

- 组件对应的工作单元
- 状态存储容器
- 更新优先级载体
- 子树关系节点
- effect/flag 的承载节点

## 4. React 16.8：Hooks

Hooks 的关键不在语法，而在数据模型：

```text
Class:
状态放在 instance

Function:
函数每次重新执行
状态放在 Fiber.memoizedState 指向的 Hook 链表
```

这解释了很多现象：

- 为什么函数组件每次 render 都会重新执行
- 为什么当前 render 的 state 是 snapshot
- 为什么 Hook 不能条件调用
- 为什么闭包会捕获某次 render 的值

## 5. 现代 React 的三层工作

### Trigger

更新来源：

```text
setState
dispatch
Context
external store
root.render
```

### Render

只计算下一棵 UI：

```text
beginWork
completeWork
reconciliation
Hooks
```

Render 可以：

- 暂停
- 重做
- 丢弃
- 低优先级让位

### Commit

把已完成的结果真正提交：

```text
DOM mutation
ref
layout effect
passive effect scheduling
```

Commit 必须保持一致性，所以通常同步完成。

## 6. 主调用链

你应该从一开始就记住：

```text
setState
 ↓
dispatchSetState
 ↓
requestUpdateLane
 ↓
enqueue update
 ↓
scheduleUpdateOnFiber
 ↓
ensureRootIsScheduled
 ↓
performWorkOnRoot
 ↓
renderRoot*
 ↓
workLoop*
 ↓
performUnitOfWork
 ↓
beginWork
 ↓
completeUnitOfWork
 ↓
completeWork
 ↓
commitRoot
```

后面的所有章节，本质都在解释这条链。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 00A-学习方法-版本基线与源码标注规范.md -->

# 00A. 学习方法、版本基线与源码标注规范

## 本章专业术语（English → 中文）

| English | 中文 |
|---|---|
| `Source Code Baseline` | 源码版本基线 |
| `Public API` | 公共 API |
| `Internal API` | 内部 API / 内部实现接口 |
| `Invariant` | 不变量 |
| `Trade-off` | 设计权衡 |
| `Source Code Anchor` | 源码锚点 |
| `Runtime` | 运行时 |
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Host Environment` | 宿主环境 |
| `Call Stack` | 调用栈 |
| `Execution Path` | 执行路径 |

完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

---

## 1. 本教材的目标不是“记函数名”

React 内部源码会演进。真正需要掌握的是四层知识：

```text
第一层：稳定设计约束
为什么 React 要这么设计？

第二层：稳定核心模型
Fiber / Hook Queue / Lane / Render / Commit

第三层：当前版本实现
React v19.3.0 的文件、函数、调用链

第四层：历史实现
React 15 / 16 / 18 为什么和现在不一样
```

如果只记：

```text
A() → B() → C()
```

版本升级后函数拆分，你会失去理解。

如果你知道：

```text
更新必须被记录
→ 必须有 Queue
→ 不同紧急程度要可组合
→ 需要 Lane
→ Render 必须可重做
→ Commit 必须保持宿主树一致性
```

即使源码文件变化，你仍能重新定位实现。

---

## 2. 主源码版本

本教材主线固定：

```text
React v19.3.0
```

历史章节会明确标记：

```text
React 15.x
React 16.x
React 16.8+
React 18.x
React 19.x
```

禁止把不同年代源码混成一张调用链。

例如老文章可能出现：

```text
expirationTime
scheduleWork
ReactFiberScheduler
```

现代源码主要围绕：

```text
Lane
scheduleUpdateOnFiber
ReactFiberRootScheduler
Scheduler
```

看到不同名称时第一件事：

> 先确认 React 版本，而不是先判断谁“讲错了”。

---

## 3. 四种代码标记

### 3.1 Public API（公共 API）

例如：

```js
createRoot
useState
useEffect
startTransition
```

这是应用开发者依赖的 React API。

### 3.2 React 19.3 Internal Source（React 19.3 内部源码）

例如：

```text
renderWithHooks
scheduleUpdateOnFiber
ensureRootIsScheduled
performUnitOfWork
```

这些不是公共 API，未来可能改名或移动。

### 3.3 Teaching Pseudocode（教学伪码）

例如：

```js
function simplifiedUseState(initial) {
  const hook = getCurrentHook();
  return [hook.state, hook.dispatch];
}
```

用途：删除 Feature Flag、DEV、错误处理和特殊分支，突出不变量。

### 3.4 Historical Source（历史源码）

例如 React 15 Stack Reconciler。

必须独立标版本，不能拿来解释 React 19 的直接执行链。

---

## 4. 每个源码函数只先回答五个问题

看到任何新函数，不要逐行陷进去。

先回答：

```text
1. 输入是什么？
2. 输出/返回什么？
3. 修改了哪个核心数据结构？
4. 为什么在这个阶段修改？
5. 下一步控制权交给谁？
```

例如 `dispatchSetState`：

```text
输入：fiber、queue、action
修改：Hook UpdateQueue / lanes
目的：登记状态更新并触发调度
下一步：scheduleUpdateOnFiber
```

这样才能保持源码地图。

---

## 5. 每个机制必须从“不变量”理解

例如 Hook 规则：

表面规则：

```text
Hook 不能放 if 中
```

源码事实：

```text
函数组件状态通过按调用顺序推进的 Hook 链表关联
```

不变量：

> 同一个组件的每次 Render，状态 Hook 的逻辑身份必须可稳定对应。

于是规则自然推出。

---

## 6. 学习时要区分“描述对象”和“运行实体”

非常容易混：

```text
JSX
React Element
Component
Fiber
DOM Node
FiberRoot
Hook
Effect
Update
```

推荐始终问：

```text
这个对象是谁创建的？
生命周期多长？
存在哪里？
是不是浏览器对象？
是不是 React 内部持久对象？
```

下一章 `00B` 专门解决这组对象模型。

---

## 7. 推荐源码阅读顺序

不要从仓库目录第一行开始。

```text
00C 入口到像素
 ↓
01 Fiber
 ↓
02 WorkLoop
 ↓
03 Hooks Dispatcher
 ↓
04 useState / Queue
 ↓
06 Diff
 ↓
07 Commit
 ↓
08 Lane / Scheduler
 ↓
10 setState 总链
```

然后再进入 Suspense、Hydration、RSC、Compiler。

---

## 8. 本教材术语规范

正文推荐：

```text
Reconciliation（协调）
Fiber（React 工作单元）
Lane（更新车道/优先级集合）
Commit Phase（提交阶段）
Hydration（水合）
Bailout（跳过渲染/提前退出）
```

后续重复出现时可以只写英文源码名。

原因：

> 真正搜索 React 源码、GitHub Issue、Profiler、DevTools 时，必须能识别英文原词。

中文不是替代英文，而是建立准确概念映射。

---

## 9. 判断“我真的懂了”的标准

每个主题至少达到五个层次：

### Explain（解释）
不用背稿解释为什么存在。

### Trace（追踪）
能沿源码找到当前版本实现。

### Predict（预测）
看到代码能预测 Fiber/Queue/Effect 的变化。

### Debug（调试）
能用断点和 Profiler 验证判断。

### Implement（实现）
能在 Mini React 中实现简化版机制。

“看懂文章”只属于第一层的开始。

---

## 10. 学习顺序总原则

```text
先理解为什么
 ↓
再理解数据结构
 ↓
再走 happy path 调用链
 ↓
再补异常/并发/恢复分支
 ↓
最后自己实现
```

这是整套教材的统一方法。


---

<!-- SOURCE: 00B-JSX-ReactElement-Component-Fiber-HostInstance.md -->

# 00B. JSX → React Element → Component → Fiber → Host Instance

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

你必须能回答：

```text
为什么 JSX 创建了新对象，组件 state 却可能保留？
为什么函数组件没有 instance 仍能有 state？
为什么 React 可以支持非 DOM renderer？
为什么 key 改变会重置 state？
```


---

<!-- SOURCE: 00C-从编译入口到浏览器像素-完整渲染链路.md -->

# 00C. 从编译入口到浏览器像素：React 完整渲染链路

> 源码基线：React `v19.3.0`。本章先建立“从源码文件到屏幕像素”的总模型，后续 Fiber、Hooks、Lane、Diff、Commit 都是在解释这条主链上的某一段。

## 本章专业术语（English → 中文）

| English | 中文 |
|---|---|
| `Entry Module` | 入口模块 |
| `JSX Transform` | JSX 转换 |
| `Transpilation` | 转译 |
| `Bundler` | 打包器 |
| `Module Graph` | 模块依赖图 |
| `React Element` | React 元素 / UI 描述对象 |
| `React Root` | React 根节点 |
| `Fiber Root` | Fiber 根对象 |
| `Host Root` | 宿主根 Fiber |
| `Reconciler` | 协调器 |
| `Renderer` | 渲染器 |
| `Render Phase` | Render 阶段 / 计算阶段 |
| `Commit Phase` | Commit 阶段 / 提交阶段 |
| `Host Component` | 宿主组件，如 `div`、`span` |
| `Host Instance` | 宿主实例，React DOM 中即真实 DOM 节点 |
| `Style Recalculation` | 样式重新计算 |
| `Layout` | 布局 / 回流 |
| `Paint` | 绘制 |
| `Composite` | 合成 |

完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

---

## 先用白话理解：浏览器真正经历了哪几件事

很多人会把“React 编译”和“React 渲染”混成一件事。实际上一个普通前端工程至少经过两段完全不同的时间：

```text
开发 / 构建时
JSX/TSX 源文件
↓
Babel / SWC / esbuild 等解析和转换
↓
模块图、代码分割、生产优化
↓
浏览器最终能执行的 JavaScript

浏览器运行时
index.html 被解析
↓
发现 <script type="module">
↓
请求入口 JS 和依赖模块
↓
JavaScript 引擎解析 / 编译 / 执行模块
↓
执行 createRoot(...).render(...)
↓
React Runtime 开始工作
↓
Commit 修改 DOM
↓
浏览器 Style / Layout / Paint / Composite
```

在 Vite 开发模式里，你看到的是按需转换和模块请求；生产环境通常先 `build` 生成静态产物。无论哪种方式，**浏览器并不是直接理解 JSX**，而是执行经过转换后的 JavaScript。

### JavaScript 引擎里的“编译”也别混淆

浏览器 JavaScript 引擎本身也会对 JavaScript 做 parse（解析）、bytecode / JIT compilation（字节码 / 即时编译）等内部工作。这和 Babel/SWC 的源码转换不是同一层：

```text
Babel/SWC：开发工具链里的源码到源码转换
JS Engine：浏览器运行时把 JavaScript 变成可执行机器工作
React：执行后的 JavaScript 库，用自己的数据结构计算 UI
Browser Renderer：把 DOM/CSS 变成像素
```

---

## 1. 先把最容易混淆的三个“渲染”分开

工程师经常说“React 渲染”，但实际上至少有三件完全不同的事情：

```text
① Build / Compile（构建 / 编译转换）
JSX/TSX
 ↓
JavaScript

② React Render（React Render 阶段 / 计算阶段）
React Element
 ↓
Fiber Tree
 ↓
计算下一版 UI

③ Browser Rendering（浏览器渲染）
DOM + CSS
 ↓
Style
 ↓
Layout
 ↓
Paint
 ↓
Composite
 ↓
屏幕像素
```

因此：

> `root.render(<App />)` 中的 `render`，不是“浏览器现在立刻绘制 `<App />`”。它首先是向 React 根提交一次 UI 更新请求。

---

# Part I：代码为什么不能直接把 JSX 交给浏览器

## 2. 一个最小 React 工程的入口

HTML：

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

入口代码：

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

浏览器最终认识的是 JavaScript、DOM、CSS 等 Web 平台能力；JSX 是 JavaScript 的语法扩展，必须先经过 **JSX Transform（JSX 转换）**。

---

## 3. JSX 编译到底发生了什么

源码：

```jsx
function App() {
  return <h1 className="title">Hello React</h1>;
}
```

现代 JSX Transform 可以概念化为：

```js
import { jsx as _jsx } from 'react/jsx-runtime';

function App() {
  return _jsx('h1', {
    className: 'title',
    children: 'Hello React',
  });
}
```

开发模式下常见的是类似：

```js
_jsxDEV(...)
```

这一步可能由 Babel、SWC、esbuild 或具体框架/构建工具的编译链完成。**不要把 JSX 转换器和 React 自己混成一个东西。**

React 19 要求使用现代 JSX Transform。

### 关键结论

```text
JSX
不是 DOM
也不是 Fiber

JSX
 ↓ 编译
jsx()/jsxDEV()
 ↓ 执行
React Element
```

---

## 4. `<App />` 和 `<div />` 编译后有什么区别

```jsx
<App name="Tom" />
```

概念上：

```js
jsx(App, {name: 'Tom'})
```

其中：

```text
type = App 函数
```

而：

```jsx
<div className="box" />
```

概念上：

```js
jsx('div', {className: 'box'})
```

其中：

```text
type = 'div'
```

后面 Fiber Reconciler（Fiber 协调器）正是根据这些信息区分：

```text
FunctionComponent（函数组件）
HostComponent（宿主组件）
ClassComponent（类组件）
Fragment（片段）
Suspense（异步边界）
...
```

---

## 5. React Element 是什么

不要把 React Element 说成“真实 DOM”。

教学化结构：

```js
{
  $$typeof: Symbol.for('react.transitional.element'),
  type: 'h1',
  key: null,
  props: {
    className: 'title',
    children: 'Hello React'
  }
}
```

具体内部字段会随版本演进，但稳定思想是：

> React Element（React 元素）是对“UI 应该是什么”的不可变描述，不是浏览器节点。

此时页面上还没有因为这个对象自动多出一个 `<h1>`。

---

# Part II：构建工具到底做了什么

## 6. Build Time（构建期）与 Runtime（运行期）必须分开

典型开发链：

```text
src/main.jsx
src/App.jsx
src/components/*
CSS / assets
       ↓
Bundler / Dev Server
       ↓
解析 Module Graph（模块依赖图）
       ↓
JSX / TS 转译
       ↓
依赖解析
       ↓
开发：按模块提供给浏览器
生产：生成 chunks/assets
       ↓
Browser
```

生产构建还可能包括：

```text
Tree Shaking（摇树优化 / 无用代码消除）
Minification（压缩）
Code Splitting（代码分割）
Chunk Hashing（分块哈希）
Source Map（源码映射）
CSS Processing（CSS 处理）
```

这些不是 Fiber 的职责。

### 架构边界

```text
编译器 / 构建工具
负责把“作者写的代码”变成浏览器可执行资源

React Runtime
负责在浏览器执行期间维护 UI 状态和更新

Browser
负责 DOM/CSS/布局/绘制/合成
```

---

# Part III：浏览器执行入口文件

## 7. 浏览器加载到入口模块之后发生什么

浏览器解析 `index.html` 时先得到：

```text
Document
└── html
    └── body
        └── div#root
```

这时候：

```js
document.getElementById('root')
```

返回的是一个真实 DOM Element。

它和 React 内部的 Fiber Root 完全不是同一个东西。

我们先命名：

```js
const container = document.getElementById('root');
```

这里的 `container`：

> Browser DOM Container（浏览器 DOM 容器）。

---

# Part IV：入口 API 的历史版本必须区分

## 8. React 17 及更早常见入口：ReactDOM.render

旧代码：

```jsx
import ReactDOM from 'react-dom';

ReactDOM.render(
  <App />,
  document.getElementById('root'),
);
```

正确签名至少包含：

```text
要渲染的 React Node
+
DOM container
```

所以：

```js
ReactDOM.render(document.getElementById('root'))
```

不是正确的完整用法。

React 18 将 `ReactDOM.render` 标记为 deprecated（已弃用），React 19 已移除该 API。

---

## 9. React 18+ / React 19 的客户端入口

当前标准写法：

```jsx
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<App />);
```

要把它拆成两个完全不同的动作：

```text
createRoot(container)
= 建立 React Root 基础设施

root.render(<App />)
= 向这个 Root 提交一次 UI 更新
```

这两个动作不是一回事。

---

# Part V：createRoot 到底创建了什么

## 10. 第一层入口：react-dom/client

源码重点：

```text
packages/react-dom/src/client/ReactDOMRoot.js
```

React 19.3 中 `createRoot` 的主干可抽象为：

```js
function createRoot(container, options) {
  validateContainer(container);

  const internalRoot = createContainer(
    container,
    ConcurrentRoot,
    ...
  );

  markContainerAsRoot(internalRoot.current, container);
  listenToAllSupportedEvents(container);

  return new ReactDOMRoot(internalRoot);
}
```

这里出现三个关键动作：

```text
① createContainer
   创建 React 内部 Root

② markContainerAsRoot
   把 DOM container 与 React Root 关联

③ listenToAllSupportedEvents
   初始化 React DOM 事件委托体系
```

也就是说：

> `createRoot` 不仅是保存一个 DOM 节点，它同时建立 Fiber Root，并初始化 React DOM 与宿主环境的关系。

---

## 11. createContainer → createFiberRoot

源码：

```text
packages/react-reconciler/src/ReactFiberReconciler.js
packages/react-reconciler/src/ReactFiberRoot.js
```

调用链：

```text
createRoot(container)
      ↓
createContainer(container, ConcurrentRoot, ...)
      ↓
createFiberRoot(...)
```

`createFiberRoot` 最重要的事情之一：

```text
创建 FiberRootNode
创建 HostRoot Fiber
把两者互相连接
初始化 HostRoot UpdateQueue
```

教学化：

```js
const root = new FiberRootNode(containerInfo, ...);

const uninitializedFiber = createHostRootFiber(...);

root.current = uninitializedFiber;
uninitializedFiber.stateNode = root;

initializeUpdateQueue(uninitializedFiber);
```

形成：

```text
真实 DOM container
        ↑
        │ containerInfo
   FiberRootNode
        │ current
        ↓
   HostRoot Fiber
        │ stateNode
        └──────────→ FiberRootNode
```

### 为什么需要 FiberRoot 和 HostRoot Fiber 两层？

因为它们承担的职责不同。

**FiberRoot（根级运行时状态）**：

```text
containerInfo
current
pendingLanes
suspendedLanes
pingedLanes
callbackNode
callbackPriority
错误处理器
缓存
...
```

**HostRoot Fiber（Fiber 树里的根节点）**：

```text
参与 Fiber 遍历
拥有 UpdateQueue
拥有 memoizedState
拥有 child
拥有 lanes/flags
```

这是一种典型的：

> Runtime Root State（根运行时状态）与 Tree Node（树节点）分离设计。

---

# Part VI：root.render(<App />) 为什么不是直接调用 App

## 12. ReactDOMRoot.prototype.render

React 19.3 主干非常清楚：

```js
ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot;
  updateContainer(children, root, null, null);
};
```

所以：

```jsx
root.render(<App />)
```

并不是：

```js
App();
```

而是：

```text
把 <App /> 对应的 React Element
作为 Root Update（根更新）
提交给 Reconciler（协调器）
```

---

## 13. updateContainer：创建 Root Update

源码：

```text
packages/react-reconciler/src/ReactFiberReconciler.js
```

核心链：

```text
updateContainer(element, root)
      ↓
current = root.current
      ↓
requestUpdateLane(current)
      ↓
updateContainerImpl(...)
      ↓
createUpdate(lane)
      ↓
update.payload = { element }
      ↓
enqueueUpdate(rootFiber, update, lane)
      ↓
scheduleUpdateOnFiber(root, rootFiber, lane)
```

这一步非常重要。

第一次：

```jsx
root.render(<App />)
```

和以后：

```jsx
root.render(<AnotherApp />)
```

从协调器视角，都是：

> Root Fiber 收到一个 Update（更新对象）。

### 教学化 Update

```js
{
  lane,
  payload: {
    element: <App />
  },
  callback,
  next
}
```

所以初次渲染本质上也属于 React 更新系统。

---

# Part VII：Lane 和 Root Scheduler 如何接手

## 14. requestUpdateLane：这次更新属于哪一类工作

Lane（更新车道/优先级集合）不是简单的“数字优先级”。

它解决的是：

```text
哪些 Update 可以一起处理？
哪些应该先处理？
哪些可以延后？
哪些被跳过后要重放？
哪些工作彼此 entangle（纠缠）？
```

初始 `root.render` 会取得对应 lane，随后进入：

```text
scheduleUpdateOnFiber
```

---

## 15. scheduleUpdateOnFiber → ensureRootIsScheduled

更新最终需要把 Root 放进全局根调度体系。

React 19.3 要特别注意：

```text
ensureRootIsScheduled
```

主要负责：

```text
① 确保 root 在 root schedule 中
② 确保存在一个 microtask 处理 root schedule
```

真正大量调度判断并不是全在这个函数立刻完成。

React 19.3 主线：

```text
scheduleUpdateOnFiber
       ↓
markRootUpdated / 标记 Root 有待处理 lanes
       ↓
ensureRootIsScheduled
       ↓
把 Root 放入 scheduled roots 链
       ↓
安排 microtask
       ↓
processRootScheduleInMicrotask
       ↓
scheduleTaskForRootDuringMicrotask
       ↓
getNextLanes
       ↓
同步执行 or Scheduler callback
```

这也是为什么不能再用非常老的教程简单画成：

```text
scheduleUpdateOnFiber
↓
Scheduler.scheduleCallback
```

现代 React 的 Root Scheduler 层已经更明确。

---

# Part VIII：什么时候真正执行 Fiber 工作

## 16. Scheduler Task → performWorkOnRoot

并发任务入口大致：

```text
Scheduler callback
      ↓
performWorkOnRootViaSchedulerTask
      ↓
performWorkOnRoot(root, lanes, forceSync)
```

随后 React 决定：

```text
同步 Render
还是
时间切片式 Render
```

可以抽象成：

```text
renderRootSync
or
renderRootConcurrent
```

具体内部函数命名可能随着实现调整，但核心不变量不变：

> React 会根据当前 lanes 和执行环境，选择是否允许 Render 工作向主线程让步。

---

# Part IX：Fiber Work Loop（Fiber 工作循环）

## 17. Work Loop 为什么是 Fiber 架构核心

同步路径核心思想：

```js
while (workInProgress !== null) {
  performUnitOfWork(workInProgress);
}
```

并发调度路径：

```js
while (workInProgress !== null && !shouldYield()) {
  performUnitOfWork(workInProgress);
}
```

这里真正体现了 Fiber 相对老 Stack Reconciler 的架构价值：

```text
React 自己保存“下一步要处理哪个 Fiber”
而不是完全依赖 JavaScript call stack
```

---

## 18. performUnitOfWork：一个 Fiber 怎么工作

核心模型：

```text
performUnitOfWork(fiber)
       ↓
beginWork
       ↓
如果有 child
    → child 成为下一个 workInProgress

如果没有 child
    → completeUnitOfWork
```

所以整个 Render Phase 是一棵 Fiber 树的 DFS（深度优先遍历）。

---

# Part X：beginWork 为什么会执行 App()

## 19. HostRoot 首先处理 Root UpdateQueue

Fiber 树最初只有：

```text
HostRoot Fiber
```

它的 UpdateQueue 中已经有：

```text
payload.element = <App />
```

`beginWork(HostRoot)` 会计算新的 root state，得到：

```text
nextChildren = <App />
```

随后：

```text
reconcileChildren
```

创建或复用 App 对应 Fiber。

树开始变成：

```text
HostRoot
   ↓ child
App Fiber
```

---

## 20. FunctionComponent 才会真正执行组件函数

来到 `App Fiber`：

```text
beginWork(App Fiber)
       ↓
updateFunctionComponent
       ↓
renderWithHooks
       ↓
App(props)
```

例如：

```jsx
function App() {
  return (
    <div className="app">
      <h1>Hello</h1>
      <button>Click</button>
    </div>
  );
}
```

执行 App 后得到新的 React Elements。

注意：

```text
组件函数执行
≠ DOM 已经出现
```

它只是产生下一层 UI 描述。

---

# Part XI：React Element 如何变成 Fiber

## 21. Reconciliation（协调）

React 要比较：

```text
Current Fiber Tree（当前树）
        vs
新的 React Elements
```

初次 Mount 时旧 child 很少/为空，所以主要是创建 Fiber。

更新时则通过：

```text
type
key
位置
```

决定：

```text
复用
新增
移动
删除
```

例如：

```jsx
<div className="app">
```

最终对应一个：

```text
HostComponent Fiber
  type = 'div'
```

函数组件：

```jsx
<App />
```

对应：

```text
FunctionComponent Fiber
  type = App
```

---

# Part XII：completeWork 阶段才开始准备真实 DOM

## 22. beginWork 向下，completeWork 向上

树：

```text
HostRoot
  └─ App
      └─ div
          ├─ h1
          └─ button
```

大致顺序：

```text
begin HostRoot
begin App
begin div
begin h1
complete h1
begin button
complete button
complete div
complete App
complete HostRoot
```

这就是 Render Phase 的两半：

```text
beginWork    → 向下
completeWork → 向上
```

---

## 23. HostComponent 的 completeWork 会调用 Renderer

对于：

```jsx
<div className="app">
```

React Reconciler 自己不应该写死：

```js
document.createElement('div')
```

因为同一套 Reconciler 还可以服务其他 Renderer。

所以它调用 Host Config（宿主配置/平台适配层）：

```text
completeWork(HostComponent)
       ↓
createInstance(type, props, ...)
       ↓
React DOM Host Config
       ↓
document.createElement(type)
```

React DOM 对应源码：

```text
packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js
```

在普通 HTML 节点路径中最终确实会到：

```js
ownerDocument.createElement(type)
```

所以：

> Virtual UI（虚拟 UI）到真实 DOM 的关键跨层点，就是 Renderer Host Config。

---

## 24. Mount 时 DOM 先在“离屏状态”组装

比如：

```jsx
<div>
  <h1>Hello</h1>
</div>
```

React 可以先创建：

```text
HTMLHeadingElement
HTMLDivElement
```

然后：

```js
div.appendChild(h1)
```

但这个 `div` 还不一定已经插入页面的 `#root`。

这非常关键：

```text
Render Phase
可以创建尚未接入真实页面树的 Host Instances

Commit Phase
才把完成的结果正式连接到已提交 UI
```

这就是 Render / Commit 边界的重要含义。

---

# Part XIII：Render 完成后发生什么

## 25. Render Phase 产出 finishedWork

一轮 Render 完成以后，你可以概念化为：

```text
Current Tree
    │
    │ alternate
    ↓
Finished Work / WorkInProgress Tree
```

新树里已经拥有：

```text
Fiber 结构
state
props
Hook 状态
flags
subtreeFlags
Host Instance
```

但是：

> 没有 Commit，就不能把它视为用户已经看到的新 UI。

---

# Part XIV：Commit Phase 把 DOM 接入页面

## 26. Placement Flag（插入标记）

Render 阶段发现某个 Fiber 是新节点时，会标记类似：

```text
Placement
```

Commit Mutation Phase（提交 DOM 变更阶段）处理它。

React 19.3 Host Effect 主线可以抽象：

```text
commitMutationEffects
      ↓
commitHostPlacement
      ↓
commitPlacement
      ↓
找到最近 Host Parent
      ↓
insertOrAppendPlacementNode...
      ↓
appendChildToContainer / appendChild / insertBefore
```

当父节点是 HostRoot 时：

```text
parent = FiberRoot.containerInfo
```

也就是：

```js
parent === document.getElementById('root')
```

最终某个宿主调用会落到浏览器 DOM API。

于是最初：

```html
<div id="root"></div>
```

变成：

```html
<div id="root">
  <div class="app">
    <h1>Hello</h1>
    <button>Click</button>
  </div>
</div>
```

到这里才真正改变浏览器 DOM Tree。

---

# Part XV：事件是在什么时候接上的

## 27. React 事件不是每个 onClick 都简单 addEventListener 一次

`createRoot` 阶段 React DOM 会调用类似：

```text
listenToAllSupportedEvents(rootContainerElement)
```

这建立的是 React 的 Event Delegation（事件委托）基础设施。

组件上的：

```jsx
<button onClick={handleClick} />
```

并不是简单等价于：

```js
button.addEventListener('click', handleClick)
```

React DOM 会保存 props/Fiber 对应关系，在根级事件监听触发后做目标 Fiber 定位、插件事件提取、优先级映射、capture/bubble 分发等。

因此事件系统应该和 `createRoot` 一起理解，而不是只放在“点击以后”理解。

---

# Part XVI：DOM 变了，为什么屏幕还不是 React 自己画的

## 28. Commit 结束后进入浏览器渲染流水线

React 最终只是在 Web Host Environment（Web 宿主环境）里修改 DOM/CSS 相关状态。

然后浏览器负责：

```text
DOM
+
CSSOM
 ↓
Style Recalculation
（样式计算）
 ↓
Layout / Reflow
（布局 / 回流）
 ↓
Paint
（绘制记录）
 ↓
Rasterization
（栅格化）
 ↓
Composite
（图层合成）
 ↓
Screen Pixels
（屏幕像素）
```

React 不负责决定一个像素最终如何由 GPU 合成到显示器。

---

## 29. DOM Tree 和 Render Tree 不相等

例如：

```css
.hidden {
  display: none;
}
```

DOM 里节点可能仍存在，但它不会以普通可见盒子的方式进入最终布局/绘制结果。

所以：

```text
React Fiber Tree
≠ React Element Tree
≠ DOM Tree
≠ Browser Render Tree
≠ Layer Tree
```

这是“精通 React 与浏览器”的重要边界意识。

---

# Part XVII：useLayoutEffect 和 useEffect 应该放在整条链的哪里

## 30. useLayoutEffect

核心时机模型：

```text
DOM Mutation
 ↓
Ref attach / Layout Effects
 ↓
浏览器获得绘制机会
```

因此：

```js
useLayoutEffect(() => {
  const rect = ref.current.getBoundingClientRect();
});
```

可以在浏览器绘制前同步测量/调整布局，但也可能阻塞首帧。

---

## 31. useEffect

Passive Effect（被动副作用）不是构建 Fiber Tree 的一部分业务副作用执行。

一般心智模型：

```text
Commit
 ↓
浏览器 Paint（通常有机会发生）
 ↓
Passive Effects
```

但不要把“永远严格在 paint 后某一个固定毫秒执行”当成浏览器规范保证；React 调度与同步交互场景会让实际时序存在细节。

真正稳定的原则：

```text
useLayoutEffect：与布局读取/同步 DOM 调整相关，阻塞视觉提交路径
useEffect：用于与外部系统同步，不应该依赖同步布局时机
```

---

# Part XVIII：完整一条初次 Mount 调用链

## 32. 从文件到屏幕

把整章压缩成一条链：

```text
开发者源码
main.jsx / App.jsx
        ↓
JSX Transform（JSX 转换）
        ↓
JavaScript ESM
        ↓
Bundler / Dev Server
        ↓
Browser 下载并执行入口模块
        ↓
document.getElementById('root')
        ↓
得到真实 DOM Container
        ↓
createRoot(container)
        ↓
ReactDOMRoot.createRoot
        ↓
createContainer
        ↓
createFiberRoot
        ↓
FiberRootNode
+
HostRoot Fiber
+
HostRoot UpdateQueue
        ↓
listenToAllSupportedEvents
        ↓
root.render(<App />)
        ↓
ReactDOMRoot.prototype.render
        ↓
updateContainer
        ↓
requestUpdateLane
        ↓
createUpdate
        ↓
update.payload = {element: <App />}
        ↓
enqueueUpdate(HostRoot)
        ↓
scheduleUpdateOnFiber
        ↓
ensureRootIsScheduled
        ↓
Root Schedule
        ↓
Microtask
        ↓
processRootScheduleInMicrotask
        ↓
scheduleTaskForRootDuringMicrotask
        ↓
Scheduler / Sync path
        ↓
performWorkOnRoot
        ↓
Render Phase
        ↓
Work Loop
        ↓
performUnitOfWork
        ↓
beginWork(HostRoot)
        ↓
处理 Root UpdateQueue
        ↓
得到 <App />
        ↓
reconcileChildren
        ↓
App Fiber
        ↓
beginWork(App)
        ↓
renderWithHooks
        ↓
App()
        ↓
新的 React Elements
        ↓
继续 Reconciliation
        ↓
HostComponent Fibers
        ↓
completeWork
        ↓
React DOM Host Config
        ↓
createInstance
        ↓
document.createElement
        ↓
离屏组装 Host Instances
        ↓
finishedWork 完成
        ↓
Commit Phase
        ↓
commitMutationEffects
        ↓
Placement / Update / Deletion
        ↓
commitHostPlacement
        ↓
appendChildToContainer / insertBefore / appendChild
        ↓
真实 DOM Tree 改变
        ↓
Layout Effects / refs
        ↓
Browser Rendering Pipeline
        ↓
Style
        ↓
Layout
        ↓
Paint
        ↓
Composite
        ↓
用户看到屏幕像素
        ↓
Passive Effects
```

如果你能从头到尾解释这条链，你才真正拥有 React Runtime 的“地图”。

---

# Part XIX：一次 setState 为什么走的是同一条后半段链路

## 33. 初次 root.render 和组件 setState 的汇合点

初次 Render：

```text
root.render
 ↓
Root UpdateQueue
 ↓
scheduleUpdateOnFiber
```

函数组件：

```text
setState
 ↓
dispatchSetState
 ↓
Hook UpdateQueue
 ↓
scheduleUpdateOnFiber
```

所以二者从这里开始汇合：

```text
scheduleUpdateOnFiber
 ↓
Root Scheduler
 ↓
Lane selection
 ↓
Render
 ↓
Reconciliation
 ↓
Commit
```

区别主要在：

```text
Update 从哪里产生
UpdateQueue 存在哪里
Update 如何计算新 state
```

这就是为什么 `root.render`、Class `setState`、Hook `setState`、Context propagation 最终都能进入统一 Reconciler。

---

# Part XX：旧 ReactDOM.render 与现代 createRoot 的源码思想区别

## 34. Legacy Root（旧根）

React 17 及早期教程常见：

```jsx
ReactDOM.render(<App />, container);
```

React 18 虽然仍提供兼容路径，但会按 Legacy Root 行为工作；React 19 已删除公开 `ReactDOM.render` API。

从架构演进看：

```text
ReactDOM.render
      ↓
Legacy Root
      ↓
更偏同步旧语义
```

现代：

```text
createRoot
      ↓
Concurrent Root
      ↓
Lane + Root Scheduler + Concurrent 能力基础
```

因此学习老源码时，一定要看版本号，否则很容易把：

```text
expirationTime
scheduleWork
ReactFiberScheduler
legacy renderSubtreeIntoContainer
```

和现代：

```text
Lane
Root Scheduler
scheduleUpdateOnFiber
createRoot
```

混到一起。

---

# Part XXI：CSR 和 Hydration 入口不是一回事

## 35. CSR：createRoot

空容器：

```html
<div id="root"></div>
```

客户端从零创建 DOM：

```jsx
createRoot(container).render(<App />)
```

这是 Client-Side Rendering（客户端渲染）入口。

---

## 36. SSR 页面：hydrateRoot

服务端已经生成：

```html
<div id="root">
  <h1>Hello</h1>
</div>
```

客户端应该：

```jsx
hydrateRoot(container, <App />)
```

Hydration（水合）的目标不是“全部重新 createElement”，而是：

```text
尝试认领已有 DOM
 ↓
与客户端 Fiber 对应
 ↓
恢复事件/交互能力
 ↓
不匹配时执行恢复策略
```

所以：

```text
createRoot = client mount
hydrateRoot = attach to server markup
```

不能混用。

---

# Part XXII：浏览器首屏为什么可能感觉慢

## 37. “React 慢”可能发生在完全不同的阶段

一条页面性能链：

```text
Network
 ↓
JS Download
 ↓
Parse / Compile JS
 ↓
Execute modules
 ↓
React Render CPU
 ↓
Commit DOM mutations
 ↓
Style
 ↓
Layout
 ↓
Paint
 ↓
Composite
```

因此首屏慢时不能只说：

> Virtual DOM Diff 太慢。

真正可能的问题：

```text
bundle 太大
JS 主线程执行太久
组件 Render 太重
Context 传播过大
DOM 数量过多
同步 layout effect 太多
强制同步布局
大型图片/字体阻塞
CSS 复杂
Layout Thrashing
Paint 区域过大
GPU 合成压力
```

架构师必须先定位阶段，再优化。

---

# Part XXIII：开发环境为什么和生产环境行为感觉不同

## 38. Development 与 Production

开发环境可能增加：

```text
StrictMode 额外验证
开发警告
JSXDEV metadata
React DevTools hooks
Fast Refresh
Source Map
HMR
```

生产环境则通常：

```text
压缩
删除 DEV 分支
优化 chunk
关闭开发检查
```

因此你在源码调试时必须明确：

```text
我现在跟的是 DEV build 还是 PROD build？
```

很多“为什么执行两遍”的问题，实际来自 StrictMode 的开发验证，而不是生产 Render 一定执行两遍。

---

# Part XXIV：建议实际下断点跟一次

## 39. 最小 Demo

```jsx
import { createRoot } from 'react-dom/client';
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <main>
      <h1>{count}</h1>
      <button onClick={() => setCount(v => v + 1)}>
        +1
      </button>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
```

### 第一轮：只跟初次 Mount

建议断点：

```text
createRoot
createContainer
createFiberRoot
ReactDOMRoot.prototype.render
updateContainer
updateContainerImpl
scheduleUpdateOnFiber
ensureRootIsScheduled
processRootScheduleInMicrotask
scheduleTaskForRootDuringMicrotask
performWorkOnRootViaSchedulerTask
performWorkOnRoot
performUnitOfWork
beginWork
renderWithHooks
completeWork
createInstance
commitHostPlacement
```

### 第二轮：点击 +1

重点比较：

```text
初次：Root UpdateQueue
更新：Hook UpdateQueue
```

并观察两条链如何在：

```text
scheduleUpdateOnFiber
```

附近重新汇合。

---

# Part XXV：源码阅读锚点（React 19.3）

## 40. 入口与 Root

```text
packages/react-dom/src/client/ReactDOMRoot.js
  createRoot
  ReactDOMRoot.prototype.render
```

```text
packages/react-reconciler/src/ReactFiberReconciler.js
  createContainer
  updateContainer
  updateContainerImpl
```

```text
packages/react-reconciler/src/ReactFiberRoot.js
  FiberRootNode
  createFiberRoot
```

---

## 41. 调度

```text
packages/react-reconciler/src/ReactFiberWorkLoop.js
  requestUpdateLane
  scheduleUpdateOnFiber
  performWorkOnRoot
  performUnitOfWork
  completeUnitOfWork
```

```text
packages/react-reconciler/src/ReactFiberRootScheduler.js
  ensureRootIsScheduled
  processRootScheduleInMicrotask
  scheduleTaskForRootDuringMicrotask
  performWorkOnRootViaSchedulerTask
```

---

## 42. Reconciliation 与 Fiber

```text
packages/react-reconciler/src/ReactFiberBeginWork.js
  beginWork
  updateHostRoot
  updateFunctionComponent
```

```text
packages/react-reconciler/src/ReactChildFiber.js
  reconcileChildFibers
  reconcileChildrenArray
```

```text
packages/react-reconciler/src/ReactFiberHooks.js
  renderWithHooks
```

---

## 43. DOM 创建与 Commit

```text
packages/react-reconciler/src/ReactFiberCompleteWork.js
  completeWork
```

```text
packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js
  createInstance
  createTextInstance
  appendInitialChild
  finalizeInitialChildren
```

```text
packages/react-reconciler/src/ReactFiberCommitWork.js
  commitMutationEffects
  commitLayoutEffects
```

```text
packages/react-reconciler/src/ReactFiberCommitHostEffects.js
  commitHostPlacement
  commitPlacement
  insertOrAppendPlacementNode
```

---

# Part XXVI：这一章必须掌握的 12 个问题

## 44. 自检题

1. JSX 是在浏览器运行时才变成 React Element，还是构建时先被转换？
2. `_jsx('div', props)` 返回的是 DOM 还是 React Element？
3. `createRoot(container)` 和 `root.render(<App />)` 分别承担什么职责？
4. FiberRoot 和 HostRoot Fiber 为什么不是同一个对象？
5. `root.render(<App />)` 为什么没有直接执行 `App()`？
6. Root 的第一次 Render 为什么也可以看成一次 Update？
7. `update.payload = {element}` 的意义是什么？
8. React 19.3 中 `ensureRootIsScheduled` 的核心职责是什么？
9. `beginWork` 和 `completeWork` 的方向分别是什么？
10. `document.createElement` 为什么出现在 React DOM Host Config，而不是写死在通用 Reconciler？
11. `completeWork` 已经创建 DOM 以后，为什么还需要 Commit？
12. DOM 更新完成后，为什么还不能说“React 已经自己画完屏幕”？

---

# Part XXVII：参考答案

## 45. 自检答案

### 1
JSX 通常在构建/转译阶段被转换为 `jsx/jsxDEV` 等 JavaScript 调用；这些调用在浏览器执行时产生 React Element。

### 2
返回 React Element（UI 描述对象），不是 DOM。

### 3
`createRoot` 建立 Root/FiberRoot、HostRoot Fiber、事件基础设施等；`root.render` 向该 Root 提交 React Node 更新。

### 4
FiberRoot 保存根级调度/容器/lanes 等运行时状态；HostRoot Fiber 是 Fiber Tree 中参与协调和拥有 UpdateQueue 的树节点。职责不同，因此分离。

### 5
因为 `root.render` 先把 React Node 形成 Root Update，经调度后在 Render Phase 到达 FunctionComponent Fiber 时，才通过 `renderWithHooks` 执行组件函数。

### 6
因为 HostRoot 本身有 UpdateQueue；初始 `<App />` 被放进 Root Update 的 payload，再统一走 Reconciler 更新机制。

### 7
它把“下一版 Root 应该渲染的 React Node”作为 Update 的数据保存下来，供 HostRoot 计算下一状态和 children。

### 8
把 Root 纳入 root schedule，并确保有 microtask 去处理整个 root schedule；真正的大量 lane/任务决策延迟到 microtask 中完成。

### 9
`beginWork` 主要向 child 深入、计算 children；`completeWork` 从叶子向父级回溯并完成 Host Instance/flags 等工作。

### 10
因为 `react-reconciler` 要平台无关；Web、Native、自定义 Renderer 都应该复用 Reconciler，把平台操作交给 Host Config。

### 11
Render 期间创建的 Host Instance 可以是离屏候选结果；只有 Commit 才把 finished tree 的变化原子性地连接到当前已提交宿主树，并运行对应 commit side effects。

### 12
React 只修改 DOM/宿主状态；浏览器之后还需要完成 Style、Layout、Paint、Rasterize、Composite 等渲染流水线才能得到屏幕像素。

---

# Part XXVIII：最终架构图

```text
┌──────────────────────────────────────────────┐
│                Author Source                 │
│          JSX / TSX / CSS / Modules          │
└─────────────────────┬────────────────────────┘
                      │ JSX Transform / Build
                      ▼
┌──────────────────────────────────────────────┐
│              Browser JavaScript              │
│      jsx() → React Element → Entry Module    │
└─────────────────────┬────────────────────────┘
                      │ createRoot
                      ▼
┌──────────────────────────────────────────────┐
│                 React DOM                    │
│  DOM Container / Event System / Host Config │
└─────────────────────┬────────────────────────┘
                      │ createContainer
                      ▼
┌──────────────────────────────────────────────┐
│               React Reconciler               │
│ FiberRoot / HostRoot / UpdateQueue / Lanes  │
└─────────────────────┬────────────────────────┘
                      │ schedule
                      ▼
┌──────────────────────────────────────────────┐
│            Root Scheduler / Scheduler        │
│ microtask / lanes / callback / shouldYield  │
└─────────────────────┬────────────────────────┘
                      │ performWorkOnRoot
                      ▼
┌──────────────────────────────────────────────┐
│                Render Phase                  │
│ beginWork → reconcile → completeWork         │
│ React Element → Fiber → Host Instance        │
└─────────────────────┬────────────────────────┘
                      │ finishedWork
                      ▼
┌──────────────────────────────────────────────┐
│                Commit Phase                  │
│ mutation → refs/layout effects → passive    │
└─────────────────────┬────────────────────────┘
                      │ DOM APIs
                      ▼
┌──────────────────────────────────────────────┐
│                 Browser                      │
│ DOM → Style → Layout → Paint → Composite    │
└─────────────────────┬────────────────────────┘
                      ▼
                 Screen Pixels
```

这一张图应该成为整个 React 源码学习体系的首页心智模型。


---

<!-- SOURCE: 01-Fiber数据结构与双缓冲.md -->

# 01. Fiber 数据结构与双缓冲

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Root Container` | 根容器 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Current Tree` | 当前已提交 Fiber 树 |
| `Double Buffering` | 双缓冲 |
| `alternate` | 双树对应指针 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `Key` | 列表身份键 |
| `Placement` | 插入标记 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能从 Fiber 字段反推它承担的运行时职责
- 能手画 current / workInProgress / alternate 的关系
- 能解释 flags、lanes、childLanes 为什么是局部增量更新的基础

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiber.js
packages/react-reconciler/src/ReactInternalTypes.js
packages/react-reconciler/src/ReactFiberRoot.js
```

## 本章核心不变量

- current 始终代表已提交树
- WIP 可以失败/重做而不能污染 current
- child/sibling/return 必须足以恢复 DFS 进度

---

## 先用白话理解：Fiber 到底是什么

如果你只写业务，可以先把 Fiber 想成 React 给“页面里的每个组件/节点”建立的一张**工作卡片**。卡片上记录：我是谁、我的父子兄弟是谁、上次 props/state 是什么、这次有没有更新、优先级多高、最终要不要改 DOM。

React 15 更像“一口气递归把整棵组件树算完”；Fiber 以后，React 把大任务拆成很多工作卡片，所以做完一张后可以知道下一张是谁，也有机会先处理更紧急的工作。

注意：Fiber **不是线程**，也不是浏览器 DOM；它是 React 运行时内部的数据结构和工作单元。

---

## 1. Fiber 是什么

Fiber 不是简单“虚拟 DOM 节点”。

一个 Fiber 同时表示：

```text
组件身份
+ 树关系
+ props/state
+ Hooks
+ 更新优先级
+ 副作用标记
+ 对应宿主节点
```

教学化结构：

```js
type Fiber = {
  tag,
  key,
  elementType,
  type,
  stateNode,

  return,
  child,
  sibling,
  index,

  pendingProps,
  memoizedProps,
  memoizedState,
  updateQueue,

  flags,
  subtreeFlags,

  lanes,
  childLanes,

  alternate
}
```

## 2. 三个树指针

### child

指向第一个子 Fiber。

### sibling

指向下一个兄弟 Fiber。

### return

指向父 Fiber。

例如：

```jsx
<App>
  <Header />
  <Main />
  <Footer />
</App>
```

内部关系：

```text
App.child = Header
Header.sibling = Main
Main.sibling = Footer

Header.return = App
Main.return = App
Footer.return = App
```

这使 React 可以在不依赖递归调用栈的情况下进行 DFS。

## 3. memoizedState 为什么非常重要

不同 Fiber tag 下含义不同。

对于 FunctionComponent：

```text
fiber.memoizedState
        ↓
      Hook1
        ↓
      Hook2
        ↓
      Hook3
```

对于 ClassComponent，状态模型不同。

这也是为什么你不能看到 `memoizedState` 就简单翻译成“组件 state”。

## 4. stateNode

对于不同 Fiber：

```text
HostComponent <div> → DOM Element
HostText             → Text Node
ClassComponent       → class instance
FunctionComponent    → 通常没有组件实例
HostRoot             → root container
```

## 5. alternate：双缓冲的连接

React 常见两棵 Fiber 树：

```text
Current Tree
   │
alternate
   │
WorkInProgress Tree
```

更新开始：

```text
current
  ↓
createWorkInProgress(current)
  ↓
workInProgress
```

Render 期间主要修改 WIP。

Commit 后：

```text
root.current = finishedWork
```

原 WIP 成为新的 current。

这和图形学里的 double buffering 很像：

```text
屏幕继续显示旧画面
后台准备下一帧
完成后整体交换
```

React 的意义是：

> Render 阶段可以在不破坏当前已提交 UI 的情况下构造下一版本。

## 6. flags / subtreeFlags

Render 阶段不会直接修改 DOM，而是标记：

```text
Placement
Update
ChildDeletion
Ref
Passive
Layout...
```

父 Fiber 还会汇总：

```text
subtreeFlags
```

Commit 阶段依赖这些标记快速定位真正需要执行副作用的节点。

## 7. lanes / childLanes

```text
lanes
```

表示当前 Fiber 自己有哪些待处理更新优先级。

```text
childLanes
```

表示子树有哪些待处理优先级。

这让 React 能够 bailout：

```text
当前 Fiber 自己不需要更新
且子树也没有当前 lane 的工作
→ 整棵子树可跳过
```

## 8. Fiber 为什么能暂停

不是 Fiber 对象本身“会暂停”，而是因为 React 把遍历进度显式保存在：

```text
workInProgress
child
sibling
return
```

而不是隐藏在 JS call stack。

于是：

```text
performUnitOfWork(A)
→ next = B

执行若干 Fiber 后
→ shouldYield()
→ 保存当前 workInProgress

稍后继续
```

这才是可中断 Render 的真正基础。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 02-Render工作循环.md -->

# 02. Render 工作循环：beginWork / completeWork

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Current Tree` | 当前已提交 Fiber 树 |
| `alternate` | 双树对应指针 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `Flags` | 副作用标记 |
| `beginWork` | 开始处理 Fiber |
| `completeWork` | 完成 Fiber 工作 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能按 DFS 手工模拟 beginWork / completeWork
- 能解释同步与并发 work loop 的区别
- 能说明 bailout 与 replay 在工作循环中的位置

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberCompleteWork.js
```

## 本章核心不变量

- Render Phase 必须允许重放
- 每个 unit 完成后必须能找到下一个 child/sibling/parent
- 未完成树不得进入 Commit

---

## 先用白话理解：Render 工作循环在做什么

假设 UI 是一份待审批的“新页面方案”。Render Phase（渲染计算阶段）不是马上装修房子，而是在草稿纸上把每个房间应该变成什么样算出来；`beginWork` 像从父任务向子任务展开，`completeWork` 像子任务做完后逐层回收结果。

只有整份方案准备好后，React 才进入 Commit Phase（提交阶段）真正修改 DOM。正因为 Render 只是准备候选结果，它才有机会暂停、重做或丢弃。

---

## 1. Render 的真正含义

React Render 不是浏览器 Paint。

Render Phase 的目标：

> 构造或复用 WorkInProgress Fiber Tree，计算出“下一版 UI”以及需要在 Commit 执行的 flags。

## 2. workLoop

同步模式可以抽象为：

```js
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}
```

并发模式：

```js
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress)
  }
}
```

关键差异：

```text
Sync：一直做完
Concurrent：浏览器/调度器需要时可以让出
```

## 3. performUnitOfWork

核心思想：

```js
function performUnitOfWork(unit) {
  const current = unit.alternate
  const next = beginWork(current, unit, renderLanes)

  unit.memoizedProps = unit.pendingProps

  if (next === null) {
    completeUnitOfWork(unit)
  } else {
    workInProgress = next
  }
}
```

你要看懂三件事：

1. `beginWork` 尝试继续往 child 深入。
2. 没有 child 工作时进入 `completeUnitOfWork`。
3. DFS 的“向下”和“回溯”完全由 Fiber 指针控制。

## 4. beginWork

`beginWork` 会根据 Fiber.tag 分派：

```text
FunctionComponent
  → updateFunctionComponent

ClassComponent
  → updateClassComponent

HostRoot
  → updateHostRoot

HostComponent
  → updateHostComponent

MemoComponent
  → updateMemoComponent
```

函数组件主干：

```text
beginWork
 ↓
updateFunctionComponent
 ↓
renderWithHooks
 ↓
Component(props)
 ↓
得到 nextChildren
 ↓
reconcileChildren
```

这说明：

> 函数组件的“执行”发生在 Render Phase。

所以组件函数必须保持纯净。

## 5. completeUnitOfWork

当一个 Fiber 没有未处理 child：

```text
当前 Fiber complete
↓
如果有 sibling → 去 sibling
↓
否则 return 到 parent
↓
继续 complete parent
```

伪代码：

```js
function completeUnitOfWork(unit) {
  let completed = unit

  do {
    const current = completed.alternate
    const parent = completed.return

    completeWork(current, completed)

    const sibling = completed.sibling
    if (sibling !== null) {
      workInProgress = sibling
      return
    }

    completed = parent
    workInProgress = completed
  } while (completed !== null)
}
```

## 6. completeWork

对于 HostComponent，mount 时要准备真实 DOM：

```text
<div>
  ↓
createInstance
  ↓
append children
  ↓
保存到 fiber.stateNode
```

update 时则比较 props 并准备更新信息/flags。

## 7. 深度优先执行顺序

树：

```text
      A
    /   \
   B     C
  /
 D
```

大致执行：

```text
begin A
begin B
begin D
complete D
complete B
begin C
complete C
complete A
```

这张顺序一定要自己手画。

## 8. Render 为什么可以被丢弃

因为在 Commit 前：

```text
Current Tree 仍然代表已提交页面
WIP Tree 只是候选结果
```

如果高优先级更新插入，React 可以：

```text
暂停/放弃当前 WIP
重新用更合适 lanes render
```

所以不要在 Render 里执行不可重复的副作用。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 03-Hooks-Dispatcher与链表.md -->

# 03. Hooks：Dispatcher、链表与 Render Snapshot

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `Render Snapshot` | 渲染快照 |
| `stale closure` | 过期闭包/陈旧闭包 |
| `Closure` | 闭包 |
| `Ref` | 引用 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `Mount` | 挂载 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能解释 Dispatcher 为什么存在
- 能模拟 mount/update/rerender 三类 Hook 读取
- 能解释 Hook 顺序规则、render snapshot 与 stale closure 的同一根因

## React 19.3 源码锚点

```text
packages/react/src/ReactHooks.js
packages/react-reconciler/src/ReactFiberHooks.js
```

## 本章核心不变量

- 同一组件每次 render 的有状态 Hook 顺序必须稳定
- Hook 状态跨 render 存在 Fiber 而不是函数局部变量
- render-phase update 必须被限制并可重新执行组件

---

## 先用白话理解：为什么函数组件还能“记住状态”

函数每次调用都会重新开始，局部变量不会天然跨调用保存。React 的办法不是让函数自己记状态，而是让 Fiber 替它保存一串 Hook 记录。每次组件再次执行，React 按相同顺序把“第 1 个 useState、第 2 个 useRef、第 3 个 useEffect”与旧记录对应起来。

因此 Hook 规则不是风格建议，而是**状态记录与调用位置之间的身份协议**。

---

## 1. useState 并不直接知道如何实现

用户代码：

```js
const [state, setState] = useState(0)
```

`react` 包公开的 Hook API，本质会去找当前 Dispatcher：

```js
function useState(initialState) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}
```

关键问题：

> 当前到底是 mount 还是 update？

React 通过不同 Dispatcher 解决。

概念上：

```text
HooksDispatcherOnMount
  useState → mountState
  useEffect → mountEffect

HooksDispatcherOnUpdate
  useState → updateState
  useEffect → updateEffect
```

## 2. renderWithHooks

函数组件真正进入 Hooks 系统的核心入口。

重要职责：

```text
设置 currentlyRenderingFiber
重置当前 render 的 Hook 游标
选择 mount/update Dispatcher
执行 Component(props)
收尾并检查 Hook 数量
```

教学化逻辑：

```js
function renderWithHooks(current, workInProgress, Component, props) {
  currentlyRenderingFiber = workInProgress
  workInProgress.memoizedState = null
  workInProgress.updateQueue = null

  if (current === null || current.memoizedState === null) {
    ReactSharedInternals.H = HooksDispatcherOnMount
  } else {
    ReactSharedInternals.H = HooksDispatcherOnUpdate
  }

  const children = Component(props)

  finishRenderingHooks(current, workInProgress)

  return children
}
```

## 3. Hook 数据结构

简化：

```js
type Hook = {
  memoizedState,
  baseState,
  baseQueue,
  queue,
  next
}
```

函数组件：

```jsx
function App() {
  const [count] = useState(0)
  const ref = useRef()
  useEffect(...)
}
```

对应：

```text
Fiber.memoizedState
    ↓
Hook(useState)
    ↓
Hook(useRef)
    ↓
Hook(useEffect)
```

## 4. mountWorkInProgressHook

第一次 render：

```js
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  }

  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = hook
    workInProgressHook = hook
  } else {
    workInProgressHook.next = hook
    workInProgressHook = hook
  }

  return hook
}
```

重点：

> React 没有给 Hook 用变量名做 ID。

身份主要来自**调用顺序**。

## 5. updateWorkInProgressHook

更新 render 时：

```text
Current Fiber 的 Hook 链表
          ↓
按顺序读取对应旧 Hook
          ↓
克隆/复用为 WIP Hook
```

所以：

```jsx
if (flag) {
  useState(...)
}
```

会破坏顺序。

第一次：

```text
Hook1 = A
Hook2 = B
Hook3 = C
```

第二次 flag=false：

```text
Hook1 = A
Hook2 = C
```

React 会把 Hook2 当成原来的 B。

这不是风格约束，是数据结构约束。

## 6. Render Snapshot

每次函数调用都是新的闭包：

```text
Render #1
count = 0

Render #2
count = 1
```

`Render #1` 里创建的 callback 会捕获那一轮的 `count=0`。

这就是 stale closure 的根本：

```js
useEffect(() => {
  setInterval(() => {
    console.log(count)
  }, 1000)
}, [])
```

这里 interval callback 来自首次 render。

## 7. Function Component 没有持久实例

Class：

```text
同一个 instance
state 在 instance 上变化
```

Function：

```text
每次 render 都重新调用函数
持久数据在 Fiber/Hook
函数局部变量只属于当前 render
```

一句话：

> **函数组件不是“一个不断变化的函数对象”，而是一连串 render snapshot；Fiber 才是跨 render 的宿主。**

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 04-useState与UpdateQueue.md -->

# 04. useState：Hook、UpdateQueue 与调度

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Fiber Root` | Fiber 根 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `pending` | 待处理更新 |
| `eager state` | 预计算状态 |
| `Render Snapshot` | 渲染快照 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Bailout` | 跳过渲染/提前退出 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能手工跑一次 mountState 和 updateState
- 能解释 pending 环形链表、baseQueue 与 rebase
- 能追踪 dispatchSetState → Root scheduling

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberConcurrentUpdates.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberRootScheduler.js
```

## 本章核心不变量

- update 可以延迟但不能丢失
- 不同 lane 被跳过时必须保留可重放的基础状态
- setState 产生的是 Update，不是对当前 render 变量的原地修改

---

## 先用白话理解：setState 为什么不是赋值

`setCount(1)` 不是执行 `count = 1`。当前函数里的 `count` 属于本次 Render Snapshot（渲染快照），不能被 setter 改写。setter 做的是“提交一张更新单”：把 action 放进 Update Queue（更新队列），标记优先级，然后让 React 安排下一轮计算。

下一轮 Render 再读取旧 state + 一串 Update，计算出新的 state。理解这一点后，批处理、函数式更新、stale closure、Lane、Rebase 都会自然串起来。

---

## 1. mountState

第一次调用：

```js
const [count, setCount] = useState(0)
```

主干逻辑：

```text
mountState
 ↓
mountStateImpl
 ↓
创建 Hook
 ↓
初始化 memoizedState/baseState
 ↓
创建 UpdateQueue
 ↓
创建 dispatchSetState 绑定 fiber + queue
```

教学简化：

```js
function mountState(initialState) {
  const hook = mountStateImpl(initialState)
  const queue = hook.queue

  const dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue
  )

  queue.dispatch = dispatch
  return [hook.memoizedState, dispatch]
}
```

## 2. UpdateQueue

简化结构：

```js
type UpdateQueue<S, A> = {
  pending,
  lanes,
  dispatch,
  lastRenderedReducer,
  lastRenderedState,
}
```

`pending` 常以环形单链表维护。

为什么环形？

如果只保存最后一个 update：

```text
pending = U3

U3.next → U1
U1.next → U2
U2.next → U3
```

可以 O(1) 把新 update 插入尾部，同时仍可从 `pending.next` 找到第一个。

## 3. setCount 并不修改 count

调用：

```js
setCount(1)
```

概念链：

```text
dispatchSetState
 ↓
requestUpdateLane
 ↓
创建 Update
 ↓
enqueueConcurrentHookUpdate
 ↓
scheduleUpdateOnFiber
```

简化 Update：

```js
const update = {
  lane,
  action,
  hasEagerState: false,
  eagerState: null,
  next: null,
}
```

`action` 可以是：

```js
1
```

或者：

```js
prev => prev + 1
```

## 4. 为什么 setState 后还是旧值

```js
setCount(count + 1)
console.log(count)
```

当前 `count` 属于本次 render snapshot。

`setCount` 做的是：

```text
给未来 render 排一个更新
```

不是：

```text
原地修改当前函数局部变量
```

## 5. basicStateReducer

`useState` 可以理解为基于一个非常简单 reducer：

```js
function basicStateReducer(state, action) {
  return typeof action === 'function'
    ? action(state)
    : action
}
```

因此：

```js
setCount(5)
```

等价于：

```text
action = 5
→ newState = 5
```

而：

```js
setCount(c => c + 1)
```

则：

```text
action = function
→ newState = action(previousState)
```

## 6. 为什么连续三次 setCount(count + 1) 通常只 +1

假设当前：

```text
count = 0
```

代码：

```js
setCount(count + 1)
setCount(count + 1)
setCount(count + 1)
```

三次闭包里读取到的都是：

```text
count = 0
```

所以 action 都是：

```text
1
1
1
```

最终 reduce 后仍然 1。

函数式更新：

```js
setCount(c => c + 1)
setCount(c => c + 1)
setCount(c => c + 1)
```

则：

```text
0 → 1 → 2 → 3
```

## 7. baseState / baseQueue 为什么存在

这是理解 Lane 和跳过更新的关键。

假设队列：

```text
U1 高优先级
U2 低优先级
U3 高优先级
```

当前 render 只处理高优先级 lane。

React 不能直接把 U2 丢掉，所以需要保存：

```text
baseState
baseQueue
```

用于未来继续重放被跳过的 update。

这说明 React 的 state queue 不是简单 FIFO：

> 它必须支持“按优先级部分消费，并保证之后可以正确重放”。

## 8. eager state

当队列为空且条件合适时，React 可能提前计算下一 state：

```text
oldState
 ↓ reducer(action)
eagerState
```

如果：

```js
Object.is(eagerState, oldState)
```

可能直接 bailout，避免进入完整 render。

这解释了为什么某些：

```js
setCount(count)
```

可能连 render 都跳过。

## 9. 更新真正进入 Root 调度

关键链路：

```text
dispatchSetState
 ↓
dispatchSetStateInternal
 ↓
enqueueConcurrentHookUpdate
 ↓
scheduleUpdateOnFiber(root, fiber, lane)
 ↓
markRootUpdated
 ↓
ensureRootIsScheduled
```

这里从“Hook 层”进入“Fiber Root 调度层”。

这也是读源码时第一个重要跨模块边界。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 05-Effect系统.md -->

# 05. Effect 系统：useEffect / useLayoutEffect

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 06-Reconciliation与Diff.md -->

# 06. Reconciliation 与 Diff

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `Diff` | 差异比较 |
| `Key` | 列表身份键 |
| `Placement` | 插入标记 |
| `Flags` | 副作用标记 |
| `beginWork` | 开始处理 Fiber |
| `Context` | 上下文 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 把 reconciliation 理解为身份匹配而非“虚拟 DOM 比真实 DOM 快”
- 能手算 keyed array diff
- 能解释 type/key/position 如何决定 state 保留

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactChildFiber.js
packages/react-reconciler/src/ReactFiberBeginWork.js
```

## 本章核心不变量

- 相同身份才能安全复用 Fiber/state
- 移动/插入由新旧索引和 lastPlacedIndex 决定
- 算法追求可预测 O(n) 启发式而不是理论最小编辑距离

---

## 先用白话理解：Diff 真正在解决什么

每次组件执行都会得到一份新的 UI 描述。React 必须判断：新描述里的这个 `Item`，是不是上一次那个 `Item`？如果是，就尽量复用原来的 Fiber/state/DOM；如果不是，就卸载旧身份并创建新身份。

因此 Reconciliation（协调）的核心首先是 **identity（身份匹配）**，其次才是“怎么少改 DOM”。`key` 的真正作用也是帮助 React 识别列表中的身份。

---

## 1. Reconciliation 是什么

React 不直接“比较 DOM”。

它比较的是：

```text
旧 Fiber 子树
vs
新 React Elements
```

目标：

```text
尽可能复用旧 Fiber / DOM
并标记新增、移动、删除、更新
```

## 2. 单节点复用的核心

简化规则：

```text
key 相同
  ↓
再比较 type
  ↓
type 也相同 → 复用
type 不同 → 删除旧节点，创建新节点
```

因此 identity 更接近：

```text
(position, key, type)
```

而不是“组件函数名字”。

## 3. key 的真正意义

错误理解：

> key 只是为了消除 warning。

正确理解：

> key 是同级 child identity 的一部分。

例如：

```jsx
<User key={userId} />
```

userId 改变：

```text
旧 Fiber identity 失效
 ↓
卸载旧组件
 ↓
创建新 Fiber
 ↓
Hook state 被重置
```

## 4. reconcileChildrenArray

数组 Diff 是重点。

可以粗略分几步：

1. 从头按位置快速比较
2. 某处不匹配后建立旧 Fiber map
3. 用 key/index 查找可复用节点
4. 计算移动
5. 删除剩余旧节点

## 5. lastPlacedIndex

这是理解“移动”的关键。

旧列表：

```text
A(index 0)
B(index 1)
C(index 2)
D(index 3)
```

新列表：

```text
B
A
D
C
```

React 会维护：

```text
lastPlacedIndex
```

如果复用到的旧 Fiber.index：

```text
oldIndex < lastPlacedIndex
```

说明这个节点相对顺序发生倒退，需要 Placement（移动）。

## 6. 为什么 index key 有风险

旧：

```text
0:A
1:B
2:C
```

头部插 X：

```text
0:X
1:A
2:B
3:C
```

如果 key=index，React 会误把：

```text
旧 key=0 A
复用给
新 key=0 X
```

组件 state 可能跟着位置走，而不是跟着业务实体走。

## 7. Diff 不是“求理论最小编辑距离”

React 采用启发式 O(n) 策略，而不是通用树编辑距离。

原因：

```text
UI 更新频繁
理论最优算法代价太高
现实 UI 有 key/type 等强先验信息
```

## 8. bailout

如果：

```text
props 没变
state 没变
当前 lanes 不包含工作
子树 childLanes 也没当前工作
```

React 可以跳过某些 Fiber。

`React.memo` 只是 bailout 的一个入口，不代表“组件永远不会 render”。

Context、内部 state、lane 等仍可能要求更新。

## 9. 重点源码函数

```text
reconcileChildFibers
reconcileSingleElement
reconcileSingleTextNode
reconcileChildrenArray
updateSlot
updateFromMap
placeChild
deleteChild
deleteRemainingChildren
```

读 Diff 时不要先看所有分支。

建议只用：

```jsx
<ul>
  {items.map(x => <Item key={x.id} />)}
</ul>
```

然后只调：

```text
A B C
→
B A D
```

手工记录每个 Fiber 的：

```text
key
index
oldIndex
flags
sibling
```

这是最快掌握的方法。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 07-Commit阶段.md -->

# 07. Commit：从 Fiber flags 到真实 DOM

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 08-Lane与Scheduler.md -->

# 08. Lane 与 Scheduler：优先级、并发和 Transition

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Priority` | 优先级 |
| `Concurrent Rendering` | 并发渲染 |
| `Transition` | 过渡更新 |
| `Suspense` | 异步等待边界 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 区分 Lane、Event Priority、Scheduler Priority
- 能解释 Root Scheduler 的 microtask 层
- 能手算低优先级 update 被跳过并 rebase 的过程

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberLane.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberRootScheduler.js
packages/scheduler/src/forks/Scheduler.js
```

## 本章核心不变量

- 高优先级工作可以先完成，低优先级语义不能丢
- Root 的 pending/suspended/pinged/expired 状态必须保持一致
- Scheduler 决定“何时运行 callback”，Lane 决定“React 处理哪组更新”

---

## 先用白话理解：Lane 和 Scheduler 为什么同时存在

想象医院急诊：Lane（更新车道）像病历上的“紧急程度和所属批次”，它是 React Reconciler 对更新集合的表达；Scheduler（调度器）像负责安排“什么时候给医生一个时间片”的值班系统。

Lane 回答“哪些更新这轮应该算”，Scheduler 回答“这段 JS 工作何时获得执行机会”。它们相关，但不是同一个东西。

---

## 1. Lane 解决什么问题

React 需要同时处理：

```text
输入框紧急更新
点击
普通 setState
Transition 大列表
Suspense retry
Idle 工作
```

如果所有更新只有“有/无”，无法表达优先级与批次。

Lane 使用 bitmask 表示一组更新优先级。

概念化：

```text
00000001  SyncLane
00000100  某种高优先级
00100000  TransitionLane
...
```

多个 lane 可以 OR：

```text
pendingLanes = laneA | laneB
```

## 2. requestUpdateLane

setState 时首先要回答：

> 这次更新属于哪个 lane？

影响因素包括：

```text
当前执行上下文
是否 transition
当前 event priority
并发模式
```

然后 Update 会携带：

```js
update.lane = lane
```

## 3. markRootUpdated

Fiber 上的更新最终要传播到 Root。

Root 维护：

```text
pendingLanes
suspendedLanes
pingedLanes
expiredLanes
entangledLanes...
```

这让调度不是针对单个组件，而是针对整个 Root 的待处理工作集合。

## 4. ensureRootIsScheduled

Root 有更新后需要确保存在合适的调度任务。

概念：

```text
取 next lanes
 ↓
判断优先级
 ↓
同步工作？
   → sync queue
并发工作？
   → Scheduler callback
```

## 5. Scheduler 和 React Lane 不是同一个系统

容易混淆：

### Lane

React Reconciler 内部的更新优先级/批次模型。

### Scheduler

更通用的 JS 任务调度器，帮助：

```text
按 priority 执行 callback
判断 shouldYield
让出主线程
```

关系：

```text
Lane 决定 React 这次应该处理哪些更新
Scheduler 帮助安排什么时候执行对应工作
```

## 6. Concurrent Rendering

“并发”不是 JS 多线程。

还是主线程，但 React 可以：

```text
做一部分 Render
↓
shouldYield
↓
把控制权还给宿主环境
↓
之后继续/重做
```

所以更准确是：

> 可中断、可调度的 Render。

## 7. startTransition

```js
startTransition(() => {
  setResults(nextResults)
})
```

不是：

```text
setTimeout
```

也不是：

```text
创建新线程
```

核心效果：

> 让 transition 内触发的更新获得 transition 语义/较低优先级，使更紧急更新可以抢先。

常见场景：

```text
输入框 value：紧急
搜索结果大列表：transition
```

用户输入保持响应，大列表允许稍后完成。

## 8. baseQueue 与 Lane 为什么必须结合理解

有队列：

```text
U1 Sync
U2 Transition
U3 Sync
```

本轮只 render Sync：

```text
执行 U1
跳过 U2
执行 U3（但为了未来重放需要保留正确基础）
```

因此 React 需要：

```text
baseState
baseQueue
```

来保证以后处理 U2 时结果仍一致。

如果你不懂这一点，就还没有真正懂 concurrent state queue。


## 9. React 19.3：Root Scheduler 才是现代调度主入口之一

很多 React 18 时代的教程会把下面这条链画得过于简单：

```text
scheduleUpdateOnFiber
→ ensureRootIsScheduled
→ Scheduler.scheduleCallback
```

在 v19.3.0 中，需要把 **Root Scheduler 的 microtask 层**单独画出来：

```text
setState / dispatch
  ↓
requestUpdateLane
  ↓
enqueue update
  ↓
scheduleUpdateOnFiber(root, fiber, lane)
  ↓
markRootUpdated(...)
  ↓
ensureRootIsScheduled(root)
  ↓
把 root 加入 scheduled-root 链表
  ↓
确保一次 microtask
  ↓
processRootScheduleInMicrotask
  ↓
scheduleTaskForRootDuringMicrotask(root, now)
  ↓
getNextLanes(root, ...)
  ↓
┌──────────────────────┬──────────────────────────┐
│ sync lanes           │ concurrent lanes         │
│ flush sync path      │ Scheduler callback       │
└──────────────────────┴──────────────────────────┘
```

关键文件：

```text
packages/react-reconciler/src/ReactFiberRootScheduler.js
```

这个变化非常值得理解，因为它揭示了一个更深的架构事实：

> **“收到更新”与“决定这一轮真正处理哪些 root / lanes”不是同一个时刻。**

`ensureRootIsScheduled` 的主要职责之一，是保证 Root 出现在 root schedule 中，并保证后续 microtask 会处理这份 schedule；它并不等于“立刻执行 React render”。

### 为什么要在 microtask 里统一处理 Root schedule？

概念上可以理解为：

```text
同一个 browser task 内
setA()
setB()
setC()
  ↓
都只是在声明“root 有工作”
  ↓
microtask checkpoint
  ↓
统一看这一批 root / lane 状态
  ↓
决定 sync / concurrent work
```

这和 Automatic Batching 的整体设计方向高度一致：**先收集更新，再以 Root 为单位决定工作。**

> 注意：不要把这句话简化成“React 就是用 microtask 实现 batching”。Automatic Batching 是完整更新/Root scheduling 体系的结果，microtask 是其中一个重要调度边界。

## 10. Lane 的准确心智模型：不仅仅是 Priority

错误心智模型：

```text
Lane = 一个数字优先级
```

更准确：

```text
Lane = bitmask 中的一个工作身份
Lanes = 一组工作身份
```

Lane 同时参与：

```text
更新分组
优先级选择
Root pending 状态
suspend / ping
expiration
transition 语义
rebase
子树剪枝 childLanes
```

因此 Lane 更像一种 **“可组合的更新集合坐标系”**。

### Root 上最重要的集合

建立以下状态机：

```text
pendingLanes
  ├─ suspendedLanes    等待外部条件
  ├─ pingedLanes       suspend 后已被唤醒
  ├─ expiredLanes      等太久，需要提升处理
  └─ entangled/...     具有必须协调处理的关系
```

`getNextLanes` 的本质不是“找最大数字”，而是根据 Root 当前状态求：

> **此刻合法、最高价值、应该进入下一轮 render 的 lanes 集合。**

## 11. Event Priority → Lane → Scheduler Priority，不要混成一个概念

完整链要分三层：

```text
浏览器/React Event Priority
        ↓
requestUpdateLane / eventPriorityToLane
        ↓
React Lane(s)
        ↓
Root Scheduler 选择 next lanes
        ↓
映射为 Scheduler Priority
        ↓
Scheduler callback / shouldYield
```

这三个层级分别解决：

```text
Event Priority：这次交互有多紧急？
Lane：这批 React 更新属于哪组工作？
Scheduler Priority：宿主 JS callback 什么时候获得执行时间？
```

## 12. React 19.3 的 Transition：避免背旧的“所有 transition 都 entangle”结论

React 19.3 的 release notes 特别指出：**Transitions 现在可以独立渲染，不再把无关 transition 全部纠缠成一次共同完成的 render。**

因此学习 Transition 时，应该掌握稳定模型：

```text
startTransition
→ 建立 transition context
→ transition 内 update 获得 transition lane 语义
→ urgent update 可以先处理
→ transition 允许被中断/重启
```

而不要把某一版本具体的 lane entanglement 策略背成 React 永久设计。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 09-浏览器渲染与React性能.md -->

# 09. React 到浏览器像素：Style / Layout / Paint / Composite

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Passive Effect` | 被动副作用 |
| `Effect` | 副作用 |
| `Transition` | 过渡更新 |
| `Memoization` | 记忆化/缓存计算结果 |
| `Context` | 上下文 |
| `Profiler` | 性能分析器 |
| `DOM` | 文档对象模型 |
| `CSSOM` | CSS 对象模型 |
| `Layout` | 布局/回流 |
| `Paint` | 绘制 |
| `Composite` | 合成 |
| `Compositor` | 合成器 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 区分 React render 慢与浏览器 rendering 慢
- 能解释 Layout/Paint/Composite 成本来源
- 能用 Profiler + Performance 面板定位瓶颈而不是猜优化

## React 19.3 源码锚点

```text
packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js
浏览器 Performance / Rendering 工具
```

## 本章核心不变量

- React Commit 结束不等于像素已经显示
- 读取布局和写布局交错会放大 layout cost
- memoization 只能解决 React 计算/引用问题，不能自动解决浏览器布局成本

---

## 1. React Commit 结束不等于用户已经看到像素

完整链：

```text
React Render
 ↓
React Commit
 ↓
DOM 改变
 ↓
Browser Style Calculation
 ↓
Layout
 ↓
Paint
 ↓
Composite
 ↓
Screen
```

## 2. Style

浏览器根据：

```text
DOM
CSSOM
cascade
inheritance
selector matching
```

得到 computed style。

## 3. Layout

确定几何信息：

```text
x / y
width / height
line boxes
scroll geometry
```

某些 DOM 读取会强制浏览器提前完成 layout：

```js
getBoundingClientRect()
offsetWidth
offsetHeight
```

如果你在循环里交替：

```text
写 style
读 layout
写 style
读 layout
```

可能造成 layout thrashing。

## 4. Paint

把视觉属性转换成绘制指令：

```text
文字
背景
阴影
边框
图片
```

## 5. Composite

浏览器可能把页面分层，再由 compositor 合成。

常见动画优化：

```css
transform
opacity
```

很多情况下可以减少 Layout/Paint 工作，但不能绝对化；实际是否独立合成仍由浏览器决定。

## 6. React 性能问题必须区分两类

### React 计算慢

```text
组件 render 太多
大列表 reconciliation
昂贵计算
Context 扇出
不合理 state 粒度
```

优化工具：

```text
React.memo
useMemo
useCallback
state colocate
virtualization
transition
```

### Browser rendering 慢

```text
Layout 频繁
Paint 大
图片大
复杂阴影
DOM 数量过高
强制同步布局
```

这是浏览器问题，单纯 `React.memo` 不一定有用。

## 7. useLayoutEffect 为什么能避免闪烁

因为时序：

```text
DOM mutation
 ↓
useLayoutEffect
 ↓
可以同步 setState/改布局
 ↓
Browser Paint
```

用户可能只看到最终结果。

代价：

> Paint 被阻塞。

## 8. useEffect 为什么更推荐

因为大多数副作用不需要 Paint 前完成。

把非视觉同步工作放到 passive effect：

```text
Commit 更快结束
浏览器更早有机会更新画面
```

## 9. 性能分析时必须同时看

React DevTools Profiler：

```text
哪些组件 render
commit 花多久
```

Browser Performance：

```text
long task
layout
paint
composite
JS execution
```

只有两边结合，才能判断瓶颈到底在 React 还是浏览器。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 10-完整setState调用链.md -->

# 10. 一次 setState 到屏幕像素：完整主干调用链

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Fiber Root` | Fiber 根 |
| `Mutation Phase` | DOM 变更阶段 |
| `Passive Effect` | 被动副作用 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能从事件回调一路追到浏览器像素
- 能标记每一步修改了哪个数据结构
- 能识别 19.3 Root Scheduler 与旧教程调用图差异

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberRootScheduler.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberCompleteWork.js
packages/react-reconciler/src/ReactFiberCommitWork.js
```

## 本章核心不变量

- Update 入队与 Root 调度是两个层次
- Render 计算结果通过 flags 才进入 Commit
- Passive effects 不应混同为 DOM mutation 的一部分

---

用这个 Demo：

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count}
    </button>
  )
}
```

点击按钮后，按层拆。

## 阶段 1：React Event

事件回调执行：

```js
setCount(c => c + 1)
```

这里的 `setCount` 是首次/某次 mountState 创建并绑定的 dispatch：

```text
fiber + queue + dispatchSetState
```

## 阶段 2：dispatchSetState

```text
dispatchSetState
 ↓
requestUpdateLane
 ↓
dispatchSetStateInternal
```

创建：

```text
Update {
  lane,
  action: c => c + 1,
  ...
}
```

## 阶段 3：进入 Hook UpdateQueue

```text
enqueueConcurrentHookUpdate
```

Update 被挂入 queue。

此时 state 还没有“原地变成 1”。

## 阶段 4：通知 Fiber Root

```text
scheduleUpdateOnFiber
 ↓
markRootUpdated
 ↓
ensureRootIsScheduled
```

Root 知道：

```text
某 lane 有 pending work
```

## 阶段 5：Root work 开始

根据优先级进入类似：

```text
performSyncWorkOnRoot
或
performWorkOnRootViaSchedulerTask
```

然后：

```text
renderRootSync
或
renderRootConcurrent
```

## 阶段 6：WorkLoop

```text
workLoop*
 ↓
performUnitOfWork
 ↓
beginWork
```

走到 Counter Fiber：

```text
updateFunctionComponent
 ↓
renderWithHooks
 ↓
Counter()
```

## 阶段 7：updateState

第二次 render 的：

```js
useState(0)
```

不再 mount，而是 update dispatcher：

```text
useState
 ↓
updateState
 ↓
updateReducer
 ↓
处理 UpdateQueue
```

执行 action：

```js
c => c + 1
```

得到：

```text
newState = 1
```

Hook.memoizedState 更新为 1。

## 阶段 8：组件返回新 Element

```jsx
<button>1</button>
```

Reconciliation 比较：

```text
旧 HostComponent button
vs
新 button
```

type/key 一致 → 复用 Fiber / DOM。

子 Text：

```text
"0" → "1"
```

产生更新标记。

## 阶段 9：completeWork

向上完成 Fiber：

```text
Text complete
Button complete
Counter complete
...
Root complete
```

收集 flags / subtreeFlags。

Render 完成：

```text
finishedWork
```

## 阶段 10：commitRoot

```text
commitRoot
 ↓
Mutation Phase
```

真实 DOM 文本变成：

```text
1
```

随后 Layout Effects。

## 阶段 11：浏览器

DOM 已变化：

```text
Style
 ↓
Layout（若需要）
 ↓
Paint
 ↓
Composite
```

用户最终看到：

```text
1
```

## 阶段 12：Passive Effects

如果 Counter 有：

```js
useEffect(...)
```

React 会在 passive effect flush 阶段执行相应 cleanup/create。

---

# 一句话闭环

```text
setState
不是“修改变量”

而是：

创建带优先级的 Update
→ 放进 Fiber Hook 队列
→ 调度 Root
→ Render 消费队列计算新 state
→ Reconciliation 标记变更
→ Commit 修改 DOM
→ 浏览器把 DOM 变化绘制成像素
```

如果你能从头手画并解释每一层的数据结构，才算真正理解 `useState`。


## React 19.3 修正版：一次 setState 的 Root Scheduling 中段

为了避免沿用旧教程，这一段建议单独背成“19.3 主链”：

```text
事件回调
  ↓
setCount(action)
  ↓
dispatchSetState / 对应 dispatch 实现
  ↓
requestUpdateLane(fiber)
  │
  ├─ legacy/sync 特殊情况
  ├─ render-phase update 特殊情况
  ├─ transition context → requestTransitionLane
  └─ resolveUpdatePriority → eventPriorityToLane
  ↓
创建 Update{ lane, action, ... }
  ↓
加入 Hook queue
  ↓
scheduleUpdateOnFiber(root, fiber, lane)
  ↓
Root pending lanes 被标记
  ↓
ensureRootIsScheduled(root)
  ↓
Root 进入 scheduled-root 链表 + 确保 microtask
  ↓
processRootScheduleInMicrotask
  ↓
scheduleTaskForRootDuringMicrotask
  ↓
getNextLanes
  ↓
决定：同步执行 or Scheduler callback
  ↓
performWorkOnRoot
```

这条链里最容易学错的是：

```text
ensureRootIsScheduled ≠ 直接开始 render
```

它首先是“确保 Root 被后续统一调度处理”。

## 一次更新应该记录的 8 组状态

真正看源码时，不要只记函数跳转。建议每次点击都记录：

| 层 | 观察值 | 你要回答的问题 |
|---|---|---|
| Hook | `hook.memoizedState` | 当前已使用的 state 是什么？ |
| Queue | `queue.pending` | 新 Update 如何链接？ |
| Update | `update.lane/action` | 这次更新是什么、属于哪组工作？ |
| Fiber | `fiber.lanes` | 当前 Fiber 标记了哪些工作？ |
| Ancestor | `childLanes` | 祖先如何知道子树有工作？ |
| Root | `pendingLanes` | Root 现在有哪些未完成工作？ |
| Scheduler | `callbackNode/priority` | 是否已有宿主 callback？ |
| Commit | `flags/subtreeFlags` | Render 最终准备提交什么？ |

如果你只会说“setState 会触发 render”，但无法描述这 8 组数据的变化，还没有达到源码级掌握。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 11-Context原理.md -->

# 11. Context：依赖记录、传播与为什么会重渲染

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 12-memo与Bailout.md -->

# 12. React.memo、useMemo、useCallback 与 Bailout

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `Memoization` | 记忆化/缓存计算结果 |
| `beginWork` | 开始处理 Fiber |
| `Context` | 上下文 |
| `Ref` | 引用 |
| `React Compiler` | React 编译器 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 区分 memo/useMemo/useCallback 的缓存对象
- 能解释 bailout 为什么仍可能继续处理 childLanes
- 能在 Compiler 时代判断手工 memoization 是否还有必要

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberHooks.js
compiler/ 与 React Compiler 官方文档
```

## 本章核心不变量

- bailout 不能跳过子树中仍有当前 lanes 的工作
- referential equality 只是一种证明“可复用”的手段
- memoization 是性能语义，不应改变业务语义

---

## 1. 三者不是一个东西

```text
React.memo
  控制组件 Fiber 是否可以跳过 render

useMemo
  缓存某次 render 中的计算结果

useCallback
  缓存函数引用
```

## 2. memo 的核心

```jsx
const Child = memo(ChildImpl)
```

更新时 React 会比较：

```text
prevProps
nextProps
```

默认浅比较。

如果：

```text
props equal
ref equal
当前 Fiber 没有必须处理的 lane/context work
```

可能进入 bailout。

## 3. bailout 不等于什么都不做

重要：

> bailout 当前 Fiber 后，React 仍可能需要检查 childLanes。

情况：

```text
Parent props 没变
但孙组件自己有 state update
```

不能因为 Parent bailout 就把整个子树扔掉。

所以有：

```text
bailoutOnAlreadyFinishedWork
```

其逻辑会判断当前 render lanes 是否与 childLanes 相交。

## 4. useMemo

概念：

```js
Hook.memoizedState = [value, deps]
```

update：

```text
deps 相同
→ 返回旧 value

deps 不同
→ 调 factory
→ 保存 [newValue, newDeps]
```

## 5. useCallback

基本可以理解：

```text
useCallback(fn, deps)
≈ 缓存 fn 本身
```

Hook.memoizedState：

```text
[callback, deps]
```

## 6. 为什么无脑 useCallback 不是优化

useCallback 也有：

```text
Hook 管理
deps 比较
闭包
代码复杂度
```

只有当“稳定函数引用”有下游价值时才值得，例如：

```text
作为 memo child 的 prop
作为其他 Hook dependency
注册/注销要求引用稳定的外部 API
```

## 7. React Compiler 时代

现代 React Compiler 可以自动进行部分 memoization 类优化。

但这不意味着这些原理失效。

你仍要理解：

```text
identity
referential equality
render cost
bailout
dependency
```

因为这些是 React 数据流的基础，不只是手动性能 API 的技巧。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 13-React事件系统.md -->

# 13. React DOM 事件系统：Native Event → Fiber → Dispatch Queue → Lane

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `React Root` | React 根节点/根容器 |
| `Root Container` | 根容器 |
| `createRoot` | 创建 React 根 |
| `Fiber` | 纤程/React 工作单元 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Priority` | 优先级 |
| `Transition` | 过渡更新 |
| `Key` | 列表身份键 |
| `Flags` | 副作用标记 |
| `Event Priority` | 事件优先级 |
| `Batching` | 批处理 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。**

## 本章掌握标准

你需要能从一次真实点击追到：

```text
browser native event
→ root listener
→ event target
→ closest Fiber
→ plugin extract
→ dispatch queue
→ capture/bubble listeners
→ user handler
→ setState
→ event priority → lane
```

## React 19.3 源码锚点

```text
packages/react-dom-bindings/src/events/DOMPluginEventSystem.js
packages/react-dom-bindings/src/events/ReactDOMEventListener.js
packages/react-dom-bindings/src/client/ReactDOMComponentTree.js
packages/react-dom-bindings/src/events/plugins/SimpleEventPlugin.js
packages/react-dom-bindings/src/events/EventRegistry.js
packages/react-dom-bindings/src/events/ReactDOMUpdatePriority.js
```

## 本章核心不变量

- 浏览器事件目标必须能映射回 React 管理的 Fiber。
- React 自己的 capture/bubble dispatch 与浏览器 native propagation 相关但不是同一个机制。
- 事件优先级必须在状态更新选择 lane 前可被读取。
- Portal、多个 root、non-delegated event 不能破坏传播语义。

---

## 1. SyntheticEvent 的架构意义

把 SyntheticEvent 只理解成“跨浏览器兼容层”已经过时且过浅。

现代 React 事件系统同时承担：

```text
事件注册管理
native target → Fiber 映射
listener 收集
capture/bubble React 传播
event priority 建立
与更新批处理/调度上下文衔接
```

SyntheticEvent 是这个 dispatch pipeline 暴露给用户代码的事件对象抽象之一。

## 2. 为什么使用 root delegation

React 17 以后，现代 React DOM 的主流做法是把大量可委托事件注册在 root container，而不是 document 全局，也不是每个元素单独注册。

概念：

```text
<div id="root">  ← React root listeners
  <App>
    <button onClick={...}/>
```

浏览器 click：

```text
button native click
  ↓ native bubble
root listener
  ↓
React dispatch pipeline
```

好处不仅是减少监听器数量，还包括：

```text
多个 React roots 的边界更明确
版本共存更容易
Portal/Root 传播逻辑由 React 控制
事件优先级入口集中
```

## 3. listenToAllSupportedEvents

源码入口：

```text
DOMPluginEventSystem.js
listenToAllSupportedEvents(rootContainerElement)
```

教学化理解：

```js
for (const nativeEventName of allNativeEvents) {
  if (canDelegate(nativeEventName)) {
    listen(root, nativeEventName, bubble)
  }
  listen(root, nativeEventName, capture)
}
```

真实源码会包含：

```text
nonDelegatedEvents
selectionchange 特殊处理
legacy / feature flags
passive listener 选项
```

第一遍不要被这些分支打散。

## 4. 并不是所有事件都能简单委托

有些 DOM 事件本身不 bubble，或浏览器行为特殊，因此 React 维护 non-delegated event 集合。

因此错误结论：

```text
“React 所有事件都只在 root 绑定两个 listener”
```

正确：

> React 大量事件走 delegation，但存在需要直接/特殊监听的事件。

## 5. native event target 如何找到 Fiber

React DOM 会在宿主节点保存内部映射，使：

```text
DOM Node
→ closest React instance/Fiber
```

源码关键词：

```text
getClosestInstanceFromNode
getFiberCurrentPropsFromNode
precacheFiberNode
updateFiberProps
```

这一步建立了两个世界之间的桥：

```text
Browser DOM Tree
        ↕
React Fiber Tree
```

## 6. dispatchEvent 不是直接调用 onClick

核心流水线可以概念化为：

```text
dispatchEvent
  ↓
找到 target Fiber
  ↓
dispatchEventForPluginEventSystem
  ↓
extractEvents
  ↓
插件创建 SyntheticEvent + 收集 listeners
  ↓
processDispatchQueue
  ↓
执行 capture / bubble
```

插件体系的意义：不同 native event 可能需要不同标准化/合成逻辑。

例如：

```text
SimpleEventPlugin
ChangeEventPlugin
EnterLeaveEventPlugin
SelectEventPlugin
BeforeInputEventPlugin
```

具体插件会随版本演进，理解“extract → queue → process”比背插件名单重要。

## 7. React capture / bubble 的 listener 收集

假设：

```jsx
<div onClickCapture={A} onClick={B}>
  <button onClickCapture={C} onClick={D} />
</div>
```

React 会围绕 target Fiber 向上收集可用 listener，然后按 phase 顺序执行。

概念：

```text
capture: A → C
bubble:  D → B
```

注意：

```text
DOM propagation path
React Fiber/HostComponent listener path
Portal/root 边界处理
```

可能使复杂场景不像“纯 DOM parentNode 向上走”那么简单。

## 8. stopPropagation：必须区分两个层面

当你调用：

```js
e.stopPropagation()
```

要问：

```text
它如何影响 SyntheticEvent dispatch queue？
是否调用 nativeEvent.stopPropagation()？
当前 listener 是 capture 还是 bubble？
事件是否跨 portal / root？
外部原生 listener 注册在什么位置和 phase？
```

调试事件问题最忌讳只说“冒泡被阻止了”。

## 9. Event Priority 是调度桥梁

事件系统和 Lane 的连接点非常关键。

React 会把不同事件映射为不同更新紧迫程度，例如概念上：

```text
discrete：click / keydown / input 类
continuous：mousemove / pointermove 类
default：普通异步工作
```

事件 wrapper 会设置当前 update priority。

之后：

```text
user handler
  ↓
setState
  ↓
requestUpdateLane
  ↓
resolveUpdatePriority
  ↓
eventPriorityToLane
```

所以 Lane 不是凭空选出来的。

## 10. Event Priority、Lane、Scheduler Priority 三层不要混淆

```text
Event Priority
  表达当前交互紧迫性
        ↓
Lane
  表达 React 更新集合/调度身份
        ↓
Scheduler Priority
  表达宿主 callback 的执行优先级
```

这三层有映射，但不是同一个 enum。

## 11. Automatic Batching 与 React Event

历史 React 教程经常说：

```text
“只有 React event handler 里才 batching”
```

这对现代 `createRoot` 心智模型不够准确。

现代 React 的 batching 更广泛，与 Root scheduling / microtask 等机制共同工作。

因此事件系统仍然会建立 update priority，但不要把 batching 的全部实现归因于 SyntheticEvent。

## 12. Portal 是检验理解的好案例

Portal 的 DOM parent 可能与 Fiber logical parent 不一致：

```text
Fiber tree:
App
 └─ Modal
     └─ Button

DOM tree:
#app-root ...
#modal-root
 └─ button
```

React 事件传播强调 React tree/root/portal 语义，而不是简单依赖 DOM parentNode。

如果能解释 Portal 中 onClick 为什么仍可能传播到逻辑父组件，说明你开始真正理解 React event system。

## 13. 实验 1：React listener 与 native listener 顺序

建立：

```jsx
<div ref={outer} onClickCapture={() => log('react outer capture')} onClick={() => log('react outer bubble')}>
  <button onClick={() => log('react button')}>click</button>
</div>
```

再用 `addEventListener` 在：

```text
button
outer
root container
document
```

分别注册 capture/bubble listener。

目标不是背固定输出，而是画出：

```text
native capture
→ native target/bubble
→ root wrapper 进入 React dispatch
→ React queue phase
```

并解释实际顺序为什么产生。

## 14. 实验 2：观察事件优先级到 lane

断点：

```text
createEventListenerWrapperWithPriority
setCurrentUpdatePriority / resolveUpdatePriority
requestUpdateLane
```

分别触发：

```text
click
mousemove
setTimeout 里的 setState
startTransition 内 setState
```

记录 lane 差异。

## 15. 常见错误认知

```text
❌ SyntheticEvent 只是为了浏览器兼容
❌ 所有事件都只绑定 root
❌ React bubble 就等于 native bubble
❌ React event handler 才会 batching
❌ event priority 就是 Scheduler priority
```

正确做法是始终画四层：

```text
Browser Event
→ React Event System
→ Update Priority / Lane
→ Root Scheduler
```

## 16. 自检问题

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么 DOM 节点必须能反查 Fiber？
2. root delegation 相比 document delegation 解决了什么架构问题？
3. Portal 为什么能证明 React propagation 不只是 DOM parentNode traversal？
4. nonDelegatedEvents 为什么存在？
5. 一次 click 中 `setState` 的 lane 从哪里获得优先级信息？


---

<!-- SOURCE: 14-Suspense与Throw-Thenable.md -->

# 14. Suspense：Thenable、Opaque Suspension、Ping、Retry 与 Replay

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Current Tree` | 当前已提交 Fiber 树 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Hook Linked List` | Hook 链表 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Concurrent Rendering` | 并发渲染 |
| `Transition` | 过渡更新 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** “throw Promise”只能作为历史/概念简写。现代 `use()` 的具体实现更精细。

## 本章掌握标准

你应该能画出：

```text
use(thenable)
→ track thenable
→ pending
→ 保存真实 thenable
→ 抛内部 SuspenseException
→ WorkLoop 捕获
→ 取回 suspended thenable
→ 找 Suspense boundary
→ fallback / retain previous UI
→ attach ping listener
→ thenable resolve
→ ping root
→ retry lane
→ replay / rerender
```

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberThenable.js
packages/react-reconciler/src/ReactFiberThrow.js
packages/react-reconciler/src/ReactFiberSuspenseContext.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberLane.js
```

## 本章核心不变量

- 未完成的 primary tree 不能被当成已完成 UI 提交。
- suspension 必须能找到一个处理边界或升级为错误/根级处理。
- thenable resolve 不能直接“继续旧 JS 调用栈”，而是重新调度 React work。
- retry 必须保留当前已提交 UI 的一致性。

---

## 先用白话理解：Suspense 不是一个 Loading 组件

Suspense 的核心问题是：组件在 Render 时发现“我现在还算不出最终 UI，因为依赖的数据/代码还没准备好”，React 如何暂时停止这条子树、找到最近边界显示备用 UI，并在资源就绪后重新尝试？

所以真正要学的是 suspend（挂起）→ capture（边界捕获）→ fallback（备用内容）→ ping（就绪通知）→ retry（重试），而不是只会写 `<Suspense fallback={...}>`。

---

## 1. Suspense 不是异步组件语法糖

Suspense 的核心问题是：

> **Render 过程中发现当前子树暂时无法完成时，React 如何保持已提交 UI 一致，同时安排未来重试？**

这个问题依赖 Fiber 架构：

```text
Current Tree 继续作为已提交 UI
WIP Tree 尝试下一版本
WIP suspend → 可以放弃/回退/保留旧 UI
```

## 2. “throw Promise”为什么是过度简化

早期理解 Suspense 时常说：

```js
if (!ready) throw promise
```

这帮助理解“用 throw 解开同步调用栈”。

但在 React 19.3 的 `use()` 路径中，核心设计是：

```text
真实 thenable 被保存到内部 suspendedThenable
React 抛出一个 opaque SuspenseException
WorkLoop 捕获后再调用 getSuspendedThenable()
```

原因之一：避免用户代码通过普通 `try/catch` 把真实 suspension 信号误吞掉。

因此分两层记：

```text
稳定模型：Render 用异常式控制流中断当前同步执行
19.3 实现：use() 抛 opaque internal exception，真实 thenable 单独保存
```

## 3. Thenable 状态跟踪

React 需要把 thenable 归一为：

```text
pending
fulfilled(value)
rejected(reason)
```

如果 fulfilled：

```text
use(thenable) → 返回 value
```

如果 rejected：

```text
抛 reason → 进入 error path
```

如果 pending：

```text
触发 suspension path
```

这说明 `use()` 本质不是“await 的 Hook 版本”，而是把一个异步资源状态接入 React Render 控制流。

## 4. use() 为什么可以有不同于传统 Hooks 的调用限制

传统状态 Hook 身份依赖：

```text
Fiber.memoizedState Hook linked list 顺序
```

`use(thenable/context)` 的内部路径与普通有状态 Hook 并不完全相同，因此不能机械套用：

```text
“所有 React useX 都必须完全相同规则”
```

但这也不意味着可以任意改变资源读取语义。React 19.3 甚至加入了对某些“条件 use 导致前一次 suspend、后一次不再 use”模式的 DEV 检查。

## 5. WorkLoop 如何区分 suspension 与普通 error

Render 中出现 throw 后，React 要判断：

```text
这是 thenable/suspense 控制流？
还是普通错误？
还是特殊内部异常？
```

随后：

```text
suspension
→ 找最近可处理的 Suspense boundary

error
→ 找 Error Boundary / root error path
```

所以 Suspense 和 Error Boundary 共用“Render 不能完成”的某些基础设施，但语义完全不同。

## 6. Boundary 做了什么

概念上：

```text
primary children 尝试 render
      ↓ suspend
nearest Suspense boundary
      ↓
决定本轮显示/保留什么
      ↓
fallback 或旧内容
```

不要把 Suspense 理解为：

```text
promise pending → 立刻 DOM 替换 fallback
```

因为 Transition、已有 UI、timeout/avoid fallback、Activity/Offscreen 等策略都会影响可见行为。

## 7. Ping：Promise resolve 之后不是“继续执行”

thenable resolve 后：

```text
wakeable listener
→ pingSuspendedRoot
→ 标记相关 lanes 已可重试
→ ensure Root scheduling
→ 下一次 render
```

它不会恢复先前 JS 栈：

```text
Component()
  paused here  ← ❌ 不是协程恢复
```

而是：

```text
重新进入 React Render
→ 重新执行需要的组件
→ 这次 use(thenable) 读取 fulfilled value
```

这与“Render 可重放”不变量完全一致。

## 8. Retry Lane

Suspense retry 不一定和普通 click/setState 采用同一个 lane。

源码里有专门 retry lane 选择逻辑。

意义：

```text
“一个资源现在 ready 了”
```

是一类特殊 React work，应被 Root Scheduler 正确排序。

## 9. Replay：现代 React 源码的重要概念

Suspense 可能出现：

```text
组件执行到一半 suspend
→ 数据很快 ready
→ React 对相关 unit 进行 replay
```

因此 `renderWithHooks` 周边会看到：

```text
renderWithHooksAgain
resetHooksAfterThrow
resetHooksOnUnwind
thenable state reset/reuse
```

这比传统“函数组件只执行一次”的心智模型复杂得多。

## 10. Suspense 与 Transition

典型场景：

```text
当前页面 A 已显示
用户触发 transition 到 B
B render 中 suspend
```

React 可以选择：

```text
保留 A 一段时间
而不是立即用 fallback 覆盖整个交互
```

这就是为什么 Suspense 必须与 Lane/Transition 一起学习。

## 11. Suspense 与 Activity / Offscreen

现代 React 不只有“mount/unmount”两种状态。

隐藏/后台树可以存在：

```text
state 保留
DOM 可能隐藏
effects 可能断开/重连
工作优先级降低
```

Activity/Offscreen 相关设计说明 React 的树状态空间已经比经典生命周期更丰富。

## 12. Suspense 与 Server Rendering

Streaming SSR 中 Suspense boundary 还是：

```text
HTML streaming 的切分单元
```

服务端可以先发送 shell/fallback，边界内容准备好后继续发送。

客户端 hydration 又能按 boundary 逐步接管。

因此 Suspense 同时连接：

```text
Client Concurrent Rendering
Server Streaming
Hydration
RSC/Flight
```

## 13. 实验：证明“不是恢复旧函数栈”

```jsx
function ResourceView() {
  console.log('render ResourceView')
  const data = use(resourcePromise)
  console.log('after use', data)
  return <div>{data}</div>
}
```

观察 pending → fulfilled 前后的日志。

你会看到数据 ready 后组件重新进入 render，而不是从上次 `use()` 下一行简单继续。

## 14. 源码断点

```text
trackUsedThenable
getSuspendedThenable
throwException
attachPingListener
pingSuspendedRoot
requestRetryLane
updateSuspenseComponent
renderWithHooksAgain
```

记录：

```text
workInProgressSuspendedReason
suspendedThenable
root.pingedLanes
retry lane
boundary flags
```

## 15. 常见错误认知

```text
❌ Suspense = loading 组件
❌ React 19 的 use() 就是直接 throw Promise
❌ Promise resolve 后 React 从暂停的 JS 行继续
❌ Suspense 和 Error Boundary 是同一个东西
❌ Suspense 只和客户端数据请求有关
```

## 16. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么 React 要抛 opaque `SuspenseException` 而不是直接让真实 thenable 泄漏给用户代码？
2. 为什么 thenable resolve 只能触发 retry，而不能直接 mutate DOM？
3. Suspense 为什么天然依赖 current/WIP 双缓冲？
4. Transition + Suspense 为什么能避免已有 UI 立即闪成 fallback？
5. Server Streaming 为什么也把 Suspense boundary 当关键单元？


---

<!-- SOURCE: 15-SSR与Hydration.md -->

# 15. SSR、Fizz Streaming、Hydration、Selective Hydration 与 PPR

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么 hydration 必须有 cursor，而普通 mount 不需要？
2. 为什么 HTML 已可见不代表页面已可交互？
3. Event Replay 与 Selective Hydration 为什么必须配合？
4. `useId` 为什么不能简单用 `Math.random()`？
5. Fizz 与 RSC 分别传输什么？


---

<!-- SOURCE: 16-Class生命周期与Fiber.md -->

# 16. Class Component：Instance Model、UpdateQueue 与 Fiber 生命周期映射

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Hook Linked List` | Hook 链表 |
| `Update Queue` | 更新队列 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `beginWork` | 开始处理 Fiber |
| `completeWork` | 完成 Fiber 工作 |
| `Context` | 上下文 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** Class 不是“React 15 的遗迹”；现代 React 仍由 Fiber Reconciler 执行 ClassComponent。

## 本章掌握标准

你需要理解的不只是生命周期名字，而是：

```text
Class instance 如何挂到 Fiber
this.state 如何进入 class UpdateQueue
render-phase lifecycle 与 commit-phase lifecycle 如何映射
为什么 UNSAFE_* 与可重放 Render 冲突
```

## React 19.3 源码锚点

```text
packages/react-reconciler/src/ReactFiberClassComponent.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberClassUpdateQueue.js
packages/react-reconciler/src/ReactFiberCommitWork.js
```

## 核心不变量

- `render()` 属于可重放 Render Phase，不能依赖“只执行一次”。
- Class instance 可以持久存在，但它看到的 props/state 必须和 Fiber 当前处理阶段保持一致。
- commit lifecycle 才能安全依赖宿主 DOM 已进入新状态。

---

## 1. Class 与 Function 的状态宿主不同

Class：

```text
Fiber.stateNode → class instance
instance.state
Fiber.updateQueue → class updates
```

Function：

```text
Fiber.memoizedState → Hook linked list
Hook.queue → hook updates
```

但两者最终都进入同一套：

```text
Lane
Root Scheduler
beginWork
completeWork
commit
```

## 2. mountClassInstance

初次 mount 大致需要：

```text
构造 instance
绑定 Fiber ↔ instance
初始化 props/state/context
处理 update queue
调用合法的 mount render-phase lifecycle
执行 render()
```

注意：`constructor` 是 JavaScript instance 初始化，不等于 Commit。

## 3. this.setState 不是直接改 this.state

概念链：

```text
this.setState(partial)
→ class updater
→ create Update
→ enqueueUpdate(Fiber.updateQueue)
→ requestUpdateLane
→ scheduleUpdateOnFiber
```

因此 Class 和 Hook 的 setState 有共同架构原则：

> **更新先成为 queue 中的数据，再由 Render 消费。**

## 4. Class UpdateQueue 与 Hook UpdateQueue 不要混为一谈

两者都解决“排队/优先级/rebase”，但数据结构和实现文件不同。

Class：

```text
ReactFiberClassUpdateQueue.js
```

Function Hook：

```text
ReactFiberHooks.js
```

真正应该比较的是设计目标，而不是强行认为源码结构一致。

## 5. Render Phase 生命周期

历史 API：

```text
componentWillMount
componentWillReceiveProps
componentWillUpdate
```

现代别名：

```text
UNSAFE_componentWillMount
UNSAFE_componentWillReceiveProps
UNSAFE_componentWillUpdate
```

问题不是“这些名字老”。

真正冲突是：

```text
Render 可能执行
→ 被打断
→ 被丢弃
→ 重新执行
```

如果你在 Will 生命周期中：

```text
发不可撤销请求
修改外部单例
手工改 DOM
记录一次性计费
```

就无法满足 Render 可重放。

## 6. static getDerivedStateFromProps

它属于 render 计算路径。

因此必须理解成：

```text
next props + previous state
→ 计算 derived state
```

而不是“收到 props 变化时触发一次的事件回调”。

## 7. getSnapshotBeforeUpdate 为什么非常重要

它体现 Commit 的 phase 设计：

```text
Before Mutation
  ↓
getSnapshotBeforeUpdate(prevProps, prevState)
  ↓
Mutation
  DOM 变化
  ↓
Layout
  componentDidUpdate(..., snapshot)
```

典型滚动列表：

```text
DOM 变之前读 scrollHeight
DOM 变之后根据 snapshot 调整 scrollTop
```

如果只有 `componentDidUpdate`，某些“变更前宿主状态”已经丢失。

## 8. componentDidMount / componentDidUpdate

属于 Layout/Commit 语义。

它们可以：

```text
读取已提交 DOM
建立订阅
执行与新 UI 对应的外部同步
```

但仍不意味着可以无脑 setState，否则会形成 nested update。

## 9. componentWillUnmount

卸载过程要理解成资源清理协议：

```text
Fiber 被删除
→ layout/passive/class cleanup 按阶段执行
→ refs detach
→ host nodes removal
→ 内部指针逐步断开
```

不要把 unmount 只理解成“DOM remove 后调用一个函数”。

## 10. Error Boundary 为什么主要是 Class API

错误边界典型依赖：

```text
static getDerivedStateFromError
componentDidCatch
```

它们分别覆盖：

```text
render error → 计算 fallback state
commit/reporting → componentDidCatch
```

详细见错误恢复章节。

## 11. 为什么 Hooks 不是 lifecycle 一一替换

错误映射：

```text
useEffect([]) = componentDidMount
useEffect([x]) = componentDidUpdate
cleanup = componentWillUnmount
```

这只能帮助初学迁移，不是正确架构模型。

Effect 的正确模型：

```text
一个外部系统同步过程
setup(deps)
cleanup(previous deps)
```

一个组件可以有多个独立 Effect，而 Class lifecycle 是围绕 instance 阶段聚合的。

## 12. 实验

在 StrictMode 开发环境中给：

```text
constructor
render
componentDidMount
componentWillUnmount
```

分别打日志。

然后解释：

```text
哪些重复是 DEV 检查语义？
哪些真正对应 production mount？
为什么 render 重复不能产生副作用？
```

## 13. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. Class instance 为什么可以持久存在，但 render 仍必须纯？
2. `this.setState` 与 Hook `setState` 的共同架构原则是什么？
3. `getSnapshotBeforeUpdate` 为什么必须在 mutation 之前？
4. UNSAFE lifecycle 的真正问题是“弃用”还是“与可重放 Render 冲突”？
5. 为什么不能用 Class lifecycle 机械解释 Hooks？


---

<!-- SOURCE: 17-现代React关键能力.md -->

# 17. 现代 React 总览：从 Fiber Runtime 到 Async UI、Server 与 Compiler

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Host Config` | 宿主配置/渲染器平台适配层 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Transition` | 过渡更新 |
| `Memoization` | 记忆化/缓存计算结果 |
<!-- TERMS-AUTO-END -->


> **源码/产品基线：React 19.3 + React Compiler 1.x。** 这一章只建立地图；具体机制分别在后续专题深入。

## 1. 现代 React 的能力树

现代 React 不能再只用：

```text
Component + Hooks + Virtual DOM
```

来概括。

更准确：

```text
Declarative Component Model
        ↓
Fiber Reconciler
        ↓
Lanes / Root Scheduler
        ↓
Concurrent Render
        ↓
Suspense / Activity / Transition
        ↓
DOM Renderer + Events + ViewTransition
        ↓
Fizz SSR / Hydration / PPR
        ↓
RSC / Flight
        ↓
Compiler / Rules of React
```

## 2. Transition：不是 debounce，也不是后台线程

`startTransition` / `useTransition` 改变的是 React 更新语义：

```text
urgent work
可以优先提交

transition work
可以延迟、中断、重启
```

React 19.3 中无关 transition 能更独立地渲染，说明具体 lane 协调策略仍会演进。

稳定结论只有：

> Transition 是 React Scheduler/Reconciler 中的非紧急更新语义。

## 3. useDeferredValue

它把“当前 value”与“允许滞后的 UI value”分开。

```text
input state = 最新
expensive result = deferred snapshot
```

它不是 setTimeout；底层仍然通过 lane/deferred work 与 Suspense 协调。

## 4. Activity

React 19.2 引入 `<Activity>`，用于控制 UI 区域的可见/后台状态和优先级。

理解它要联系：

```text
Offscreen-like state retention
hidden subtree
state preservation
effect connect/disconnect
background pre-render
```

它说明 React 的生命周期已经不只是：

```text
mount → update → unmount
```

还存在“保留但隐藏/后台”的状态。

## 5. useEffectEvent

用于把 Effect 中的某些“事件式逻辑”从 reactive dependency 中分离。

核心问题：

```text
Effect 的连接条件 = roomId
通知样式 = theme
```

如果 theme 变化不应导致重新连接，就需要把“同步过程”和“被同步系统触发的事件逻辑”分开建模。

它不是“绕过 exhaustive-deps 的逃生口”。

## 6. use()

`use()` 可以读取：

```text
thenable
context 等 React 支持的 usable
```

它的重要性是把“读取资源可能 suspend”纳入 React Render 控制流。

在 19.3 的 thenable 路径中，React 使用内部 opaque suspension exception，而不是把真实 thenable 直接暴露为 throw 值。

## 7. Actions / useActionState / useOptimistic

现代 React 将 mutation flow 建模为：

```text
start async action
→ pending
→ optimistic UI
→ server/client mutation
→ success commit or error recovery
```

这让表单、Transition、异步状态、错误边界之间可以更一致地协作。

## 8. ViewTransition

React 19.3 将 `<ViewTransition>` 稳定化。

它不是简单 CSS wrapper，而是把 React 的 Transition commit 与浏览器 View Transition API 协调。

架构连接：

```text
React knows old/new tree
+ Transition semantics
+ commit lifecycle
+ browser view transition capture
```

因此 ViewTransition 必须放在 Commit/Scheduler 语境下理解。

## 9. Fragment Refs

React 19.3 稳定 Fragment refs，让一组没有额外 wrapper DOM 的子节点可以暴露组合式平台行为。

它改变的是：

```text
“ref 必须指向单一 host node”
```

这个长期假设的一部分。

学习时要区分：

```text
Fiber identity
Host node(s)
Public ref instance
```

## 10. browser()

React DOM 19.3 新增 `browser()`，可和 `use()` + Suspense 结合表达 browser-only subtree。

这把：

```text
“这段代码在服务端不成立”
```

从随意 `typeof window` 条件分支提升为更明确的 server/client render 语义。

## 11. React Compiler 1.x

React Compiler 已是稳定能力。

不要只记：

```text
“自动 useMemo”
```

更准确：

```text
JavaScript/JSX AST
→ Compiler HIR
→ control-flow/data-flow/mutation analysis
→ Rules of React validation
→ safe memoization transformation
→ runtime helpers
```

它能自动 memo 的根本前提是组件遵守 React 的纯度与数据流规则。

## 12. Performance Tracks

React 19.2 提供 React Performance Tracks，用浏览器 Performance 时间线展示：

```text
React work
Scheduler work
Components
network/server interactions（取决于工具环境）
```

源码精通不应该只会读内部函数，还应该能用生产级 profiling 工具验证性能假设。

## 13. PPR / Streaming / RSC

现代 React 的 server 架构是多层协议：

```text
RSC/Flight：组件数据模型
Fizz：HTML streaming renderer
Hydration：客户端接管 server DOM
PPR：预渲染与后续恢复
```

它们不是四种互斥渲染模式，而是可以组合的层。

## 14. 正确学习顺序

```text
Fiber / Render / Commit
→ Hooks / queues
→ Lane / Root Scheduler
→ Suspense / Transition / Activity
→ Event / DOM renderer
→ SSR / Hydration
→ RSC / Flight
→ Compiler
```

如果从 Actions、RSC 或 Compiler 直接开始，很容易只会 API 而没有 runtime model。

## 15. 精通标准

当看到一个新 React API，你应该自动问：

```text
它在 Render 还是 Commit 起作用？
它把数据存在哪？
它是否创建 Update？
Update 属于什么 lane？
是否可能 suspend/retry？
是否影响 Host Config / DOM？
服务端是否有另一条实现？
Compiler 是否会改写它周围的数据流？
```

能用这组问题分析未来 API，才算真正具备架构级 React 能力。


---

<!-- SOURCE: 18-源码阅读地图.md -->

# 18. React 源码阅读地图：按问题找入口

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Diff` | 差异比较 |
| `Placement` | 插入标记 |
| `beginWork` | 开始处理 Fiber |
| `completeWork` | 完成 Fiber 工作 |
| `Context` | 上下文 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 本章代码若标注“教学简化”，表示保留核心状态转移而非逐字复制源码。

## 本章掌握标准

- 能按问题而不是按目录定位源码
- 能在版本升级后重新发现函数位置
- 能建立自己的 symbol → data structure → invariant 索引

## React 19.3 源码锚点

```text
v19.3.0 packages/react-reconciler/src/
v19.3.0 packages/react-dom-bindings/src/
v19.3.0 packages/react-server/src/
v19.3.0 compiler/
```

## 本章核心不变量

- 源码路径是版本细节，问题/数据结构/不变量才是长期索引
- 任何调用链都要验证“谁改了什么数据”
- 阅读不能只追函数跳转而忽略状态变化

---

## 问题 1：useState 是怎么保存状态的？

看：

```text
packages/react/src/ReactHooks.js
packages/react-reconciler/src/ReactFiberHooks.js
```

函数：

```text
useState
resolveDispatcher
renderWithHooks
mountWorkInProgressHook
updateWorkInProgressHook
mountState
updateState
dispatchSetState
```

## 问题 2：setState 怎么触发 Fiber 更新？

看：

```text
ReactFiberHooks.js
ReactFiberConcurrentUpdates.js
ReactFiberWorkLoop.js
ReactFiberLane.js
```

函数：

```text
requestUpdateLane
enqueueConcurrentHookUpdate
scheduleUpdateOnFiber
markRootUpdated
ensureRootIsScheduled
```

## 问题 3：组件函数在哪里执行？

```text
ReactFiberBeginWork.js
ReactFiberHooks.js
```

函数：

```text
beginWork
updateFunctionComponent
renderWithHooks
```

## 问题 4：Diff 在哪里？

```text
ReactChildFiber.js
```

函数：

```text
reconcileChildFibers
reconcileChildrenArray
updateSlot
updateFromMap
placeChild
```

## 问题 5：DOM 在哪里创建？

```text
ReactFiberCompleteWork.js
ReactFiberConfigDOM.js
```

关注：

```text
completeWork
createInstance
createTextInstance
appendInitialChild
```

## 问题 6：DOM 在哪里插入/更新？

```text
ReactFiberCommitWork.js
ReactFiberConfigDOM.js
```

关注：

```text
commitMutationEffects
commitPlacement
commitHostUpdate
commitHostTextUpdate
```

## 问题 7：useEffect 在哪里执行？

```text
ReactFiberHooks.js
ReactFiberCommitWork.js
ReactFiberWorkLoop.js
```

关注：

```text
mountEffectImpl
updateEffectImpl
pushSimpleEffect
commitHookEffectListUnmount
commitHookEffectListMount
flushPassiveEffects
```

## 问题 8：Concurrent 如何让出？

```text
ReactFiberWorkLoop.js
scheduler/src/forks/Scheduler.js
```

关注：

```text
workLoopConcurrent
shouldYield
performWorkUntilDeadline
```

## 问题 9：Lane 怎么选？

```text
ReactFiberLane.js
ReactFiberWorkLoop.js
```

关注：

```text
requestUpdateLane
getNextLanes
markRootUpdated
markRootSuspended
```

## 问题 10：Context 为什么会让 consumer render？

```text
ReactFiberNewContext.js
ReactFiberBeginWork.js
```

关注：

```text
readContext
propagateContextChanges
checkIfContextChanged
```

---

# 推荐源码笔记模板

每个函数都用统一格式记录：

```md
## dispatchSetState

文件：
ReactFiberHooks.js

输入：
fiber, queue, action

输出/副作用：
创建 Update；
选择 lane；
入队；
触发 Root 调度。

改变的数据：
queue.pending
fiber/root lanes

下一跳：
scheduleUpdateOnFiber

它解决的问题：
把用户态 setState 转成 Reconciler 可调度更新。
```

坚持这种笔记格式，源码不会越看越散。

---

## 本章实验与自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**


---

<!-- SOURCE: 19-ErrorBoundary与错误恢复.md -->

# 19. Error Boundary 与错误恢复：Render Error、Commit Error、Root Recovery

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么 Render error 更容易通过重新 render recovery？
2. 为什么 Commit error 不能简单 rollback DOM？
3. Suspense pending 和 rejected 为什么进入不同 boundary？
4. 为什么 Event handler error 不等价于 child render error？


---

<!-- SOURCE: 20-ServerComponents与Flight.md -->

# 20. React Server Components 与 Flight：组件模型跨机器后的协议

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. RSC payload 为什么不能叫 HTML？
2. `'use client'` 为什么是模块图边界，不只是 runtime if？
3. Server Component 引用 Client Component 时服务器到底传什么？
4. RSC + SSR 为什么可以同时存在？
5. Server Action 为什么更像 RPC capability 而不是“函数序列化”？


---

<!-- SOURCE: 21-useSyncExternalStore与Tearing.md -->

# 21. useSyncExternalStore：外部可变状态、Snapshot 与 Tearing

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Concurrent Rendering` | 并发渲染 |
| `Hydration` | 水合/复用服务端 DOM |
| `SSR` | 服务端渲染 |
| `Context` | 上下文 |
| `Tearing` | 撕裂/并发读取不一致 |
| `External Store` | 外部状态仓库 |
| `Mount` | 挂载 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 这是理解“Concurrent React 为什么不能随便订阅外部全局变量”的关键章节。

## 本章掌握标准

你要能解释：

```text
为什么 useEffect + setState 订阅 store 在并发模型中可能不够
什么是 tearing
getSnapshot 为什么必须稳定
subscribe 与 snapshot 的协议
SSR 为什么需要 getServerSnapshot
```

## 源码锚点

```text
packages/react/src/ReactHooks.js
packages/react-reconciler/src/ReactFiberHooks.js
```

关键词：

```text
mountSyncExternalStore
updateSyncExternalStore
subscribeToStore
updateStoreInstance
pushStoreConsistencyCheck
```

## 1. 外部 Store 为什么特殊

React 自己的 state：

```text
UpdateQueue + Lane
→ React 知道状态版本
→ Render 基于某个一致 snapshot
```

外部 mutable store：

```js
store.value = ...
```

可能在 React 两次 Fiber unit 之间随时变化。

## 2. 什么是 Tearing

假设同一次并发 Render：

```text
Component A 读取 store = 1
React yield
外部 store 变为 2
Component B 读取 store = 2
```

如果最终把 A(1) + B(2) 一起 commit：

> 同一帧 UI 来自两个不同 store 版本。

这就是 tearing。

## 3. 为什么 getSnapshot 是核心

API：

```js
useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)
```

不是：

```text
“给 React 一个 getValue()”
```

而是提供一个可比较的 snapshot 协议。

React 可以在 render/commit 附近重新检查：

```text
之前读取的 snapshot
vs
现在 store snapshot
```

若不一致，需要重新同步更新，避免提交撕裂 UI。

## 4. getSnapshot 必须缓存稳定结果

错误：

```js
getSnapshot() {
  return { todos: store.todos }
}
```

每次都返回新对象，会让 React 认为 snapshot 一直变化。

正确方式：

```text
如果底层 store 没变
→ getSnapshot 返回 Object.is 相等的值/缓存对象
```

## 5. subscribe 的语义

```js
subscribe(callback)
```

必须：

```text
注册 store change listener
返回 unsubscribe
```

React 用它把外部更新重新转成 React 可调度工作。

## 6. 为什么叫 Sync External Store

“Sync”不是说所有 UI 都同步 render。

重点是：

> 外部 store 的可观察值必须与 React commit 保持同步一致，不能让 concurrent rendering 产生 tearing。

某些外部 store 更新需要更保守的同步检查，这是为了 correctness。

## 7. SSR 的 getServerSnapshot

服务端和 hydration 首次客户端读取需要同一个可匹配初始 snapshot。

否则：

```text
server HTML = snapshot A
client hydration first snapshot = B
```

可能导致 hydration mismatch 或 UI 不一致。

## 8. 与 Context / Redux / Zustand 的关系

状态库可以内部使用 `useSyncExternalStore` 或等价协议来接入 Concurrent React。

架构上：

```text
Context：React 自己知道 value dependency
External Store：值活在 React 外，必须提供 snapshot/subscribe 协议
```

## 9. 实验：制造 tearing 思维实验

写一个外部 store，让 `getSnapshot` 在 render 期间故意变化，观察 React 的一致性检查/重渲染行为。

断点：

```text
updateSyncExternalStore
pushStoreConsistencyCheck
updateStoreInstance
```

## 10. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么 `useEffect(() => store.subscribe(...))` 的简单实现可能在 concurrent 模型下有一致性窗口？
2. getSnapshot 为什么不能每次返回新对象？
3. React 自己的 useState 为什么较少面临同样 tearing 问题？
4. getServerSnapshot 与 hydration 有什么关系？


---

<!-- SOURCE: 22-HostConfig与自定义Renderer.md -->

# 22. Reconciler 与 Renderer：Host Config、自定义 Renderer、React DOM 边界

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Host Instance` | 宿主实例/真实平台节点 |
| `Host Config` | 宿主配置/渲染器平台适配层 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Update Queue` | 更新队列 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Transition` | 过渡更新 |
| `Diff` | 差异比较 |
| `Placement` | 插入标记 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** 这是“架构师级 React”必须掌握的一章。

## 本章掌握标准

你要能回答：

```text
React Reconciler 为什么可以不依赖 DOM？
HostComponent 的 DOM 在哪里创建？
Commit 如何调用平台 API？
React DOM 与 React Native 为什么能共享 Fiber？
```

## 源码锚点

```text
packages/react-reconciler/src/ReactFiberCompleteWork.js
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react-reconciler/src/ReactFiberHostConfig.js
packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js
packages/react-reconciler/README.md
```

## 1. React 的平台无关核心

Reconciler 关心：

```text
Element identity
Fiber tree
state/update queues
lanes
render/commit traversal
```

它不应该硬编码：

```js
document.createElement
node.appendChild
```

## 2. Host Config 是依赖倒置

从架构模式看：

```text
Reconciler = policy / algorithm
Host Config = platform capability interface
```

Reconciler 调用抽象能力：

```text
createInstance
createTextInstance
appendInitialChild
prepareUpdate / commitUpdate
removeChild
hideInstance / unhideInstance
scheduleTimeout...
```

具体 Renderer 提供实现。

## 3. Complete Phase 为什么适合创建 Host Instance

初次 mount：

```text
beginWork
→ 确定 children

completeWork HostComponent
→ children 已完成
→ createInstance
→ append children
→ stateNode = host instance
```

这形成 bottom-up 构建。

## 4. Render 创建 Host Instance，为什么不等于修改屏幕？

React DOM 在 mount 期间可以先创建离线 DOM node：

```text
createElement
set initial props
append child to detached parent
```

真正把 subtree 插入已连接 DOM 通常仍由 Commit Placement 完成。

因此：

```text
create host object ≠ user-visible mutation
```

## 5. Mutation Mode / Persistence Mode

不同 Renderer 可以有不同 host 更新策略。

常见 DOM renderer 是 mutation style：

```text
对已有 host tree 执行 insert/update/remove
```

某些 renderer 理论上可采用 persistence：

```text
构造新 host child set
→ replace container children
```

这体现 Reconciler 与宿主策略的解耦。

## 6. 自定义 Renderer 的学习价值

`react-reconciler` 包的 API 是实验性的，但实现一个教学 renderer 很有价值。

例如目标宿主：

```text
Canvas scene graph
terminal tree
JSON object tree
custom game UI
```

你会被迫区分：

```text
Fiber ≠ Host Node
Reconciliation ≠ DOM Diff
Commit ≠ Browser Paint
```

## 7. DOM Renderer 还负责什么

React DOM 不只 Host Config：

```text
property setting
styles
controlled inputs
selection
focus
hydration matching
events
resource hints
form actions
view transitions
Trusted Types integration
```

所以“ReactDOM 就是 appendChild adapter”也过度简化。

## 8. 实验：做一个 JSON Renderer

目标 API：

```jsx
<box width={100}>
  <text>Hello</text>
</box>
```

Commit 后得到：

```js
{
  type: 'box',
  props: { width: 100 },
  children: [{ type: 'text', children: ['Hello'] }]
}
```

实现：

```text
createInstance
createTextInstance
appendInitialChild
appendChild
removeChild
commitUpdate
```

不需要浏览器，就能验证 Reconciler 的平台无关性。

## 9. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么 HostComponent Fiber.stateNode 对 DOM renderer 是 DOM node，而 FunctionComponent 不是？
2. completeWork 中创建 DOM 为什么仍可以属于 Render Phase？
3. Host Config 从软件架构角度属于什么设计思想？
4. 为什么学自定义 Renderer 能纠正“Virtual DOM = DOM wrapper”的错误理解？


---

<!-- SOURCE: 23-ReactCompiler内部模型.md -->

# 23. React Compiler：HIR、数据流分析、Rules of React 与自动 Memoization

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Closure` | 闭包 |
| `Memoization` | 记忆化/缓存计算结果 |
| `Context` | 上下文 |
| `Ref` | 引用 |
| `Profiler` | 性能分析器 |
| `Rules of React` | React 规则 |
| `React Compiler` | React 编译器 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `DOM` | 文档对象模型 |
| `Layout` | 布局/回流 |
| `Invariant` | 不变量 |
<!-- TERMS-AUTO-END -->


> **基线：React Compiler 1.x 稳定版。** Compiler 是现代 React 架构的一部分，不再适合只当实验特性略过。

## 本章掌握标准

你要能解释：

```text
为什么 Compiler 能自动 memo
为什么 Hooks/组件纯度规则是编译优化前提
为什么 Compiler 不等于“自动加 useMemo”
为什么手工 memo 仍有少数 escape-hatch 场景
```

## 官方架构事实

Compiler 当前作为 build-time tool 工作，核心会把输入代码降低到自己的 HIR，并使用 control-flow / data-flow / mutation 分析理解组件与 Hook 代码，再进行优化和规则验证。

## 源码地图

```text
compiler/
packages/react-compiler-runtime/
eslint-plugin-react-hooks/
```

具体目录会快速演进，因此 Compiler 章节更应该以“pass / IR / invariant”方式阅读，而不是背文件名。

## 1. 为什么 React 适合 Compiler

React 函数组件理想模型：

```text
UI = f(props, state, context)
```

如果函数满足：

```text
render pure
不修改输入
不在 render 产生不可追踪副作用
引用依赖可分析
```

编译器就能证明某些表达式在依赖不变时可复用。

## 2. AST 不够，为什么需要 HIR

直接在 JavaScript AST 上做所有优化很困难：

```text
控制流
early return
branch
mutation alias
closure capture
hook semantics
```

Compiler 会建立更适合分析的高级中间表示 HIR。

可以把它理解为：

```text
JS/JSX AST
→ lowering
→ HIR + CFG
→ analysis passes
→ reactive scope / dependency knowledge
→ optimization
→ generated JS
```

## 3. CFG / Data Flow

例如：

```js
if (!user) return null
const fullName = user.first + user.last
return <Profile name={fullName} />
```

手工 Hook 不能在 early return 后“有条件使用 useMemo”。

Compiler 却可以在自己的 IR 中理解控制流并在安全位置建立缓存区域。

这说明自动 memo 的表达能力可能高于手工 `useMemo`。

## 4. Mutation Analysis

编译器必须知道：

```text
某个 value 是否可能被修改
某个函数是否可能修改捕获值
某个对象引用是否稳定/可缓存
```

否则：

```text
缓存一个后来被原地 mutate 的结果
```

可能改变程序语义。

## 5. Rules of React 不只是 lint 风格

Compiler-backed lint 规则的深层意义：

> 它们在描述“什么样的 React 程序可以被安全重放、分析和优化”。

例如：

```text
render purity
refs during render
setState in render/effect 的危险模式
Hook rules
```

这和 Fiber Render 可重放是不变量一致的。

## 6. Compiler 与 memo/useMemo/useCallback

传统手工：

```text
开发者声明缓存边界
```

Compiler：

```text
静态分析后自动建立更细粒度缓存
```

但手工 memo 仍可能用于：

```text
明确的性能契约
与第三方库的稳定引用协议
Effect dependency 的精确身份控制
Compiler 无法/不选择优化的边界
```

不要机械删除旧项目所有 memoization。

## 7. Compiler 不会修复错误的数据模型

例如：

```text
巨型 Context value 每次整体变化
外部 store 无 snapshot consistency
DOM layout thrashing
N+1 network requests
```

Compiler 最多优化 React 计算，不会替你解决系统架构问题。

## 8. 如何读 Compiler 源码

不要按目录全部读。

按 pipeline：

```text
parse/lower
→ HIR construction
→ validation
→ inference/analysis
→ reactive scopes
→ codegen
→ runtime cache helpers
```

对每个 pass 问：

```text
输入 IR 是什么？
建立了什么事实？
需要什么前置不变量？
产出给下一 pass 什么信息？
```

## 9. 实验

选择同一组件：

```text
关闭 Compiler
开启 Compiler
```

用 Compiler playground/构建输出观察：

```text
哪些值被缓存
哪些函数被复用
什么代码因为违反 Rules 无法优化
```

再用 Profiler 比较真实收益。

## 10. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么 React Compiler 需要自己的 IR？
2. 自动 memo 为什么依赖 Render purity？
3. 为什么 Compiler 不是“自动包 React.memo”？
4. 为什么 Compiler 不能解决 layout thrashing？


---

<!-- SOURCE: 24-StrictMode与RulesOfReact.md -->

# 24. StrictMode 与 Rules of React：用“可重放”检查程序正确性

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么“只在生产不重复”不能成为写不纯 Render 的理由？
2. StrictMode 为什么和 Concurrent Render 的可重放哲学一致？
3. Effect double-connect 暴露的是哪类 bug？


---

<!-- SOURCE: 25-Profiler与性能工程.md -->

# 25. React 性能工程：Profiler、Performance Tracks 与浏览器流水线

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Fiber` | 纤程/React 工作单元 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Scheduler` | 调度器 |
| `Transition` | 过渡更新 |
| `Bailout` | 跳过渲染/提前退出 |
| `Memoization` | 记忆化/缓存计算结果 |
| `Key` | 列表身份键 |
| `Context` | 上下文 |
| `Provider` | 上下文提供者 |
| `Consumer` | 上下文消费者 |
| `Ref` | 引用 |
| `Profiler` | 性能分析器 |
| `External Store` | 外部状态仓库 |
<!-- TERMS-AUTO-END -->


> **目标：从“猜优化”升级为“测量 → 分类 → 归因 → 验证”。**

## 1. 先分类，不要先加 memo

性能问题至少分四类：

```text
A. React Render CPU
B. Commit / DOM Mutation
C. Browser Style/Layout/Paint/Composite
D. Network/Server/Data waterfall
```

不同类别解决方案完全不同。

## 2. React Profiler 解决什么

Profiler 能回答：

```text
哪些组件 render 了？
本次 commit 花了多久？
为什么 render？
memo 是否真正跳过？
```

但它不完整显示浏览器 layout/paint 成本。

## 3. Browser Performance 面板

用于看：

```text
JS task
Style recalculation
Layout
Paint
Composite
Long Task
network timing
```

如果 React render 只有 3ms，但 Layout 80ms：

```text
加 useMemo 大概率方向错了
```

## 4. React Performance Tracks

React 19.2 引入 Performance Tracks，使 React/Scheduler 信息更直接进入性能时间线。

这让你可以关联：

```text
user interaction
→ React scheduled work
→ component/render work
→ browser rendering
```

源码理解应该和 profiling 证据互相验证。

## 5. 性能优化的因果树

### Render 次数太多

检查：

```text
state 放置位置
Context fan-out
props identity
external store selector
unnecessary effect setState
```

### 单次 Render 太慢

检查：

```text
昂贵 JS 计算
大列表
重复数据转换
组件粒度
Compiler/memoization
```

### Commit 太重

检查：

```text
大量 Host nodes 插入/删除
key 导致 remount
频繁 ref/layout effect
```

### Layout/Paint 太重

检查：

```text
DOM 规模
CSS selector/layout dependency
forced synchronous layout
复杂 paint
动画属性
```

## 6. memoization 的成本模型

任何 memo 都有：

```text
比较成本
缓存内存
代码复杂度
引用管理成本
```

收益成立条件：

```text
被避免的工作成本
× 避免频率
>
缓存/比较/复杂度成本
```

所以“全部 useCallback”不是工程策略。

## 7. Context 性能不是简单 useMemo(value)

Provider：

```jsx
<Ctx value={{a,b,c}}>
```

即使 useMemo 稳定对象，只要 a/b/c 中任一变化，所有依赖整个 Context 的 consumer 仍可能需要更新。

更结构性的解法：

```text
拆 Context
external store + selector
状态下沉/上移重构
server/client boundary 调整
```

## 8. 大列表

React 层：

```text
virtualization
stable key
bailout
transition/deferred value
```

浏览器层：

```text
DOM 数量
layout scope
contain/content-visibility（适用时）
```

不要只优化 Fiber 而留下十万个真实 DOM。

## 9. 一次性能实验模板

```text
问题：输入搜索框卡顿

Baseline:
React render 38ms
Layout 4ms

Hypothesis:
过滤 20k items 每次 urgent render 计算

Change:
把结果更新放 transition + memo/Compiler + virtualization

Result:
urgent input render 3ms
transition render 可中断
DOM 数量从 20k → 30

Conclusion:
瓶颈同时有 React CPU + DOM 规模
```

## 10. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么 React Profiler 不能代替 Browser Performance？
2. 为什么 useMemo 不能修复 Layout？
3. key 不稳定会怎样同时伤害 Render 与 Commit？
4. Compiler 自动 memo 后，为什么仍需要架构级性能设计？


---

<!-- SOURCE: 26-Ref系统与ImperativeHandle.md -->

# 26. Ref 系统：Object Ref、Callback Ref、Commit Attach/Detach 与 Imperative Handle

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Ref` | 引用 |
| `Imperative Handle` | 命令式句柄 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `DOM` | 文档对象模型 |
| `Layout` | 布局/回流 |
| `Fragment` | 片段 |
| `Mount` | 挂载 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** React 19 支持 ref 作为 function component 的 prop 使用，Ref 心智模型比“拿 DOM”更广。

## 本章掌握标准

你需要能区分：

```text
useRef 的 Hook state
Host ref attach/detach
callback ref
forwardRef 历史角色
ref as prop
useImperativeHandle
Fragment refs
```

## 源码锚点

```text
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberCommitEffects.js
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react/src/ReactForwardRef.js
```

## 1. useRef 本身只是稳定容器

```js
const ref = useRef(initial)
```

Hook 保存：

```text
memoizedState → { current: initial }
```

后续 render 复用同一个对象身份。

修改：

```js
ref.current = x
```

不创建 state Update，因此不触发 Render。

## 2. DOM ref 是 Commit 行为

```jsx
<div ref={ref} />
```

Render 只能记录：

```text
这个 Fiber 有 ref
```

真实：

```text
ref.current = DOM node
```

必须等 Host node 已经创建/提交到正确阶段。

所以 attach/detach 属于 Commit 语义。

## 3. Callback Ref

```jsx
<div ref={node => { ... }} />
```

它本质上是 commit callback。

因此必须能够正确处理：

```text
attach(node)
detach(null or cleanup semantics)
StrictMode DEV reconnect
```

不能把 callback ref 当 render callback。

## 4. useImperativeHandle

组件不一定想把完整 DOM/API 暴露给父级。

```js
useImperativeHandle(ref, () => ({
  focus() { inputRef.current.focus() }
}))
```

它建立：

```text
Parent Ref
→ controlled public imperative interface
→ internal host nodes hidden
```

架构上属于封装边界，而不只是 Hook 技巧。

## 5. React 19 的 ref as prop

现代 function component 可以直接接收 `ref` prop（配合相应 React 19 语义），这降低了 `forwardRef` 的必要性。

学习源码时要区分：

```text
历史 public API forwarding mechanism
vs
Fiber commit ref machinery
```

后者仍然存在。

## 6. Fragment Refs

React 19.3 稳定 Fragment refs。

它说明 Public Ref Instance 不再必须一一对应单 Host node。

理解重点：

```text
一个 Fiber/public abstraction
可以代表一组平台节点行为
```

## 7. 为什么 render 时读取 ref.current 常常危险

Ref 是 mutable escape hatch。

如果 Render 依赖：

```js
if (ref.current...) return ...
```

React 无法像 state/props 那样追踪这个依赖的更新。

而 concurrent/replay render 中，mutable external value 还可能产生不一致。

因此 Ref 更适合：

```text
imperative handle
DOM access after commit
保存不驱动 UI 的 mutable value
```

## 8. 实验

断点：

```text
commitAttachRef
safelyDetachRef
mountImperativeHandle
updateImperativeHandle
```

观察：

```text
ref.current 在 render/layout/passive 各阶段是什么
```

## 9. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. useRef 为什么不触发 render？
2. 为什么 host ref attach 必须在 Commit？
3. useImperativeHandle 解决的是状态问题还是封装问题？
4. Fragment refs 为什么证明 ref 不必等于单 DOM node？


---

<!-- SOURCE: 27-Batching与flushSync.md -->

# 27. Automatic Batching、Root Microtask 与 flushSync

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `createRoot` | 创建 React 根 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Render Snapshot` | 渲染快照 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Suspense` | 异步等待边界 |
| `SSR` | 服务端渲染 |
| `Batching` | 批处理 |
| `Automatic Batching` | 自动批处理 |
<!-- TERMS-AUTO-END -->


> **源码基线：React v19.3.0。** Batching 是更新调度体系的结果，不应该简化成“React event handler 结束后统一 setState”。

## 本章掌握标准

你要能解释：

```text
为什么多个 setState 常只产生一次可见 commit
为什么 modern createRoot batching 范围更广
Root Scheduler microtask 做什么
flushSync 为什么是 escape hatch
为什么 batching 不等于 queue 中只剩一个 update
```

## 源码锚点

```text
packages/react-reconciler/src/ReactFiberRootScheduler.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-dom/src/shared/ReactDOMFlushSync.js
```

## 1. Batching 不等于“合并 state 值”

```js
setA(1)
setB(2)
setC(3)
```

可能 batch 成较少的 Render/Commit。

但三个 Update 仍可能分别存在于各自 queue 中。

因此：

```text
Batching = 调度/提交边界优化
不是 = 把所有 Update 对象压成一个
```

## 2. React 18+ Automatic Batching 的心智模型

现代 Root 中，同一 browser task 内来自：

```text
React event
Promise callback
setTimeout 等
```

的多个更新，在适当条件下可以被统一批处理。

不要再背旧规则：

```text
“只有 SyntheticEvent batching”
```

## 3. React 19.3 Root microtask

`ensureRootIsScheduled`：

```text
root 加入 schedule
→ 确保 microtask
```

microtask 中：

```text
processRootScheduleInMicrotask
→ 扫描 scheduled roots
→ scheduleTaskForRootDuringMicrotask
→ 选择 next lanes
```

这给同一 task 内的更新提供一个自然收集窗口。

## 4. 为什么不能说“batching 就是 microtask”

因为 batching correctness 还依赖：

```text
UpdateQueue
lanes
execution context
sync callback handling
Root pending state
commit scheduling
```

microtask 是调度边界，不是全部实现。

## 5. State snapshot 与 batching

```js
setCount(count + 1)
setCount(count + 1)
setCount(count + 1)
```

三次 action 都基于当前 render snapshot 的 `count`。

最终常只得到 +1，不是因为 batching “丢了两个 update”，而是因为三个 action 都是替换为同一个值。

函数式：

```js
setCount(c => c + 1)
```

让 queue 在 reducer 处理时以上一个计算结果为输入。

## 6. flushSync

`flushSync` 的语义：

> 请求 React 在这个边界内把可同步处理的工作尽快 flush，使调用返回时 DOM 更接近已提交状态。

典型需要：

```text
和第三方 imperative browser API 协调
必须立即测量刚 setState 后的 DOM
```

但它会破坏正常调度优化，可能迫使 Suspense fallback 或额外工作，因此不能当常规“解决异步 setState”的工具。

## 7. 实验

分别在：

```text
click handler
Promise.then
setTimeout
flushSync
```

中连续 setState，记录：

```text
render count
commit count
DOM 读取时机
```

## 8. 自检

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

1. 为什么 batching 后 UpdateQueue 仍然需要保存多个 Update？
2. 三次 `setCount(count+1)` 只 +1 与 batching 的真正关系是什么？
3. Root microtask 为什么有助于 batching，但为什么 batching 又不等于 microtask？
4. flushSync 为什么是 escape hatch？


---

<!-- SOURCE: 28-useReducer源码原理.md -->

# 28. useReducer 源码原理：同一套 Hook Queue 的另一种表达

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `pending` | 待处理更新 |
| `eager state` | 预计算状态 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Bailout` | 跳过渲染/提前退出 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `Mount` | 挂载 |
<!-- TERMS-AUTO-END -->


> 基线：React 19.3.0。目标不是记 API，而是理解 `useReducer` 为什么和 `useState` 共享同一类 Hook / UpdateQueue 模型。

## 1. 先建立不变量

`useReducer` 必须满足四个约束：

- render 阶段读取到的是当前 render 对应的 state snapshot；
- `dispatch(action)` 不直接修改当前局部变量；
- update 必须进入队列，并带着 lane 参与优先级选择；
- 被跳过的低优先级 update 必须能够在未来 rebase，否则并发更新会丢失语义。

所以它自然会落到：

```text
Hook
  ├─ memoizedState
  ├─ baseState
  ├─ baseQueue
  └─ queue
       ├─ pending
       ├─ dispatch
       ├─ lastRenderedReducer
       └─ lastRenderedState
```

## 2. 源码主线

源码锚点：[`ReactFiberHooks.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)

```text
useReducer
  ↓ Dispatcher
mountReducer / updateReducer / rerenderReducer
  ↓
updateReducerImpl
  ↓
合并 pendingQueue 与 baseQueue
  ↓
按 renderLanes 消费 update
  ↓
跳过的 update 克隆进 newBaseQueue
  ↓
得到 memoizedState / baseState / baseQueue
```

教学化伪码：

```js
function updateReducerImpl(hook, reducer) {
  const queue = hook.queue
  mergePendingIntoBaseQueue(hook, queue)

  let state = hook.baseState
  let newBaseQueue = null

  for (const update of hook.baseQueue) {
    if (!includesRenderLane(update.lane)) {
      newBaseQueue = cloneForLater(update, newBaseQueue)
      continue
    }
    state = update.hasEagerState
      ? update.eagerState
      : reducer(state, update.action)
  }

  hook.memoizedState = state
  hook.baseQueue = newBaseQueue
  return [state, queue.dispatch]
}
```

> 上面是教学化结构，不是逐字复制 React 源码。

## 3. useState 与 useReducer 的关系

`useState` 可以理解成使用了一个“basicStateReducer”的特殊 reducer：

```js
function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action
}
```

所以：

```text
useState(value)
≈ useReducer(basicStateReducer, value)
```

这不是说两者公共 API 完全等价，而是说它们在 reconciler 内部共享大量队列处理机制。

## 4. 为什么 reducer 必须是纯函数

Render 可能被重新执行、放弃或重试。如果 reducer 有副作用：

```js
function reducer(state, action) {
  analytics.send(action) // 错误：副作用
  return nextState
}
```

同一个 action 可能因为重渲染而造成重复外部副作用。Reducer 的职责是**从输入计算状态**，不是执行外部同步。

## 5. eager state 优化

当 React 能够安全地提前计算下一 state，并且新旧 state `Object.is` 相等时，可能走 eager bailout，减少一次无意义调度。但这只是优化，不能依赖它作为业务语义。

## 6. 实验

```jsx
function Demo() {
  const [state, dispatch] = useReducer((s, a) => s + a, 0)
  return <button onClick={() => { dispatch(1); dispatch(2) }}>{state}</button>
}
```

断点建议：

```text
mountReducer
updateReducerImpl
dispatchReducerAction
scheduleUpdateOnFiber
```

观察 `pending` 环、lane、`baseState` 与 `baseQueue` 的变化。

## 7. 自检

1. 为什么 `dispatch` 可以保持稳定引用，但 reducer/state 每个 render 都可能变化？
2. 为什么 `baseQueue` 不是普通“待执行队列”？
3. 如果 reducer 返回与当前 state `Object.is` 相同的值，React 能做什么优化？

参考答案见 [`assessments/全章节自检题-参考答案.md`](assessments/%E5%85%A8%E7%AB%A0%E8%8A%82%E8%87%AA%E6%A3%80%E9%A2%98-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。


---

<!-- SOURCE: 29-useMemo-useCallback源码原理.md -->

# 29. useMemo / useCallback：Render 缓存，而不是状态管理

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `stale closure` | 过期闭包/陈旧闭包 |
| `Closure` | 闭包 |
| `Memoization` | 记忆化/缓存计算结果 |
| `Profiler` | 性能分析器 |
| `React Compiler` | React 编译器 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


源码锚点：[`ReactFiberHooks.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)

## 1. 核心模型

`useMemo` 的 Hook `memoizedState` 可以教学化理解为：

```text
[value, deps]
```

更新时：

```text
读取 old [value, deps]
  ↓
逐项 Object.is 比较 deps
  ↓
相同 → 返回旧 value
不同 → 执行 create()，存 [newValue, nextDeps]
```

`useCallback(fn, deps)` 本质上缓存的是函数引用：

```text
[fn, deps]
```

它不是“让函数不创建”，而是**让 React 在依赖不变时把上一次函数引用返还给你**。

## 2. 为什么不能把 useMemo 当语义保证

Memoization 是性能工具，而不是状态容器。业务正确性不应该依赖“这个值一定不会重新计算”。否则你的逻辑把优化层误当成了语义层。

## 3. React.memo + useCallback 的真实关系

```jsx
const Child = memo(function Child({ onClick }) { ... })
```

如果父组件每次：

```jsx
<Child onClick={() => save(id)} />
```

函数引用变化会让浅比较失败。

`useCallback` 只有在**下游真的利用引用稳定性**时才可能有价值，例如 memoized child 或 Effect dependency。

## 4. 成本模型

手工 memo 也有成本：

```text
保存缓存值
+ 保存 deps
+ 每次 render 比较 deps
+ 增加代码复杂度
+ 更容易制造 stale closure
```

因此优化过程应该是：Profiler 找热点 → 确定重渲染/计算成本 → 再选择 memo，而不是“函数都包 useCallback”。

## 5. React Compiler 时代

React Compiler 可以自动做大量基于依赖的 memoization。它并不让这些原理失效，反而要求你更理解“纯 render + 稳定数据流”为什么是编译器能优化的前提。

## 6. 自检

1. `useCallback(fn, deps)` 与 `useMemo(() => fn, deps)` 在模型上有什么关系？
2. 为什么 `useMemo` 不能用来保证对象“永远只创建一次”？
3. 什么时候 `useCallback` 反而可能降低可维护性而没有性能收益？

参考答案见答案册。


---

<!-- SOURCE: 30-useEffectEvent与闭包模型.md -->

# 30. useEffectEvent 与闭包模型：Reactive 与 Non-Reactive Effect Logic

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Effect` | 副作用 |
| `stale closure` | 过期闭包/陈旧闭包 |
| `Closure` | 闭包 |
| `Ref` | 引用 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


> React 19.3 文档包含 `useEffectEvent`。它解决的是“Effect 中某段逻辑需要读取最新值，但不应该因此重新同步整个 Effect”的建模问题。

官方 API 文档：https://react.dev/reference/react/useEffectEvent

## 1. 先理解 stale closure 不是 React bug

每次 render 都产生新的 lexical environment：

```text
Render #1 → count = 0 → callback#1 captures 0
Render #2 → count = 1 → callback#2 captures 1
```

旧 callback 当然仍读取旧 render 的值。

## 2. Effect 的 reactive dependency

Effect 的语义应该是：

> 当用于建立外部同步关系的 reactive value 改变时，停止旧同步并建立新同步。

如果只是通知文本使用了 `theme`，而连接只由 `roomId` 决定：

```jsx
const onConnected = useEffectEvent(() => {
  showNotification('Connected', theme)
})

useEffect(() => {
  const c = connect(roomId)
  c.on('connected', onConnected)
  return () => c.disconnect()
}, [roomId])
```

`theme` 可以由 Effect Event 在调用时读取最新 committed value，但它不成为连接 Effect 的重新同步条件。

## 3. 不应该滥用

`useEffectEvent` 不是“逃避 dependency lint”的工具。真正参与外部同步关系的值仍应该写进 deps。

## 4. 和 ref hack 的区别

过去常见：

```js
const latest = useRef(value)
latest.current = value
```

再从 async callback 读取 `latest.current`。这可以解决某些 latest-value 问题，但会绕过 React 的 reactive model。`useEffectEvent` 更直接表达“这段 Effect 内事件逻辑是 non-reactive”。

## 5. 自检

1. 为什么 `useEffectEvent` 不能简单理解成“自动 useRef”？
2. 为什么它只能在 Effect/Effect Event 中调用，而不是普通事件处理器里随便调用？
3. 哪些值应该留在 Effect deps 中？


---

<!-- SOURCE: 31-useTransition与useDeferredValue.md -->

# 31. useTransition / useDeferredValue：把“紧急程度”建模进更新

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Scheduler` | 调度器 |
| `Transition` | 过渡更新 |
| `JSX` | JavaScript XML/JS 语法扩展 |
<!-- TERMS-AUTO-END -->


源码锚点：

- [`ReactFiberHooks.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)
- [`ReactFiberLane.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberLane.js)
- [`ReactFiberRootScheduler.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberRootScheduler.js)

## 1. Transition 不等于 setTimeout

`startTransition` 的目标不是“延迟 N 毫秒”，而是把某些更新标记为 non-blocking transition work，让输入等更紧急工作可以先完成。

```text
Input update → urgent lane
Result list update inside transition → transition lane
```

当两者竞争时，React 可以中断/重启较低紧急度的 render。

## 2. useTransition

```jsx
const [isPending, startTransition] = useTransition()
```

`isPending` 让 UI 能表达“transition 仍未完成”。它不是网络请求 loading 的通用替代物；它描述的是 React transition 的 pending 状态。

## 3. useDeferredValue

```jsx
const deferredQuery = useDeferredValue(query)
```

可以把它理解为：当前 UI 先接收新 `query`，但某个消费端允许暂时继续使用旧值，React 再以较低紧急度追上。

## 4. 两者差异

```text
useTransition：你控制“哪次 state update 是 transition”
useDeferredValue：你控制“某个 value 的消费可以延后”
```

## 5. 并发不变量

低优先级 render 可能：

```text
开始 → 被输入打断 → 放弃 WIP → 高优先级 commit → 重新 render transition
```

因此 render 必须可重入、可重做且无外部副作用。

## 6. 自检

1. 为什么 Transition 不是定时器？
2. `useDeferredValue` 为什么可能显示“旧值 + 新的其他 UI”？
3. 为什么并发渲染要求 UpdateQueue 能 rebase？


---

<!-- SOURCE: 32-useId-useDebugValue-useInsertionEffect.md -->

# 32. useId / useDebugValue / useInsertionEffect：库作者常见 Hooks

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Passive Effect` | 被动副作用 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Key` | 列表身份键 |
| `Hydration` | 水合/复用服务端 DOM |
| `SSR` | 服务端渲染 |
| `Layout` | 布局/回流 |
| `Paint` | 绘制 |
<!-- TERMS-AUTO-END -->


## useId

`useId` 用于生成在 SSR/Hydration 场景可协调的稳定 ID，常用于 accessibility attribute 关联。不要用它生成列表 key；key 表达业务 identity，而 `useId` 解决的是组件实例渲染标识。

## useDebugValue

Custom Hook 可以用它给 React DevTools 提供更可读的调试标签。它不会替代业务日志，也不应该改变 Hook 行为。

## useInsertionEffect

它面向 CSS-in-JS 等库，在布局 Effect 读取 layout 之前把样式插入正确位置。它不是更“快”的 `useLayoutEffect`，应用业务代码极少需要它。

典型顺序可概念化为：

```text
Commit mutation / insertion-related work
→ insertion effects
→ layout effects
→ browser paint
→ passive effects
```

具体内部子阶段应以当前源码为准，不把教学顺序当作所有 edge case 的逐指令时间线。

## 自检

1. 为什么 `useId` 不能当列表 key 生成器？
2. `useInsertionEffect` 主要解决哪类库级问题？
3. `useDebugValue` 为什么不属于状态机制？


---

<!-- SOURCE: 33-use-ActionState-Optimistic-FormStatus.md -->

# 33. use / useActionState / useOptimistic / useFormStatus

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `pending` | 待处理更新 |
| `Transition` | 过渡更新 |
| `Suspense` | 异步等待边界 |
| `Thenable` | 类 Promise 对象 |
| `Context` | 上下文 |
| `Ref` | 引用 |
| `DOM` | 文档对象模型 |
<!-- TERMS-AUTO-END -->


官方参考：

- https://react.dev/reference/react/use
- https://react.dev/reference/react/useActionState
- https://react.dev/reference/react/useOptimistic
- https://react.dev/reference/react-dom/hooks/useFormStatus

## 1. use：读取可挂起资源与 Context

`use()` 与普通 Hooks 有不同调用约束，并与 Suspense 协作。当 thenable pending 时，React 进入内部 suspension 控制流，而不是让用户代码继续拿到一个“半完成结果”。

源码锚点：[`ReactFiberThenable.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberThenable.js)

## 2. useActionState

它把 Action 的结果状态和 pending 状态组织起来：

```text
Action invocation
→ pending
→ action result / error
→ state commit
```

重点不是“又一个 useState”，而是 Action/Transition/Form 语义之间的组合。

## 3. useOptimistic

乐观状态有两层：

```text
base value：服务器/父层确认的真实状态
optimistic overlay：Action pending 期间临时投影
```

当 Action 完成或失败，overlay 需要正确回落/重算，而不是永久覆盖 base value。

## 4. useFormStatus

它读取父 `<form>` Action 的状态，类似于表单范围内的状态通道。它不是任意请求的全局 loading store。

## 5. 自检

1. 为什么 `useOptimistic` 必须区分 base state 与 optimistic state？
2. `useActionState` 和普通 `useReducer` 的语义中心分别是什么？
3. `use()` 与 Suspense 的关系是什么？


---

<!-- SOURCE: 34-Fragment-Portal-Lazy-ViewTransition.md -->

# 34. Fragment / Portal / lazy / ViewTransition：组件树与宿主树并不总是一一对应

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Fiber` | 纤程/React 工作单元 |
| `Transition` | 过渡更新 |
| `Suspense` | 异步等待边界 |
| `Context` | 上下文 |
| `Ref` | 引用 |
| `DOM` | 文档对象模型 |
| `Portal` | 传送门 |
| `Fragment` | 片段 |
| `Lazy` | 懒加载 |
| `View Transition` | 视图过渡 |
<!-- TERMS-AUTO-END -->


## Fragment

Fragment 可以参与 React tree，但不一定引入额外 Host DOM wrapper。这是理解“React tree ≠ DOM tree”的典型例子。

React 19.3 将 Fragment Refs 稳定化，因此 Fragment 在现代 React 中不再只是“零 DOM wrapper 的语法糖”那么简单；具体 API 见官方 19.3 release notes。

## Portal

Portal 改变的是 Host DOM 插入位置，不改变 React ownership tree。因此 Context、React event propagation 等仍按 React tree 语义理解，而不是简单跟 DOM parent 一致。

## lazy

`lazy(() => import(...))` 把模块加载和 Suspense boundary 组合起来。加载未完成时，lazy component 的 render 会进入 suspension，而不是“返回 null 等待”。

## ViewTransition

React 19.3 稳定 `<ViewTransition>`，它与 Transition 更新以及浏览器 View Transition API 协作。它属于“React 提交变化 + 浏览器视觉过渡”的交叉层，不应该和 React Fiber 并发调度混为一谈。

## 自检

1. 为什么 Portal 的 DOM parent 和 React parent 可以不同？
2. lazy 为什么天然和 Suspense 配合？
3. ViewTransition 解决的是调度问题还是视觉过渡问题？


---

<!-- SOURCE: 35-ReactDOM属性系统与受控组件.md -->

# 35. React DOM 属性系统与受控组件

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Host Config` | 宿主配置/渲染器平台适配层 |
| `Update` | 更新对象 |
| `Diff` | 差异比较 |
| `DOM` | 文档对象模型 |
<!-- TERMS-AUTO-END -->


源码锚点：[`react-dom-bindings/src/client`](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom-bindings/src/client)

## 1. Renderer 不是把 props 原样 setAttribute

React DOM 必须区分：

```text
DOM property
HTML attribute
style object
事件 props
特殊布尔/枚举属性
dangerouslySetInnerHTML
受控 input/select/textarea
```

例如 `value` 对 input 不只是普通 attribute；它参与受控组件同步。

## 2. 受控组件的不变量

```text
React state 是 source of truth
→ render 产生 value/checked
→ commit 把值同步到 DOM
→ browser event 触发下一次 state update
```

如果事件 handler 没有及时更新 state，React 下一次提交仍会把 DOM 拉回受控值。

## 3. 为什么 controlled/uncontrolled 切换危险

组件生命周期中突然从 `value={undefined}` 变成明确 value，会改变“谁是 source of truth”。React 会警告这种设计，因为它容易产生 DOM 内部状态和 React 状态错位。

## 4. style

`style={{ width: 10 }}` 不是把对象 stringify 后塞给 attribute。React DOM 对 style diff 有专门处理，需要删除旧 style、写入新 style，并处理部分单位规则。

## 5. 自检

1. 为什么 `value` 不能按普通 attribute 理解？
2. 受控 input 的 source of truth 在哪里？
3. React DOM 为什么需要独立于 reconciler 的 Host Config/DOM binding 层？


---

<!-- SOURCE: 36-浏览器EventLoop与React调度边界.md -->

# 36. 浏览器 Event Loop 与 React 调度边界

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

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


---

<!-- SOURCE: 37-初次Mount完整调用链.md -->

# 37. 初次 Mount：从 createRoot 到第一个像素

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `createRoot` | 创建 React 根 |
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `beginWork` | 开始处理 Fiber |
| `completeWork` | 完成 Fiber 工作 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `DOM` | 文档对象模型 |
| `Layout` | 布局/回流 |
| `Paint` | 绘制 |
<!-- TERMS-AUTO-END -->


> 建议先完整阅读：[00C. 从编译入口到浏览器像素：React 完整渲染链路](00C-%E4%BB%8E%E7%BC%96%E8%AF%91%E5%85%A5%E5%8F%A3%E5%88%B0%E6%B5%8F%E8%A7%88%E5%99%A8%E5%83%8F%E7%B4%A0-%E5%AE%8C%E6%95%B4%E6%B8%B2%E6%9F%93%E9%93%BE%E8%B7%AF.md)。本章作为快速调用链复习。

## 主链

```text
createRoot(container)
→ createContainer / FiberRoot + HostRoot Fiber
→ root.render(<App />)
→ updateContainer
→ enqueue update on HostRoot
→ scheduleUpdateOnFiber
→ ensureRootIsScheduled
→ microtask / root scheduler
→ performWorkOnRoot
→ renderRoot*
→ workLoop*
→ beginWork HostRoot
→ updateFunctionComponent App
→ renderWithHooks
→ reconcileChildren
→ completeWork HostComponent
→ commitRoot
→ mutation/layout/passive phases
→ browser style/layout/paint/composite
```

源码锚点：

- [`ReactDOMRoot.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/client/ReactDOMRoot.js)
- [`ReactFiberReconciler.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberReconciler.js)
- [`ReactFiberWorkLoop.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [`ReactFiberBeginWork.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberBeginWork.js)
- [`ReactFiberCompleteWork.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberCompleteWork.js)

## 关键观察

初次 mount 时没有旧 child Fiber 可以复用，因此 reconciliation 主要构造新 Fiber；HostComponent 的 DOM instance 在 complete 阶段准备，最终在 commit 时连接到可见 DOM tree。

## 断点

```text
updateContainer
scheduleUpdateOnFiber
performWorkOnRoot
beginWork
renderWithHooks
reconcileChildFibers
completeWork
commitRoot
```

## 自检

1. 为什么 DOM instance 可以在 Render 的 complete 阶段创建，但不能在那时把它随便插进可见容器？
2. `root.render` 为什么不是“立即把 JSX 转成 DOM”？
3. 首次 mount 哪些阶段能被并发 render 放弃？


---

<!-- SOURCE: 38-更新与卸载完整调用链.md -->

# 38. Update 与 Unmount：身份、Effect 与删除副作用

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Commit Phase` | 提交阶段 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Key` | 列表身份键 |
| `Deletion` | 删除标记 |
| `Flags` | 副作用标记 |
| `subtreeFlags` | 子树副作用标记 |
| `Ref` | 引用 |
<!-- TERMS-AUTO-END -->


## Update 主链

```text
事件
→ dispatchSetState
→ update + lane
→ enqueueConcurrentHookUpdate
→ scheduleUpdateOnFiber
→ root scheduling
→ renderWithHooks(update dispatcher)
→ process UpdateQueue
→ reconciliation
→ flags/subtreeFlags
→ commit mutation
→ layout effects
→ passive cleanup/create
```

## 删除

当 child identity 不再存在：

```text
Reconciliation 标记 deletion
→ Commit 遍历删除子树
→ 处理 ref / layout cleanup / host removal
→ passive cleanup 在 passive phase 处理
```

不要把“unmount”理解成一个单独函数调用；它是一系列 commit-side cleanup/host mutation 的组合。

## key 改变

```jsx
<Form key={userId} />
```

当 key 改变，React 视为不同 identity：旧子树删除，新子树 mount，因此 Hook state 会重置。

## 自检

1. 为什么 key 能重置 state？
2. deletion 为什么需要 commit phase，而不是 render phase 直接 removeChild？
3. Effect cleanup 为什么与 DOM mutation 的先后顺序很重要？


---

<!-- SOURCE: 39-Suspense-Hydration完整调用链.md -->

# 39. Suspense / Hydration 完整调用链

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `hydrateRoot` | 水合根节点 |
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Suspense` | 异步等待边界 |
| `Thenable` | 类 Promise 对象 |
| `Ping` | 异步完成唤醒 |
| `Retry` | 重试渲染 |
| `Hydration` | 水合/复用服务端 DOM |
| `DOM` | 文档对象模型 |
<!-- TERMS-AUTO-END -->


## Suspense

React 19.3 不能只用“throw Promise”概括。教学主线：

```text
render reads resource
→ pending thenable
→ internal suspension signal
→ WorkLoop captures suspended thenable
→ nearest Suspense boundary marks fallback/retry state
→ commit fallback when appropriate
→ thenable resolves → ping root
→ retry lane scheduled
→ boundary renders primary content again
```

源码锚点：

- [`ReactFiberThenable.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberThenable.js)
- [`ReactFiberThrow.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberThrow.js)
- [`ReactFiberWorkLoop.js`](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js)

## Hydration

```text
server HTML already exists
→ hydrateRoot establishes hydration root
→ render attempts to claim/match existing host nodes
→ matching succeeds: attach React ownership/event semantics
→ mismatch: recover according to boundary/root strategy
```

Hydration 的目标不是“再 render 一遍同样 HTML”，而是把现有宿主 DOM 与客户端 Fiber tree 对齐并接管交互。

## Event replay / selective hydration

在尚未完全 hydration 的区域发生离散事件时，React DOM 可以利用事件优先级和 hydration 机制尝试让相关边界更快变得可交互，而不是要求整棵树一次性同步完成。

## 自检

1. Suspense 的 ping 触发了什么？
2. Hydration mismatch 为什么不能总是简单忽略？
3. Selective hydration 与普通 client render 的目标有什么不同？


---

<!-- SOURCE: 40-React15-StackReconciler深度解析.md -->

# 40. React 15 Stack Reconciler 深度解析

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `Lane` | 更新车道/优先级集合 |
| `Priority` | 优先级 |
| `Mount` | 挂载 |
| `Stack Reconciler` | 栈协调器 |
| `Call Stack` | 调用栈 |
<!-- TERMS-AUTO-END -->


> 这一章用于理解“为什么 Fiber 必须出现”。React 15 没有 Hooks；状态组件主要依赖 Class instance 和旧 reconciler。

## 1. 组件实例模型

```text
Class component
→ new Component(props)
→ instance.props / state
→ instance.render()
```

Function component 当时主要被视为无状态渲染函数，没有现代 Hooks 的 Fiber-linked state model。

## 2. Stack Reconciler 的核心限制

旧模型在大体上依赖同步递归调用：

```text
update A
  → update B
    → update D
  → update C
```

遍历进度隐含在 JavaScript call stack 中。要在任意组件之间暂停，然后以后恢复，就必须能显式保存“当前工作位置”和局部状态，而普通递归栈不适合作为 React 自己可控制的持久工作结构。

## 3. 生命周期与副作用

旧生命周期如 `componentWillMount`、`componentWillReceiveProps`、`componentWillUpdate` 容易让开发者把副作用放在“render 前”阶段。进入可重做 render 模型后，这种副作用就可能被执行多次，因此后来出现 `UNSAFE_` 标记和生命周期迁移。

## 4. 从 Stack 到 Fiber 的设计推导

如果我们提出需求：

```text
大更新可以分片
高优先级输入能先处理
未提交结果可以丢弃
已提交 UI 必须保持一致
```

就自然推导出：

```text
显式工作单元 Fiber
+ current/WIP 双树
+ priority/lane
+ render/commit 分离
```

## 5. 为什么 React 15 不可能“直接加 Hooks”就等于现代 React

Hooks 不只是 API。现代 Hook 系统与 `Fiber.memoizedState`、UpdateQueue、renderWithHooks、lane 调度、effect commit 紧密结合。React 15 缺少这套运行时基础。

## 自检

1. Stack Reconciler 最大限制是 Class 语法还是工作模型？
2. Fiber 为什么必须显式保存 parent/child/sibling？
3. 为什么旧 `componentWill*` 生命周期与可重做 render 冲突？


---

<!-- SOURCE: 41-源码编译运行与调试环境.md -->

# 41. React 源码编译、运行与调试环境

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Reconciler` | 协调器 |
| `Fiber` | 纤程/React 工作单元 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `pending` | 待处理更新 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Key` | 列表身份键 |
| `Flags` | 副作用标记 |
| `subtreeFlags` | 子树副作用标记 |
| `beginWork` | 开始处理 Fiber |
| `DOM` | 文档对象模型 |
<!-- TERMS-AUTO-END -->


## 目标

你必须能做到：

```text
git checkout v19.3.0
→ 安装依赖
→ 找到 packages/react-reconciler
→ 跑一个最小 DOM Demo
→ 在关键函数打断点
→ 观察 Fiber/Hook/Queue/Lane
```

## 1. 固定 tag

```bash
git clone https://github.com/facebook/react.git
cd react
git checkout v19.3.0
```

不要直接只看 `main`，因为主分支会持续变化，教材的函数路径和你本地代码容易错位。

## 2. 阅读优先于“把整个仓库 build 成生产包”

第一阶段可以借助 IDE 跳转、GitHub source 和针对性测试理解源码；第二阶段再搭本地构建/fixtures。React 仓库的构建工具会演进，因此具体命令以 tag 内 README / scripts 为准。

## 3. 断点策略

不要给 `beginWork` 无条件打断点后面对几千次命中。使用条件断点：

```text
workInProgress.type === App
workInProgress.key === 'target'
currentlyRenderingFiber.type === Demo
```

## 4. 必看变量

```text
currentlyRenderingFiber
workInProgressHook
currentHook
renderLanes
fiber.lanes / childLanes
hook.memoizedState / baseState / baseQueue
queue.pending
fiber.flags / subtreeFlags
root.pendingLanes
```

## 5. 每次调试只证明一个命题

例：证明“setState 不直接修改当前 render 的 state”：

```text
1. 点击前记录闭包 count
2. 断在 dispatchSetState
3. 看 update.action 被入队
4. 当前闭包 count 不变
5. 下一次 render 才得到新 memoizedState
```

## 自检

1. 为什么源码阅读必须固定 tag？
2. 为什么条件断点比函数入口全断更有效？
3. 如何设计一个实验验证 `baseQueue` 的 rebase？


---

<!-- SOURCE: 42-架构总复盘与核心不变量.md -->

# 42. React 架构总复盘：从需求推导内部结构

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Host Config` | 宿主配置/渲染器平台适配层 |
| `Passive Effect` | 被动副作用 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `Lane` | 更新车道/优先级集合 |
| `Key` | 列表身份键 |
| `Flags` | 副作用标记 |
| `Suspense` | 异步等待边界 |
<!-- TERMS-AUTO-END -->


真正精通 React 的标准不是记住 200 个函数名，而是能从约束推导结构。

## 不变量 1：未提交 Render 不能污染已提交 UI

因此需要：

```text
current / workInProgress
render / commit separation
```

## 不变量 2：Render 可能重做

因此：

```text
component render 必须纯
reducer 必须纯
外部副作用进入 commit/effect/event
```

## 不变量 3：更新有不同紧急度，但不能丢语义

因此：

```text
Lane
UpdateQueue
baseState/baseQueue rebase
```

## 不变量 4：组件状态属于 identity，而不是 JSX 文本位置

Identity 由树位置、type、key 等 reconciliation 规则共同决定。因此 key 改变可以重置子树 state。

## 不变量 5：Renderer 与 Reconciler 必须解耦

Reconciler 计算“宿主树需要什么变化”，Host Config/DOM binding 决定“如何作用到具体平台”。因此 React DOM 与自定义 Renderer 可以共享 reconciler 思想。

## 不变量 6：同步外部世界必须可建立/清理

因此 Effect 不是“生命周期回调集合”，而是“外部同步过程”的声明。

## 不变量 7：Server/Client 的树可以跨时间、跨环境协作

SSR/Hydration/RSC/Suspense 需要 React 不只处理一次性同步 DOM render，而是处理流式结果、边界、恢复和分阶段可交互。

## 精通检查

你应该能不看文档解释下面整条链：

```text
click
→ React event
→ setState dispatch
→ Update + Lane
→ queue
→ root scheduling
→ Render WIP
→ Hooks/Queue processing
→ Reconciliation
→ complete/flags
→ Commit
→ DOM mutation/ref/layout
→ browser render pipeline
→ passive effect
```

还应能解释任意一步为什么不能被前一步或后一步简单替代。


---

<!-- SOURCE: 43-从零到精通的因果知识图谱.md -->

# 43. 从零到精通的 React 因果知识图谱

这不是目录，而是“为什么下一章必须建立在上一层之上”的因果图。

```text
JavaScript 闭包 / 调用栈
        ↓
函数组件 Render Snapshot（渲染快照）
        ↓
为什么状态不能存在函数局部变量里
        ↓
Fiber + Hook 链表
        ↓
为什么 Hook 依赖固定顺序
        ↓
Update / UpdateQueue
        ↓
为什么 setter 不是直接赋值
        ↓
Lane（更新优先级集合）
        ↓
为什么 Queue 需要 baseState/baseQueue 做 Rebase（重基）
        ↓
Root Scheduler（根调度器）
        ↓
Render WorkLoop（渲染工作循环）
        ↓
beginWork / Reconciliation（协调）
        ↓
completeWork / flags（副作用标记）
        ↓
Commit（提交）
        ↓
Renderer / DOM mutation（DOM 变更）
        ↓
Browser Style/Layout/Paint/Composite
```

另一条并发主线：

```text
JS 主线程有限
↓
同步递归工作不可让位
↓
Stack Reconciler 的架构约束
↓
Fiber 将工作显式化
↓
可暂停 Render
↓
Lane 表达不同优先级工作
↓
Transition / Deferred / Suspense
↓
并发一致性、Tearing、External Store
```

另一条服务端主线：

```text
CSR 首屏成本
↓
SSR 输出 HTML
↓
Hydration 复用服务端 DOM
↓
Streaming + Suspense
↓
Selective Hydration（选择性水合）
↓
RSC / Flight（服务器组件协议）
```

学习时遇到不懂的概念，应沿箭头回退一层，而不是继续硬读源码。


---

<!-- SOURCE: 44-React源码阅读核心不变量与证明.md -->

# 44. React 源码阅读核心不变量与证明

源码版本会变化，但系统必须维持一些 Invariant（不变量）。掌握不变量，比背函数名更接近精通。

## 不变量 1：已提交 UI 必须保持一致

Render 可以中断、重做、丢弃；但 Commit 必须把一套完整结果提交给宿主环境。因此 React 用 current / workInProgress 双树，把候选工作和已提交 UI 隔离。

## 不变量 2：同一函数组件的一组 Hook 必须稳定对应

React 需要在新 Render 中找到“上一次的第 N 个 Hook”。因此 primitive Hooks 的调用拓扑必须稳定。条件 Hook 会破坏映射。

## 不变量 3：被低优先级跳过的 Update 不能丢

否则未来高低优先级重新合并时，最终状态会错误。`baseState/baseQueue` 正是为了保留可重放基线。

## 不变量 4：Reconciliation 必须维护 identity（身份）

State 与 Fiber 身份绑定。`type + key + position` 的匹配决定复用还是 remount（重新挂载）。这就是 key 会影响状态保留的根本原因。

## 不变量 5：Reconciler 不应该硬编码 DOM

否则 React 无法支持 Native 或自定义 Renderer。Host Config（宿主配置）把“计算 UI”与“如何创建/插入宿主节点”隔离。

## 不变量 6：读取外部可变数据必须保证并发一致性

Concurrent Render 期间外部 store 可能变化，React 需要 snapshot 检查与同步恢复机制，这解释了 `useSyncExternalStore` 存在的理由。

## 如何证明你理解

对每个不变量，至少能做到：

1. 给出一个违反它会出错的最小反例。
2. 指出 React 用什么数据结构维护它。
3. 找到 React 19.3 对应源码文件/函数。
4. 用断点观察一次真实执行。
5. 在 Mini React 中实现一个简化版本。


---

<!-- SOURCE: 45-为什么React这样设计-架构权衡.md -->

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


---

<!-- SOURCE: 46-源码点击学习项目使用指南.md -->

# 46. React 源码点击学习项目使用指南

项目目录：[`source-learning-app/`](source-learning-app/README.md)

## 1. 它解决什么问题

传统源码学习常见流程：

```text
教材看到函数名
↓
去 GitHub 搜索
↓
进入 5000 行文件
↓
不知道从哪里继续
```

这个项目把“概念 → 调用链 → 源码文件 → symbol（函数/常量）”做成可点击关系。

## 2. 启动

进入 `source-learning-app` 后双击：

```text
启动源码学习器.command
```

或者终端：

```bash
python3 -m http.server 4173
```

然后打开 `http://localhost:4173`。

## 3. 使用方式

1. 左侧选学习主题，例如“首次 Mount”。
2. 中间看因果解释和调用链。
3. 点击调用链中的函数名。
4. 右侧会读取固定 `v19.3.0` 官方 Raw Source。
5. 自动搜索 symbol 并高亮附近源码。
6. 点击“GitHub 打开”可进入官方固定 tag 页面。

## 4. 为什么不把整套 React 源码复制进资料包

- 固定 tag URL 本身已经保证版本稳定。
- 避免维护重复仓库和版权/体积问题。
- 学习器可以直接显示官方原始文件。
- 如果网络不可用，仍会给出完整文件路径、symbol 名和 GitHub URL，方便本地 clone 后对照。

## 5. 推荐顺序

先点击走通：

```text
createRoot
→ createContainer
→ createFiberRoot
→ root.render
→ updateContainer
→ scheduleUpdateOnFiber
→ ensureRootIsScheduled
→ performWorkOnRoot
→ beginWork
→ renderWithHooks
→ completeWork
→ commitRoot
```

再进入：

```text
useState
→ dispatchSetState
→ UpdateQueue
→ Lane
→ Rebase
```


---

<!-- SOURCE: 课程路线-12周.md -->

# React Mastery：12 周源码课程路线

## Week 0：先修知识诊断（基础不足者必修）

目标：消除“不是 React 本身造成的源码阅读障碍”。

阅读：`00P` 与 `prerequisites/01~10`。已经熟悉某项可以快速通过自检，不要求重复学习。

验收：能够解释闭包、调用栈、链表、DFS、bitmask、microtask、DOM/CSSOM、JSX transform、Flow 和 Source Map 分别如何出现在 React 源码学习中。

---

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。

| English | 中文 |
|---|---|
| `Renderer` | 渲染器 |
| `Fiber` | 纤程/React 工作单元 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Update` | 更新对象 |
| `baseQueue` | 基础更新队列 |
| `pending` | 待处理更新 |
| `stale closure` | 过期闭包/陈旧闭包 |
| `Closure` | 闭包 |
| `Lane` | 更新车道/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Priority` | 优先级 |
| `Diff` | 差异比较 |
<!-- TERMS-AUTO-END -->


> 默认每周 5 天、每天 1.5~2.5 小时。重点不是“12 周看完”，而是每周都留下可验证产物：图、源码笔记、实验记录、实现代码。

## Week 1：对象模型与历史约束

阅读：00、00A、00B、00C、16。

产物：

```text
一张 React 15 → Fiber → Hooks 的演进图
一张 JSX / Element / Component / Fiber / HostInstance 对照图
一张“源码 → JSX Transform → createRoot → Fiber → DOM → Browser Pixels”全链路图
```

验收：不再用“Virtual DOM 节点”笼统代替 Element/Fiber；能从 `createRoot(container).render(<App />)` 讲到浏览器 Paint/Composite。

## Week 2：Fiber 与 WorkLoop

阅读：01、02。

实验：手算 10 个 Fiber 的 begin/complete 顺序；调试 `performUnitOfWork`。

产物：实现 Mini React Phase 1~3。

## Week 3：Hooks Runtime

阅读：03、04。

实验：Lab 01、Lab 02。

产物：手画 Hook list、UpdateQueue、baseQueue；实现 Mini React Hook + Queue。

## Week 4：Identity / Diff / Commit

阅读：06、07、26。

实验：Lab 04、Lab 05。

产物：手算稳定 key / index key 两种 Diff；实现 Flags + Commit。

## Week 5：Effect 与外部世界

阅读：05、21、27。

实验：Effect 顺序、external store、batching。

产物：解释 stale closure、effect synchronization、tearing 三者不是同一个问题。

## Week 6：Lane / Root Scheduler / Concurrent

阅读：08、10、24。

实验：Lab 03。

产物：画出 Event Priority → Lane → Root schedule → Scheduler/Sync work 的分层图；Mini React 加简化 lane + rebase + yield。

## Week 7：DOM Renderer / Event / Browser

阅读：09、13、22。

实验：Portal event、Custom Renderer。

产物：实现 JSON Renderer；用 Performance 面板区分 React CPU 和 Layout/Paint。

## Week 8：Context / Memo / Performance

阅读：11、12、25。

实验：Lab 10 前半。

产物：对一个真实页面做 profiling 报告，必须包含“优化前证据、假设、修改、优化后证据”。

## Week 9：Suspense 与错误恢复

阅读：14、19。

实验：Lab 06。

产物：画 Suspense pending → fallback → ping → retry 状态机；比较 ErrorBoundary。

## Week 10：SSR / Hydration

阅读：15。

实验：Lab 07。

产物：一个 streaming SSR + hydration demo，故意制造 mismatch 并写根因分析。

## Week 11：RSC / Flight / Modern React

阅读：17、20、23。

实验：Compiler / RSC 框架项目的最小可观察 demo。

产物：画 Fizz vs Flight 数据流；解释 Server/Client Component 边界与序列化约束。

## Week 12：综合实现与论文式答辩

完成：Mini React 到 Phase 14，综合挑战题。

最终答辩材料：

```text
1. 30 分钟白板：一次 setState 到 pixel
2. 20 分钟白板：Suspense/Hydration
3. 20 分钟源码现场追踪
4. Mini React 架构说明
5. 一份真实性能优化实验报告
```

如果这五项不依赖背稿能完成，已经进入真正的源码级能力区间。


## 答案使用规则

每周自检先闭卷完成，再查看：

- `assessments/章节自检-参考答案.md`
- `labs/实验结果与验收标准.md`

第 12 周完成 50 道综合挑战题后，再查看 `assessments/综合挑战题-参考答案.md`，并按 0–4 分标准自评。


---

<!-- SOURCE: 专家架构审计报告.md -->

# React 源码级系统学习：专家架构审计报告

## 审计结论

一套能把“会用 React”的开发者培养到“源码级精通”的教材，不能只覆盖 API 与函数调用链。它必须同时建立四种能力：

1. **解释能力**：能用普通语言解释一个概念为什么存在。
2. **追踪能力**：能从公共 API 沿调用链追到 Reconciler / Renderer。
3. **状态推演能力**：能手算 Fiber、Hook、Queue、Lane 在一次更新中的变化。
4. **实现与诊断能力**：能实现 Mini React 的核心机制，并用断点定位真实 React 行为。

当前教材已经具备完整 React 主干，但对低起点学习者最大的风险是“概念跨层”：直接从 React Element 跳到 Fiber，从 Update 跳到位掩码，从 Scheduler 跳到 microtask。为此本轮增加 `00P` 和 `prerequisites/` 基础层，把这些隐含先修知识显式化。

## 教材最终应采用四层结构

### L0：平台与语言基础

JavaScript 闭包、调用栈、数据结构、位运算、Event Loop、DOM/CSSOM、编译打包、Flow、Debugging。

### L1：React 用户模型

Element、Component、State Snapshot、Effect、Identity、Context、Ref、受控组件。

### L2：React Runtime / Source

Fiber、Hook 链表、UpdateQueue、Lane、WorkLoop、Reconciliation、Commit、Renderer、Root Scheduler。

### L3：架构与高级系统

Concurrent Rendering、Suspense、Hydration、RSC/Flight、External Store、一致性、Compiler、Custom Renderer、Profiler。

学习者只有在 L0/L1 对应概念稳定后，才进入 L2 的对应源码；不能把“源码越早越好”误解成“基础没建立就进 5000 行文件”。

## 每章必须回答的 9 个问题

1. 这个概念的中文与英文是什么？
2. 它解决什么问题？
3. 不使用它会出什么具体问题？
4. 最小可运行示例是什么？
5. 核心数据结构是什么？
6. 一次真实执行中数据如何变化？
7. React 19.3 源码入口是什么？
8. 怎么用断点证明？
9. 它的 trade-off（权衡）和边界是什么？

## “精通”的验收标准

学习者最终应能完成：

- 从 `createRoot().render()` 不查资料画出首次 Mount 主链。
- 给出一个 Hook 顺序错位的内存模型解释。
- 手推 3 个不同 Lane 更新经过 `baseQueue` 后的最终状态。
- 解释 key 改变为什么会重置 state，并追到 Child Fiber 匹配源码。
- 说明 DOM 节点在 completeWork 创建、在 Commit 插入的区别。
- 解释 `useLayoutEffect` 与浏览器 Paint 的关系。
- 区分 Lane、Event Priority、Scheduler Priority。
- 解释 Suspense 的 throw/capture/ping/retry，而不只说“显示 fallback”。
- 解释 SSR、Hydration、RSC/Flight 不是同一个东西。
- 用 Profiler + 浏览器 Performance 面板找一次真实性能瓶颈。
- 自己实现一个包含 Fiber、Hook、UpdateQueue、Lane 简化模型的 Mini React。

达到这些能力，才可以说“源码级精通”，而不是记住函数名。


---

<!-- SOURCE: debugging/断点调试手册.md -->

# React v19.3.0 源码断点调试手册

> **术语约定**：正文保留 React 源码中的英文术语，并在首次出现时给出中文含义；完整中英对照见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。


> 调试目标不是“看调用栈跳来跳去”，而是**验证一个明确假设**。每次只追一条因果链，并记录对象状态变化。

## 1. 调试前的固定协议

每次源码实验先写：

```text
问题：我想证明什么？
预测：我认为会经过哪些 symbol？
观察对象：Fiber / Hook / Queue / Root / Host 中看哪些字段？
停止条件：看到什么就算本轮完成？
反例：改哪个变量能让路径变化？
```

推荐使用最小 Demo，而不是业务项目。

```jsx
function App() {
  const [count, setCount] = useState(0)

  useLayoutEffect(() => {
    console.log('layout', count)
  }, [count])

  useEffect(() => {
    console.log('passive', count)
    return () => console.log('cleanup', count)
  }, [count])

  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count}
    </button>
  )
}
```

## 2. 第一条链：Hooks mount/update

断点：

```text
renderWithHooks
renderWithHooksAgain
mountWorkInProgressHook
updateWorkInProgressHook
mountState
updateState
```

观察：

```text
currentlyRenderingFiber
currentHook
workInProgressHook
fiber.memoizedState
hook.memoizedState
hook.baseState
hook.baseQueue
hook.queue
```

验收：你能画出 current Hook list 与 WIP Hook list，并解释 update 时如何逐个对应。

## 3. 第二条链：dispatchSetState → Root

断点：

```text
dispatchSetState
requestUpdateLane
enqueueConcurrentHookUpdate
scheduleUpdateOnFiber
```

观察：

```text
update.action
update.lane
queue.pending
fiber.lanes
alternate.lanes
root.pendingLanes
```

不要只看“函数是否执行”，要回答：**这一层把更新事实写到了哪个持久对象上？**

## 4. 第三条链：React 19.3 Root Scheduler

这类内部调度细节最容易随 React 版本演进。重点断点：

```text
ensureRootIsScheduled
processRootScheduleInMicrotask
scheduleTaskForRootDuringMicrotask
performWorkOnRootViaSchedulerTask
performSyncWorkOnRoot
```

观察：

```text
firstScheduledRoot / lastScheduledRoot（以当前源码字段为准）
root.next
root.pendingLanes
nextLanes
root.callbackNode
root.callbackPriority
```

验证三个事实：

1. `ensureRootIsScheduled` 主要负责把 Root 放入调度集合并确保 microtask。
2. microtask 中才集中处理 Root schedule、选择 next lanes 并决定 sync/task 路径。
3. “React batching”“microtask”“Scheduler callback”不是同一个概念。

## 5. 第四条链：Render WorkLoop

断点：

```text
performWorkOnRoot
renderRootSync / renderRootConcurrent
workLoopSync / workLoopConcurrent
performUnitOfWork
beginWork
completeUnitOfWork
completeWork
```

观察：

```text
workInProgress
workInProgress.tag
workInProgress.type
child
sibling
return
flags
subtreeFlags
lanes
childLanes
```

做一棵 5 个节点的小树，在纸上预测 begin/complete 顺序，再用断点核对。

## 6. 第五条链：Function Component

断点：

```text
beginWork
updateFunctionComponent
renderWithHooks
reconcileChildren
```

把以下对象放在 Watch：

```text
current
workInProgress
nextProps
nextChildren
renderLanes
```

回答：Function Component 的用户函数在哪个阶段执行？它返回的 Element 与后续 child Fiber 之间隔了什么步骤？

## 7. 第六条链：Diff / Identity

Demo：

```text
旧：[A, B, C]
新：[B, A, D]
```

断点（具体 helper 名随实现可能调整）：

```text
reconcileChildrenArray
updateSlot
updateFromMap
placeChild
deleteChild
```

观察：

```text
oldFiber.key
oldFiber.index
newIdx
lastPlacedIndex
newFiber.alternate
newFiber.flags
```

必须区分：复用 Fiber、移动 Host、保留 state 不是三句同义话。

## 8. 第七条链：Commit

断点：

```text
commitRoot
commitMutationEffects
commitLayoutEffects
commitHookLayoutEffects
flushPassiveEffects
```

在 Elements 面板同时观察 DOM：

```text
Render 结束时 DOM 是否已经变化？
Mutation 前后 DOM 如何变化？
Layout Effect 执行时 DOM 是否已经是新版？
Passive Effect 在何时出现？
```

## 9. 第八条链：Effect cleanup/create

构造 dependency 改变和 unmount 两种场景，分别观察：

```text
layout destroy/create
passive destroy/create
```

不要只背顺序。记录 parent/child、mount/update/unmount 三种情况下的实际行为，并注明 React 版本。

## 10. 第九条链：Suspense / use()

React 19.3 调试重点：

```text
ReactFiberThenable.js 中 thenable tracking 路径
getSuspendedThenable
throwException
attachPingListener
pingSuspendedRoot
```

观察：

```text
thenable.status
suspendedThenable
root.suspendedLanes
root.pingedLanes
boundary.memoizedState
```

关键纠偏：现代 `use()` pending path 中，不要预设“用户 thenable 直接一路作为 thrown value 穿过所有层”。内部存在 opaque Suspense control-flow signal。

## 11. 第十条链：Hydration

重点文件：

```text
ReactFiberHydrationContext.js
ReactFiberBeginWork.js
ReactFiberWorkLoop.js
ReactFiberConfigDOM.js
```

断点方向：

```text
tryToClaimNextHydratableInstance
throwOnHydrationMismatch
popHydrationState
replayBeginWork（涉及 replay 场景时）
```

分别制造：文本 mismatch、节点类型 mismatch、Suspense 内延迟 hydration。记录 hydration cursor 和 current Host instance。

## 12. 第十一条链：Event → Update Priority

重点：

```text
DOMPluginEventSystem.js
ReactDOMEventListener.js
```

观察：

```text
native event
DOM target
closest Fiber targetInst
React listener collection
event priority
最终 requestUpdateLane 的结果
```

Portal 是很好的反例实验：DOM 祖先关系与 React Fiber 祖先关系不完全一致。

## 13. 性能调试协议

页面“卡”时先分层：

```text
React Render CPU ?
Commit CPU ?
Browser Style/Layout/Paint ?
Long Task / JS third-party ?
Network / server ?
Memory / GC ?
```

再选择工具：

```text
React Profiler → React component work
Browser Performance → main thread + rendering pipeline
Network → I/O
Memory → allocation / GC
```

不要一看到 render 次数多就上 memo。

## 14. 调试笔记模板

```markdown
### 问题
为什么这次点击触发了两次组件函数执行？

### 版本
React v19.3.0 / DEV / StrictMode on

### 预测
可能与 StrictMode render replay 有关。

### 断点
renderWithHooks
renderWithHooksAgain

### 观察
- 第一次：...
- 第二次：...

### 结论
...

### 反例
关闭 StrictMode 后重复实验：...
```

## 15. 最重要的纪律

```text
一次实验只证明一个命题。
一次断点不要同时追 30 个函数。
没有记录字段变化，不算完成源码调试。
不能设计反例，说明你只是看到了现象，还没掌握因果。
```


---

<!-- SOURCE: mini-react/README.md -->

# Mini React：用实现验证 React 架构理解

> **术语约定**：正文保留 React 源码中的英文术语，并在首次出现时给出中文含义；完整中英对照见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。


> 目标不是造一个可用于生产的 React，而是用最少代码复现最重要的**不变量**。每个 Phase 都有测试，测试通过后才能进入下一阶段。

## 总原则

你的 Mini React 不需要复制 React 19.3 的所有优化，但必须保持模型正确：

```text
描述与 Host 分离
Render 与 Commit 分离
current 与 WIP 分离
Hook 状态跨函数调用持久化
Update 可以排队
低优先级 Update 可被跳过且以后重放
Render 可以被切片
Commit 产生可观察变化
identity 决定 state preservation
```

## Phase 0：测试基座

先准备：

```text
createRoot
render helper
fake host tree 或 jsdom
assert tree
assert render count
assert effect log
```

任何后续功能都必须有回归测试。

## Phase 1：JSX / React Element

实现：

```js
createElement(type, config, ...children)
```

Element 至少区分：

```text
type
key
props
```

测试：key 不进入普通 props；文本 child 能标准化。

**不变量：Element 是描述，不是 Host Node。**

## Phase 2：Fiber Tree 与显式 DFS

Fiber 至少：

```js
{
  tag,
  type,
  key,
  stateNode,
  return,
  child,
  sibling,
  alternate,
  pendingProps,
  memoizedProps,
  memoizedState,
  flags,
}
```

实现：

```text
performUnitOfWork
beginWork
completeUnitOfWork
completeWork
```

测试：给固定树打印 begin/complete 顺序，必须与手算 DFS 一致。

**不变量：遍历进度保存在显式结构中，而不是只能依赖递归 call stack。**

## Phase 3：Current / WIP 双缓冲

实现：

```text
root.current
createWorkInProgress
alternate
```

Render 时不能修改 current 的已提交 Host 结果。

测试：故意让 Render 中途抛错，current host tree 仍保持上一次提交结果。

## Phase 4：Reconciliation + Flags

先支持单节点，再支持数组。

Flags：

```text
Placement
Update
Deletion
```

Render 只记录 flags，Commit 才操作 Host。

测试：

```text
旧 A → 新 A（复用）
A → B（替换）
[A,B,C] → [B,A,D]（稳定 key）
```

## Phase 5：Commit

实现最少 Host API：

```text
createInstance
appendChild
insertBefore
removeChild
commitUpdate
```

测试：Render 完成但 Commit 未执行前，用户可观察 host tree 不应变化。

## Phase 6：Hooks Dispatcher + Hook List

实现：

```text
currentlyRenderingFiber
workInProgressHook
currentHook
mount dispatcher
update dispatcher
```

先实现 `useState` 的 Hook node：

```js
{
  memoizedState,
  baseState,
  baseQueue,
  queue,
  next,
}
```

测试：

```jsx
const [a, setA] = useState('A')
const [b, setB] = useState('B')
```

反复 render 后不能串状态。

## Phase 7：UpdateQueue

先实现 pending 环形链表：

```text
U3(pending)
 ↓next
U1 → U2 → U3
```

支持 value update 与 function update。

测试：

```js
setCount(c => c + 1)
setCount(c => c + 1)
setCount(c => c + 1)
```

最终必须是 +3。

## Phase 8：Lane 简化模型 + Rebase

用 bitmask：

```js
const SyncLane = 0b01
const TransitionLane = 0b10
```

Update 携带 lane；本轮只消费 renderLanes 中的 Update。

实现：

```text
baseState
baseQueue
clone skipped update
replay
```

测试必须覆盖：低优先级 U1 被跳过、高优先级 U2 执行、后续 Transition render 重放后语义仍正确。

**这是 Mini React 从“玩具 Hook”进入真正 React 模型的分水岭。**

## Phase 9：Scheduler / Yield

不复制 React Scheduler，只实现 cooperative scheduling：

```text
MessageChannel
performance.now()
shouldYield
```

让 `workLoopConcurrent` 在 deadline 前处理部分 Fiber，之后保存 `workInProgress`。

测试：大树 Render 中插入高优先级输入任务，证明系统能让出主线程并继续。

## Phase 10：Effects

明确两层：

```text
Hook list：保持 Hook identity
Effect structure：Commit 阶段执行 create/destroy
```

支持：

```text
deps Object.is compare
layout effect
passive effect
cleanup
```

测试 mount/update/unmount。

## Phase 11：Context + Bailout

实现简单 Provider stack、context dependency；实现 props/state/lanes 下的 bailout。

关键测试：父组件 render 不意味着所有 child 都必须执行；但 childLanes 有工作时不能错误跳过子树。

## Phase 12：Suspense 简化模型

允许 read resource 返回：

```text
fulfilled → value
pending → internal suspension signal + tracked thenable
rejected → error
```

边界捕获 suspension，渲染 fallback；thenable settle 后 ping root。

不要只实现 `catch (promise)`，而是模仿“资源状态 + 控制流 + retry lane”的分层思想。

## Phase 13：Custom Renderer 分离

把 DOM/JSON host 操作抽出成 Host Config，Reconciler 不允许直接调用 DOM API。

测试同一 Reconciler 可以接：

```text
DOM host
JSON host
```

## Phase 14：Profiler instrumentation

在 begin/complete/commit 关键位置打时间戳，输出：

```text
component render duration
root render duration
commit duration
```

用一个真实性能实验证明：减少 React render 与减少 browser layout 是不同优化。

## 最终架构图

```text
User API
  ↓
Element
  ↓
Fiber Reconciler
  ├─ Hooks / UpdateQueue
  ├─ Lanes
  ├─ WorkLoop
  ├─ Reconciliation
  └─ Flags
       ↓
Commit
       ↓
Host Config
       ↓
DOM / JSON / Other Host
```

## 最终验收

你的 Mini React 至少要用测试证明：

1. Hook identity 由固定调用序列维护。
2. state 是 render snapshot，dispatch 是 enqueue + schedule。
3. 不同 lane 更新可以被跳过并正确 rebase。
4. current 不被未 Commit 的 WIP 污染。
5. key/type 决定 Fiber identity 与 state preservation。
6. Render 可 yield，Commit 才产生 Host 可观察变化。
7. Effect cleanup/create 有明确 phase。
8. Renderer 与 Reconciler 可以替换 Host 而分离。

当你能独立实现并解释这些测试失败时，源码理解已经远高于“读过 React 源码”。


---

<!-- SOURCE: labs/README.md -->

# Labs：用实验替代“我感觉我懂了”

> **术语约定**：正文保留 React 源码中的英文术语，并在首次出现时给出中文含义；完整中英对照见 [`appendix/专业术语中英对照表.md`](appendix/%E4%B8%93%E4%B8%9A%E6%9C%AF%E8%AF%AD%E4%B8%AD%E8%8B%B1%E5%AF%B9%E7%85%A7%E8%A1%A8.md)。


每个实验都遵循同一个协议：**先预测 → 再断点 → 记录状态 → 解释不变量 → 改变一个变量重做**。

推荐顺序：01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10。

完成实验时，不要只保存 console 输出。至少记录 Fiber/Hook/Queue/Root 中两个以上关键字段的变化。


## 参考结果

完成实验后再对照：[《实验结果与验收标准》](labs/%E5%AE%9E%E9%AA%8C%E7%BB%93%E6%9E%9C%E4%B8%8E%E9%AA%8C%E6%94%B6%E6%A0%87%E5%87%86.md)。


---

<!-- SOURCE: labs/实验结果与验收标准.md -->

# React Mastery Labs：参考结果与验收标准

> 实验不是“跑出同样日志就算完成”。每个 Lab 至少要提交：**预测 → 实测 → 源码断点 → 状态图 → 解释差异**。

## Lab 01：Hook 顺序与 renderWithHooks

**预期：** mount 使用 mount dispatcher 创建 Hook 链；update 按顺序从 current Hook 链克隆/复用。条件跳过普通 Hook 会导致后续 Hook identity 错位并触发 DEV 错误/异常行为。render-phase update 会让组件在同一 render 工作中通过 rerender 路径再次执行，且有 rerender 上限。

**验收：** 能画出 `Fiber.memoizedState → Hook1 → Hook2...`，并指出 `currentHook/workInProgressHook` 的推进位置。

## Lab 02：UpdateQueue / baseQueue / rebase

**预期：** 在 Transition update 后插入 urgent update时，高优先级 render 可能跳过 transition；`memoizedState` 得到本轮结果，而 `baseState/baseQueue` 保留可重放基线。后续 transition render 重放队列后最终顺序仍与 update 语义一致。

**验收：** 至少记录每个 update 的 lane/action，以及 skip 前后 `baseState/baseQueue/memoizedState`。

## Lab 03：Root Scheduler / microtask

**预期：** setter 首先把 root 加入 schedule；`ensureRootIsScheduled` 主要保证 root schedule + pending microtask。当前 JS/event stack 完成后，microtask 中 `scheduleTaskForRootDuringMicrotask` 统一选 next lanes，并决定 sync work 或 Scheduler callback。

**验收：** 不能再画“setState → 立即 scheduleCallback”的单线图；必须画出 Root microtask 层。

## Lab 04：Key / Diff / state identity

**预期：** 稳定 key 的同一 child 即使 index 改变，state 仍跟 key 对应 Fiber 走；index key 在头部插入时会让 state 更容易跟“位置”而不是业务实体关联。`lastPlacedIndex` 用旧 index 单调性决定移动。

**验收：** 能分别解释“state 错位”“DOM 移动”“额外 render”三件不同事情。

## Lab 05：Effect / Commit 顺序

**预期：** Render 中只登记 effect；Commit mutation 修改 DOM；layout cleanup/setup 属于同步 Commit window；passive effects 被延后 flush。不要把“useEffect 永远 paint 后”写成硬协议。

**验收：** 日志至少区分 render、ref、layout cleanup/setup、passive cleanup/setup，并能解释 StrictMode DEV 下额外调用。

## Lab 06：Suspense / Ping / Retry

**预期：** `use(thenable)` pending 时真实 thenable 被暂存并抛 opaque `SuspenseException`；boundary 捕获后决定 fallback/保留 UI。thenable settle 触发 ping，随后重新调度 retry render；只有成功 Render 后才 Commit。

**验收：** 能画 `suspend → capture → commit fallback/keep current → resolve → ping → retry → commit`。

## Lab 07：Hydration / Event Replay

**预期：** hydration 使用 cursor 认领已有 DOM；结构不符进入 mismatch/recovery。未 hydrated boundary 上的可重放事件可能被识别为 blocked，触发更高优先级 hydration，之后再 replay。

**验收：** 能区分“服务器 HTML 已可见”“Fiber 已 hydrate”“事件已可安全处理”三个状态。

## Lab 08：External Store / Tearing

**预期：** naive effect subscription 可能存在 render→subscribe 的一致性窗口；`useSyncExternalStore` 通过 snapshot + subscribe + consistency check 保证 concurrent read 一致性。`getSnapshot` 若每次返回新对象会造成持续变化判断。

**验收：** 能定义 tearing，并解释为什么内部 `useState` 与任意 mutable external store 的一致性条件不同。

## Lab 09：Custom Renderer

**预期：** React Element/Fiber/Hooks/Diff/调度可以复用，但 Host Config 决定 instance 的创建、children 插入、属性更新、删除等。自定义 host node 不需要是 DOM。

**验收：** 实现最小 host config 后，至少能输出一棵内存 scene tree，并说明 Render 中“创建 detached instance”与 Commit 中“挂载到 container”的区别。

## Lab 10：Compiler / Profiling

**预期：** Compiler 对满足 Rules/purity 的 render 建立缓存/复用，不等于机械插入 `React.memo`。开启 Compiler 后可能减少人工 memo，但 Browser Layout/Paint/网络瓶颈不因此消失。

**验收：** 必须有编译前后代码/Profiler 对比；若性能无变化，也要解释瓶颈为何不在 React render。


---

<!-- SOURCE: assessments/精通度量表.md -->

# React 源码精通度量表

> 这不是分数游戏，而是防止“读了很多，但没有形成能力”的验收标准。

## 五种能力

| 能力 | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Explain | 会说 API | 会解释机制 | 能解释设计原因 | 能解释权衡/替代方案 | 能从约束推演设计 |
| Trace | 只到 Hook | 能到 Fiber | 能到 Root/Commit | 能覆盖并发/异常分支 | 能追陌生路径 |
| Debug | 看 console | 会用 DevTools | 会下源码断点 | 能定位错误状态字段 | 能验证源码假设 |
| Implement | 会写组件 | 能写简化 Hook | 能写 Fiber/Queue | 能写 Diff/Commit/Scheduler | 能设计自己的 Renderer/扩展 |
| Compare | 会背区别 | 能列差异 | 能说边界 | 能做成本模型 | 能迁移到陌生架构 |

## 核心模块毕业要求

### Fiber / WorkLoop

必须能在白板上从 `child/sibling/return` 推导 DFS，解释 `alternate`、current/WIP、flags、lanes，并手算一棵 6~10 个节点的 begin/complete 顺序。

### Hooks / Queue

必须能手画 3 个 Hook 的链表，追一次 mount 和 update；给定 3 个不同 lane 的 Update，能解释本轮哪些被处理、哪些进入 baseQueue，以及为何需要 rebase。

### Reconciliation

给定旧 `[A,B,C,D]` 和新 `[B,E,A,D]`（稳定 key），必须能说明哪些 Fiber 复用、哪些新建/删除、哪些 Placement/移动，并说明 state identity。

### Commit / Effect

必须能区分 mutation/layout/passive；给定 parent/child layout/passive effect，能够通过实验而非背诵确认顺序，并解释 DOM 可观察时点。

### Scheduler / Lane

必须能解释：Event Priority、Lane、Root pending lanes、Scheduler priority 是不同层；能解释 Root microtask 在当前版本中的作用；能解释 transition 被打断后为什么仍能恢复语义。

### Suspense / Hydration

必须能解释 thenable tracking、ping/retry、boundary fallback、hydration mismatch/selective hydration/event replay，并明确 SSR ≠ RSC。

### Performance

给一个“页面卡”问题，先分类 CPU React render / Commit / Browser Layout-Paint / Network-Server，再选择相应工具，而不是先加 memo。

## 失败信号

出现以下任意一种，说明还没掌握：

- 用“Virtual DOM 比真实 DOM 快”解释 React 性能。
- 把 Lane 直接叫“线程优先级”。
- 把 `useEffect` 等同于 `componentDidMount`。
- 把 key 只解释成“避免 warning / 提升性能”。
- 把 Suspense 只解释成“throw Promise”。
- 把 hydration 解释成“给 HTML 绑定事件”。
- 把 RSC 当 SSR 的新名字。
- 把 Compiler 当“自动 useMemo”。
- 遇到卡顿不测量就上 `React.memo`。

## 最终验收

L4 是“源码级熟练”；L5 才接近“架构级精通”。不要求对 React 每个 feature 都 L5，但 Fiber/Hook/Queue/Render-Commit/Scheduler 至少应达到 L4。


---

<!-- SOURCE: assessments/综合挑战题.md -->

# React Mastery 综合挑战题

> 不看答案，优先画图和写状态变化。每题都应该能说明“为什么”。

> 完成后再对照：[《综合挑战题：参考答案》](assessments/%E7%BB%BC%E5%90%88%E6%8C%91%E6%88%98%E9%A2%98-%E5%8F%82%E8%80%83%E7%AD%94%E6%A1%88.md)。

## A. 身份与数据模型

1. JSX、React Element、Fiber、Host Instance 各自何时创建、谁会跨 render 持久存在？
2. Function Component 没有实例，state 为什么还能跨调用存在？
3. `key` 相同但 `type` 不同，state 应否保留？为什么？
4. 同一个 JSX 在树中换了位置，什么时候仍可能保留 state，什么时候不会？
5. `alternate` 是“双缓存”的全部吗？Root/current/WIP 如何共同定义“已提交”和“候选”状态？

## B. Hooks / Queue

6. 为什么 Hook identity 不能简单改成“按变量名”？
7. `queue.pending` 为什么常设计成环形链表？如果改成普通头指针，有什么复杂度/操作差异？
8. `baseState` 与 `memoizedState` 分别代表什么语义？
9. 一个低优先级 Update 被跳过后，高优先级 Update 为什么有时也需要进入重放基线？
10. eager state 优化需要满足什么安全前提？它为什么不是简单“提前算 state”？
11. render-phase update 为什么需要重新 render？它如何防止无限重渲染？
12. stale closure 是 JavaScript 闭包问题、React 问题，还是两者交互？给出精确定义。

## C. Render / Diff / Commit

13. 为什么 `beginWork` 是“向下”，`completeWork` 是“回溯”？
14. 如果 Render 阶段直接 append DOM，会破坏哪几个并发不变量？
15. `subtreeFlags` 的存在避免了什么工作？
16. 数组 Diff 中 `lastPlacedIndex` 表达的是什么约束？
17. 为什么“最小 DOM 操作”不是 React reconciliation 的数学最优目标？
18. 一个 Fiber 被 bailout 时，为什么还要考虑 `childLanes`？
19. Mutation / Layout / Passive 三类副作用的可观察性差异是什么？
20. ref attach/detach 为什么属于 Commit，而不是 Render？

## D. Scheduling / Concurrent

21. 一次 click 产生 Update 后，Event Priority、Lane、Root schedule、Scheduler task 各自解决什么问题？
22. React 19.3 的 Root microtask 为什么值得单独作为一个层次理解？
23. `startTransition` 不等于 `setTimeout`，从语义和实现两方面解释。
24. “Concurrent Rendering = 多线程渲染”错在哪里？
25. Render 被打断并从头重做时，如何保证已提交 UI 不被半成品污染？
26. 为什么低优先级任务可以饿死？系统如何通过 expiration/选择策略处理类似问题？

## E. Effects / External World

27. `useLayoutEffect` 为什么可能造成掉帧？
28. `useEffect` deps 比较为何不能理解为“监听变量变化”？
29. `useEffectEvent` 试图解决哪类“响应式依赖 vs 最新值”冲突？
30. 为什么外部 store 读取必须有 snapshot 协议？什么是 tearing？
31. `flushSync` 是“关闭 batching”吗？给出更准确的描述。

## F. Suspense / Server

32. React 19.3 的 `use()` pending path 为什么使用内部 opaque exception，而不是让业务捕获实际 thenable？
33. ping 与 retry 分别改变什么状态？
34. Suspense fallback 是 Commit 前决定还是浏览器 Paint 后补救？
35. SSR、Streaming SSR、Hydration、Selective Hydration 分别解决什么瓶颈？
36. hydration mismatch 为什么不是普通 Diff？
37. RSC 为什么能减少发送到客户端的组件代码？它传输的核心不是 HTML，而是什么类型的数据？
38. Client Component 为什么仍可能参与服务端首屏输出？
39. Server Action 与普通 HTTP endpoint 的边界应该怎样理解？

## G. Renderer / Compiler / Performance

40. 如果把 React DOM 换成 Canvas Renderer，哪些层复用、哪些层必须替换？
41. Host Config 是什么架构模式？为什么 `react-reconciler` API 不稳定很重要？
42. React Compiler 为什么需要控制流/数据流/mutation 分析？
43. Compiler 可以让你完全不懂 memoization 吗？为什么？
44. `React.memo` 自己也有成本，建立一个何时值得的成本模型。
45. Profiler 显示 React render 很快，但用户仍觉得交互卡，下一步看哪里？
46. 浏览器 Layout thrashing 与 React 重渲染有什么联系和区别？
47. `transform` 常比改变 `left` 更适合动画，但什么时候仍可能发生 paint/composite 成本？

## H. 架构推演

48. 如果让你设计一个没有 Hooks 调用顺序限制的新 state API，你需要额外保存什么 identity 信息？代价是什么？
49. 如果 Commit 也要可中断，你必须重新定义哪些用户可观察一致性保证？
50. 如果 Scheduler 完全交给浏览器未来的新原语，React 哪些层仍然必须保留？


---

<!-- SOURCE: assessments/综合挑战题-参考答案.md -->

# React Mastery 综合挑战题：参考答案（React v19.3.0）

> 使用方式：先独立作答，再对照本答案。这里给的不是“背诵句子”，而是**可验证的推导框架**。真正掌握的标准，是你能从约束推导出答案，并能在源码/断点中验证。
>
> 版本基线：React `v19.3.0`。内部文件名和函数名可能随版本变化，稳定知识应优先理解**数据结构、不变量和状态转移**。

## A. 身份与数据模型

### 1. JSX、React Element、Fiber、Host Instance 各自何时创建、谁会跨 render 持久存在？

**结论：** JSX 是源码语法；JSX 被编译为运行时代码，执行时产生 React Element；Reconciler 根据 Element 创建/复用 Fiber；Renderer 在 Host Fiber 完成时创建或复用 Host Instance（DOM renderer 中就是 DOM Node）。

- **JSX**：编译前的语法表示，本身不在运行时“保存状态”。
- **React Element**：某次表达式求值产生的不可变 UI 描述；同一 JSX 每次 render 通常都会产生新的 Element 对象。
- **Fiber**：React 内部的持久工作/身份节点。已提交的 `current` Fiber 与候选 `workInProgress` 通过 `alternate` 关联，可跨多次 render 复用其身份、state、queue 等。
- **Host Instance**：真实宿主对象。DOM renderer 中通常是 `HTMLElement/Text`；只要对应 Host Fiber 身份和类型被复用，DOM Node 可以跨 render 持久存在。

因此，“Element 每次都是新对象”与“state/DOM 可以保留”并不矛盾：**Element 是描述，Fiber/Host Instance 才承载持久身份**。

**源码锚点：** `ReactJSXElement.js`、`ReactFiber.js`、`ReactChildFiber.js`、`ReactFiberCompleteWork.js`、`ReactFiberConfigDOM.js`。

### 2. Function Component 没有实例，state 为什么还能跨调用存在？

函数组件每次 render 都只是普通函数调用，局部变量会重新创建。持久 state 不存函数对象，而存于对应 Fiber 的 Hook 链表中：

```text
FunctionComponent Fiber
  memoizedState
      ↓
   Hook1 → Hook2 → Hook3 ...
```

`useState` 的 Hook 保存 `memoizedState/baseState/queue`；下一次 `renderWithHooks` 会沿 current Fiber 的 Hook 链按调用顺序恢复/克隆 Hook。因此**跨 render 持久的是 Fiber/Hook 数据，不是函数局部变量**。

### 3. `key` 相同但 `type` 不同，state 应否保留？为什么？

**不应保留。** React 的身份不是只由 `key` 决定，而是至少由“同一父级下的 key/位置 + element type”共同约束。`key` 相同但 `type` 改变，表示旧组件语义已经不同，旧 Fiber 不能安全复用为新类型，通常会删除旧 Fiber、mount 新 Fiber，因此 Hook/Class state 重置。

`key` 的作用是帮助同一父级的 children 在重排时识别“哪个旧孩子对应哪个新孩子”，不是让任意类型共享 state。

### 4. 同一个 JSX 在树中换了位置，什么时候仍可能保留 state，什么时候不会？

关键不是源码文本是不是“同一段 JSX”，而是**在同一个父级 reconciliation 范围内，新 child 能否匹配到旧 Fiber identity**。

- 同一父级列表中，带稳定 `key` 的 child 即使 index 改变，也可能被识别为同一 Fiber，state 保留，只标记 Placement/移动。
- 没有 key 时，位置变化常按 index/顺序匹配，容易导致身份错配或 state 跟着位置走。
- 从父节点 A 移到另一个父节点 B，一般不能跨父级直接复用旧 Fiber；旧位置 unmount，新位置 mount，state 通常重置。

所以“位置”应理解为**父级 children 身份空间中的结构位置**，不是屏幕坐标。

### 5. `alternate` 是“双缓存”的全部吗？Root/current/WIP 如何共同定义“已提交”和“候选”状态？

不是。`alternate` 只是两份对应 Fiber 之间的连接。

真正的语义来自：

```text
root.current → 当前已提交 Fiber Tree
current.alternate ↔ workInProgress candidate
```

Render 阶段在 WIP 树上计算，不修改“用户认为已提交”的 current 语义；Render 成功并进入 Commit 后，Root 才把完成树提升为新的 current。下一次更新又可以复用另一份 Fiber 作为 WIP。

因此“双缓冲”不是“永远同时存在两棵完整独立树”这么机械；它是**current 指针 + alternate 复用机制 + Commit 切换语义**共同形成的已提交/候选隔离。

---

## B. Hooks / Queue

### 6. 为什么 Hook identity 不能简单改成“按变量名”？

变量名不是可靠运行时身份：

1. 编译/minify 后名称会变化；
2. 解构 `const [x] = useState()` 中 `x` 是用户变量，不属于 Hook 数据结构；
3. 一个 Custom Hook 内可以调用多个同类 Hook；调用者根本看不到内部变量名；
4. 同一 Hook 返回值可以不赋值、改名、传递；
5. 动态调用需要定义作用域、生命周期和冲突规则。

React 选择“调用顺序 + Fiber identity”是低额外元数据、易于静态约束的一种设计。如果改成显式 key/symbol，也能设计，但会引入 key 管理、查找、冲突、垃圾回收和重构语义成本。

### 7. `queue.pending` 为什么常设计成环形链表？如果改成普通头指针，有什么复杂度/操作差异？

典型环形队列只需保存尾指针：

```text
pending = tail
pending.next = head
```

优点：

- O(1) 追加新 Update；
- O(1) 找到 head（`pending.next`）；
- 两个环形队列可较方便地拼接；
- 不需要额外维护 head + tail 两个字段。

如果只保存普通头指针，尾部追加要么 O(n) 遍历，要么再维护 tail。React 的 UpdateQueue 还经常需要把 pending 队列与 baseQueue 合并，环形表示很适合这种“批量 splice”。

### 8. `baseState` 与 `memoizedState` 分别代表什么语义？

- `memoizedState`：**当前这次 render 计算得到、组件实际看到的 state**。
- `baseState`：**为未来 rebase 保留的计算基线**，对应 baseQueue 重放前的 state。

当所有 update 都按当前 lanes 被处理时，两者可能相同；一旦某些低优先级 update 被跳过，当前 render 可以得到一个暂时的 `memoizedState`，同时必须保存一个较早的 `baseState + baseQueue`，以后以正确顺序重放被跳过的 update。

### 9. 一个低优先级 Update 被跳过后，高优先级 Update 为什么有时也需要进入重放基线？

因为 Update 顺序具有语义。

假设：

```text
U1: transition  x => x + 10   （低优先级）
U2: sync        x => x * 2    （高优先级）
```

高优先级 render 先跳过 U1、执行 U2。为了将来处理 U1 时仍能得到“按原始队列顺序最终应该得到的结果”，React 不能只留下 U1；在发生第一次 skip 后，后续已经执行过的 update 通常也需要以克隆形式进入 baseQueue（其 lane 可被处理成无需再次跳过的语义），这样未来从 `baseState` 重放时仍能恢复原顺序。

这是 `baseQueue` 看起来复杂的根本原因：**并发优先级不能破坏逻辑 update 顺序。**

### 10. eager state 优化需要满足什么安全前提？它为什么不是简单“提前算 state”？

Eager state 的目标是在“很可能无需 render”的情况下提前用 `lastRenderedReducer + lastRenderedState` 计算下一状态；若 `Object.is` 相等，可以走 eager bailout。

安全前提大意包括：当前 Fiber/alternate 没有待处理 lane、队列的 reducer/state 与上次 render 仍可作为可信基线等。即便 eager 结果相同，Update 仍可能需要被队列结构记录，以便之后若出现 rebase 场景保持队列语义。

所以它不是把 React 变成“setter 立即修改 state”，而是**在能够证明结果不变时跳过不必要的调度/render，同时保留队列一致性**。

**源码锚点：** `ReactFiberHooks.js` 的 `dispatchSetState/dispatchSetStateInternal`、`lastRenderedReducer`、`lastRenderedState`。

### 11. render-phase update 为什么需要重新 render？它如何防止无限重渲染？

如果组件执行过程中调用了本组件的 state setter，当前函数已经使用了旧 snapshot，React 不能在调用栈中途“修改局部变量”。因此它记录 render-phase update，在本轮函数返回后通过 `renderWithHooksAgain` 再执行组件，让新的 Hook state 形成新的 snapshot。

为避免：

```text
render → setState → render → setState → ...
```

React 维护 rerender 次数上限（源码中有 `RE_RENDER_LIMIT`），超过阈值抛出“Too many re-renders”。

### 12. stale closure 是 JavaScript 闭包问题、React 问题，还是两者交互？给出精确定义。

它是**JavaScript lexical closure + React render snapshot 模型的交互结果**。

每次 Function Component render 都创建新的局部变量和回调闭包。旧 render 创建的 callback 会继续引用旧 render 的变量，即使 Fiber 的最新 state 已变化。这个行为本身符合 JS 闭包语义；React 的“每次 render 都是一份 snapshot”让这个现象高频出现。

所以精确定义是：**异步/长期存活回调继续读取创建它的那一次 render 的闭包环境，而调用者误以为它会自动读取最新 props/state。**

---

## C. Render / Diff / Commit

### 13. 为什么 `beginWork` 是“向下”，`completeWork` 是“回溯”？

父 Fiber 要先根据自己的类型、props/state 计算“下一批 children 是什么”，因此 `beginWork` 负责创建/复用 child Fiber 并向下深入。

而父 Fiber 的完成信息依赖其子树先完成，例如：

- Host 父节点 mount 时要把已完成 child host instances 组织起来；
- `subtreeFlags` 需要汇总子树 flags；
- 子节点先完成，父节点才能被视为完整候选结果。

因此 DFS 形态天然是：

```text
beginWork: parent → child
completeWork: child → parent
```

### 14. 如果 Render 阶段直接 append DOM，会破坏哪几个并发不变量？

至少破坏：

1. **可中断**：低优先级 render 被暂停时，DOM 已半更新；
2. **可丢弃**：WIP 被废弃无法简单回收已经写入的外部世界；
3. **可重放**：StrictMode/错误恢复/并发重做会重复副作用；
4. **原子可见性**：用户可能看到树的一半是旧、一半是新；
5. **Suspense/Error recovery**：候选渲染失败时无法无副作用地换另一路径。

因此 React 将“纯计算候选树”和“修改宿主环境”分为 Render / Commit 两个边界。

### 15. `subtreeFlags` 的存在避免了什么工作？

避免 Commit 阶段对整个 Fiber Tree 无条件深度遍历。

`flags` 表示当前 Fiber 自己的副作用，`subtreeFlags` 汇总子树是否包含某类副作用。Commit traversal 可以判断某个子树如果与当前 effect mask 无交集，就整体跳过。这相当于为 Commit 建立一层**稀疏副作用索引**。

### 16. 数组 Diff 中 `lastPlacedIndex` 表达的是什么约束？

它表示：**到目前为止，已确认可以按新顺序保留在原相对位置的旧节点中，最大的 oldIndex**。

对于复用的 child：

- `oldIndex >= lastPlacedIndex`：它仍保持相对递增顺序，可以不移动，并更新 `lastPlacedIndex = oldIndex`；
- `oldIndex < lastPlacedIndex`：它在旧列表中落在已处理节点之前，但新列表要求它出现在之后，因此必须标记 Placement（移动）。

React 19.3 `ReactChildFiber.js` 的 `placeChild` 明确使用这一规则。

### 17. 为什么“最小 DOM 操作”不是 React reconciliation 的数学最优目标？

通用树编辑距离的最优算法代价高，而且 UI identity 不只是节点标签，还包含组件语义和开发者提供的 key。React 的目标是：

- 接近 O(n) 的可预测性能；
- 稳定、易解释的 identity/state preservation；
- 在常见 UI 更新中足够少的 host mutation；
- 支持并发、Suspense、组件边界等更高层语义。

因此 reconciliation 是**启发式身份匹配算法**，不是追求理论最小 edit script 的求解器。

### 18. 一个 Fiber 被 bailout 时，为什么还要考虑 `childLanes`？

父 Fiber 的 props/state 自己没变，不代表其子树没有更新。例如某个孙组件自身 `setState`，更新 lane 会向祖先传播到 `childLanes`。

所以 bailout 必须区分：

```text
当前 Fiber 自己可以复用
≠
整棵子树都可以跳过
```

只有当当前 render lanes 与 `childLanes` 也不相交，才能安全整棵跳过；否则仍需进入子树找到有工作的 Fiber。

### 19. Mutation / Layout / Passive 三类副作用的可观察性差异是什么？

- **Mutation effects**：真正改变 Host Tree（插入、删除、属性变化等）。完成后 DOM 状态已切到新版本。
- **Layout effects**：Commit 内同步执行，发生在 DOM mutation 后、浏览器获得稳定绘制机会之前；适合测量 DOM/同步调整。会阻塞主线程和潜在 paint。
- **Passive effects (`useEffect`)**：Commit 后异步/延后 flush，不属于 DOM 原子切换的一部分。它通常让浏览器更早获得绘制机会，但不要把“永远严格 paint 后”当协议；交互更新等情况下实际时机可能变化。

核心不是死背“第几毫秒”，而是：**Layout 属于 commit 的同步可观察窗口，Passive 不属于。**

### 20. ref attach/detach 为什么属于 Commit，而不是 Render？

ref 向用户暴露“当前真实已提交实例”。Render 候选可能被中断、丢弃、重做；如果 Render 就改 `ref.current`，用户会观察到从未提交的 DOM/组件实例。

因此 ref 的 attach/detach 必须和 Host mutation/可见树切换保持一致，放在 Commit 生命周期中。

---

## D. Scheduling / Concurrent

### 21. 一次 click 产生 Update 后，Event Priority、Lane、Root schedule、Scheduler task 各自解决什么问题？

可以分成四层：

1. **Event Priority**：把浏览器事件语义映射成 React 当前 update priority，例如 click 属于 discrete event。事件 wrapper 在分发期间设置 current update priority。
2. **Lane**：把“这个 update 属于哪类优先级/批次/并发语义”编码到 Fiber/Root 可组合的位集合中；`requestUpdateLane` 决定 update lane。
3. **Root schedule**：Root 收到 update 后加入待调度 Root 链，并确保 microtask；在 microtask 中统一选择 next lanes、处理 starvation、决定 sync/async 路径。
4. **Scheduler task**：当需要异步时间切片时，负责“什么时候给 React 一段 CPU 时间、是否该 yield”，是执行时机机制。

所以 **Lane 是 React 的语义优先级模型；Scheduler 是任务执行机制**，两者不能混成一个概念。

### 22. React 19.3 的 Root microtask 为什么值得单独作为一个层次理解？

因为 React 19.3 中 `ensureRootIsScheduled` 的职责非常明确：

```text
1) 确保 root 在 root schedule 中
2) 确保存在处理 root schedule 的 pending microtask
```

真正的大部分 lane/task 决策延后到 `scheduleTaskForRootDuringMicrotask`。这样可以：

- 合并同一浏览器 task 内多个 update/root 调度请求；
- 等当前 JS/event stack 结束后统一选择 next lanes；
- 在同一个集中点处理 sync work、过期 lanes、callback 复用/取消；
- 让 batching 与 root scheduling 更一致。

因此“setState 立刻 Scheduler.scheduleCallback”是过度简化甚至旧式心智图。

### 23. `startTransition` 不等于 `setTimeout`，从语义和实现两方面解释。

**语义：** `startTransition` 声明“这些 state updates 是非紧急 UI transition，可以被更紧急输入打断/延后”；`setTimeout` 只声明“这段 JS 以后再运行”。

**实现：** `startTransition` 的 callback 本身通常立即执行，但 ReactSharedInternals 中的 transition 上下文使其中触发的 state update 获得 Transition lane。`setTimeout` 到时执行的 update 若没有 transition 上下文，通常只是普通 Default/事件上下文优先级。

因此：

```text
startTransition = 改变 React update 语义
setTimeout       = 改变 JS task 时间
```

### 24. “Concurrent Rendering = 多线程渲染”错在哪里？

React DOM 的 Fiber render 通常仍跑在浏览器主线程 JS 环境中。Concurrent 的关键是：

- 工作拆成 Fiber unit；
- Render 可暂停/yield；
- 高优先级 update 可以抢占；
- 低优先级候选可以重启/丢弃；
- Commit 仍保持一致性边界。

它是**协作式可中断调度（concurrency）**，不是两个 CPU 线程同时修改一棵 React Tree（parallelism）。

### 25. Render 被打断并从头重做时，如何保证已提交 UI 不被半成品污染？

靠 current/WIP 隔离 + Render/Commit 分离：

```text
root.current → 仍表示已提交版本
workInProgress → 候选计算
```

Render 主要修改 Fiber 内部候选数据/flags，不直接执行用户可见 Host mutation。被打断时可以放弃 WIP。只有一棵候选树完整并被选为 finishedWork 后，Commit 才对 Host Tree 执行 mutation，并切换 current。

### 26. 为什么低优先级任务可以饿死？系统如何通过 expiration/选择策略处理类似问题？

如果用户持续产生更高优先级更新，较低 lane 每次都可能被抢占，理论上会一直得不到 CPU。

React Root 为 lanes 维护 expiration 信息。`markStarvedLanesAsExpired` 会遍历 pending lanes：对于长期未完成且满足条件的 lane 计算/检查 expiration；达到期限后加入 `root.expiredLanes`，后续选择策略会提高其必须完成的紧迫性。

这是一种**防 starvation 的老化（aging）/超时保障**，而不是保证所有 lane 每轮公平轮转。Idle 类 lane 甚至可以按设计不设 expiration。

---

## E. Effects / External World

### 27. `useLayoutEffect` 为什么可能造成掉帧？

Layout Effect 在 Commit 的同步阶段运行，浏览器通常还没有机会完成下一帧绘制。若里面：

- 做重 CPU 计算；
- 连续 setState 触发额外同步更新；
- DOM 写 → 读 → 写导致 forced layout；

就会延长 main-thread critical path，错过 16.7ms（60Hz）等帧预算。因此只有“必须在用户看到前完成的 DOM 测量/同步修正”才适合 layout effect。

### 28. `useEffect` deps 比较为何不能理解为“监听变量变化”？

React 没有对 JS 变量安装 watcher。流程是：

```text
组件因某种原因 render
→ 本轮产生 deps 数组
→ 与上轮保存的 deps 逐项 Object.is
→ 决定 effect 是否需要重新同步
```

如果组件根本没有 render，deps 也不会被“主动监听”。所以 deps 的准确含义是**effect 所使用的 reactive snapshot 依赖声明**，不是响应式 getter 订阅系统。

### 29. `useEffectEvent` 试图解决哪类“响应式依赖 vs 最新值”冲突？

有些 effect 的“连接生命周期”只应由少量 reactive 值决定，但 effect 内某个 callback 又希望读取**最新 props/state**，并且这份最新值不应导致重新连接。

例如 chat room 连接依赖 `roomId`，但收到消息时希望读取最新 `theme`。如果把 `theme` 加 deps，会导致不必要 reconnect；不加又可能 stale closure。

Effect Event 提供一种“由 Effect 调用、读取最新值，但自身不作为 effect 重同步依赖”的边界。它不是逃避 deps 的通用工具，而是区分**响应式同步条件**和**非响应式事件逻辑**。

### 30. 为什么外部 store 读取必须有 snapshot 协议？什么是 tearing？

外部 store 不受 React UpdateQueue 控制，可能在一次 concurrent render 的两个时间片之间自行变化。如果组件 A 读到版本 1、组件 B 在同一候选 UI 中读到版本 2，最终可能形成彼此矛盾的页面，这就是 **tearing**。

`useSyncExternalStore` 要求：

- `getSnapshot()` 提供可比较且稳定的当前快照；
- `subscribe()` 通知变化；
- React 在关键阶段能重新检查 snapshot，一致地强制更新；
- SSR/hydration 用 `getServerSnapshot` 保证初始客户端视图与服务器一致。

它解决的是**并发一致性协议**，不仅是“封装 subscribe”。

### 31. `flushSync` 是“关闭 batching”吗？给出更准确的描述。

不是。`flushSync` 是一个**强制同步提交的 escape hatch**：React 会以同步优先级执行回调相关更新，并在返回前尽可能把为满足该更新所需的 pending work/Effects 一起 flush，使 DOM 在调用后达到可立即读取的已提交状态。

它可能打破本来可延迟/批处理的执行策略，但“全局关闭 batching”不是准确模型。它的代价是减少调度自由、可能提前显示 Suspense fallback、增加同步主线程工作。

---

## F. Suspense / Server

### 32. React 19.3 的 `use()` pending path 为什么使用内部 opaque exception，而不是让业务捕获实际 thenable？

React 19.3 会先把真正 thenable 存在内部 `suspendedThenable` 槽中，再 `throw SuspenseException`。WorkLoop 捕获该 opaque signal 后通过 `getSuspendedThenable()` 取回真实 thenable。

这样做有两个重要目的：

1. **控制流隔离**：用户 `try/catch` 不应把 suspension 当成普通 Promise/业务异常吞掉；
2. **实现封装**：Suspense 的内部中断协议不把真正 thenable 作为用户可依赖 API 暴露。

源码注释明确写道：opaque value 的目的之一就是避免 thenable 被 userspace 捕获。

**源码锚点：** `ReactFiberThenable.js` 的 `SuspenseException`、`suspendedThenable`、`getSuspendedThenable`。

### 33. ping 与 retry 分别改变什么状态？

- **Ping**：thenable settle 后通知 Root，“先前 suspended 的某些 lanes 现在可能有机会继续”，更新 Root 的 ping/调度状态并重新安排工作；它不是 UI mutation。
- **Retry**：实际再次执行 Render（可能使用 retry lane / 原 lane 组合），重新调用组件/读取资源，尝试完成该 Suspense boundary。

所以：

```text
resolve promise → ping root → schedule → retry render → 若成功再 commit
```

Promise resolve 本身绝不会直接 append/replace DOM。

### 34. Suspense fallback 是 Commit 前决定还是浏览器 Paint 后补救？

是**Render 阶段决定候选树，Commit 阶段应用**，不是浏览器 paint 后才发现“加载太慢”再补救。

子树 suspend 时，React 的异常/边界逻辑把最近可处理的 Suspense boundary 标记为捕获并重新 render，生成 primary/fallback 的候选结构。最终哪一版本进入 DOM 在 Commit 前就已确定。Transition 等策略可能选择保留已显示内容、延迟 fallback，但仍属于 React render/scheduling 决策。

### 35. SSR、Streaming SSR、Hydration、Selective Hydration 分别解决什么瓶颈？

- **SSR**：客户端 JS 尚未执行时就能获得 HTML，提高首屏内容可见性/SEO，但传统 SSR 常要等整个树完成。
- **Streaming SSR**：按 Suspense boundary 分块逐步输出，不必等待所有数据/组件完成，改善 TTFB/渐进展示。
- **Hydration**：客户端 React 接管服务器已有 DOM，建立 Fiber、事件与状态，使静态 HTML 可交互。
- **Selective Hydration**：不用按整棵树固定顺序 hydration；可以优先 hydration 用户正在交互/更高优先级的 boundary，提高可交互响应。

### 36. hydration mismatch 为什么不是普通 Diff？

普通 client update 的 Host Tree 是 React 自己上一次 Commit 的结果，Fiber/DOM 映射可信。Hydration 则要“认领”一棵**外部已经存在的服务器 DOM**，通过 hydration cursor 逐个匹配 React 预期。

Mismatch 表示这个前提失败：DOM 结构/文本可能与 React 候选不同。React 需要考虑：

- 是否可局部恢复；
- 是否丢弃某个 boundary 的服务器 DOM 改 client render；
- 是否保留用户输入/事件；
- 错误诊断。

这比普通 update 的“旧 React Tree vs 新 React Tree”多了一层宿主状态对齐协议。

### 37. RSC 为什么能减少发送到客户端的组件代码？它传输的核心不是 HTML，而是什么类型的数据？

Server Component 模块只在服务端执行，其实现代码无需进入浏览器 bundle。服务器执行后通过 **Flight/RSC payload** 发送一个可流式反序列化的 React 模型：包含元素/值、序列化 props、Client Reference、Server Reference、模块引用等协议数据。

客户端不是拿 RSC 源码重新执行，而是消费该模型，与 Client Components 组合成客户端可继续处理的 React Tree。因此 RSC payload 不是“HTML 字符串协议”。

### 38. Client Component 为什么仍可能参与服务端首屏输出？

`'use client'` 表示这个模块及依赖需要进入客户端模块图、可在客户端执行/拥有状态与事件能力，不等于“服务器完全不渲染它”。在支持 RSC + SSR 的框架中，服务器仍可使用 Client Component 的描述参与 HTML SSR/Fizz 输出，让首屏先看到 HTML；随后浏览器加载对应 client code 并 hydration。

所以：

```text
Client Component = 客户端代码边界
≠ 只能 CSR、不能 SSR
```

### 39. Server Action 与普通 HTTP endpoint 的边界应该怎样理解？

底层最终仍需要网络请求/HTTP 之类传输机制，但 Server Action 是 React/框架提供的**远程函数引用/RPC 风格协议集成**：

- 客户端拿到的是 Server Reference，而不是服务器函数实现；
- 参数/返回值受 React 序列化协议约束；
- 可与 form、transition、RSC refresh/cache 等框架生命周期集成。

普通 endpoint 更显式、协议自定义程度更高、与 React 生命周期无绑定。架构上应把 Server Action 看作**React 生态的 RPC capability/transport abstraction**，而不是“函数真的被序列化到浏览器”。

---

## G. Renderer / Compiler / Performance

### 40. 如果把 React DOM 换成 Canvas Renderer，哪些层复用、哪些层必须替换？

大部分平台无关 Reconciler 可复用：

```text
React Element
Fiber
Hooks
UpdateQueue
Lane/Scheduling semantics
Reconciliation
大部分 Render/Commit traversal
Suspense/Error boundary 机制
```

宿主相关层必须替换：

```text
Host Config
Host Instance 类型
create/update/append/remove 操作
文本/资源/可见性接口
事件输入适配
hydration（若支持）
```

DOM renderer 的 `HTMLElement` 可以变成 Canvas scene node、native view、terminal node 等。

### 41. Host Config 是什么架构模式？为什么 `react-reconciler` API 不稳定很重要？

Host Config 是典型的**依赖倒置 / Adapter / Ports-and-Adapters**：Reconciler 只依赖抽象宿主能力，由具体 Renderer 注入实现。

但 `react-reconciler` 和 Host Config 属于 React 内部扩展面，不是稳定公共 API。函数签名、capability、Feature Flag 会随内部架构演进而改变，因此生产自定义 Renderer 必须：

- 锁定 React/reconciler 版本；
- 有集成测试；
- 升级时逐版本对照 host config 变化；
- 不把内部 API 当普通 semver 稳定库使用。

### 42. React Compiler 为什么需要控制流/数据流/mutation 分析？

“安全自动 memo”必须知道：

- 值在哪里定义、哪些路径能到达；
- 某个值依赖哪些 props/state；
- 对象是否被 mutation/alias；
- 某表达式是否 pure、是否可缓存；
- 缓存跨 render 的生命周期边界；
- 条件/循环下哪些计算可复用。

这些不是简单 AST 文本匹配可以安全解决的，需要 IR 上的 CFG/数据流/别名和 mutation 推理。否则 Compiler 容易缓存错误值，直接改变程序语义。

### 43. Compiler 可以让你完全不懂 memoization 吗？为什么？

不能。Compiler 可以减少手工 `useMemo/useCallback/React.memo` 的数量，但你仍需要理解：

- identity/state preservation；
- pure render 约束；
- Context/store 更新边界；
- effect 依赖；
- expensive computation 的真实瓶颈；
- 浏览器 layout/paint、网络、数据架构等 Compiler 管不到的成本。

而且当性能异常或 Compiler bail out 时，你需要能解释生成策略。因此“少写 memo”不等于“无需理解 memoization”。

### 44. `React.memo` 自己也有成本，建立一个何时值得的成本模型。

可以比较：

```text
收益 ≈ 被避免的 child render + descendants render + 潜在 host diff
成本 ≈ props shallow compare + memo bookkeeping + 稳定引用维护 + 内存/复杂度
```

更值得：

- 子树 render 昂贵；
- 父频繁 render；
- 子 props 大多数时候保持浅相等；
- Profiler 能证明 bailout 明显减少工作。

不值得：

- 子组件非常便宜；
- props 每次都产生新对象/函数，几乎总变化；
- 比较本身比 render 还贵；
- 为 memo 强行添加大量 `useCallback/useMemo` 增加复杂度但无实际收益。

### 45. Profiler 显示 React render 很快，但用户仍觉得交互卡，下一步看哪里？

转到浏览器 Performance/Main Thread：

- Long Task / 其他 JS；
- style recalculation；
- forced layout / Layout；
- Paint/Raster；
- Composite；
- 大图/动画；
- GC；
- input delay；
- 网络/服务端等待。

React Profiler只回答“React commit/render 花了多少”，不能覆盖从事件到像素的全部链路。

### 46. 浏览器 Layout thrashing 与 React 重渲染有什么联系和区别？

React rerender 是 JS/Fiber 计算；Layout thrashing 是浏览器因为交错 DOM read/write 被迫反复执行 style/layout：

```js
write DOM
read offsetHeight  // forced layout
write DOM
read rect          // another forced layout
```

二者可独立发生：一次 React render 也能在 layout effect 中触发多次 forced layout；很多 React render 若没有触发布局相关 DOM 变化，也未必造成 layout thrashing。

优化时必须先定位瓶颈属于 React CPU 还是浏览器 rendering pipeline。

### 47. `transform` 常比改变 `left` 更适合动画，但什么时候仍可能发生 paint/composite 成本？

`transform/opacity` **有机会**只走 compositor，但不是保证“零成本”：

- 元素尚未拥有合适的 composited layer，可能发生 layer promotion/raster；
- 大图层移动需要大量 GPU memory/bandwidth；
- filter、mask、clip、复杂阴影、混合模式可能要求重新 raster/paint；
- 内容自身变化仍会 paint；
- 过多 layer 会增加合成成本；
- 浏览器/设备实现会影响最终 pipeline。

所以正确说法是：**transform 更容易避免 layout，并常可减少 paint；是否 compositor-only 必须用 Performance/Layers 实测。**

---

## H. 架构推演

### 48. 如果让你设计一个没有 Hooks 调用顺序限制的新 state API，你需要额外保存什么 identity 信息？代价是什么？

你至少要给每个 state cell 一个与调用位置无关、跨 render 稳定的 identity，例如：

- 显式 key/string/symbol；
- 编译器生成稳定 call-site ID；
- 信号/对象引用式 state handle；
- 某种组件实例内部 Map。

随之产生的代价：

- ID 冲突与作用域规则；
- Custom Hook/动态列表中 ID 如何组合；
- 条件创建后何时回收 state cell；
- 代码复制/重构对 call-site ID 的影响；
- Map lookup/元数据成本；
- SSR/hydration/Compiler 如何稳定复现 identity。

React 的顺序模型不是唯一方案，但它以语法限制换取了极低运行时 identity 成本。

### 49. 如果 Commit 也要可中断，你必须重新定义哪些用户可观察一致性保证？

当前 Commit 的重要假设是：Host mutation/ref/layout lifecycle 形成一个相对原子的可观察切换。如果 Commit 可以中断，你必须重新设计：

- DOM 是否允许新旧混合树被用户看见？
- 事件在中间态命中哪个 Fiber/DOM？
- ref.current 在半 commit 时指向什么？
- focus/selection/scroll 如何保存？
- layout effect 能否读取半更新布局？
- 外部 subscription 是否会看到部分 state？
- 出错时如何 rollback 已执行 host mutation？

可能需要事务型 Host Config、离屏 staging tree、浏览器原生原子提交能力或更强版本隔离。也就是说，可中断 Commit 不是“加 shouldYield”那么简单，它会改变 React 对外的一致性契约。

### 50. 如果 Scheduler 完全交给浏览器未来的新原语，React 哪些层仍然必须保留？

即使浏览器提供完美 `scheduler.postTask/yield/priorities`，React 仍需保留大量语义层：

- Element/Fiber identity；
- Hook/Class state 与 UpdateQueue；
- Lane/更新集合语义（即便最终映射到浏览器 priority）；
- reconciliation/Diff；
- current/WIP、可重放 Render；
- Commit 与副作用顺序；
- Suspense/Error recovery；
- Context/external-store consistency；
- hydration/RSC integration；
- Renderer/Host Config abstraction。

浏览器 Scheduler 只能替代或简化“**什么时候运行一段工作**”的机制，不能替代“**React 要运行什么、哪些更新属于同一语义批次、如何保持 UI identity 和一致性**”。

---

# 建议的评分方式

每题按 0–4 分：

- **0**：不会或结论错误。
- **1**：会背一句结论，但无法解释原因。
- **2**：能解释机制和关键数据结构。
- **3**：能给出 React 19.3 源码入口/调用链并画出状态变化。
- **4**：能指出设计 trade-off、构造反例，并能在 Mini React 中实现对应机制。

50 题满分 200。达到 150+ 且核心题（8/9/14/21/25/30/32/35/36/48/49/50）无明显概念错误，可以认为已经进入“源码级熟练”；170+ 才接近本课程定义的“架构级精通”。

## React 19.3 重点源码索引

```text
packages/react-reconciler/src/ReactFiber.js
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberThenable.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberRootScheduler.js
packages/react-reconciler/src/ReactFiberLane.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberCompleteWork.js
packages/react-reconciler/src/ReactChildFiber.js
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react-reconciler/src/ReactFiberCommitEffects.js
packages/react-reconciler/src/ReactFiberHydrationContext.js
packages/react-dom-bindings/src/events/ReactDOMEventListener.js
packages/react-dom-bindings/src/events/DOMPluginEventSystem.js
packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js
```


---

<!-- SOURCE: assessments/全章节自检题.md -->

# 全章节自检题

> 每章至少先口头回答，再看参考答案。目标是能解释“为什么”，而不是只说定义。

## 00. React 整体架构与历史演进

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 00B. JSX → React Element → Component → Fiber → Host Instance

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 01. Fiber 数据结构与双缓冲

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 02. Render 工作循环：beginWork / completeWork

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 03. Hooks：Dispatcher、链表与 Render Snapshot

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 04. useState：Hook、UpdateQueue 与调度

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 05. Effect 系统：useEffect / useLayoutEffect

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 06. Reconciliation 与 Diff

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 07. Commit：从 Fiber flags 到真实 DOM

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 08. Lane 与 Scheduler：优先级、并发和 Transition

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 09. React 到浏览器像素：Style / Layout / Paint / Composite

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 10. 一次 setState 到屏幕像素：完整主干调用链

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 11. Context：依赖记录、传播与为什么会重渲染

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 12. React.memo、useMemo、useCallback 与 Bailout

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 13. React DOM 事件系统：Native Event → Fiber → Dispatch Queue → Lane

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 14. Suspense：Thenable、Opaque Suspension、Ping、Retry 与 Replay

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 15. SSR、Fizz Streaming、Hydration、Selective Hydration 与 PPR

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 16. Class Component：Instance Model、UpdateQueue 与 Fiber 生命周期映射

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 17. 现代 React 总览：从 Fiber Runtime 到 Async UI、Server 与 Compiler

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 18. React 源码阅读地图：按问题找入口

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 19. Error Boundary 与错误恢复：Render Error、Commit Error、Root Recovery

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 20. React Server Components 与 Flight：组件模型跨机器后的协议

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 21. useSyncExternalStore：外部可变状态、Snapshot 与 Tearing

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 22. Reconciler 与 Renderer：Host Config、自定义 Renderer、React DOM 边界

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 23. React Compiler：HIR、数据流分析、Rules of React 与自动 Memoization

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 24. StrictMode 与 Rules of React：用“可重放”检查程序正确性

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 25. React 性能工程：Profiler、Performance Tracks 与浏览器流水线

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 26. Ref 系统：Object Ref、Callback Ref、Commit Attach/Detach 与 Imperative Handle

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 27. Automatic Batching、Root Microtask 与 flushSync

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 28. useReducer 源码原理：同一套 Hook Queue 的另一种表达

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 29. useMemo / useCallback：Render 缓存，而不是状态管理

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 30. useEffectEvent 与闭包模型：Reactive 与 Non-Reactive Effect Logic

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 31. useTransition / useDeferredValue：把“紧急程度”建模进更新

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 32. useId / useDebugValue / useInsertionEffect：库作者常见 Hooks

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 33. use / useActionState / useOptimistic / useFormStatus

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 34. Fragment / Portal / lazy / ViewTransition：组件树与宿主树并不总是一一对应

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 35. React DOM 属性系统与受控组件

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 36. 浏览器 Event Loop 与 React 调度边界

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 37. 初次 Mount：从 createRoot 到第一个像素

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 38. Update 与 Unmount：身份、Effect 与删除副作用

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 39. Suspense / Hydration 完整调用链

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 40. React 15 Stack Reconciler 深度解析

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 41. React 源码编译、运行与调试环境

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？

## 42. React 架构总复盘：从需求推导内部结构

1. 本章最核心的运行时不变量是什么？请用一条因果链解释。
2. 如果删除本章介绍的关键数据结构/阶段，React 会失去哪种能力或正确性保证？


---

<!-- SOURCE: assessments/全章节自检题-参考答案.md -->

# 全章节自检题：参考答案

> 答案给出最小正确模型。掌握阶段还应回到对应章节和源码锚点自行验证。

## 00. React 整体架构与历史演进

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../00-整体架构与历史演进.md`](00-%E6%95%B4%E4%BD%93%E6%9E%B6%E6%9E%84%E4%B8%8E%E5%8E%86%E5%8F%B2%E6%BC%94%E8%BF%9B.md) 的源码锚点和实验。

## 00B. JSX → React Element → Component → Fiber → Host Instance

1. 核心是把组件工作显式化为可遍历、可复用、可带状态与优先级的工作单元，并通过 current/WIP 保证未提交计算不污染已提交 UI。
2. 若没有显式 Fiber/双缓冲，React 很难保存可恢复遍历进度、承载 lanes/flags，并安全地放弃未提交 render。
   进一步验证：回到 [`../00B-JSX-ReactElement-Component-Fiber-HostInstance.md`](00B-JSX-ReactElement-Component-Fiber-HostInstance.md) 的源码锚点和实验。

## 01. Fiber 数据结构与双缓冲

1. 核心是把组件工作显式化为可遍历、可复用、可带状态与优先级的工作单元，并通过 current/WIP 保证未提交计算不污染已提交 UI。
2. 若没有显式 Fiber/双缓冲，React 很难保存可恢复遍历进度、承载 lanes/flags，并安全地放弃未提交 render。
   进一步验证：回到 [`../01-Fiber数据结构与双缓冲.md`](01-Fiber%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84%E4%B8%8E%E5%8F%8C%E7%BC%93%E5%86%B2.md) 的源码锚点和实验。

## 02. Render 工作循环：beginWork / completeWork

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../02-Render工作循环.md`](02-Render%E5%B7%A5%E4%BD%9C%E5%BE%AA%E7%8E%AF.md) 的源码锚点和实验。

## 03. Hooks：Dispatcher、链表与 Render Snapshot

1. 核心是函数组件每次执行只产生一个 render snapshot，跨 render 的状态由 Fiber 上按调用顺序组织的 Hook/UpdateQueue 保存。
2. 没有稳定 Hook 顺序与队列，React 无法把本次 Hook 调用和上一次状态一一对应，也无法处理并发优先级与重放。
   进一步验证：回到 [`../03-Hooks-Dispatcher与链表.md`](03-Hooks-Dispatcher%E4%B8%8E%E9%93%BE%E8%A1%A8.md) 的源码锚点和实验。

## 04. useState：Hook、UpdateQueue 与调度

1. 核心是函数组件每次执行只产生一个 render snapshot，跨 render 的状态由 Fiber 上按调用顺序组织的 Hook/UpdateQueue 保存。
2. 没有稳定 Hook 顺序与队列，React 无法把本次 Hook 调用和上一次状态一一对应，也无法处理并发优先级与重放。
   进一步验证：回到 [`../04-useState与UpdateQueue.md`](04-useState%E4%B8%8EUpdateQueue.md) 的源码锚点和实验。

## 05. Effect 系统：useEffect / useLayoutEffect

1. 核心是把 render 计算与外部系统同步分离；Effect 描述同步的建立与清理，执行发生在 commit 相关阶段。
2. 如果 render 直接做外部副作用，可重做/放弃 render 会导致重复或幽灵副作用。
   进一步验证：回到 [`../05-Effect系统.md`](05-Effect%E7%B3%BB%E7%BB%9F.md) 的源码锚点和实验。

## 06. Reconciliation 与 Diff

1. 核心是根据 type/key/位置判断 child identity，从而决定 Fiber/state 是复用、移动还是删除/新建。
2. 没有 identity 规则，组件 state 无法稳定归属，列表更新会产生错误复用或不必要重建。
   进一步验证：回到 [`../06-Reconciliation与Diff.md`](06-Reconciliation%E4%B8%8EDiff.md) 的源码锚点和实验。

## 07. Commit：从 Fiber flags 到真实 DOM

1. 核心是只有完成的 render 结果才能在 commit 中改变宿主环境，并按明确顺序处理 mutation、ref、layout/passive 相关工作。
2. 若 render 中直接改变 DOM，则被丢弃的 render 也会污染页面，破坏一致性。
   进一步验证：回到 [`../07-Commit阶段.md`](07-Commit%E9%98%B6%E6%AE%B5.md) 的源码锚点和实验。

## 08. Lane 与 Scheduler：优先级、并发和 Transition

1. 核心是把更新紧急度/集合编码进 lane，并让 root scheduler 根据 pending lanes 和宿主执行机会安排 render。
2. 没有优先级与可重入队列，低优先级工作要么阻塞紧急输入，要么在被跳过后丢失语义。
   进一步验证：回到 [`../08-Lane与Scheduler.md`](08-Lane%E4%B8%8EScheduler.md) 的源码锚点和实验。

## 09. React 到浏览器像素：Style / Layout / Paint / Composite

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../09-浏览器渲染与React性能.md`](09-%E6%B5%8F%E8%A7%88%E5%99%A8%E6%B8%B2%E6%9F%93%E4%B8%8EReact%E6%80%A7%E8%83%BD.md) 的源码锚点和实验。

## 10. 一次 setState 到屏幕像素：完整主干调用链

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../10-完整setState调用链.md`](10-%E5%AE%8C%E6%95%B4setState%E8%B0%83%E7%94%A8%E9%93%BE.md) 的源码锚点和实验。

## 11. Context：依赖记录、传播与为什么会重渲染

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../11-Context原理.md`](11-Context%E5%8E%9F%E7%90%86.md) 的源码锚点和实验。

## 12. React.memo、useMemo、useCallback 与 Bailout

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../12-memo与Bailout.md`](12-memo%E4%B8%8EBailout.md) 的源码锚点和实验。

## 13. React DOM 事件系统：Native Event → Fiber → Dispatch Queue → Lane

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../13-React事件系统.md`](13-React%E4%BA%8B%E4%BB%B6%E7%B3%BB%E7%BB%9F.md) 的源码锚点和实验。

## 14. Suspense：Thenable、Opaque Suspension、Ping、Retry 与 Replay

1. 核心是把未完成内容/已有服务器 DOM 当作可恢复边界状态处理，让 React 可以 fallback、ping/retry 或 claim/recover。
2. 没有 boundary/retry/hydration 状态机，异步未完成和服务端已有 DOM 都只能退化成全量同步重建。
   进一步验证：回到 [`../14-Suspense与Throw-Thenable.md`](14-Suspense%E4%B8%8EThrow-Thenable.md) 的源码锚点和实验。

## 15. SSR、Fizz Streaming、Hydration、Selective Hydration 与 PPR

1. 核心是把未完成内容/已有服务器 DOM 当作可恢复边界状态处理，让 React 可以 fallback、ping/retry 或 claim/recover。
2. 没有 boundary/retry/hydration 状态机，异步未完成和服务端已有 DOM 都只能退化成全量同步重建。
   进一步验证：回到 [`../15-SSR与Hydration.md`](15-SSR%E4%B8%8EHydration.md) 的源码锚点和实验。

## 16. Class Component：Instance Model、UpdateQueue 与 Fiber 生命周期映射

1. 核心是把组件工作显式化为可遍历、可复用、可带状态与优先级的工作单元，并通过 current/WIP 保证未提交计算不污染已提交 UI。
2. 若没有显式 Fiber/双缓冲，React 很难保存可恢复遍历进度、承载 lanes/flags，并安全地放弃未提交 render。
   进一步验证：回到 [`../16-Class生命周期与Fiber.md`](16-Class%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E4%B8%8EFiber.md) 的源码锚点和实验。

## 17. 现代 React 总览：从 Fiber Runtime 到 Async UI、Server 与 Compiler

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../17-现代React关键能力.md`](17-%E7%8E%B0%E4%BB%A3React%E5%85%B3%E9%94%AE%E8%83%BD%E5%8A%9B.md) 的源码锚点和实验。

## 18. React 源码阅读地图：按问题找入口

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../18-源码阅读地图.md`](18-%E6%BA%90%E7%A0%81%E9%98%85%E8%AF%BB%E5%9C%B0%E5%9B%BE.md) 的源码锚点和实验。

## 19. Error Boundary 与错误恢复：Render Error、Commit Error、Root Recovery

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../19-ErrorBoundary与错误恢复.md`](19-ErrorBoundary%E4%B8%8E%E9%94%99%E8%AF%AF%E6%81%A2%E5%A4%8D.md) 的源码锚点和实验。

## 20. React Server Components 与 Flight：组件模型跨机器后的协议

1. 核心是把一部分组件执行放在服务器，并通过 Flight 表达组件树/引用，而不是把它等同于生成 HTML。
2. 没有协议和 client/server boundary，就无法在保留客户端交互组件的同时传输服务端组件结果。
   进一步验证：回到 [`../20-ServerComponents与Flight.md`](20-ServerComponents%E4%B8%8EFlight.md) 的源码锚点和实验。

## 21. useSyncExternalStore：外部可变状态、Snapshot 与 Tearing

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../21-useSyncExternalStore与Tearing.md`](21-useSyncExternalStore%E4%B8%8ETearing.md) 的源码锚点和实验。

## 22. Reconciler 与 Renderer：Host Config、自定义 Renderer、React DOM 边界

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../22-HostConfig与自定义Renderer.md`](22-HostConfig%E4%B8%8E%E8%87%AA%E5%AE%9A%E4%B9%89Renderer.md) 的源码锚点和实验。

## 23. React Compiler：HIR、数据流分析、Rules of React 与自动 Memoization

1. 核心是基于 React 的纯 render 与数据依赖规则做静态分析和自动 memoization，而不是改变 React 的运行时语义。
2. 若组件违反 Rules of React/纯度，编译器就无法安全推导依赖和缓存边界。
   进一步验证：回到 [`../23-ReactCompiler内部模型.md`](23-ReactCompiler%E5%86%85%E9%83%A8%E6%A8%A1%E5%9E%8B.md) 的源码锚点和实验。

## 24. StrictMode 与 Rules of React：用“可重放”检查程序正确性

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../24-StrictMode与RulesOfReact.md`](24-StrictMode%E4%B8%8ERulesOfReact.md) 的源码锚点和实验。

## 25. React 性能工程：Profiler、Performance Tracks 与浏览器流水线

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../25-Profiler与性能工程.md`](25-Profiler%E4%B8%8E%E6%80%A7%E8%83%BD%E5%B7%A5%E7%A8%8B.md) 的源码锚点和实验。

## 26. Ref 系统：Object Ref、Callback Ref、Commit Attach/Detach 与 Imperative Handle

1. 核心是只有完成的 render 结果才能在 commit 中改变宿主环境，并按明确顺序处理 mutation、ref、layout/passive 相关工作。
2. 若 render 中直接改变 DOM，则被丢弃的 render 也会污染页面，破坏一致性。
   进一步验证：回到 [`../26-Ref系统与ImperativeHandle.md`](26-Ref%E7%B3%BB%E7%BB%9F%E4%B8%8EImperativeHandle.md) 的源码锚点和实验。

## 27. Automatic Batching、Root Microtask 与 flushSync

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../27-Batching与flushSync.md`](27-Batching%E4%B8%8EflushSync.md) 的源码锚点和实验。

## 28. useReducer 源码原理：同一套 Hook Queue 的另一种表达

1. 核心是函数组件每次执行只产生一个 render snapshot，跨 render 的状态由 Fiber 上按调用顺序组织的 Hook/UpdateQueue 保存。
2. 没有稳定 Hook 顺序与队列，React 无法把本次 Hook 调用和上一次状态一一对应，也无法处理并发优先级与重放。
   进一步验证：回到 [`../28-useReducer源码原理.md`](28-useReducer%E6%BA%90%E7%A0%81%E5%8E%9F%E7%90%86.md) 的源码锚点和实验。

## 29. useMemo / useCallback：Render 缓存，而不是状态管理

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../29-useMemo-useCallback源码原理.md`](29-useMemo-useCallback%E6%BA%90%E7%A0%81%E5%8E%9F%E7%90%86.md) 的源码锚点和实验。

## 30. useEffectEvent 与闭包模型：Reactive 与 Non-Reactive Effect Logic

1. 核心是把 render 计算与外部系统同步分离；Effect 描述同步的建立与清理，执行发生在 commit 相关阶段。
2. 如果 render 直接做外部副作用，可重做/放弃 render 会导致重复或幽灵副作用。
   进一步验证：回到 [`../30-useEffectEvent与闭包模型.md`](30-useEffectEvent%E4%B8%8E%E9%97%AD%E5%8C%85%E6%A8%A1%E5%9E%8B.md) 的源码锚点和实验。

## 31. useTransition / useDeferredValue：把“紧急程度”建模进更新

1. 核心是把更新紧急度/集合编码进 lane，并让 root scheduler 根据 pending lanes 和宿主执行机会安排 render。
2. 没有优先级与可重入队列，低优先级工作要么阻塞紧急输入，要么在被跳过后丢失语义。
   进一步验证：回到 [`../31-useTransition与useDeferredValue.md`](31-useTransition%E4%B8%8EuseDeferredValue.md) 的源码锚点和实验。

## 32. useId / useDebugValue / useInsertionEffect：库作者常见 Hooks

1. 核心是把 render 计算与外部系统同步分离；Effect 描述同步的建立与清理，执行发生在 commit 相关阶段。
2. 如果 render 直接做外部副作用，可重做/放弃 render 会导致重复或幽灵副作用。
   进一步验证：回到 [`../32-useId-useDebugValue-useInsertionEffect.md`](32-useId-useDebugValue-useInsertionEffect.md) 的源码锚点和实验。

## 33. use / useActionState / useOptimistic / useFormStatus

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../33-use-ActionState-Optimistic-FormStatus.md`](33-use-ActionState-Optimistic-FormStatus.md) 的源码锚点和实验。

## 34. Fragment / Portal / lazy / ViewTransition：组件树与宿主树并不总是一一对应

1. 核心是把更新紧急度/集合编码进 lane，并让 root scheduler 根据 pending lanes 和宿主执行机会安排 render。
2. 没有优先级与可重入队列，低优先级工作要么阻塞紧急输入，要么在被跳过后丢失语义。
   进一步验证：回到 [`../34-Fragment-Portal-Lazy-ViewTransition.md`](34-Fragment-Portal-Lazy-ViewTransition.md) 的源码锚点和实验。

## 35. React DOM 属性系统与受控组件

1. 核心是只有完成的 render 结果才能在 commit 中改变宿主环境，并按明确顺序处理 mutation、ref、layout/passive 相关工作。
2. 若 render 中直接改变 DOM，则被丢弃的 render 也会污染页面，破坏一致性。
   进一步验证：回到 [`../35-ReactDOM属性系统与受控组件.md`](35-ReactDOM%E5%B1%9E%E6%80%A7%E7%B3%BB%E7%BB%9F%E4%B8%8E%E5%8F%97%E6%8E%A7%E7%BB%84%E4%BB%B6.md) 的源码锚点和实验。

## 36. 浏览器 Event Loop 与 React 调度边界

1. 核心是把更新紧急度/集合编码进 lane，并让 root scheduler 根据 pending lanes 和宿主执行机会安排 render。
2. 没有优先级与可重入队列，低优先级工作要么阻塞紧急输入，要么在被跳过后丢失语义。
   进一步验证：回到 [`../36-浏览器EventLoop与React调度边界.md`](36-%E6%B5%8F%E8%A7%88%E5%99%A8EventLoop%E4%B8%8EReact%E8%B0%83%E5%BA%A6%E8%BE%B9%E7%95%8C.md) 的源码锚点和实验。

## 37. 初次 Mount：从 createRoot 到第一个像素

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../37-初次Mount完整调用链.md`](37-%E5%88%9D%E6%AC%A1Mount%E5%AE%8C%E6%95%B4%E8%B0%83%E7%94%A8%E9%93%BE.md) 的源码锚点和实验。

## 38. Update 与 Unmount：身份、Effect 与删除副作用

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../38-更新与卸载完整调用链.md`](38-%E6%9B%B4%E6%96%B0%E4%B8%8E%E5%8D%B8%E8%BD%BD%E5%AE%8C%E6%95%B4%E8%B0%83%E7%94%A8%E9%93%BE.md) 的源码锚点和实验。

## 39. Suspense / Hydration 完整调用链

1. 核心是把未完成内容/已有服务器 DOM 当作可恢复边界状态处理，让 React 可以 fallback、ping/retry 或 claim/recover。
2. 没有 boundary/retry/hydration 状态机，异步未完成和服务端已有 DOM 都只能退化成全量同步重建。
   进一步验证：回到 [`../39-Suspense-Hydration完整调用链.md`](39-Suspense-Hydration%E5%AE%8C%E6%95%B4%E8%B0%83%E7%94%A8%E9%93%BE.md) 的源码锚点和实验。

## 40. React 15 Stack Reconciler 深度解析

1. 核心是理解实例/同步递归模型的限制，以及 Fiber/现代生命周期为何要把可重做计算和副作用分开。
2. 继续依赖隐式 JS 调用栈和 render 前副作用，会阻碍可中断/可重做的工作模型。
   进一步验证：回到 [`../40-React15-StackReconciler深度解析.md`](40-React15-StackReconciler%E6%B7%B1%E5%BA%A6%E8%A7%A3%E6%9E%90.md) 的源码锚点和实验。

## 41. React 源码编译、运行与调试环境

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../41-源码编译运行与调试环境.md`](41-%E6%BA%90%E7%A0%81%E7%BC%96%E8%AF%91%E8%BF%90%E8%A1%8C%E4%B8%8E%E8%B0%83%E8%AF%95%E7%8E%AF%E5%A2%83.md) 的源码锚点和实验。

## 42. React 架构总复盘：从需求推导内部结构

1. 核心是不把 React API 当孤立技巧，而是把它放进 Trigger → Render → Commit → Host/Browser 的整体运行时模型中理解。
2. 移除这一层会使相邻层职责混合，导致状态、调度、宿主副作用或可恢复性失去明确边界。
   进一步验证：回到 [`../42-架构总复盘与核心不变量.md`](42-%E6%9E%B6%E6%9E%84%E6%80%BB%E5%A4%8D%E7%9B%98%E4%B8%8E%E6%A0%B8%E5%BF%83%E4%B8%8D%E5%8F%98%E9%87%8F.md) 的源码锚点和实验。


---

<!-- SOURCE: appendix/专业术语中英对照表.md -->

# React 专业术语中英对照表

> 约定：正文首次出现重要术语时，优先采用 **English（中文）** 的形式。中文用于建立概念，英文保留用于源码搜索、官方文档和调试。

| English | 中文 |
|---|---|
| `React Root` | React 根节点/根容器 |
| `Root Container` | 根容器 |
| `createRoot` | 创建 React 根 |
| `hydrateRoot` | 水合根节点 |
| `Renderer` | 渲染器 |
| `Reconciler` | 协调器 |
| `Reconciliation` | 协调/对比更新 |
| `Fiber` | 纤程/React 工作单元 |
| `Fiber Root` | Fiber 根 |
| `Host Root` | 宿主根节点 |
| `Host Component` | 宿主组件 |
| `Host Instance` | 宿主实例/真实平台节点 |
| `Host Config` | 宿主配置/渲染器平台适配层 |
| `Work In Progress` | 工作中 Fiber 树 |
| `Current Tree` | 当前已提交 Fiber 树 |
| `Double Buffering` | 双缓冲 |
| `alternate` | 双树对应指针 |
| `Render Phase` | 渲染阶段/计算阶段 |
| `Commit Phase` | 提交阶段 |
| `Mutation Phase` | DOM 变更阶段 |
| `Layout Phase` | 布局副作用阶段 |
| `Passive Effect` | 被动副作用 |
| `Layout Effect` | 布局副作用 |
| `Effect` | 副作用 |
| `Hook` | 钩子 |
| `Hooks Dispatcher` | Hooks 分发器 |
| `Hook Linked List` | Hook 链表 |
| `Update Queue` | 更新队列 |
| `Update` | 更新对象 |
| `baseState` | 基础状态 |
| `baseQueue` | 基础更新队列 |
| `pending` | 待处理更新 |
| `eager state` | 预计算状态 |
| `Render Snapshot` | 渲染快照 |
| `stale closure` | 过期闭包/陈旧闭包 |
| `Closure` | 闭包 |
| `Lane` | 更新车道/优先级集合 |
| `Lanes` | 车道集合/优先级集合 |
| `Scheduler` | 调度器 |
| `Root Scheduler` | 根调度器 |
| `Priority` | 优先级 |
| `Concurrent Rendering` | 并发渲染 |
| `Transition` | 过渡更新 |
| `Bailout` | 跳过渲染/提前退出 |
| `Memoization` | 记忆化/缓存计算结果 |
| `Diff` | 差异比较 |
| `Key` | 列表身份键 |
| `Placement` | 插入标记 |
| `Deletion` | 删除标记 |
| `Flags` | 副作用标记 |
| `subtreeFlags` | 子树副作用标记 |
| `beginWork` | 开始处理 Fiber |
| `completeWork` | 完成 Fiber 工作 |
| `Work Loop` | 工作循环 |
| `Unit of Work` | 工作单元 |
| `Suspense` | 异步等待边界 |
| `Thenable` | 类 Promise 对象 |
| `Ping` | 异步完成唤醒 |
| `Retry` | 重试渲染 |
| `Hydration` | 水合/复用服务端 DOM |
| `SSR` | 服务端渲染 |
| `Server Components` | 服务端组件 |
| `RSC` | React 服务端组件 |
| `Flight` | RSC 传输协议/数据格式 |
| `Streaming` | 流式传输 |
| `Event Delegation` | 事件委托 |
| `Synthetic Event` | 合成事件 |
| `Event Priority` | 事件优先级 |
| `Batching` | 批处理 |
| `Automatic Batching` | 自动批处理 |
| `flushSync` | 同步强制刷新 |
| `Context` | 上下文 |
| `Provider` | 上下文提供者 |
| `Consumer` | 上下文消费者 |
| `Ref` | 引用 |
| `Imperative Handle` | 命令式句柄 |
| `Profiler` | 性能分析器 |
| `Tearing` | 撕裂/并发读取不一致 |
| `External Store` | 外部状态仓库 |
| `Strict Mode` | 严格模式 |
| `Rules of React` | React 规则 |
| `React Compiler` | React 编译器 |
| `JSX` | JavaScript XML/JS 语法扩展 |
| `JSX Transform` | JSX 转换 |
| `Automatic JSX Runtime` | 自动 JSX 运行时 |
| `Transpilation` | 转译 |
| `Bundler` | 打包器 |
| `Bundle` | 打包产物 |
| `Module Graph` | 模块依赖图 |
| `Tree Shaking` | 摇树优化/无用代码消除 |
| `Code Splitting` | 代码分割 |
| `Source Map` | 源码映射 |
| `ESM` | ES 模块 |
| `Entry Module` | 入口模块 |
| `React Element` | React 元素/虚拟 UI 描述对象 |
| `Virtual DOM` | 虚拟 DOM/内存中的 UI 描述 |
| `DOM` | 文档对象模型 |
| `CSSOM` | CSS 对象模型 |
| `Render Tree` | 渲染树 |
| `Style Recalculation` | 样式重新计算 |
| `Layout` | 布局/回流 |
| `Reflow` | 回流 |
| `Paint` | 绘制 |
| `Composite` | 合成 |
| `Compositor` | 合成器 |
| `GPU` | 图形处理器 |
| `Main Thread` | 主线程 |
| `Event Loop` | 事件循环 |
| `Microtask` | 微任务 |
| `Macrotask` | 宏任务 |
| `Frame` | 浏览器帧 |
| `requestAnimationFrame` | 动画帧回调 |
| `CSR` | 客户端渲染 |
| `HMR` | 热模块替换 |
| `Fast Refresh` | 快速刷新 |
| `Controlled Component` | 受控组件 |
| `Uncontrolled Component` | 非受控组件 |
| `Error Boundary` | 错误边界 |
| `Error Recovery` | 错误恢复 |
| `Portal` | 传送门 |
| `Fragment` | 片段 |
| `Lazy` | 懒加载 |
| `View Transition` | 视图过渡 |
| `Compiler Runtime` | 编译器运行时 |
| `Custom Renderer` | 自定义渲染器 |
| `Mutation Mode` | 可变宿主模式 |
| `Persistent Mode` | 持久化宿主模式 |
| `Mount` | 挂载 |
| `Unmount` | 卸载 |
| `Lifecycle` | 生命周期 |
| `Stack Reconciler` | 栈协调器 |
| `Fiber Reconciler` | Fiber 协调器 |
| `Call Stack` | 调用栈 |
| `Depth-First Search` | 深度优先遍历 |
| `Source Code Anchor` | 源码锚点 |
| `Invariant` | 不变量 |
| `Trade-off` | 权衡 |
| `Host Environment` | 宿主环境 |
| `Runtime` | 运行时 |


---

<!-- SOURCE: appendix/源码Symbol索引-v19.3.0.md -->

# React v19.3.0 源码 Symbol 索引

> 这是“导航索引”，不是稳定 API 列表。React 内部函数可能在 patch/minor 中移动。读源码时以 tag `v19.3.0` 为基线。

| 主题 | 关键 Symbol | 主要文件 | 读它为了什么 |
|---|---|---|---|
| 公共 Hooks | `useState/useEffect/use` 等 | `packages/react/src/ReactHooks.js` | 看公共 API 如何交给 Dispatcher |
| Hook render | `renderWithHooks`, `renderWithHooksAgain` | `react-reconciler/src/ReactFiberHooks.js` | mount/update dispatcher、Hook 游标、re-render |
| Hook state | `mountState`, `updateState`, `dispatchSetState` | `ReactFiberHooks.js` | Hook/Queue/Update 与调度入口 |
| Fiber 构造 | `createFiber`, `createWorkInProgress` | `ReactFiber.js` | current/WIP/alternate |
| Begin | `beginWork`, `updateFunctionComponent` | `ReactFiberBeginWork.js` | 从 Fiber tag 到组件执行/reconcile |
| Complete | `completeWork` | `ReactFiberCompleteWork.js` | Host 实例、flags、回溯阶段 |
| WorkLoop | `performUnitOfWork`, `completeUnitOfWork`, `renderRoot*` | `ReactFiberWorkLoop.js` | Render engine |
| Update scheduling | `requestUpdateLane`, `scheduleUpdateOnFiber` | `ReactFiberWorkLoop.js` | Update 如何携带 lane 进入 root |
| Root scheduling | `ensureRootIsScheduled`, `processRootScheduleInMicrotask`, `scheduleTaskForRootDuringMicrotask` | `ReactFiberRootScheduler.js` | 19.3 Root 链表 + microtask + task |
| Lane | `getNextLanes`, lane sets/helpers | `ReactFiberLane.js` | pending/suspended/pinged/entangled lanes |
| Child reconciliation | `reconcileChildFibers`, array reconciliation helpers | `ReactChildFiber.js` | key/type/reuse/placement/deletion |
| Commit | `commit*Effects` | `ReactFiberCommitWork.js`, WorkLoop commit orchestration | mutation/layout/passive |
| Concurrent queue | `enqueueConcurrentHookUpdate` 等 | `ReactFiberConcurrentUpdates.js` | 并发 update 缓冲与传播 |
| Suspense/thenable | `trackUsedThenable`, `getSuspendedThenable`, internal exception | `ReactFiberThenable.js` | modern `use()` pending control flow |
| Hydration | claim/mismatch/pop hydration state | `ReactFiberHydrationContext.js` | client Fiber 与 server host nodes 匹配 |
| DOM Host Config | create/commit/hydration host ops | `react-dom-bindings/src/client/ReactFiberConfigDOM.js` | Reconciler→DOM 边界 |
| DOM event root | `listenToAllSupportedEvents`, plugin dispatch | `react-dom-bindings/src/events/DOMPluginEventSystem.js` | root delegation/plugin event system |
| Event priority | event listener dispatch priority | `react-dom-bindings/src/events/ReactDOMEventListener.js` | native event → React update priority |
| Scheduler | task queue / callback scheduling | `packages/scheduler/src/*` | React 外部的 cooperative task scheduler |
| Server render | Fizz related files | `packages/react-server/src/*` | server HTML/stream rendering |
| Flight | Flight server/client | `packages/react-server/src/*`, `packages/react-client/src/*`, renderer bindings | RSC serialization/reconstruction |

## 阅读提示

先用 symbol 搜索进入函数，再读 30~80 行上下文。除非当前问题要求，否则不要顺着 import 把整个仓库展开。每次阅读只维护一张“当前对象状态表”：Fiber、Hook、Queue、Root、Host 五列足够覆盖大多数主干。


---

<!-- SOURCE: appendix/官方源码锚点索引-v19.3.0.md -->

# React 19.3.0 官方源码锚点索引

> 用于“教材解释 → 官方源码”双向跳转。内部函数不是公共 API，未来版本可能移动。

## Reconciler

- Fiber Root：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberRoot.js

- Fiber 数据结构：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiber.js
- Hooks：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js
- BeginWork：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberBeginWork.js
- CompleteWork：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberCompleteWork.js
- WorkLoop：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js
- Child reconciliation：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactChildFiber.js
- Lane：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberLane.js
- Root Scheduler：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberRootScheduler.js
- Commit Work：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberCommitWork.js
- Commit Host Effects：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberCommitHostEffects.js
- Concurrent Updates：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberConcurrentUpdates.js
- Thenable/Suspense：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberThenable.js
- Throw/Capture：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberThrow.js
- Hydration Context：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHydrationContext.js

## React DOM

- Root API：https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/client/ReactDOMRoot.js
- DOM bindings client：https://github.com/facebook/react/blob/v19.3.0/packages/react-dom-bindings/src/client
- Events：https://github.com/facebook/react/blob/v19.3.0/packages/react-dom-bindings/src/events

## JSX / React Element

- JSX runtime entry：https://github.com/facebook/react/blob/v19.3.0/packages/react/src/jsx/ReactJSX.js
- React Element creation：https://github.com/facebook/react/blob/v19.3.0/packages/react/src/jsx/ReactJSXElement.js

## Public React Hooks

- ReactHooks：https://github.com/facebook/react/blob/v19.3.0/packages/react/src/ReactHooks.js

## Scheduler

- Scheduler package：https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src

## 阅读原则

先从函数名定位，再从调用者/被调用者扩散。不要按文件从第一行读到最后一行。


---

<!-- SOURCE: appendix/设计决策地图.md -->

# React 设计决策地图：从问题反推机制

> 架构师读源码，不应该只问“这里怎么写”，还要问“如果不用这个结构，会违反什么约束”。

| 约束/问题 | React 机制 | 代价/复杂度 |
|---|---|---|
| 大树递归无法良好让出 | Fiber + 显式 WorkLoop | 运行时结构和状态机显著复杂 |
| 未完成 UI 不能污染已显示 UI | current/WIP + Commit boundary | 双树/alternate 管理成本 |
| 不同交互紧急程度不同 | Lane + Root scheduling | update queue 必须支持跳过/rebase |
| Function Component 每次重执行 | Hook list 存持久状态 | Hook 调用顺序成为约束 |
| 一次 render 中 state 应稳定 | render snapshot | 容易产生 stale closure 心智负担 |
| 副作用不能在可重放 Render 中发生 | Commit effects | Effect API/cleanup 模型复杂 |
| sibling identity 需要可预测 | key + type reconciliation | 开发者必须提供稳定 identity |
| 低优先级更新不能丢 | baseState/baseQueue/rebase | Queue 算法复杂 |
| 等待异步资源又不想手写 loading 状态传播 | Suspense boundary + ping/retry | 控制流、lane、server/hydration 协作复杂 |
| SSR HTML 要尽早显示且逐步可交互 | Streaming + selective hydration | hydration cursor/replay/priority 复杂 |
| 组件树不应绑定 DOM | Reconciler + Host Config | renderer contract 难且内部 API 不稳定 |
| 外部 store 不受 React 控制 | useSyncExternalStore snapshot protocol | store 必须提供稳定 snapshot 语义 |
| 手工 memo 易错且噪音大 | React Compiler | 编译分析复杂、需要遵守可分析语义 |

## 架构推演方法

读一个新机制时，强制写四问：

```text
1. 它解决的系统约束是什么？
2. 如果没有它，会出现怎样的错误/性能/一致性问题？
3. 它把复杂度从哪里搬到了哪里？
4. 它与相邻机制的 contract 是什么？
```

例如 `baseQueue`：

```text
约束：允许不同 lane 分开 render，但 update 语义不能丢。
没有它：跳过低优先级 update 后，未来无法重建正确的更新序列。
复杂度迁移：从“简单 FIFO state”搬到“可跳过+重放的 queue”。
contract：Lane 选择决定跳过；Hook reducer 消费/克隆；未来 render rebase。
```

这比背字段更接近架构级理解。


---

<!-- SOURCE: appendix/易混概念对照表.md -->

# React 易混概念对照表

| 概念 A | 概念 B | 精确区别 |
|---|---|---|
| JSX | React Element | JSX 是语法；Element 是运行时 UI 描述值 |
| React Element | Fiber | Element 更像输入描述；Fiber 是 Reconciler 的持久工作/状态节点 |
| Component | Fiber | Component 是用户逻辑抽象；Fiber 是 React 对一次组件位置的运行时表示 |
| Fiber | DOM Node | Fiber 属于 React；DOM Node 属于浏览器 Host |
| Render Phase | Browser Render | React Render 计算 Fiber；浏览器 Render 通常指 Style/Layout/Paint 等 |
| Render | Commit | Render 计算候选结果；Commit 产生用户可观察 host/effect 变化 |
| `memoizedState` | Hook state | Fiber 的 `memoizedState` 在不同 tag 下语义不同；FunctionComponent 时可指 Hook 链表头 |
| Hook list | Effect list | Hook list 保持调用身份；effect 数据还会进入用于 commit 的 effect 结构 |
| state snapshot | 异步 state | snapshot 指当前 render 闭包中的值固定；不能简单归因“setState 异步” |
| batching | microtask | batching 是更新合并语义；microtask 是当前 root scheduling 的时机机制之一 |
| Lane | Scheduler priority | Lane 表示 React 更新集合/优先级语义；Scheduler priority 是任务执行层优先级 |
| Transition | setTimeout | Transition 是 React 更新语义/优先级；setTimeout 是宿主计时任务 |
| Concurrent | multi-thread | Concurrent 是可中断/可重放的协作式渲染语义，不等于多线程计算 |
| key | index | key 参与 sibling identity；index 仅在稳定不重排列表才可能安全 |
| `useEffect` | lifecycle method | Effect 建模“外部同步过程”，不是把 class 生命周期一一改名 |
| `useRef` | state | ref 变化不触发 render；state update 进入 React 调度协议 |
| `React.memo` | `useMemo` | 前者可跳过组件 render；后者在组件 render 中复用计算结果 |
| Suspense | ErrorBoundary | Suspense 处理可恢复等待/thenable；ErrorBoundary 处理渲染错误路径 |
| fallback | loading boolean | fallback 是边界级协调结果；boolean 是业务状态实现方式 |
| SSR | RSC | SSR 主要输出 HTML；RSC 输出可流式的组件数据/引用协议，目的不同 |
| Hydration | mount | hydration 尝试复用 server host tree；mount 创建新 host tree |
| Hydration | event binding | hydration 包含 Fiber/Host 匹配、状态恢复与调度，不只是事件 |
| Fizz | Flight | Fizz 是 React server HTML streaming；Flight 是 RSC wire protocol |
| Host Config | Reconciler | Host Config 提供环境操作；Reconciler 决定树更新和调度 |
| Profiler | Performance panel | Profiler 关注 React 工作；Performance panel 可看到主线程/浏览器 pipeline |
| React Compiler | Babel JSX transform | Compiler 做语义/依赖优化分析；JSX transform 主要做语法 lowering |
