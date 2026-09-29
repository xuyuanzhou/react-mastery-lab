import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
const source = process.argv[2];
if (!source || !(await stat(source)).isDirectory())
  throw Error("用法: npm run import -- /path/to/React原理精通");
const target = path.resolve("content/React原理精通");
if (path.resolve(source) === target) throw Error("源目录不能等于目标目录");
await mkdir(target, { recursive: true });
await cp(source, target, {
  recursive: true,
  force: false,
  errorOnExist: true,
  filter: (s) =>
    !s
      .split(path.sep)
      .some((p) => ["node_modules", ".git", "dist"].includes(p)),
});
console.log(
  "完整目录已导入；运行 npm run build 重新索引。重复文件会报错，不覆盖教材。",
);
