# 贡献教材章节

欢迎手写章节，也欢迎用其他 AI 生成初稿。所有发布内容都经过同一套可复现的校验与人工核对。网站是静态 GitHub Pages，在线阅读页不会直接写入仓库；新增章节通过 Git 变更与 PR 进入课程。

## 最短流程

1. 先查左侧目录与全文搜索，确认不是已有章节的重复版本。提出这一章要解决的具体问题，以及应放在哪个分组。
2. 运行 `npm run chapter:new -- --slug=your-topic --title="章节标题" --group=hooks --order=235`。草稿写在 `drafts/your-topic.md`，不会被网站发布。
3. 手写正文，或把 [AI 写作提示词](docs/AI_CHAPTER_PROMPT.md) 和[章节模板](docs/CHAPTER_TEMPLATE.md)交给其他 AI 起草。AI 生成的来源、例子、函数名、行号和运行结果都要人工验证。
4. 运行 `npm run chapter:validate -- drafts/your-topic.md`，补齐学习目标、机制、真实源码锚点、实验、自检和逐题答案。这个检查只验证结构；事实准确性仍要人工检查。
5. 把完成的文件复制到 `content/React原理精通/community/your-topic.md`，运行 `npm run check`。构建会自动把章节加入指定分组、全文搜索与阅读器；内链和源码 symbol 也会校验。
6. 提交 PR，写清本章问题、版本证据、实验步骤、答案如何得出，以及是否使用 AI 辅助。审阅通过后自动部署。

## 分组和顺序

文件顶部的 `<!-- chapter-meta: group=hooks; order=235 -->` 控制左侧课程位置。分组可用 `start`、`runtime`、`hooks`、`concurrency`、`browser`、`server`、`architecture`、`practice`、`reference`。`order` 是同组排序的 0–999 整数。不要通过改旧章节文件名来插入课程，以免破坏已有链接；如需前置关系，在正文写明并链接相关章节。

## 内容验收

- 先建立公共 API 现象，再解释内部机制；固定源码语境为 React v19.3.0。
- 图示要能被独立手算；术语首次出现给中文解释；代码示例可运行并说明环境。
- 每章有具体自检题及对应推导答案，读者不应因正文缺少前提而无法作答。
- 引用外部资料要给原始链接。官方源码的 `source:` 锚点必须指向真实文件与 symbol。教学 Mini React 的 `project:` 锚点不得伪装为官方实现。
- 对错误、性能和时序的结论写清版本及前提，避免“总是同步/异步”等口号。
- 不提交个人资料、密钥、大段复制内容、生成目录或 `node_modules`。

`npm run check` 会运行格式、静态检查、教材内链和源码锚点校验、Mini React 测试、TypeScript 与生产构建。它证明工程一致性，不代替审稿人对技术结论的复核。
