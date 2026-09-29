# 交付验证记录

日期：2026-09-29

- `npm install`：成功，已包含 package-lock.json。
- `npm run build`：TypeScript 检查与 Vite 生产构建通过，无大包警告。
- `npm test`：7 项通过；包括跨 Lane rebase、无跳过更新、key 移动、全部教材 md 内链、全部 source 函数锚点、官方版本/许可证、中文目录及附件导入/拒绝覆盖。
- 浏览器实测：三栏首页、Fiber 教材、源码函数点击定位、术语卡片、全文搜索、收藏与已读的刷新持久化、UpdateQueue 2 → 22、源码全文搜索 commitRoot、跨文件函数定位、源码后退、深浅主题。
- 大文件使用固定行高的窗口化渲染，每次最多创建 100 行代码节点；确认跳转到 ReactFiberWorkLoop.js 的 commitRoot 与 ReactFiberHooks.js 的 renderWithHooksAgain 可准确定位。
- 原始源码缓存：官方 v19.3.0 归档的 packages 目录，1,834 个可浏览代码文件，许可证及校验信息已保留。

## 交付边界

当前 28 篇是新编导学教材。没有取得原对话的原始文件，因此未声称迁移原知识库的所有章节。已提供整目录导入器，并验证不会覆盖同名原文；待获得原知识库后仍需实际导入和检查。

尚未执行真实 Vercel/Netlify 线上发布；项目已提供静态产物与部署配置。移动端有响应式样式，主要验收以桌面源码学习为准。教学实验不等于官方运行时的动态追踪。
