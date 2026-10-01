# 31. 组件测试与行为验证

> 第四阶段 · 工程实践 · 官方用法基于 React 文档；右侧源码对应本项目固定的 React v19.3.0 缓存。示例为教学代码，不是官方源码的逐行复制。

## 学习目标

- 理解本节概念，能独立解释其使用时机与边界。
- 能运行并修改示例，说明输入变化如何影响页面。
- 能指出一处常见错误，并知道到哪里查阅对应官方文档和源码。

## 核心知识

组件测试应验证用户能看见和执行的行为，而不是断言内部实现细节。使用 React Testing Library 模拟真实交互，用 getByRole、getByLabelText 等可访问查询定位元素。单元测试覆盖纯函数，组件测试覆盖渲染/事件，端到端测试覆盖完整业务路径。测试工具属于工程选型而非 React 内置功能。

## 实例：把知识应用到组件

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import Counter from './Counter';
it('点击后显示新计数', async () => {
  const user = userEvent.setup();
  render(<Counter />);
  await user.click(screen.getByRole('button', { name: /点击/ }));
  expect(screen.getByRole('button', { name: /1/ })).toBeTruthy();
});
```

**阅读代码的顺序：** 先辨认组件的输入与当前状态，再找事件或外部变化的触发点，最后预测下一次渲染会产生什么界面。对于带请求、DOM 或定时器的示例，注意执行环境与清理边界。

## 常见错误与正确做法

为了容易测试而读取组件内部 state，或用固定超时等待异步行为，导致测试脆弱。

## 动手练习

为登录表单补充“非法邮箱不可提交”和“合法邮箱触发提交”两个测试用例。

完成后，请尝试改变输入或状态，并写下你预计的输出、实际输出和差异原因。涉及浏览器的示例可以在本项目中创建练习组件运行，不要将其误认为直接复制就能独立启动的完整 Vite 工程。

## 自检问题

**为什么优先使用 getByRole？**

它贴近用户和辅助技术能感知的语义，也能暴露可访问性问题。

## 官方文档与源码连接

- React 官方文档：[组件测试与行为验证](https://react.dev/learn)。
- 固定版源码：[ReactFiberWorkLoop.js](source:packages/react-reconciler/src/ReactFiberWorkLoop.js)。
- 对照建议：最后从可访问性和性能角度完善真实项目。

## 完成标准

能够独立讲解核心概念、完成动手练习，并将一次组件行为与右侧源码中的相应阶段联系起来。读完后点击本平台的「标记已读」，需要回顾的内容可以收藏。

继续阅读：[32. 语义化与无障碍](32-04-engineering-语义化与无障碍.md)。
