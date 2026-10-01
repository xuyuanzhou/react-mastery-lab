# React Mastery Lab

一个可在线阅读的 React 19.3.0 源码学习平台，同时也是可供学习的 React + TypeScript + Vite 工程。线上地址：[React Mastery Lab](https://xuyuanzhou.github.io/react-mastery-lab/)。

平台包含 93 篇《React 原理精通》主教材、28 篇快速导学及 4 篇工程实践课程。左侧读教材，右侧可切换阅读固定的 React v19.3.0 官方源码或本项目的构建期源码快照。官方源码提供可切换的中文讲解层：在关键函数行点击「译」查看机制、阅读重点和对应教材，原始源码与行号保持不变。教学实验用于理解机制，不是 React 内部运行时的完整复刻。

## 本地开发

要求 Node.js 22+ 与 npm。首次安装需要网络；之后日常构建使用仓库里的官方源码缓存。

```bash
npm ci
npm run dev
```

浏览器打开终端显示的地址。提交前运行：

```bash
npm run check
```

`check` 顺序执行 ESLint、测试和生产构建。`npm run preview` 可以本地检查 `dist/`。不要直接双击 `index.html`；它是 Vite 开发入口，必须经过构建或开发服务器处理。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 生成索引并启动开发服务器 |
| `npm run index` | 从 Markdown 与源码缓存重建所有索引 |
| `npm run lint` | 检查 TypeScript、React Hooks 与脚本规则 |
| `npm run typecheck` | 独立运行 TypeScript 类型检查 |
| `npm test` | 生成索引并运行教学算法、内容、源码完整性和阅读器交互测试 |
| `npm run build` | 生成索引、类型检查并构建 `dist/` |
| `npm run check` | 提交/部署前的统一质量检查 |
| `npm run format` | 格式化应用、脚本和配置代码 |
| `npm run preview` | 本地预览正式构建 |

## 工程结构

```text
content/                        Markdown 教材，内容的唯一维护入口
  React原理精通/               原有主教材与实验材料
  engineering/                 学习本项目的四篇工程实践课
src/
  main.tsx                     React 入口、StrictMode、HashRouter
  app/                         应用外壳与渲染错误边界
  features/learning/           Markdown 阅读、术语、源码锚点、课程模型
  features/source/             官方源码与本项目源码浏览
    annotations.ts              人工校对的 React 19.3.0 函数级中文讲解
  features/labs/               教学实验和独立算法
  features/progress/           进度、书签和主题的本地持久化
  generated/                   构建期课程元数据，不手工编辑
scripts/                        索引生成、教材导入、源码缓存同步与测试
public/react-source/            固定 React v19.3.0 packages 缓存及许可证
.github/workflows/              GitHub Pages 自动检查与发布
```

`src/generated/chapters.json` 仅含课程元数据。Markdown 正文通过 `public/教材附件/` 按章请求；全文搜索索引只在打开搜索框时加载。这避免把教材正文打进首页 JS。`public/project-source/` 是构建期从明确的源文件白名单生成的本站项目源码快照，不会复制 `.env`、依赖或 Git 元数据。

## 在线学习本项目

进入首页的「学习这个工程」或左侧「工程实践」分组。打开右侧源码面板，选择「本项目源码」。工程课程里的 `project:` 链接会直接定位本项目代码，`source:` 链接定位官方 React 代码：

```markdown
[应用入口](project:src/main.tsx#L1)
[进度 Hook](project:src/features/progress/useProgress.ts#useProgress)
[React Hook 实现](source:packages/react-reconciler/src/ReactFiberHooks.js#renderWithHooks)
```

查看 [架构说明](ARCHITECTURE.md) 了解内容生成、状态和部署边界。这个工程展示静态内容型应用的合理实践；账号、服务端权限、数据库、监控和分环境发布需按实际业务设计，不能把本项目当作已具备这些能力的企业系统。

## 中文源码注释

在右侧「React 官方源码」范围打开关键函数后，中文注释卡会说明该函数的职责与值得观察的字段/分支；代码行旁的「译」标记可重新打开注释。「中文注释」标签支持浏览当前文件或跨文件搜索已编写的注释，工具栏按钮可暂时隐藏讲解层。注释是独立的教学数据，不会插入或改写 `public/react-source/` 中的官方文件，因此 GitHub 固定 tag、行号和源码校验仍可对照。

桌面端可拖动教材与源码之间的竖向分隔线调整源码窗口，宽度保存在 localStorage；分隔线支持方向键。工具栏的「关闭注释」和讲解卡右上角的 × 可关闭中文讲解，点击「显示注释」可恢复。

新增注释时在 `src/features/source/annotations.ts` 添加真实文件路径、symbol、中文说明与教材章节；测试会校验 symbol 和章节都存在。尚未注释的函数仍可通过函数索引和全文源码搜索阅读。

## 内容与官方源码

教材原文保存在 `content/`，新增 `.md` 后运行 `npm run index`。如要导入另一份完整《React 原理精通》目录：

```bash
npm run import -- "/实际路径/React原理精通"
npm run check
```

导入器保留嵌套路径和附件，拒绝覆盖已有文件。React 官方源码固定为 `facebook/react` 的 `v19.3.0`，本地缓存含 1,834 个可浏览代码文件。`public/react-source/provenance.json` 记录下载来源与校验信息，MIT 许可证在 `public/react-source/LICENSE`。运行时读取本站缓存，不依赖 GitHub API 额度。需要重新同步时运行 `npm run sync-source`，此命令需要网络。

## 部署

仓库的 [GitHub Pages 工作流](.github/workflows/deploy-pages.yml) 在推送 `main` 后执行 `npm ci`、`npm run check`，检查通过才上传 `dist/`。GitHub 仓库的 **Settings → Pages → Build and deployment → Source** 应选择 **GitHub Actions**。Vite 使用 `base: './'`，路由使用 HashRouter，适用于 `https://用户名.github.io/react-mastery-lab/` 这样的仓库子路径。

也可用 `netlify.toml` 或 `vercel.json` 部署：构建命令 `npm run build`，输出目录 `dist`，Node.js 22+。这是纯静态站点；平台展示 SSR/RSC 教材与源码，但自身不运行 SSR/RSC 服务。

学习进度仅保存在当前浏览器 `localStorage`。清除网站数据会清除记录，不会自动跨设备同步。
