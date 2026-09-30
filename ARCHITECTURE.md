# 架构说明

## 目标与边界

React Mastery Lab 同时展示「教材、React 官方源码、工程自身源码、教学实验」。它是静态内容型 React 应用，适合学习清晰的数据流、功能模块、构建产物与交付检查。业务系统需要的认证、权限、服务端持久化和运维能力不在本项目范围内。

## 数据流

```text
content/**/*.md ───────────────┐
public/react-source/packages/ ─┤ scripts/index.mjs
src/、scripts/、配置白名单 ──────┘
          │
          ├─ src/generated/chapters.json     课程元数据，进入应用包
          ├─ public/教材附件/                 正文和图片，按章节加载
          ├─ public/search-index.json        全文索引，仅搜索时加载
          ├─ public/source-index.json        React 文件/函数索引
          ├─ public/project-source-index.json 本项目文件/函数索引
          └─ public/project-source/          可公开的本项目源码快照
```

`content/` 是教材唯一维护入口，生成物不应手工编辑或提交。构建器负责课程排序、路径保留与源码符号索引。官方源码固定在 `v19.3.0`，避免教材锚点随主分支变化。

## 应用分层

- `src/main.tsx` 负责 React 挂载、StrictMode 和路由容器。
- `src/app/App.tsx` 负责页面组合、导航、全局搜索和源码面板联动；`ErrorBoundary` 避免意外渲染异常导致整页空白。
- `src/features/learning/` 负责 Markdown、目录、术语和 `source:` / `project:` 锚点。
- `src/features/source/` 负责源码索引、文件树、函数搜索、按行定位和历史。
- `src/features/labs/` 负责可交互教学模型，与 React 内部实现严格区分。
- `src/features/progress/` 集中管理 `localStorage` 中的阅读状态；未来需要账户时应在这一边界引入服务端适配。

App 仍是应用外壳，不把业务 API 直接写进 JSX。若继续加入功能，优先抽取独立页面组件或服务模块，而不是继续增长外壳文件。

## 路由与状态

HashRouter 适配 GitHub Pages 静态子路径。章节 URL 含 `chapter` 与可选标题 `anchor`；右侧源码状态在面板内管理，前进/后退独立于教材路由。持久化状态包括已读、书签、最近访问和主题，仅在当前浏览器有效。读取时校验数据形状，写入失败时向用户提示。

Markdown 正文与搜索索引按需请求，显示加载/错误状态并取消过期请求。源码文件在浏览器内存中按来源和路径缓存；行窗口化渲染限制大文件的 DOM 数量。`project-source` 只复制白名单文件，避免无意发布私有配置。

## 质量与发布

`npm run check` 是本地和 GitHub Actions 共同的质量入口：ESLint → 测试 → TypeScript 与 Vite 构建。测试关注教学算法、教材链接、版本与许可证、索引完整性和导入器行为。Pages 工作流仅在通过后发布 `dist/`，不能把仓库根目录的 Vite 开发 HTML 当作产物。

企业业务项目应进一步增加：API 契约与错误策略、鉴权/授权、敏感信息保护、关键流程端到端测试、日志与性能指标、分环境配置、回滚策略。是否引入全局状态库、SSR 或微前端，应由业务约束决定。
