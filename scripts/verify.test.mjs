import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { rebase, keyedDiff } from "../src/features/labs/simulation.mjs";
const chapters = JSON.parse(
  await fs.readFile("src/generated/chapters.json", "utf8"),
);
const index = JSON.parse(await fs.readFile("public/source-index.json", "utf8"));
const searchIndex = JSON.parse(
  await fs.readFile("public/search-index.json", "utf8"),
);
const projectIndex = JSON.parse(
  await fs.readFile("public/project-source-index.json", "utf8"),
);
const chapterBody = (id) => fs.readFile(path.join("content", id), "utf8");
test("跨 Lane 更新保留顺序，最终从基线重放得到 22", () => {
  const input = [
    { lane: 2, kind: "add", value: 10 },
    { lane: 1, kind: "multiply", value: 2 },
  ];
  const first = rebase(1, input, 1);
  assert.equal(first.memoizedState, 2);
  assert.equal(first.baseState, 1);
  assert.equal(first.baseQueue[1].lane, 0);
  assert.equal(rebase(first.baseState, first.baseQueue, 2).memoizedState, 22);
  assert.equal(input[1].lane, 1);
});
test("没有跳过更新时清空基线队列", () => {
  const result = rebase(1, [{ lane: 1, kind: "add", value: 2 }], 1);
  assert.deepEqual(result, { memoizedState: 3, baseState: 3, baseQueue: [] });
});
test("key 顺序 C A B 只给 A B 移动标记", () => {
  assert.deepEqual(
    keyedDiff(["A", "B", "C"], ["C", "A", "B"]).map((x) => x.action),
    ["复用", "移动", "移动"],
  );
  assert.equal(keyedDiff(["A"], ["B"])[0].action, "插入");
});
test("全部教材内链都可解析", async () => {
  for (const c of chapters) {
    for (const m of (await chapterBody(c.id)).matchAll(
      /\]\(([^)]+\.md)(?:#[^)]*)?\)/g,
    )) {
      const href = m[1];
      if (/^https?:/.test(href)) continue;
      const id = path.posix.normalize(
        path.posix.join(path.posix.dirname(c.id), decodeURIComponent(href)),
      );
      assert.ok(
        chapters.some((c) => c.id === id),
        `${c.id} → ${id}`,
      );
    }
  }
});
test("全部 source 锚点对应缓存中的真实文件和函数", async () => {
  let linkedChapters = 0;
  for (const c of chapters) {
    const links = [
      ...(await chapterBody(c.id)).matchAll(
        /\]\(source:([^#)]+)(?:#([^)]*))?\)/g,
      ),
    ];
    if (links.length) linkedChapters++;
    for (const m of links) {
      const file = index.files.find((f) => f.path === m[1]);
      assert.ok(file, `${c.id}: ${m[1]}`);
      if (m[2] && !/^L\d+$/.test(m[2]))
        assert.ok(
          file.symbols.some((s) => s.name === m[2]),
          `${c.id}: ${m[2]}`,
        );
    }
  }
  assert.ok(linkedChapters >= 75, `只有 ${linkedChapters} 篇可直接跳转源码`);
});
test("官方包版本与声明一致，许可证随项目保留", async () => {
  const p = JSON.parse(
    await fs.readFile(
      "public/react-source/packages/react/package.json",
      "utf8",
    ),
  );
  assert.equal(p.version, "19.3.0");
  assert.match(await fs.readFile("public/react-source/LICENSE", "utf8"), /MIT/);
  assert.equal(index.tag, "v19.3.0");
});
test("导入器保留嵌套中文路径、图片和原始字节，拒绝重复覆盖", async () => {
  const os = await import("node:os");
  const { execFileSync } = await import("node:child_process");
  const temp = await fs.mkdtemp(
    path.join(os.tmpdir(), "react-mastery-import-test-"),
  );
  try {
    const source = path.join(temp, "original");
    const work = path.join(temp, "project");
    await fs.mkdir(path.join(source, "前置基础"), { recursive: true });
    await fs.mkdir(work);
    await fs.writeFile(
      path.join(source, "前置基础", "闭包.md"),
      "# 闭包\n\n[图](图.svg)\n",
    );
    await fs.writeFile(path.join(source, "前置基础", "图.svg"), "<svg/>");
    execFileSync(
      process.execPath,
      [path.resolve("scripts/import.mjs"), source],
      { cwd: work, stdio: "pipe" },
    );
    const target = path.join(work, "content/React原理精通/前置基础");
    assert.equal(
      await fs.readFile(path.join(target, "闭包.md"), "utf8"),
      "# 闭包\n\n[图](图.svg)\n",
    );
    assert.equal(
      await fs.readFile(path.join(target, "图.svg"), "utf8"),
      "<svg/>",
    );
    assert.throws(() =>
      execFileSync(
        process.execPath,
        [path.resolve("scripts/import.mjs"), source],
        { cwd: work, stdio: "pipe" },
      ),
    );
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
test("完整 React 原理精通教材已接入，不能退回 28 篇", () => {
  assert.ok(chapters.length >= 110, `教材章节不足：${chapters.length}`);
  assert.ok(chapters.filter((c) => c.track === "mastery").length >= 94);
  assert.ok(chapters.some((c) => c.id.includes("00C-从编译入口到浏览器像素")));
  assert.ok(chapters.some((c) => c.id.includes("00D-React用户模型")));
  assert.ok(chapters.some((c) => c.id.includes("04-useState与UpdateQueue")));
  assert.ok(chapters.some((c) => c.id.includes("42-架构总复盘")));
});

test("默认学习顺序先基础后源码，复盘和答案放在对应内容之后", () => {
  const at = (part) =>
    chapters.findIndex((chapter) => chapter.id.includes(part));
  assert.ok(at("prerequisites/10-") < at("00D-React用户模型"));
  assert.ok(at("00D-React用户模型") < at("00-整体架构"));
  assert.ok(at("39-Suspense-Hydration") < at("00C-从编译入口"));
  assert.ok(
    at("assessments/全章节自检题.md") <
      at("assessments/全章节自检题-参考答案.md"),
  );
  assert.ok(at("prerequisites/01-closure.md") < at("core/01-elements.md"));
  assert.equal(
    chapters.find((c) => c.id.endsWith("课程路线-能力里程碑.md"))?.group,
    "start",
  );
  assert.equal(
    chapters.find((c) => c.id.endsWith("课程路线-12周.md"))?.group,
    "reference",
  );
});

test("主学习路线按能力验收，不设置学习期限", async () => {
  const route = await fs.readFile(
    "content/React原理精通/课程路线-能力里程碑.md",
    "utf8",
  );
  assert.match(route, /没有完成期限/);
  assert.match(route, /预测.*解释.*定位.*验证.*迁移/s);
  assert.match(route, /里程碑 0/);
  assert.match(route, /里程碑 6/);
  assert.doesNotMatch(route, /每周\s*\d|第\s*\d+\s*周/);
});

test("章节自检不再使用同一道模板题覆盖全部章节", async () => {
  const quiz = await fs.readFile(
    "content/React原理精通/assessments/全章节自检题.md",
    "utf8",
  );
  const answers = await fs.readFile(
    "content/React原理精通/assessments/全章节自检题-参考答案.md",
    "utf8",
  );
  const questions = [...quiz.matchAll(/^\*\*情境题：\*\* (.+)$/gm)].map(
    (match) => match[1],
  );
  assert.equal(questions.length, 44);
  assert.equal(new Set(questions).size, 44);
  assert.equal([...answers.matchAll(/^\*\*参考要点：\*\*/gm)].length, 44);
});

test("前置课自检有可核对的答案，链表与 DFS 有完整推演", async () => {
  const prerequisites = (
    await fs.readdir("content/React原理精通/prerequisites")
  ).filter((name) => /^\d{2}-.*\.md$/.test(name));
  assert.equal(prerequisites.length, 10);
  for (const name of prerequisites) {
    const body = await fs.readFile(
      path.join("content/React原理精通/prerequisites", name),
      "utf8",
    );
    assert.match(body, /## 自检/);
    assert.match(body, /## 参考(?:答案|解释)/, `${name} 缺参考答案`);
  }
  const structures = await fs.readFile(
    "content/React原理精通/prerequisites/02-数据结构-链表树队列与位运算.md",
    "utf8",
  );
  assert.match(structures, /U1 → U2 → U3 → U4 → U1/);
  assert.match(structures, /begin 顺序是 A、B、D、E、C/);
  assert.match(structures, /complete 顺序是 D、E、B、C、A/);
});

test("核心课程与专题课程均提供就近自检解析", async () => {
  const root = "content/React原理精通";
  for (const key of [
    "00",
    "00B",
    ...Array.from({ length: 29 }, (_, i) => String(i + 1).padStart(2, "0")),
  ]) {
    const name = (await fs.readdir(root)).find(
      (file) => file.startsWith(`${key}-`) && file.endsWith(".md"),
    );
    assert.ok(name, `缺少 ${key} 章`);
    const body = await fs.readFile(path.join(root, name), "utf8");
    assert.match(body, /## 本章情境自检与参考解析/, `${name} 缺少情境题答案`);
  }
  for (let n = 30; n <= 41; n++) {
    const key = String(n).padStart(2, "0");
    const name = (await fs.readdir(root)).find(
      (file) => file.startsWith(`${key}-`) && file.endsWith(".md"),
    );
    assert.ok(name, `缺少 ${key} 章`);
    const body = await fs.readFile(path.join(root, name), "utf8");
    assert.match(body, /## 本章自检参考解析/, `${name} 缺少逐题解析`);
  }
  for (let n = 42; n <= 45; n++) {
    const name = (await fs.readdir(root)).find(
      (file) => file.startsWith(`${n}-`) && file.endsWith(".md"),
    );
    const body = await fs.readFile(path.join(root, name), "utf8");
    assert.match(body, /自检/, `${name} 缺少架构自检`);
    assert.match(body, /参考(?:答案|解析|推导)/, `${name} 缺少架构题答案`);
  }
  for (const group of [
    "prerequisites",
    "core",
    "hooks",
    "concurrency",
    "server",
    "architecture",
  ]) {
    for (const name of (await fs.readdir(`content/${group}`)).filter((file) =>
      file.endsWith(".md"),
    )) {
      const body = await fs.readFile(`content/${group}/${name}`, "utf8");
      assert.match(body, /## 参考解释/, `${group}/${name} 缺少快速导学答案`);
    }
  }
});

test("截图版 UI 使用新的课程分组而不是旧 28 篇分组", async () => {
  const model = await fs.readFile("src/features/learning/model.ts", "utf8");
  const app = await fs.readFile("src/app/App.tsx", "utf8");
  for (const key of [
    "start",
    "runtime",
    "hooks",
    "concurrency",
    "browser",
    "server",
    "architecture",
    "practice",
  ]) {
    assert.match(model, new RegExp(`\\b${key}:`));
  }
  assert.doesNotMatch(app, /group === "prerequisites"/);
  assert.doesNotMatch(app, /group === "core"/);
});

test("课程清单只含元数据，搜索正文按需加载且完整", () => {
  assert.equal(searchIndex.length, chapters.length);
  assert.ok(chapters.every((chapter) => !("body" in chapter)));
  assert.ok(
    searchIndex.every(
      (entry) =>
        chapters.some((chapter) => chapter.id === entry.id) &&
        typeof entry.body === "string",
    ),
  );
});

test("工程实践源码锚点有效，公开快照仅含白名单文件", async () => {
  const paths = new Set(projectIndex.files.map((file) => file.path));
  assert.ok(paths.has("src/main.tsx"));
  assert.ok(paths.has("src/app/App.tsx"));
  assert.ok(paths.has(".github/workflows/deploy-pages.yml"));
  assert.ok(
    projectIndex.files.every(
      (file) =>
        !/(^|\/)(node_modules|generated|\.env|\.git)(\/|$)/.test(file.path),
    ),
  );
  for (const chapter of chapters.filter(
    (item) => item.group === "engineering",
  )) {
    for (const match of (await chapterBody(chapter.id)).matchAll(
      /\]\(project:([^#)]+)(?:#([^)]*))?\)/g,
    )) {
      const file = projectIndex.files.find((item) => item.path === match[1]);
      assert.ok(file, `${chapter.id}: ${match[1]}`);
      if (match[2] && !/^L\d+$/.test(match[2])) {
        assert.ok(
          file.symbols.some((symbol) => symbol.name === match[2]),
          `${chapter.id}: ${match[2]}#${match[2]}`,
        );
      }
    }
  }
});
