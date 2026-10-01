import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { chapterMeta, validateCommunityChapter } from "./chapter-schema.mjs";

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out.sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
}

const MASTER_PREFIX = "React原理精通/";
const hiddenMasterFiles = new Set([
  "CHATGPT-可点击导航.md",
  "MANIFEST.md",
  "README.md",
  "React-Mastery-完整合订版.md",
  "本地安装说明.md",
  "目录.md",
]);

const groupTitles = {
  basicsStart: "基础 01 / React 入门",
  basicsUi: "基础 02 / 组件与交互",
  basicsHooks: "基础 03 / Hooks 与状态",
  basicsEngineering: "基础 04 / 工程实践",
  start: "01 / 学习起点",
  runtime: "02 / React 运行时主线",
  hooks: "03 / Hooks 与状态",
  concurrency: "04 / 调度与并发",
  browser: "05 / 浏览器与事件",
  server: "06 / Suspense · SSR · RSC",
  architecture: "07 / 架构与性能",
  practice: "08 / 源码阅读 · 调试 · 验收",
  reference: "09 / 附录与参考",
  quick: "10 / 快速导学",
  engineering: "11 / 工程实践",
};

const groupOrder = Object.fromEntries(
  Object.keys(groupTitles).map((group, index) => [group, index]),
);

const practiceOrder = new Map([
  ["00C-从编译入口到浏览器像素-完整渲染链路.md", 700],
  ["42-架构总复盘与核心不变量.md", 701],
  ["43-从零到精通的因果知识图谱.md", 702],
  ["44-React源码阅读核心不变量与证明.md", 703],
  ["45-为什么React这样设计-架构权衡.md", 704],
  ["48-行为测试与可访问性验收.md", 706],
]);

function classifyMaster(id, body) {
  const rel = id.slice(MASTER_PREFIX.length);
  if (rel.startsWith("community/")) {
    const result = validateCommunityChapter(body, id);
    if (result.errors.length) {
      throw new Error(`${id}: ${result.errors.join("；")}`);
    }
    return chapterMeta(body);
  }
  const base = path.posix.basename(rel);
  const n = Number(base.match(/^(\d{2})/)?.[1]);
  if (rel.startsWith("prerequisites/")) {
    const pn = Number(base.match(/^(\d{2})/)?.[1] ?? 0);
    return { group: "start", order: 20 + pn };
  }
  if (rel.startsWith("labs/")) {
    const lab = Number(base.match(/^(\d{2})/)?.[1]);
    return {
      group: "practice",
      order: Number.isFinite(lab) ? 810 + lab : 825,
    };
  }
  if (rel.startsWith("assessments/")) {
    const order = base.includes("全章节自检题")
      ? base.includes("参考答案")
        ? 832
        : 831
      : base.includes("综合挑战题")
        ? base.includes("参考答案")
          ? 835
          : 834
        : 838;
    return { group: "practice", order };
  }
  if (rel.startsWith("debugging/")) return { group: "practice", order: 850 };
  if (rel.startsWith("mini-react/")) return { group: "practice", order: 860 };
  if (rel.startsWith("source-learning-app/"))
    return { group: "practice", order: 870 };
  if (rel.startsWith("appendix/")) return { group: "reference", order: 900 };
  if (base === "课程路线-能力里程碑.md") return { group: "start", order: 2 };
  if (base === "课程路线-12周.md") return { group: "reference", order: 999 };
  if (base.startsWith("18-源码阅读地图")) return { group: "start", order: 40 };
  if (base.startsWith("41-源码编译运行")) return { group: "start", order: 41 };
  if (base.startsWith("46-源码点击学习")) return { group: "start", order: 42 };
  if (base.startsWith("47-业务状态建模")) return { group: "start", order: 36 };
  if (base.startsWith("49-如何贡献新章节"))
    return { group: "reference", order: 898 };
  if (base === "专家架构审计报告.md") return { group: "practice", order: 705 };
  if (practiceOrder.has(base))
    return { group: "practice", order: practiceOrder.get(base) };
  if (base.startsWith("00P")) return { group: "start", order: 0 };
  if (base.startsWith("00A")) return { group: "start", order: 1 };
  if (base.startsWith("00D")) return { group: "start", order: 35 };
  if (base.startsWith("00-")) return { group: "runtime", order: 100 };
  if (base.startsWith("00B")) return { group: "runtime", order: 101 };
  if ([1, 2, 6, 7, 10, 37, 38].includes(n))
    return { group: "runtime", order: 100 + n };
  if ([3, 4, 5, 11, 12, 16, 24, 26, 27, 28, 29, 30, 32, 33].includes(n))
    return { group: "hooks", order: 200 + n };
  if ([8, 31, 36].includes(n)) return { group: "concurrency", order: 300 + n };
  if ([9, 13, 35].includes(n)) return { group: "browser", order: 400 + n };
  if ([14, 15, 20, 39].includes(n)) return { group: "server", order: 500 + n };
  if ([17, 19, 21, 22, 23, 25, 34, 40].includes(n))
    return { group: "architecture", order: 600 + n };
  return { group: "reference", order: 850 + (Number.isFinite(n) ? n : 0) };
}

const quickOrder = {
  prerequisites: 0,
  core: 1,
  hooks: 2,
  concurrency: 3,
  server: 4,
  architecture: 5,
  labs: 6,
  assessments: 7,
};

const basicsGroups = {
  "01-start": "basicsStart",
  "02-ui": "basicsUi",
  "03-hooks": "basicsHooks",
  "04-engineering": "basicsEngineering",
};

function classifyBasics(id) {
  const [, section, filename] = id.split("/");
  const group = basicsGroups[section];
  const order = Number(filename?.match(/^(\d{2})-/)?.[1]);
  if (!group || !Number.isInteger(order)) {
    throw new Error(`React 基础课程路径无效：${id}`);
  }
  return { group, order };
}

const chapters = [];
for (const p of await walk("content")) {
  if (!/\.md$/i.test(p)) continue;
  const body = await fs.readFile(p, "utf8");
  const id = p.slice("content/".length).replaceAll("\\", "/");
  if (id === "basics/README.md") continue;
  const isMastery = id.startsWith(MASTER_PREFIX);
  const rel = isMastery ? id.slice(MASTER_PREFIX.length) : "";
  if (isMastery && hiddenMasterFiles.has(rel)) continue;
  const top = id.split("/")[0];
  const classified = isMastery
    ? classifyMaster(id, body)
    : top === "basics"
      ? classifyBasics(id)
      : top === "engineering"
        ? { group: "engineering", order: chapters.length }
        : { group: "quick", order: quickOrder[top] ?? 9 };
  chapters.push({
    id,
    title: body.match(/^#\s+(.+)/m)?.[1]?.trim() || path.basename(p, ".md"),
    group: classified.group,
    groupTitle: groupTitles[classified.group] ?? classified.group,
    order: classified.order,
    track: isMastery ? "mastery" : top === "basics" ? "basics" : "guide",
  });
}

chapters.sort(
  (a, b) =>
    groupOrder[a.group] - groupOrder[b.group] ||
    a.order - b.order ||
    a.id.localeCompare(b.id, "zh-CN", { numeric: true }),
);

await fs.mkdir("src/generated", { recursive: true });
await fs.rm("public/教材附件", { recursive: true, force: true });
await fs.cp("content", "public/教材附件", { recursive: true });
await fs.writeFile("src/generated/chapters.json", JSON.stringify(chapters));
await fs.writeFile(
  "public/search-index.json",
  JSON.stringify(
    await Promise.all(
      chapters.map(async (chapter) => ({
        id: chapter.id,
        title: chapter.title,
        group: chapter.group,
        body: await fs.readFile(path.join("content", chapter.id), "utf8"),
      })),
    ),
  ),
);

const files = [];
for (const p of await walk("public/react-source")) {
  if (!/\.(js|jsx|ts|tsx)$/.test(p)) continue;
  const body = await fs.readFile(p, "utf8");
  const symbols = [];
  const lines = body.split("\n");
  lines.forEach((line, i) => {
    const patterns = [
      /^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/,
      /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\(?[^=]*\)?\s*=>)/,
      /^\s*(?:export\s+(?:default\s+)?)?class\s+([A-Za-z_$][\w$]*)/,
    ];
    for (const re of patterns) {
      const m = line.match(re);
      if (m) {
        symbols.push({ name: m[1], line: i + 1 });
        break;
      }
    }
  });
  files.push({
    path: p.slice("public/react-source/".length).replaceAll("\\", "/"),
    symbols,
    lines: lines.length,
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  });
}
await fs.writeFile(
  "public/source-index.json",
  JSON.stringify({
    tag: "v19.3.0",
    origin: "https://github.com/facebook/react/tree/v19.3.0",
    files,
  }),
);

// Publish an explicit, reviewable allowlist of this application's source for learning.
// Never copy .env files, git metadata, dependencies, generated content, or user data.
const projectPaths = [
  ...(await walk("src")).filter(
    (file) =>
      !file.startsWith("src/generated/") && /\.(ts|tsx|mjs|css)$/.test(file),
  ),
  ...(await walk("scripts")).filter((file) => /\.mjs$/.test(file)),
  ...(await walk("mini-react")).filter((file) => /\.mjs$/.test(file)),
  "vite.config.ts",
  "vitest.config.ts",
  "tsconfig.json",
  "package.json",
  "eslint.config.mjs",
  "README.md",
  "ARCHITECTURE.md",
  ".github/workflows/deploy-pages.yml",
];
await fs.rm("public/project-source", { recursive: true, force: true });
const projectFiles = [];
for (const file of projectPaths) {
  const output = path.join("public/project-source", file);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.copyFile(file, output);
  const body = await fs.readFile(file, "utf8");
  const symbols = [];
  body.split("\n").forEach((line, index) => {
    const match = line.match(
      /^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/,
    );
    if (match) symbols.push({ name: match[1], line: index + 1 });
  });
  projectFiles.push({
    path: file,
    symbols,
    lines: body.split("\n").length,
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  });
}
await fs.writeFile(
  "public/project-source-index.json",
  JSON.stringify({ tag: "this-project", files: projectFiles }),
);

const masteryCount = chapters.filter((c) => c.track === "mastery").length;
console.log(
  `Indexed ${chapters.length} chapters (${masteryCount} mastery), ${files.length} source files`,
);
if (chapters.length < 100 || masteryCount < 80) {
  throw new Error(
    `课程索引异常：只生成 ${chapters.length} 篇，其中主教材 ${masteryCount} 篇。`,
  );
}
