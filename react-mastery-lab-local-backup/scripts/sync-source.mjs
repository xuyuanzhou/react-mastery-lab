import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const tag = "v19.3.0";
const origin = `https://codeload.github.com/facebook/react/tar.gz/refs/tags/${tag}`;
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "react-mastery-source-"));
try {
  const response = await fetch(origin);
  if (!response.ok) throw Error(`Download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(path.join(temp, "source.tar.gz"), bytes);
  execFileSync("tar", ["-xzf", path.join(temp, "source.tar.gz"), "-C", temp]);
  const root = path.join(temp, "react-19.3.0");
  const pkg = JSON.parse(
    await fs.readFile(path.join(root, "packages/react/package.json"), "utf8"),
  );
  if (pkg.version !== "19.3.0") throw Error("版本校验失败，未更新缓存");
  await fs.mkdir("public/react-source", { recursive: true });
  await fs.cp(path.join(root, "packages"), "public/react-source/packages", {
    recursive: true,
  });
  await fs.copyFile(path.join(root, "LICENSE"), "public/react-source/LICENSE");
  await fs.writeFile(
    "public/react-source/provenance.json",
    JSON.stringify(
      {
        tag,
        origin,
        archiveSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        downloadedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    "已同步 v19.3.0 官方 packages 源码。运行 npm run build 重建索引。",
  );
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
