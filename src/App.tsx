import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import {
  Atom,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  Code2,
  FlaskConical,
  GraduationCap,
  Home,
  Menu,
  Moon,
  Search,
  Sun,
  X,
  PanelRightClose,
  PanelRightOpen,
  Clock,
  Route,
} from "lucide-react";
import chapters from "./generated/chapters.json";
import {
  chain,
  glossary,
  groups,
  resolveMd,
  sourceLink,
  type SourceTarget,
} from "./model";
import SourceViewer from "./SourceViewer";
import Labs from "./Labs";
type Progress = {
  read: string[];
  bookmarks: string[];
  recent: string[];
  theme: string;
};
const empty: Progress = { read: [], bookmarks: [], recent: [], theme: "dark" };
function readProgress(): Progress {
  try {
    const s = JSON.parse(localStorage.getItem("react-mastery-v1") || "{}");
    return {
      read: Array.isArray(s.read)
        ? s.read.filter((x: unknown) => typeof x === "string")
        : [],
      bookmarks: Array.isArray(s.bookmarks)
        ? s.bookmarks.filter((x: unknown) => typeof x === "string")
        : [],
      recent: Array.isArray(s.recent)
        ? s.recent.filter((x: unknown) => typeof x === "string")
        : [],
      theme: s.theme === "light" ? "light" : "dark",
    };
  } catch {
    return empty;
  }
}
const chapterUrl = (id: string, anchor?: string) =>
  "/learn?chapter=" +
  encodeURIComponent(id) +
  (anchor ? "&anchor=" + encodeURIComponent(anchor) : "");
function termsPlugin() {
  return (tree: any) => {
    function visit(node: any, skip = false) {
      if (!node.children) return;
      const ignored =
        skip ||
        ["code", "pre", "a", "abbr", "h1", "h2", "h3"].includes(node.tagName);
      node.children = node.children.flatMap((child: any) => {
        if (!ignored && child.type === "text") {
          const keys = Object.keys(glossary);
          const regex = new RegExp("\\b(" + keys.join("|") + ")\\b", "g");
          const result: any[] = [];
          let last = 0;
          for (const m of child.value.matchAll(regex)) {
            result.push({
              type: "text",
              value: child.value.slice(last, m.index),
            });
            result.push({
              type: "element",
              tagName: "abbr",
              properties: {
                title: glossary[m[0]][0] + "：" + glossary[m[0]][1],
                tabIndex: 0,
                "data-term": m[0],
              },
              children: [{ type: "text", value: m[0] }],
            });
            last = m.index + m[0].length;
          }
          if (last) {
            result.push({ type: "text", value: child.value.slice(last) });
            return result;
          }
        }
        visit(child, ignored);
        return [child];
      });
    }
    visit(tree);
  };
}
function CallChain({ open }: { open: (t: SourceTarget) => void }) {
  return (
    <section className="chain-card">
      <div className="section-label">
        <Route size={16} /> 源码主线 <small>点击函数，直接定位</small>
      </div>
      <div className="call-chain">
        {chain.map(([symbol, p], i) => (
          <span key={symbol}>
            <button onClick={() => open({ path: "packages/" + p, symbol })}>
              <small>{String(i + 1).padStart(2, "0")}</small>
              {symbol}
            </button>
            {i < chain.length - 1 && <ArrowRight size={13} />}
          </span>
        ))}
      </div>
      <p>
        概念执行路径，跨越调度边界；createRoot 创建根，随后 root.render
        才提交元素更新，并非这些函数直接依次调用。
      </p>
    </section>
  );
}
export default function App() {
  const [progress, setProgress] = useState(readProgress),
    [storageError, setStorageError] = useState(false),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [showSource, setShowSource] = useState(() => window.innerWidth > 1000),
    [source, setSource] = useState<SourceTarget | null>({
      path: "packages/react-reconciler/src/ReactFiberHooks.js",
      symbol: "renderWithHooks",
    }),
    [term, setTerm] = useState<string | null>(null),
    [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
  const location = useLocation(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const doc = chapters.find((c) => c.id === params.get("chapter"));
  const article = useRef<HTMLElement>(null);
  const main = useRef<HTMLElement>(null);
  const isLearn = location.pathname === "/learn",
    isLabs = location.pathname === "/labs",
    isSaved = location.pathname === "/saved";
  const active = chapters.findIndex((c) => c.id === doc?.id);
  const validRead = progress.read.filter((id) =>
    chapters.some((c) => c.id === id),
  );
  const percent = Math.round(
    (validRead.length / Math.max(1, chapters.length)) * 100,
  );
  const courseGroups = [
    ...new Set([...Object.keys(groups), ...chapters.map((c) => c.group)]),
  ];
  useEffect(() => {
    document.documentElement.dataset.theme = progress.theme;
    try {
      localStorage.setItem("react-mastery-v1", JSON.stringify(progress));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [progress]);
  useEffect(() => {
    if (doc) {
      setProgress((p) => ({
        ...p,
        recent: [doc.id, ...p.recent.filter((id) => id !== doc.id)].slice(
          0,
          12,
        ),
      }));
      document.title = doc.title + " · React Mastery Lab";
    } else document.title = "React Mastery Lab · 源码学习实验室";
    setMobileNav(false);
    main.current?.scrollTo(0, 0);
  }, [doc?.id, location.pathname]);
  useEffect(() => {
    const headings = article.current?.querySelectorAll("h2,h3");
    setToc(
      Array.from(headings ?? []).map((h) => ({
        id: h.id,
        text: h.textContent ?? "",
        level: Number(h.tagName.slice(1)),
      })),
    );
    const anchor = params.get("anchor");
    if (anchor)
      requestAnimationFrame(() =>
        document.getElementById(anchor)?.scrollIntoView({ block: "start" }),
      );
  }, [doc?.id, params]);
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setTerm(null);
        setMobileNav(false);
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  function open(t: SourceTarget) {
    setSource(t);
    setShowSource(true);
  }
  function toggle(key: "read" | "bookmarks", id: string) {
    setProgress((p) => ({
      ...p,
      [key]: p[key].includes(id)
        ? p[key].filter((x) => x !== id)
        : [...p[key], id],
    }));
  }
  const results = query.trim()
    ? chapters.filter((c) =>
        (c.title + " " + c.body)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : [];
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
          onClick={(e) => {
            e.preventDefault();
            open(target);
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
          onClick={(e) => {
            e.preventDefault();
            navigate(chapterUrl(doc!.id, decodeURIComponent(href.slice(1))));
          }}
        >
          {children}
        </a>
      );
    if (/\.md(?:#.*)?$/i.test(href) && !/^https?:/.test(href)) {
      const resolved = resolveMd(doc!.id, href);
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
  return (
    <div className={"app " + (!showSource ? "source-hidden" : "")}>
      <header className="topbar">
        <button
          className="mobile-menu"
          aria-label="打开课程目录"
          onClick={() => setMobileNav(!mobileNav)}
        >
          <Menu size={19} />
        </button>
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Atom size={24} />
          </span>
          <span>
            React <b>Mastery</b>
            <small>THE SOURCE LEARNING LAB</small>
          </span>
        </Link>
        <nav>
          <Link className={!isLabs ? "active" : ""} to="/">
            学习空间
          </Link>
          <Link className={isLabs ? "active" : ""} to="/labs">
            交互实验室 <span>8</span>
          </Link>
        </nav>
        <button className="global-search" onClick={() => setSearchOpen(true)}>
          <Search size={15} />
          搜索教材、概念… <kbd>⌘ K</kbd>
        </button>
        <div className="top-actions">
          <span className="version">React 19.3.0</span>
          <button
            aria-label="切换主题"
            onClick={() =>
              setProgress((p) => ({
                ...p,
                theme: p.theme === "dark" ? "light" : "dark",
              }))
            }
          >
            {progress.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            aria-label="切换源码面板"
            onClick={() => setShowSource(!showSource)}
          >
            {showSource ? (
              <PanelRightClose size={18} />
            ) : (
              <PanelRightOpen size={18} />
            )}
          </button>
          <span className="avatar">R</span>
        </div>
      </header>
      <aside className={"sidebar " + (mobileNav ? "mobile-open" : "")}>
        <div className="workspace-name">
          <span className="workspace-icon">
            <GraduationCap size={18} />
          </span>
          <span>
            React 原理精通<small>从使用者，到实现者</small>
          </span>
        </div>
        <div className="side-shortcuts">
          <Link to="/" className={location.pathname === "/" ? "active" : ""}>
            <Home size={16} />
            学习路线
          </Link>
          <Link to="/saved" className={isSaved ? "active" : ""}>
            <Bookmark size={16} />
            我的书签<span>{progress.bookmarks.length}</span>
          </Link>
        </div>
        <div className="sidebar-label">
          课程目录 <span>{chapters.length} 篇</span>
        </div>
        <div className="course-tree">
          {courseGroups.map((g) => {
            const list = chapters.filter((c) => c.group === g);
            if (!list.length) return null;
            return (
              <details key={g} open>
                <summary>
                  <ChevronDown size={13} />
                  {groups[g] || g}
                  <small>{list.length}</small>
                </summary>
                {list.map((c, i) => (
                  <Link
                    title={c.title}
                    key={c.id}
                    className={c.id === doc?.id ? "selected" : ""}
                    to={chapterUrl(c.id)}
                  >
                    <span
                      className={
                        "chapter-status " +
                        (progress.read.includes(c.id) ? "done" : "")
                      }
                    >
                      {progress.read.includes(c.id) ? (
                        <Check size={11} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span>{c.title.replace(/^\d+[.、\s-]*/, "")}</span>
                    {progress.bookmarks.includes(c.id) && (
                      <Bookmark size={10} />
                    )}
                  </Link>
                ))}
              </details>
            );
          })}
        </div>
        <div className="progress-card">
          <div>
            学习进度 <b>{percent}%</b>
          </div>
          <div className="progress-bar">
            <i style={{ width: percent + "%" }} />
          </div>
          <small>
            已完成 {validRead.length} / {chapters.length} 篇 · 按自己的节奏
          </small>
        </div>
      </aside>
      <main ref={main} className="main">
        <div className="breadcrumb">
          <BookOpen size={14} />
          <span>学习空间</span>
          <span>/</span>
          <span>
            {isLearn
              ? groups[doc?.group ?? ""] || "教材"
              : isLabs
                ? "交互实验室"
                : isSaved
                  ? "我的书签"
                  : "学习路线"}
          </span>
          <span className="reading-mode">教材 × 源码</span>
        </div>
        {storageError && (
          <div role="alert" className="error">
            浏览器未允许保存进度，本次进度仅保存在内存。
          </div>
        )}
        {isLearn ? (
          doc ? (
            <>
              <div className="document-meta">
                <span className="eyebrow">
                  {groups[doc.group] || doc.group}
                </span>
                <div>
                  <button
                    className={
                      progress.bookmarks.includes(doc.id) ? "active" : ""
                    }
                    onClick={() => toggle("bookmarks", doc.id)}
                  >
                    <Bookmark size={15} />
                    {progress.bookmarks.includes(doc.id) ? "已收藏" : "收藏"}
                  </button>
                  <button
                    className={progress.read.includes(doc.id) ? "active" : ""}
                    onClick={() => toggle("read", doc.id)}
                  >
                    <Check size={15} />
                    {progress.read.includes(doc.id) ? "已读" : "标记已读"}
                  </button>
                </div>
              </div>
              <div className="doc-layout">
                <article
                  className="markdown"
                  ref={article}
                  onClick={(e) => {
                    const key = (e.target as HTMLElement)
                      .closest("abbr")
                      ?.getAttribute("data-term");
                    if (key) setTerm(key);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const key = (e.target as HTMLElement).getAttribute(
                        "data-term",
                      );
                      if (key) setTerm(key);
                    }
                  }}
                >
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSlug, rehypeHighlight, termsPlugin]}
                    urlTransform={(url) =>
                      url.startsWith("source:") ? url : defaultUrlTransform(url)
                    }
                    components={{
                      a: mdLink,
                      img: ({ src, ...p }) => (
                        <img
                          {...p}
                          src={
                            src && !/^https?:/.test(src)
                              ? import.meta.env.BASE_URL +
                                "教材附件/" +
                                resolveMd(doc.id, src).id
                              : src
                          }
                        />
                      ),
                      code: ({ children, className, ...p }) => {
                        const key = String(children);
                        return glossary[key] && !className ? (
                          <button
                            className="term-code"
                            title={glossary[key][0]}
                            onClick={() => setTerm(key)}
                          >
                            {children}
                          </button>
                        ) : (
                          <code className={className} {...p}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {doc.body}
                  </Markdown>
                </article>
                <aside className="toc">
                  <span>本页目录</span>
                  {toc.map((h) => (
                    <button
                      key={h.id}
                      className={h.level === 3 ? "indent" : ""}
                      onClick={() => navigate(chapterUrl(doc.id, h.id))}
                    >
                      {h.text}
                    </button>
                  ))}
                </aside>
              </div>
              <CallChain open={open} />
              <div className="chapter-pagination">
                {active > 0 ? (
                  <Link to={chapterUrl(chapters[active - 1].id)}>
                    <ArrowLeft size={16} />
                    <span>
                      <small>上一章</small>
                      {chapters[active - 1].title}
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {active < chapters.length - 1 && (
                  <Link to={chapterUrl(chapters[active + 1].id)}>
                    <span>
                      <small>下一章</small>
                      {chapters[active + 1].title}
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="empty">
              <h1>未找到这篇教材</h1>
              <p>请检查 Markdown 链接，或导入对应的原始教材目录后重新构建。</p>
              <Link to="/">返回学习路线</Link>
            </div>
          )
        ) : isLabs ? (
          <Labs />
        ) : isSaved ? (
          <>
            <div className="eyebrow">YOUR LIBRARY</div>
            <h1>我的学习记录</h1>
            <h2>书签</h2>
            {!progress.bookmarks.length && (
              <p className="muted">阅读章节时点击“收藏”，在这里随时继续。</p>
            )}
            <div className="saved-list">
              {progress.bookmarks
                .map((id) => chapters.find((c) => c.id === id))
                .filter(Boolean)
                .map((c) => (
                  <Link key={c!.id} to={chapterUrl(c!.id)}>
                    <Bookmark size={16} />
                    {c!.title}
                    <ArrowRight size={16} />
                  </Link>
                ))}
            </div>
            <h2>最近访问</h2>
            <div className="saved-list">
              {progress.recent
                .map((id) => chapters.find((c) => c.id === id))
                .filter(Boolean)
                .map((c) => (
                  <Link key={c!.id} to={chapterUrl(c!.id)}>
                    <Clock size={16} />
                    {c!.title}
                    <ArrowRight size={16} />
                  </Link>
                ))}
            </div>
          </>
        ) : (
          <>
            <section className="welcome">
              <div>
                <div className="eyebrow">
                  <span className="status-dot" /> YOUR REACT LEARNING JOURNEY
                </div>
                <h1>
                  读懂原理。
                  <br />
                  沿着源码，走得更深。
                </h1>
                <p>
                  从第一张 Fiber 工作卡片，到一次更新抵达屏幕。
                  <br />
                  阅读、追踪、实验，在同一个学习空间完成。
                </p>
                <Link
                  className="primary"
                  to={chapterUrl(
                    progress.recent.find((id) =>
                      chapters.some((c) => c.id === id),
                    ) ||
                      chapters.find((c) => c.group === "start")?.id ||
                      chapters[0]?.id ||
                      "",
                  )}
                >
                  {progress.recent.length ? "继续学习" : "开始第一课"}
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="react-orbit">
                <Atom />
                <span>
                  REACT
                  <br />
                  <b>19.3</b>
                </span>
                <i className="orbit-dot" />
              </div>
            </section>
            <div className="stats">
              <div>
                <BookOpen size={18} />
                <span>
                  <b>{chapters.length}</b> 学习章节
                </span>
              </div>
              <div>
                <FlaskConical size={18} />
                <span>
                  <b>8</b> 交互实验
                </span>
              </div>
              <div>
                <Code2 size={18} />
                <span>
                  固定源码 <b>v19.3.0</b>
                </span>
              </div>
            </div>
            <div className="section-heading">
              <h2>从零到精通</h2>
              <span>先建立模型，再走进实现</span>
            </div>
            <div className="roadmap">
              {[
                ["01", "建立学习起点", "JavaScript · 浏览器 · JSX · 源码阅读", "start"],
                ["02", "理解 React 运行时", "Element · Fiber · WorkLoop · Commit", "runtime"],
                ["03", "掌握 Hooks 与状态", "Dispatcher · Queue · Effect · Context", "hooks"],
                ["04", "理解调度与并发", "Lane · Scheduler · Transition", "concurrency"],
                ["05", "连接浏览器运行时", "Event · DOM · Layout · Paint", "browser"],
                ["06", "进入服务端模型", "Suspense · SSR · Hydration · RSC", "server"],
                ["07", "上升到架构层", "Compiler · Renderer · 性能工程", "architecture"],
                ["08", "源码阅读与验收", "Debug · Labs · Mini React · Assessments", "practice"],
              ].map(([n, title, desc, g]) => (
                <Link
                  key={n}
                  to={chapterUrl(
                    chapters.find((c) => c.group === g)?.id || chapters[0].id,
                  )}
                >
                  <span className="roadmap-number">{n}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
            <CallChain open={open} />
            <div className="section-heading">
              <h2>在实验中建立直觉</h2>
              <Link to="/labs">
                进入实验室 <ArrowRight size={14} />
              </Link>
            </div>
            <div className="lab-preview">
              <div>
                <div className="mini-nodes">
                  <span>current</span>
                  <i>⇄</i>
                  <span>WIP</span>
                </div>
                <h3>同一个界面，两棵工作树</h3>
                <p>观察 render 如何准备，commit 如何切换。</p>
              </div>
              <Link
                to="/labs"
                className="round-link"
                aria-label="进入 Fiber 实验"
              >
                <ArrowUpRight />
              </Link>
            </div>
            <p className="content-notice">
              已完整接入 React 原理精通教材：92 篇主教材 + 18 篇快速导学，并固定 React v19.3.0 源码基线。
            </p>
          </>
        )}
        <footer className="main-footer">
          <Atom size={14} /> React Mastery Lab{" "}
          <span>理解设计原因，而不只是记住函数名。</span>
        </footer>
      </main>
      {showSource && <SourceViewer target={source} onOpen={open} />}
      {searchOpen && (
        <div className="modal-backdrop" onClick={() => setSearchOpen(false)}>
          <section
            className="search-modal"
            role="dialog"
            aria-modal="true"
            aria-label="全文搜索"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-search">
              <Search size={20} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索全部教材正文…"
              />
              <button
                aria-label="关闭搜索"
                onClick={() => setSearchOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="search-results">
              {!query ? (
                <p>输入关键词，例如：闭包、baseQueue、Hydration。</p>
              ) : results.length ? (
                results.map((c) => {
                  const i = c.body.toLowerCase().indexOf(query.toLowerCase());
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        navigate(chapterUrl(c.id));
                        setSearchOpen(false);
                      }}
                    >
                      <b>{c.title}</b>
                      <small>{groups[c.group] || c.group}</small>
                      <p>
                        {c.body.slice(
                          Math.max(0, i - 30),
                          Math.max(0, i - 30) + 150,
                        )}
                      </p>
                    </button>
                  );
                })
              ) : (
                <p>没有匹配的章节，试试中英文术语。</p>
              )}
            </div>
            <footer>
              {results.length} 个匹配章节 <span>Esc 关闭</span>
            </footer>
          </section>
        </div>
      )}
      {term && (
        <div className="modal-backdrop" onClick={() => setTerm(null)}>
          <section
            className="term-modal"
            role="dialog"
            aria-modal="true"
            aria-label="术语解释"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="关闭术语解释"
              onClick={() => setTerm(null)}
            >
              <X size={18} />
            </button>
            <div className="eyebrow">GLOSSARY / 术语卡片</div>
            <h2>{term}</h2>
            <h3>{glossary[term]?.[0]}</h3>
            <p>{glossary[term]?.[1]}</p>
          </section>
        </div>
      )}
    </div>
  );
}
