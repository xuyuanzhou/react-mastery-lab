# 09. React 到浏览器像素：Style / Layout / Paint / Composite

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

请至少完成三件事：

1. **源码定位：** 在 `v19.3.0` tag 中找到本章列出的关键 symbol，并记录它的 caller / callee。
2. **断点验证：** 用最小 Demo 观察本章至少一个核心数据结构在更新前后的变化。
3. **脱稿解释：** 不使用“React 就是这样规定的”作为理由，而是用本章的不变量解释 API 约束。

达到精通标准时，你应该能回答：**如果删除本章某个关键数据结构或约束，系统具体会在哪一步失去正确性？**
