# 13. React DOM 事件系统：Native Event → Fiber → Dispatch Queue → Lane

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么 DOM 节点必须能反查 Fiber？
2. root delegation 相比 document delegation 解决了什么架构问题？
3. Portal 为什么能证明 React propagation 不只是 DOM parentNode traversal？
4. nonDelegatedEvents 为什么存在？
5. 一次 click 中 `setState` 的 lane 从哪里获得优先级信息？
