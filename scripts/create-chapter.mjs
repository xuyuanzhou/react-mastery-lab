import fs from "node:fs/promises";
import path from "node:path";
import { chapterGroups } from "./chapter-schema.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((part) => {
    const [key, ...value] = part.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);
const { slug, title, group, order = "999" } = args;
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  throw new Error("请提供 --slug=lowercase-kebab-case");
}
if (!title?.trim()) throw new Error("请提供 --title=中文章节名");
if (!chapterGroups.has(group))
  throw new Error("请提供有效的 --group=hooks 等分组");
if (!/^\d{1,3}$/.test(order) || Number(order) > 999) {
  throw new Error("--order 必须是 0–999");
}
const target = path.join("drafts", `${slug}.md`);
await fs.mkdir("drafts", { recursive: true });
await fs.writeFile(
  target,
  `<!-- chapter-meta: group=${group}; order=${order} -->
# ${title.trim()}

> 版本语境：React v19.3.0。先解释公共 API 现象，再进入该 tag 的内部实现。

## 学习目标

待填写：学完后能独立预测、解释和验证什么。

## 先用白话理解

待填写：一个最小现象与读者已知概念的联系。

## 核心机制

待填写：数据结构、因果步骤、关键分支和一个反例。可加入图与表，但要解释图中每条箭头。

## 源码定位

待填写：到 React v19.3.0 中查证后，加入真实的 [函数名](source:packages/真实路径.js#真实函数名) 链接，并说明观察什么。

## 动手实验

待填写：最小 Demo、操作步骤、预期结果、真实结果与偏差解释。

## 自检

1. 待填写：给定具体情境，要求预测或手算。

## 参考答案

1. 待填写：不仅给结论，还要写推导步骤、源码依据与边界。

## 延伸资料

- 待填写：优先提供 React 官方文档或固定 tag 源码链接。
`,
  { flag: "wx" },
);
console.log(
  `已创建草稿 ${target}。完成后运行 npm run chapter:validate -- ${target}`,
);
