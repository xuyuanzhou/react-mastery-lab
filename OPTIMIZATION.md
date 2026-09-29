# 本轮优化摘要

## 教材

- 完整接入此前《React 原理精通》Markdown 知识库。
- 恢复 prerequisites、labs、assessments、mini-react、debugging、appendix。
- 主教材与快速导学分层，避免 100+ 文档全部平铺。
- 补齐源码学习前置知识：闭包、链表/树/位运算、DOM/CSSOM、Event Loop、模块/打包、JSX/AST、Flow、Monorepo/调试、性能基础。
- Markdown 内链完整校验。

## 文档阅读器

- 正文改为按需加载。
- 搜索索引改为懒加载。
- 课程树按当前章节自动展开。
- 支持 GFM、TOC、标题锚点、图片相对路径、上一章/下一章。
- 专业英文术语保留并提供中文解释。
- 术语匹配正则改为一次预编译，避免长文档每个文本节点重复构造正则。

## 源码学习

- 固定 React v19.3.0 本地源码缓存。
- 构建期生成 1834 个源码文件的 Symbol 索引。
- Markdown inline code 中的真实 React Symbol 可直接打开源码。
- `source:` 和固定 GitHub blob 链接可精确定位文件 / 函数 / 行。
- 源码面板增加“相关课程”，实现 source → docs 反查。
- 主调用链扩展为 createRoot → createContainer → createFiberRoot → updateContainer → scheduleUpdateOnFiber → ensureRootIsScheduled → performWorkOnRoot → beginWork → renderWithHooks → completeWork → commitRoot。

## 学习状态

- 完成状态、书签、最近访问、主题保留在 localStorage。
- 进度只统计完整主教材，不用快速导学稀释进度。

## 工程质量

- 构建期自动生成课程 manifest、全文搜索、术语表、源码索引、docs↔source 映射。
- 自动测试扩展为 9 项。
- npm lock 下载地址改回官方 registry，降低 Vercel/Netlify 构建对特定镜像的依赖。
- 移除不可再信任的旧 dist 与残缺 node_modules，避免误部署旧页面。

## Runtime Lab：从静态模型升级为单步运行时教学

- 新增 `src/runtimeLab.ts`，把一次 `setState` 拆成 Event → Schedule → Render → Complete → Commit → Browser 的可验证步骤。
- 每一步都绑定 React v19.3.0 的真实源码文件/函数，并展示 Hook/UpdateQueue、Fiber current/WIP、Root pendingLanes 快照。
- `Labs.tsx` 支持上一步、下一步、自动播放、重置，并在推进时同步右侧源码面板。
- WorkLoop 实验会随 DFS 步骤高亮 HostRoot/App/Counter/Button，并自动在 `beginWork` / `completeWork` 源码之间切换。
- Effect 实验新增 mount/update/unmount/StrictMode 四种时序视角。
- 教材中的 Fiber、Hooks、useState、Effect、Diff、Lane、浏览器渲染等章节增加“在实验室验证”入口。


## 本轮继续优化：长期学习体验

- 课程树新增“全部 / 主教材 / 未读 / 收藏”筛选和本地标题搜索，110 篇课程不再只能平铺浏览。
- 每个课程分组显示主教材完成度，并保持当前章节分组自动展开。
- 阅读正文增加页内阅读进度、当前 TOC 高亮和代码块一键复制。
- 全局搜索升级为“教材 / 术语 / 源码函数”三种范围。
- Source Viewer 全文搜索新增“当前 package / 核心 packages / 全仓”范围与扫描进度，避免默认扫描 1800+ 文件。
- 源码面板可复制固定 `v19.3.0` GitHub permalink。
- Runtime Lab 支持 URL 中记录 `tab + step`，可直接分享具体实验步骤；支持 ← / → 单步与 Space 播放。
- `setState` 主实验会解释“本步发生的数据变化”和“必须保持的系统不变量”，并把 Browser Pipeline 从 Commit Phase 单独区分。
- `Labs` 与 `SourceViewer` 改为 lazy loading，降低学习首页的首屏代码负担。
- 新增回归测试，课程数量若退回旧 28 篇索引，或 dev/build 不再自动执行索引生成，会直接测试失败。

## 本轮增强：Learning IDE 工作流

- 左侧课程树支持即时筛选，并提供“全部 / 主教材 / 未读 / 书签”四种学习视图；组标题直接显示完成度。
- Markdown 阅读页增加连续阅读进度条、当前 TOC 高亮、代码块一键复制。
- 全局搜索统一为“教材全文 / 中英术语 / React 源码函数”三种范围。
- 本章 TOC 下方增加“源码锚点”，可直接从当前章节跳到相关 React v19.3.0 文件/函数。
- 右侧源码面板支持拖拽改变宽度并持久化；双击源码中的函数名时，会尝试跳转到已索引 React symbol。
- 学习 URL 现在可以同时保存 `chapter + anchor + source + symbol/line`，刷新或分享链接时可以恢复“文档 + 源码”的同一学习现场。
- Runtime Lab 9 个实验全部绑定“本实验目标 / 真实源码 / 对应教材”，不仅 setState 主实验可回到源码。
- Runtime Lab 的数据与源码映射继续固定 React v19.3.0，并增加回归校验。
