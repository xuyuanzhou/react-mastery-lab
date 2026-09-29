import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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
};

function classifyMaster(id) {
  const rel = id.slice(MASTER_PREFIX.length);
  const base = path.posix.basename(rel);
  const n = Number(base.match(/^(\d{2})/)?.[1]);
  if (rel.startsWith("prerequisites/")) {
    const pn = Number(base.match(/^(\d{2})/)?.[1] ?? 0);
    return { group: "start", order: 20 + pn };
  }
  if (rel.startsWith("labs/")) return { group: "practice", order: 810 };
  if (rel.startsWith("assessments/")) return { group: "practice", order: 830 };
  if (rel.startsWith("debugging/")) return { group: "practice", order: 850 };
  if (rel.startsWith("mini-react/")) return { group: "practice", order: 860 };
  if (rel.startsWith("source-learning-app/")) return { group: "practice", order: 870 };
  if (rel.startsWith("appendix/")) return { group: "reference", order: 900 };
  if (base === "课程路线-12周.md") return { group: "start", order: 2 };
  if (base === "专家架构审计报告.md") return { group: "architecture", order: 799 };
  if (base.startsWith("00P")) return { group: "start", order: 0 };
  if (base.startsWith("00A")) return { group: "start", order: 1 };
  if (base.startsWith("00-")) return { group: "runtime", order: 10 };
  if (base.startsWith("00B")) return { group: "runtime", order: 11 };
  if (base.startsWith("00C")) return { group: "runtime", order: 12 };
  if ([1, 2, 6, 7, 10, 37, 38, 42, 43, 44, 45].includes(n)) return { group: "runtime", order: 100 + n };
  if ([3, 4, 5, 11, 12, 16, 24, 26, 27, 28, 29, 30, 32, 33].includes(n)) return { group: "hooks", order: 200 + n };
  if ([8, 31, 36].includes(n)) return { group: "concurrency", order: 300 + n };
  if ([9, 13, 35].includes(n)) return { group: "browser", order: 400 + n };
  if ([14, 15, 20, 39].includes(n)) return { group: "server", order: 500 + n };
  if ([17, 19, 21, 22, 23, 25, 34, 40].includes(n)) return { group: "architecture", order: 600 + n };
  if ([18, 41, 46].includes(n)) return { group: "practice", order: 700 + n };
  return { group: "reference", order: 850 + (Number.isFinite(n) ? n : 0) };
}

const quickOrder = {
  prerequisites: 1000,
  core: 1010,
  hooks: 1020,
  concurrency: 1030,
  server: 1040,
  architecture: 1050,
  labs: 1060,
  assessments: 1070,
};

const chapters = [];
for (const p of await walk("content")) {
  if (!/\.md$/i.test(p)) continue;
  const body = await fs.readFile(p, "utf8");
  const id = p.slice("content/".length).replaceAll("\\", "/");
  const isMastery = id.startsWith(MASTER_PREFIX);
  const rel = isMastery ? id.slice(MASTER_PREFIX.length) : "";
  if (isMastery && hiddenMasterFiles.has(rel)) continue;
  const top = id.split("/")[0];
  const classified = isMastery
    ? classifyMaster(id)
    : { group: "quick", order: (quickOrder[top] ?? 1090) + chapters.length };
  chapters.push({
    id,
    title: body.match(/^#\s+(.+)/m)?.[1]?.trim() || path.basename(p, ".md"),
    group: classified.group,
    groupTitle: groupTitles[classified.group] ?? classified.group,
    order: classified.order,
    track: isMastery ? "mastery" : "guide",
    body,
  });
}

chapters.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, "zh-CN", { numeric: true }));

await fs.mkdir("src/generated", { recursive: true });
await fs.rm("public/教材附件", { recursive: true, force: true });
await fs.cp("content", "public/教材附件", { recursive: true });
await fs.writeFile("src/generated/chapters.json", JSON.stringify(chapters));

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
      if (m) { symbols.push({ name: m[1], line: i + 1 }); break; }
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
  JSON.stringify({ tag: "v19.3.0", origin: "https://github.com/facebook/react/tree/v19.3.0", files }),
);

const masteryCount = chapters.filter((c) => c.track === "mastery").length;
console.log(`Indexed ${chapters.length} chapters (${masteryCount} mastery), ${files.length} source files`);
if (chapters.length < 100 || masteryCount < 80) {
  throw new Error(`课程索引异常：只生成 ${chapters.length} 篇，其中主教材 ${masteryCount} 篇。`);
}
