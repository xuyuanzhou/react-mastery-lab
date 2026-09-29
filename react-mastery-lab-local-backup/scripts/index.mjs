import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out.sort();
}
const chapters = [];
for (const p of await walk("content")) {
  if (!/\.md$/i.test(p)) continue;
  const body = await fs.readFile(p, "utf8");
  const id = p.slice(8).replaceAll("\\", "/");
  chapters.push({
    id,
    title: body.match(/^#\s+(.+)/m)?.[1] || path.basename(p, ".md"),
    group: id.split("/")[0],
    body,
  });
}
const order = [
  "prerequisites",
  "core",
  "hooks",
  "concurrency",
  "server",
  "architecture",
  "labs",
  "assessments",
];
chapters.sort(
  (a, b) =>
    (order.includes(a.group) ? order.indexOf(a.group) : 99) -
      (order.includes(b.group) ? order.indexOf(b.group) : 99) ||
    a.id.localeCompare(b.id, "zh-CN", { numeric: true }),
);
await fs.mkdir("src/generated", { recursive: true });
await fs.cp("content", "public/教材附件", { recursive: true });
await fs.writeFile("src/generated/chapters.json", JSON.stringify(chapters));
const files = [];
for (const p of await walk("public/react-source")) {
  if (!/\.(js|jsx|ts|tsx)$/.test(p)) continue;
  const body = await fs.readFile(p, "utf8");
  const symbols = [];
  const lines = body.split("\n");
  lines.forEach((line, i) => {
    const m = line.match(
      /^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/,
    );
    if (m) symbols.push({ name: m[1], line: i + 1 });
  });
  files.push({
    path: p.slice("public/react-source/".length),
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
console.log(
  `Indexed ${chapters.length} chapters, ${files.length} source files`,
);
