export const chapterGroups = new Set([
  "start",
  "runtime",
  "hooks",
  "concurrency",
  "browser",
  "server",
  "architecture",
  "practice",
  "reference",
]);

export function chapterMeta(body) {
  const line = body.match(/^<!-- chapter-meta: ([^\n]+) -->/m)?.[1];
  if (!line) return null;
  const values = Object.fromEntries(
    line.split(";").map((part) => {
      const [key, value] = part.trim().split("=");
      return [key, value];
    }),
  );
  const order = Number(values.order);
  if (!chapterGroups.has(values.group)) {
    throw new Error(`无效的章节分组：${values.group}`);
  }
  if (!Number.isInteger(order) || order < 0 || order > 999) {
    throw new Error(`章节顺序必须是 0–999 的整数：${values.order}`);
  }
  return { group: values.group, order };
}

export function validateCommunityChapter(body, file) {
  const errors = [];
  let meta;
  try {
    meta = chapterMeta(body);
    if (!meta) errors.push("缺少 chapter-meta 分组与顺序");
  } catch (error) {
    errors.push(error.message);
  }
  if (!/^#\s+\S.+/m.test(body)) errors.push("缺少一级标题");
  for (const heading of [
    "学习目标",
    "核心机制",
    "源码定位",
    "动手实验",
    "自检",
    "参考答案",
  ]) {
    if (!new RegExp(`^## ${heading}`, "m").test(body)) {
      errors.push(`缺少「${heading}」小节`);
    }
  }
  if (!/\]\(source:[^)]+\)/.test(body)) {
    errors.push("至少提供一个固定版本的官方源码锚点");
  }
  if (body.length < 700) errors.push("正文太短：请补充推导、实验与答案");
  if (/TODO|待填写|示例占位/.test(body)) errors.push("仍有待填写占位内容");
  return { file, meta, errors };
}
