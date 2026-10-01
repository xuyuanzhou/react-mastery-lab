import fs from "node:fs/promises";
import path from "node:path";
import { validateCommunityChapter } from "./chapter-schema.mjs";

const community = "content/React原理精通/community";
const supplied = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const files = supplied.length
  ? supplied
  : (await fs.readdir(community).catch(() => []))
      .filter((name) => name.endsWith(".md"))
      .map((name) => path.join(community, name));
let failures = 0;
for (const file of files) {
  const body = await fs.readFile(file, "utf8");
  const { errors } = validateCommunityChapter(body, file);
  if (errors.length) {
    failures++;
    console.error(`${file}:\n- ${errors.join("\n- ")}`);
  } else
    console.log(`${file}: 结构通过；源码 symbol 与内链由 npm run check 核验`);
}
if (failures) process.exitCode = 1;
else console.log(`已校验 ${files.length} 篇社区章节`);
