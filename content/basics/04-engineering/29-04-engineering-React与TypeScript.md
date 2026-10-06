# 29. React 与 TypeScript

> 第四阶段 · 工程实践 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

使用 .tsx 文件编写包含 JSX 的 TypeScript 组件。Props 通过 type 或 interface 定义，useState 可以推断简单初始值；当初始值为 null 或空数组而类型不明确时，应添加泛型。事件类型可来自 React 的事件类型定义。类型检查帮助在编译时发现接口问题，但不会代替运行时校验。

## 实例：把知识应用到组件

```tsx
import { useState, type ChangeEvent } from 'react';
type SearchProps = { placeholder?: string; onSearch: (value: string) => void };
export default function Search({ placeholder = '搜索', onSearch }: SearchProps) {
  const [value, setValue] = useState<string>('');
  function change(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
  }
  return <><input placeholder={placeholder} value={value} onChange={change} />
    <button onClick={() => onSearch(value)}>搜索</button></>;
}
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

使用 any 逃避 Props 约束，或在可空 DOM ref 上使用无保护的 ! 访问。

## 动手练习

定义 Todo 类型，给 TaskList 的 items 与 onToggle 添加精确的类型，保证 TS 类型检查通过。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么 useState(null) 常需要显式泛型？**

否则 TypeScript 可能只推断出 null，后续赋入对象时不符合推断类型。

## 官方文档与源码连接

- React 官方文档：[React 与 TypeScript](https://react.dev/learn/typescript)。
- 固定版源码：[ReactHooks.js → useState](source:packages/react/src/ReactHooks.js#useState)。
- 源码阅读边界：TypeScript 在构建阶段检查类型；React 的 `ReactHooks.js` 使用 Flow。再对照本项目的 [tsconfig.json](project:tsconfig.json) 和 [进度类型](project:src/features/progress/useProgress.ts) 区分源码类型与应用类型。
- 对照建议：接下来学习按需加载和 Suspense 的正确边界。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[30. lazy、Suspense 与代码分割](30-04-engineering-lazySuspense与代码分割.md)。
