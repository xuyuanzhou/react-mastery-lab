# 35. React DOM 属性系统与受控组件

> 源码定位：点击 [ReactDOMComponent.js](source:packages/react-dom-bindings/src/client/ReactDOMComponent.js#L1)，在右侧查看 React v19.3.0 的实际实现。正文中的简化代码用于教学，请以该固定版本源码为准。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

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

<!-- ANSWER-GUIDE-START -->
## 本章自检参考解析

> 建议先遮住本节独立作答。每题至少说出“现象 → 内部机制 → 反例/边界”，再点击本章源码锚点核对。

1. **`value` 是动态属性与受控状态的一部分。** HTML attribute 常描述初始标记，而输入过程使用 DOM property；React 还需跟踪用户输入、选择位置与受控更新。只把 `value` 当字符串 attribute 写一次，无法解释键入后的同步行为。
2. **受控 input 的真值来自 React state/props。** `onChange` 把用户输入写回 state，下一次 Render 用新的 `value` 与 DOM 对齐。若只手动改 DOM 而不更新 state，之后的 React 更新可能把输入恢复成旧 state。
3. **Reconciler 只决定“这个 Host 节点需要怎样变”。** React DOM 绑定层负责浏览器属性、事件、样式和输入控件的具体语义；自定义 Renderer 可换成其他宿主实现而保留 Fiber、协调与调度机制。

更多情境题及答案：[全章节自检题](assessments/全章节自检题.md) · [参考答案](assessments/全章节自检题-参考答案.md)。
<!-- ANSWER-GUIDE-END -->
