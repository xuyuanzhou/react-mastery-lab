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
  for (const c of chapters) {
    for (const m of (await chapterBody(c.id)).matchAll(
      /\]\(source:([^#)]+)(?:#([^)]*))?\)/g,
    )) {
      const file = index.files.find((f) => f.path === m[1]);
      assert.ok(file, `${c.id}: ${m[1]}`);
      if (m[2] && !/^L\d+$/.test(m[2]))
        assert.ok(
          file.symbols.some((s) => s.name === m[2]),
          `${c.id}: ${m[2]}`,
        );
    }
  }
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
  assert.equal(chapters.filter((c) => c.track === "mastery").length, 92);
  assert.ok(chapters.some((c) => c.id.includes("00C-从编译入口到浏览器像素")));
  assert.ok(chapters.some((c) => c.id.includes("04-useState与UpdateQueue")));
  assert.ok(chapters.some((c) => c.id.includes("42-架构总复盘")));
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
