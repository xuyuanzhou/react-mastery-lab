# 23. React Compiler：HIR、数据流分析、Rules of React 与自动 Memoization
> 学完即练：[对应实验](labs/10-Compiler与Profiling.md)。先写预测，再观察源码和结果。

<!-- TERMS-AUTO-START -->
## 本章专业术语（English → 中文）

> 阅读源码时建议记住英文名称；中文用于快速建立概念映射。完整词表见 [`appendix/专业术语中英对照表.md`](appendix/专业术语中英对照表.md)。

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

> 先独立完成，再对照：[《章节自检：参考答案与验收标准》](assessments/章节自检-参考答案.md)。

1. 为什么 React Compiler 需要自己的 IR？
2. 自动 memo 为什么依赖 Render purity？
3. 为什么 Compiler 不是“自动包 React.memo”？
4. 为什么 Compiler 不能解决 layout thrashing？

<!-- CHAPTER-CHECK-START -->
## 本章情境自检与参考解析

**先独立作答：** 为何 React Compiler 不能对任意含副作用的组件安全做自动 memo？

**参考解析：** 编译器依赖纯度和可分析的数据流；任意副作用或原地修改会改变缓存/重放后的语义。

答题时请写出导致这个结论的关键步骤，并用本章正文的示例或右侧固定版本源码核对。更多题目见[全章节自检题](assessments/全章节自检题.md)，对应的[参考答案](assessments/全章节自检题-参考答案.md)可供核对。
<!-- CHAPTER-CHECK-END -->
