import test from "node:test";
import assert from "node:assert/strict";
import { chapterMeta, validateCommunityChapter } from "./chapter-schema.mjs";

const complete = `<!-- chapter-meta: group=hooks; order=235 -->
# 自定义 Hook 与状态边界

## 学习目标
能够解释状态属于哪个组件，给出一个独立的最小示例，并预测重渲染结果。

## 核心机制
状态与当前 Fiber 的 Hook 链关联。首次调用创建 Hook，后续 Render 按固定顺序读取上一轮对应节点。这个顺序约束使得同一个组件的多次执行仍能找到自己的状态。自定义 Hook 复用逻辑，但每次调用都有独立的 Hook 节点。把共享数据放到模块变量会让不同组件实例互相影响；将它交给共同父组件或外部 Store 才能明确共享边界。事件处理器适合承载用户动作，Effect 适合和外部系统同步。实验要明确区分两者，不能把每个状态变化都写成 Effect。

## 源码定位
阅读 [renderWithHooks](source:packages/react-reconciler/src/ReactFiberHooks.js#renderWithHooks)，观察 Dispatcher 与 Hook 链的切换。

## 动手实验
建立两个使用同一自定义 Hook 的计数器。先预测点第一个按钮后的页面，再运行 Demo，记录两个计数器的值。然后把状态移到共同父组件，比较两次观察。解释变化来自状态所有权，而不是函数名。

## 自检
1. 两个组件调用同一个 Hook 函数，点击第一个组件按钮，第二个是否变化？写出前提。

## 参考答案
1. 默认不会，因为每个组件实例有自己的 Fiber 和 Hook 链。若 Hook 读取的是同一外部 Store，或者状态被提升到共同父组件并传下去，则两个组件可以同时看到变化。验证时先区分状态由谁持有，再看事件实际更新了谁。
`;

test("章节元信息决定分组和顺序", () => {
  assert.deepEqual(chapterMeta(complete), { group: "hooks", order: 235 });
  assert.deepEqual(validateCommunityChapter(complete, "example.md").errors, []);
});

test("无效分组、占位内容和缺失答案无法进入课程", () => {
  assert.throws(() =>
    chapterMeta(complete.replace("group=hooks", "group=unknown")),
  );
  const result = validateCommunityChapter(
    complete.replace("## 参考答案", "## 待填写"),
    "bad.md",
  );
  assert.ok(result.errors.some((error) => error.includes("参考答案")));
  assert.ok(result.errors.some((error) => error.includes("占位")));
});
