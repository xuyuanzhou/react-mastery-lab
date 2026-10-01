import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const chapters = JSON.parse(
  fs.readFileSync(path.join(root, "src/generated/chapters.json"), "utf8"),
);
const basics = chapters.filter((chapter) => chapter.track === "basics");
const expected = {
  basicsStart: 8,
  basicsUi: 10,
  basicsHooks: 8,
  basicsEngineering: 8,
};

test("基础教程有 34 篇，排在源码教程之前并保持四阶段顺序", () => {
  assert.equal(basics.length, 34);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(expected).map((group) => [
        group,
        basics.filter((c) => c.group === group).length,
      ]),
    ),
    expected,
  );
  assert.deepEqual(
    chapters.slice(0, 34).map((c) => c.id),
    basics.map((c) => c.id),
  );
  assert.equal(new Set(basics.map((c) => c.id)).size, 34);
});

test("每篇基础教程包含讲解、示例、动手练习、自检和官网及本地源码入口", () => {
  for (const chapter of basics) {
    const file = path.join(root, "content", chapter.id);
    const body = fs.readFileSync(file, "utf8");
    for (const section of [
      "## 学习目标",
      "## 核心知识",
      "## 实例：把知识应用到组件",
      "## 常见错误与正确做法",
      "## 动手练习",
      "## 自检问题",
      "## 官方文档与源码连接",
    ]) {
      assert.ok(body.includes(section), `${chapter.id}: missing ${section}`);
    }
    assert.match(body, /https:\/\/(react\.dev|reactrouter\.com)\//);
    assert.ok(body.length > 1000, `${chapter.id}: content too short`);
    assert.equal(
      (body.match(/^```/gm) ?? []).length,
      2,
      `${chapter.id}: unbalanced code fences`,
    );
    const match = body.match(/\]\(source:([^)]*)\)/);
    assert.ok(match, `${chapter.id}: missing source link`);
    assert.ok(
      fs.existsSync(path.join(root, "public/react-source", match[1])),
      `${chapter.id}: unknown source ${match[1]}`,
    );
    for (const m of body.matchAll(/\]\((?!https?:|source:)([^)]+\.md)\)/g)) {
      assert.ok(
        fs.existsSync(
          path.resolve(path.dirname(file), decodeURIComponent(m[1])),
        ),
        `${chapter.id}: missing linked chapter ${m[1]}`,
      );
    }
  }
});

test("全文搜索索引和静态教材附件包含全部基础教程", () => {
  const index = JSON.parse(
    fs.readFileSync(path.join(root, "public/search-index.json"), "utf8"),
  );
  for (const chapter of basics) {
    assert.ok(
      index.some((x) => x.id === chapter.id && x.body.includes("## 动手练习")),
      chapter.id,
    );
    assert.ok(
      fs.existsSync(path.join(root, "public/教材附件", chapter.id)),
      chapter.id,
    );
  }
});
