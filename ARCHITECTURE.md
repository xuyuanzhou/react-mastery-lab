# React Mastery Lab 架构说明

## 1. 产品目标

React Mastery Lab 不是单纯 Markdown 阅读器，也不是普通 GitHub 源码浏览器。它把三种学习视图放在一个系统中：

```text
系统教材（Why / What）
        ↕
真实 React v19.3.0 源码（How）
        ↕
交互实验（Observe / Verify）
```

学习者从概念进入源码，再从源码反查课程和实验，形成闭环。

## 2. 内容是 Source of Truth

完整课程保存在：

```text
content/React原理精通/
```

构建阶段 `scripts/index.mjs` 负责生成运行时索引，而不是在 React 组件里手工维护目录。

生成物：

```text
src/generated/chapters.json          课程元数据
src/generated/glossary.json          中英术语
src/generated/source-relations.json  docs ↔ source 映射
public/search-index.json             懒加载全文搜索
public/source-index.json             React 源码文件与 Symbol 索引
public/docs/                          按需加载的 Markdown / 静态资源
```

因此新增课程应该优先新增 Markdown，而不是修改 UI 路由。

## 3. 为什么 Markdown 正文不打进主 Bundle

完整教材超过百篇。若用 `import.meta.glob(..., eager: true)` 把正文全部打进 JS：

- 首屏体积会随教材持续增大；
- 每次文档修改都会影响主 Bundle；
- 搜索和正文阅读无法独立缓存。

当前方案把正文复制到 `public/docs`，章节打开时按需 fetch；全文索引也仅在打开搜索时加载。

## 4. docs ↔ source 双向关系

构建器识别三类锚点：

```text
source:packages/...#symbol
GitHub blob/v19.3.0 固定链接
正文中的真实 React Symbol / 源码路径
```

结果写入 `source-relations.json`。

因此：

```text
Markdown 里的 renderWithHooks
→ ReactFiberHooks.js

ReactFiberHooks.js / renderWithHooks
→ 相关 Hooks / WorkLoop / setState 课程
```

## 5. 固定 React v19.3.0

源码学习平台不能跟随 `main` 漂移，否则教材、函数名、路径、行号会逐渐失真。

```text
教材版本
↕
源码版本 v19.3.0
↕
Symbol / 文件路径
```

必须稳定绑定。

## 6. 实验的定位

`src/Labs.tsx` / `src/simulation.mjs` 是教学模型，不是 React Runtime 的重新实现。

实验负责建立直觉：

- Fiber current / WIP
- Hook 顺序
- UpdateQueue + rebase
- Lane 位集合
- Effect 时序
- key / Diff
- Render / Commit
- Browser Pipeline

真实行为最终仍以右侧 React 官方源码为准。

## 7. 长期演进建议

后续优先顺序：

```text
P0 教材 ↔ 源码锚点质量
P1 Fiber / Hook / UpdateQueue 可视化
P2 Lane / WorkLoop / Diff / Effect 单步播放器
P3 Suspense / Hydration / RSC 实验
P4 学习笔记 / 自测 / spaced repetition
P5 可选云同步
```

不要优先引入账号系统、复杂后端或重型状态管理。这个产品的核心价值是“从解释到真实源码的距离足够短”。

## Runtime Lab 数据层

`src/runtimeLab.ts` 不是 React 运行时副本，而是教学状态机。它负责把抽象源码调用拆成可观察快照：

```text
RuntimeStep
├─ phase / summary / why
├─ React v19.3.0 SourceTarget
├─ related chapter
├─ Hook / UpdateQueue snapshot
└─ Fiber current / WIP / root pendingLanes snapshot
```

UI 只消费这些快照，因此后续可以继续加入 Transition、Suspense、Hydration 场景，而不把复杂状态硬编码进组件。

## 学习交互层（2026-09-29 继续优化）

### 课程导航

课程树不再只承担“文件目录”职责，而是学习状态视图：

- 全部课程
- 主教材
- 未读
- 书签
- 本地关键词筛选
- 分组完成度

`src/generated/chapters.json` 仍是单一课程 manifest；UI 只做派生筛选，不维护第二份课程数据。

### 三域统一搜索

全局搜索分为三种语义域：

```text
教材全文 → search-index.json
中英术语 → glossary.json
React 源码函数 → source-relations.json
```

这样用户搜索 `Fiber`、`协调` 或 `renderWithHooks` 时，不需要先知道它属于哪一种资源。

### Runtime Lab 深链

实验室 URL 使用：

```text
/labs?tab=<experiment>&step=<step>
```

`tab` 表示实验，`step` 表示教学执行步骤。该状态可复制、刷新、分享，并与右侧官方源码同步。

### 可调整源码工作区

源码面板宽度通过 CSS 自定义属性 `--source-width` 控制，拖拽结果保存到 `localStorage`。主内容与源码工作台仍使用同一 CSS Grid，不引入复杂 split-pane 依赖。

## Learning Context URL

应用把“正在读什么”和“正在追哪段源码”视为同一个学习上下文。URL 可同时包含：

```text
/learn?chapter=<markdown-id>&anchor=<heading>&source=<react-file>&symbol=<symbol>&line=<line>
```

`chapter/anchor` 驱动 Markdown 阅读器；`source/symbol/line` 驱动右侧 Source Viewer。这样刷新页面、收藏链接或分享给别人时，不会丢失源码定位。

## UI state 与持久化边界

只把适合长期保留的个人学习状态放进 localStorage：

- 已读章节
- 书签
- 最近访问
- 深浅主题
- 源码面板宽度

课程索引、源码索引、术语表和 docs↔source 关系均由构建期生成，不能写入 localStorage 作为权威数据源。
