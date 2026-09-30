import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { ArrowUpRight, Code2 } from "lucide-react";
import { glossary, resolveMd, sourceLink, type SourceTarget } from "./model";
import { termsPlugin } from "./termsPlugin";
import { chapterUrl } from "../../app/routes";

type Chapter = { id: string };
type Heading = { id: string; text: string; level: number };
export default function MarkdownArticle({
  doc,
  anchor,
  onToc,
  onTerm,
  onOpenSource,
}: {
  doc: Chapter;
  anchor: string | null;
  onToc: (headings: Heading[]) => void;
  onTerm: (term: string) => void;
  onOpenSource: (target: SourceTarget) => void;
}) {
  const navigate = useNavigate();
  const article = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState<{
    id: string;
    body: string;
    error: string;
  }>({ id: "", body: "", error: "" });
  const body = loaded.id === doc.id ? loaded.body : "";
  const error = loaded.id === doc.id ? loaded.error : "";
  useEffect(() => {
    const controller = new AbortController();
    const path = doc.id.split("/").map(encodeURIComponent).join("/");
    fetch(import.meta.env.BASE_URL + "教材附件/" + path, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`正文加载失败：${response.status}`);
        return response.text();
      })
      .then((text) => {
        if (!controller.signal.aborted)
          setLoaded({ id: doc.id, body: text, error: "" });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setLoaded({ id: doc.id, body: "", error: String(reason) });
      });
    return () => controller.abort();
  }, [doc.id]);
  useEffect(() => {
    if (loaded.id !== doc.id || !body) return;
    const headings = article.current?.querySelectorAll("h2,h3");
    onToc(
      Array.from(headings ?? []).map((heading) => ({
        id: heading.id,
        text: heading.textContent ?? "",
        level: Number(heading.tagName.slice(1)),
      })),
    );
    if (anchor)
      requestAnimationFrame(() =>
        document.getElementById(anchor)?.scrollIntoView({ block: "start" }),
      );
  }, [doc.id, anchor, onToc, body, loaded.id]);

  const mdLink = ({
    href = "",
    children,
  }: {
    href?: string;
    children?: ReactNode;
  }) => {
    const target = sourceLink(href);
    if (target)
      return (
        <a
          href={href}
          className="source-anchor"
          onClick={(event) => {
            event.preventDefault();
            onOpenSource(target);
          }}
        >
          <Code2 size={13} />
          {children}
          <ArrowUpRight size={12} />
        </a>
      );
    if (href.startsWith("#"))
      return (
        <a
          href={href}
          onClick={(event) => {
            event.preventDefault();
            navigate(chapterUrl(doc.id, decodeURIComponent(href.slice(1))));
          }}
        >
          {children}
        </a>
      );
    if (/\.md(?:#.*)?$/i.test(href) && !/^https?:/.test(href)) {
      const resolved = resolveMd(doc.id, href);
      return (
        <Link to={chapterUrl(resolved.id, resolved.anchor)}>{children}</Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  };

  if (error)
    return (
      <article className="markdown" role="alert">
        {error}
      </article>
    );
  if (!body)
    return (
      <article className="markdown">
        <p>正在加载正文…</p>
      </article>
    );
  return (
    <article
      className="markdown"
      ref={article}
      onClick={(event) => {
        const key = (event.target as HTMLElement)
          .closest("abbr")
          ?.getAttribute("data-term");
        if (key) onTerm(key);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          const key = (event.target as HTMLElement).getAttribute("data-term");
          if (key) onTerm(key);
        }
      }}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight, termsPlugin]}
        urlTransform={(url) =>
          url.startsWith("source:") || url.startsWith("project:")
            ? url
            : defaultUrlTransform(url)
        }
        components={{
          a: mdLink,
          img: ({ src, ...props }) => (
            <img
              {...props}
              alt={props.alt ?? ""}
              src={
                src && !/^https?:/.test(src)
                  ? import.meta.env.BASE_URL +
                    "教材附件/" +
                    resolveMd(doc.id, src).id
                  : src
              }
            />
          ),
          code: ({ children, className, ...props }) => {
            const key = String(children);
            return glossary[key] && !className ? (
              <button
                className="term-code"
                title={glossary[key][0]}
                onClick={() => onTerm(key)}
              >
                {children}
              </button>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {body}
      </Markdown>
    </article>
  );
}
