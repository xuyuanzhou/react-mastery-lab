import { glossary } from "./model";

type TextNode = { type: "text"; value: string };
type ElementNode = {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: Node[];
};
type Node =
  | TextNode
  | ElementNode
  | { type: string; tagName?: string; children?: Node[] };
const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);
const expression = new RegExp("\\b(" + keys.join("|") + ")\\b", "g");
const ignoredTags = new Set(["code", "pre", "a", "abbr", "h1", "h2", "h3"]);

/** Add accessible glossary hints to ordinary Markdown text. */
export function termsPlugin() {
  return (tree: Node) => {
    function visit(node: Node, skip = false): void {
      if (!("children" in node) || !node.children) return;
      const ignored = skip || (!!node.tagName && ignoredTags.has(node.tagName));
      node.children = node.children.flatMap((child): Node[] => {
        if (!ignored && child.type === "text" && "value" in child) {
          const result: Node[] = [];
          let last = 0;
          for (const match of child.value.matchAll(expression)) {
            const term = glossary[match[0]];
            result.push({
              type: "text",
              value: child.value.slice(last, match.index),
            });
            result.push({
              type: "element",
              tagName: "abbr",
              properties: {
                title: term[0] + "：" + term[1],
                tabIndex: 0,
                "data-term": match[0],
              },
              children: [{ type: "text", value: match[0] }],
            });
            last = match.index + match[0].length;
          }
          if (last)
            return [
              ...result,
              { type: "text", value: child.value.slice(last) },
            ];
        }
        visit(child, ignored);
        return [child];
      });
    }
    visit(tree);
  };
}
