import { expect, test } from "vitest";
import index from "../../../public/source-index.json";
import { sourceAnnotations } from "./annotations";

const chapters = Object.keys(
  import.meta.glob("../../../content/React原理精通/**/*.md"),
).map((path) => path.slice(path.indexOf("React原理精通/")));

test("中文注释定位到固定版本的真实源码函数和现有教材", () => {
  expect(sourceAnnotations.length).toBeGreaterThanOrEqual(20);
  const keys = new Set<string>();
  for (const note of sourceAnnotations) {
    const key = `${note.path}#${note.symbol}`;
    expect(keys.has(key), key).toBe(false);
    keys.add(key);
    const file = index.files.find((item) => item.path === note.path);
    expect(file, key).toBeDefined();
    expect(
      file?.symbols.some((symbol) => symbol.name === note.symbol),
      key,
    ).toBe(true);
    expect(chapters.includes(note.chapter), note.chapter).toBe(true);
    expect(note.summary.length).toBeGreaterThan(25);
  }
});
