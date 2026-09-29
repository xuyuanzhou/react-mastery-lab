# React Mastery Lab

一个可静态部署的 React 源码学习平台。React 19.3.0 + TypeScript + Vite + React Router，教材与官方源码在同一界面联动。状态仅使用 React hooks 与 localStorage，无后端、数据库或 GitHub API token。

## 开始使用

需要 Node.js 22 或更新版本，以及 npm。首次安装依赖需要网络。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。生成线上文件：

```bash
npm run build
npm test
npm run preview
```

`dist/` 是可以直接部署的静态站点。请通过 HTTP 服务访问，不要双击 index.html 使用 file:// 打开。

## 功能

- 左侧按前置基础、核心原理、Hooks、调度/并发、SSR/RSC、架构、labs、assessments 分组；目录可折叠。
- 首页学习路线、继续学习、学习进度。收藏、已读、最近 12 篇访问和主题保存在当前浏览器的 localStorage。
- GFM Markdown：表格、代码高亮、标题锚点、TOC、内部 Markdown 链接、上一章/下一章、正文全文搜索（⌘/Ctrl + K）。
- 专业术语悬停提示；点击或键盘 Enter 打开中英解释卡片。行内代码中的精确术语也可点击。
- 官方 `facebook/react` 的 `v19.3.0` packages 目录缓存，1,834 个 JS/JSX/TS/TSX 文件可在源码树中阅读；文件名过滤、函数声明索引、全源码文本搜索、行高亮和独立前进/后退历史。
- 点击 `source:` 教材链接或固定 tag 的 GitHub 源码链接，在右侧定位。源码主链中的八个节点也可以点击。
- 八类交互教学：Fiber 双树、Hooks 链表、UpdateQueue rebase、Lane 位运算、Effect 时序、Diff/key、Render/Commit、浏览器 pipeline。
- 深浅主题、桌面三栏独立滚动；窄屏课程与源码以抽屉呈现，可通过顶栏切换。

## 教材来源与完整性

**本次未获得原对话“React原理精通”与“React源码点击学习器”的真实文件。** 原对话只返回文字与不可下载的内容引用，没有附件。因此 `content/` 的 28 篇是本项目新编写的导学教材，不是原知识库的完整迁移，也不能替代原有完整课程。首页和教材正文明确展示此状态。

拿到原目录后，整体导入，不需要手工复制每一篇：

```bash
npm run import -- "/实际路径/React原理精通"
npm run build
npm test
```

导入器把整个目录放到 `content/React原理精通/`，保留目录、文件名及附件；排除 `node_modules`、`.git`、`dist`。已有同名文件会报错，避免静默覆盖。构建递归索引全部 `.md`（含 `.MD`），不设章节数量上限，未识别目录也显示为独立分组。原文件仍保留在 content 中；配套资源复制到 `public/教材附件/` 供相对图片链接读取。

`npm test` 检查普通相对 Markdown 链接和 `source:` 锚点，帮助发现原教材缺失文件或失效函数。导入器本身不保证原教材的链接原本正确；发现问题时需修复对应 Markdown。HTML 不直接执行，MDX、原始 HTML 嵌入及原教材自带的任意 JavaScript 小工具不作为可执行课程载入。

新建章节例子：

```text
content/
  prerequisites/01-closure.md
  core/02-fiber.md
  hooks/02-state-queue.md
  concurrency/01-lanes.md
  server/02-rsc.md
  architecture/01-design.md
  labs/01-lab-guide.md
  assessments/01-questions.md
```

新增文件后运行 `npm run index`；重新部署时 `npm run build` 会自动生成索引。章节顺序按课程分组、文件名自然排序。

## Markdown 联动协议

```markdown
[相邻教材](../hooks/02-state-queue.md)
[本章目标](#本章目标)
[函数](source:packages/react-reconciler/src/ReactFiberHooks.js#renderWithHooks)
[第 505 行](source:packages/react-reconciler/src/ReactFiberHooks.js#L505)
[官方链接](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js#L505)
```

标题 id 使用 rehype-slug 的 GitHub 风格生成规则，重复标题自动加后缀。HashRouter 的路由参数保存章节和标题锚点，因此刷新或直接分享章节链接不依赖服务器重写。

`source:` 路径相对于官方仓库根目录。函数定位优先使用当前缓存索引中的行号。未找到函数时会显示提示并打开文件顶部，不伪造定位。函数索引静态识别具名 `function` 声明（含 export/async/generator），并非完整 AST/调用关系分析；匿名函数、对象方法、箭头函数请使用全文搜索。调用链是跨调度边界的教学路径，不是自动生成的调用图。

## 源码缓存

来源为官方固定 tag 的 codeload 归档：

https://codeload.github.com/facebook/react/tar.gz/refs/tags/v19.3.0

`public/react-source/provenance.json` 记录 tag、下载时间、原始归档 SHA-256；`public/source-index.json` 记录每个可浏览文件的 SHA-256、行数和函数声明。官方文件未改写，MIT 许可证保留在 `public/react-source/LICENSE`。

运行时只向本站请求缓存文件，**不请求 GitHub API**。源码搜索首次需要读取缓存，因此可稍慢；支持取消，最多显示 150 条。浏览器会在内存中缓存读过的文件，文件不会并入首屏 JavaScript 包。

需要重新拉取同一个固定版本时：

```bash
npm run sync-source
npm run build
npm test
```

同步脚本需要联网与 `tar`，macOS/Linux 默认提供。没有联网也能使用已交付缓存构建。完整开发仓库的 fixtures/scripts 并未作为可运行的 React 内部构建环境提供；本项目缓存的是官方 packages 源码目录。

## 实验边界

实验是可交互的教学模型，不是 React 内部运行时调试器。UpdateQueue 模型只保留 lane 跳过与 rebase 的关键逻辑；Lane 实验用 3 位示意，不能拿其常量替代官方常量。Fiber 实验省略 bailout、错误恢复等分支。Effect 演示说明 passive effect 不保证总在浏览器 paint 后。RSC/SSR 提供教材与源码阅读，本平台自身不运行 RSC 服务。

要调试真实 React，需要官方仓库开发构建、对应 source map 与 debugger。不要把本平台的模型动画当作官方性能测试结果。

## 部署到 Netlify

项目内含 `netlify.toml`。将项目提交到自己的 Git 仓库，在 Netlify 导入：

- Build command：`npm run build`
- Publish directory：`dist`
- Node：22 或更新

也可本地构建后将 `dist` 拖入 Netlify 的手动部署入口。`HashRouter` 不需要额外重写规则。未在本次交付中创建线上账户或执行线上发布。

## 部署到 Vercel

项目内含 `vercel.json`。导入仓库，框架选择 Vite，构建命令 `npm run build`，输出目录 `dist`。部署前可执行 `npm test`。资源路径采用 `base: './'`，也适用于在 GitHub Pages 的仓库子目录托管构建产物。

## 目录与开发入口

```text
src/App.tsx             课程、阅读器、搜索、书签与主题
src/SourceViewer.tsx    源码浏览、搜索、定位与历史
src/Labs.tsx            八类交互教学
src/simulation.mjs     可独立验证的队列和 Diff 教学算法
src/model.ts           术语、源码链接、主链和分组
src/style.css          主题与响应式样式
src/generated/         自动生成的教材数据
content/               可维护的 Markdown 原文
scripts/index.mjs      构建期教材与源码索引
scripts/import.mjs     完整原目录导入
scripts/sync-source.mjs 固定版本缓存同步
scripts/verify.test.mjs 内容完整性与算法验收
public/react-source/   官方源码与许可证
```

项目没有云同步；不同浏览器的学习记录不会自动互通。清除浏览器网站数据会清除学习记录。localStorage 不可写时页面给出提示，并保持当前会话可用。

## 部署到 GitHub Pages（已配置自动发布）

项目包含 `.github/workflows/deploy-pages.yml`。每次推送到 `main`，自动安装依赖、生成教材/源码索引、构建、运行七项检查，全部通过后发布 `dist`。

1. 在 GitHub 创建自己的仓库，例如 `react-mastery-lab`。免费个人账户可使用公开仓库的 Pages；私有仓库的可用性取决于账户套餐。
2. 将本项目根目录的文件提交到仓库的 `main` 分支。必须包含隐藏目录 `.github`、`content`、`public/react-source` 及 `package-lock.json`；不需要提交 `node_modules` 或 `dist`。
3. 仓库进入 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
4. 打开 **Actions → Deploy React Mastery Lab to GitHub Pages → Run workflow** 首次运行；以后推送 `main` 自动更新。
5. 部署成功后，进入 Actions 中的 `github-pages` 环境链接，或查看 Settings → Pages 显示的网站地址。通常为 `https://你的用户名.github.io/react-mastery-lab/`。

如果默认分支叫 `master`，把 workflow 的 `branches: [main]` 改为 `[master]`。如果 GitHub 显示环境审批，需要仓库管理员在 Actions 中完成审批。

Vite 已使用相对资源路径 `base: './'`，并采用 HashRouter，因此仓库名改变通常不必修改前端配置，直接刷新 `/#/learn?...` 章节链接也不会产生 Pages 路由 404。请用部署页面给出的带末尾 `/` 的根地址访问。源码缓存来自本站，不消耗 GitHub API 额度。

这是纯静态部署，不能执行服务端 API、SSR 或 RSC 运行时。本项目的对应内容是教材与官方源码阅读，不依赖服务端执行。

配置依据：[GitHub 官方 Pages 自定义工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。当前只交付部署配置，尚未关联你的 GitHub 仓库、推送或实际发布。
