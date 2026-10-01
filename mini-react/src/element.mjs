// 教学版 Element：只描述期望 UI，不创建 DOM/JSON 宿主节点。
export const TEXT = Symbol.for("mini-react.text");
export const FRAGMENT = Symbol.for("mini-react.fragment");
export const SUSPENSE = Symbol.for("mini-react.suspense");

export function createElement(type, config, ...children) {
  const { key = null, ...props } = config ?? {};
  const input = children.length ? children : props.children;
  return {
    type,
    key: key == null ? null : String(key),
    props: { ...props, children: normalizeChildren(input) },
  };
}

export function normalizeChildren(input) {
  const result = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (value == null || typeof value === "boolean") return;
    if (typeof value === "string" || typeof value === "number") {
      result.push({
        type: TEXT,
        key: null,
        props: { nodeValue: String(value) },
      });
      return;
    }
    if (typeof value !== "object" || !("type" in value)) {
      throw new TypeError("child 必须是 Element、文本或数组");
    }
    result.push(value);
  };
  visit(input);
  return result;
}
