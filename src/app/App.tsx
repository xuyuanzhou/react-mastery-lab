import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useProgress } from "../features/progress/useProgress";
import CallChain from "../features/learning/CallChain";
import { chapterUrl } from "./routes";
import CourseSidebar from "./CourseSidebar";
import HomePage from "./HomePage";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Atom,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  Menu,
  Moon,
  Search,
  Sun,
  X,
  PanelRightClose,
  PanelRightOpen,
  Clock,
} from "lucide-react";
import chapters from "../generated/chapters.json";
import {
  glossary,
  groups,
  type SourceTarget,
} from "../features/learning/model";
const SourceViewer = lazy(() => import("../features/source/SourceViewer"));
const Labs = lazy(() => import("../features/labs/Labs"));
const MarkdownArticle = lazy(
  () => import("../features/learning/MarkdownArticle"),
);
export default function App() {
  const { progress, setProgress, storageError } = useProgress();
  const [searchData, setSearchData] = useState<
      { id: string; title: string; group: string; body: string }[] | null
    >(null),
    [searchError, setSearchError] = useState(""),
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
  const main = useRef<HTMLElement>(null);
  const isLearn = location.pathname === "/learn",
    isLabs = location.pathname === "/labs",
    isSaved = location.pathname === "/saved";
  const active = chapters.findIndex((c) => c.id === doc?.id);
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
    main.current?.scrollTo(0, 0);
  }, [doc, location.pathname, setProgress]);
  useEffect(() => {
    if (!searchOpen || searchData) return;
    const controller = new AbortController();
    fetch(import.meta.env.BASE_URL + "search-index.json", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`搜索索引加载失败：${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setSearchData(data);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSearchError(String(reason));
      });
    return () => controller.abort();
  }, [searchOpen, searchData]);
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
    ? (searchData ?? []).filter((c) =>
        (c.title + " " + c.body)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : [];
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
      <CourseSidebar
        progress={progress}
        activeChapterId={doc?.id}
        pathname={location.pathname}
        mobileOpen={mobileNav}
        onNavigate={() => setMobileNav(false)}
      />
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
                <Suspense fallback={<p className="muted">正在准备阅读器…</p>}>
                  <MarkdownArticle
                    doc={doc}
                    anchor={params.get("anchor")}
                    onToc={setToc}
                    onTerm={setTerm}
                    onOpenSource={open}
                  />
                </Suspense>
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
          <Suspense fallback={<p className="muted">正在准备实验室…</p>}>
            <Labs />
          </Suspense>
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
          <HomePage progress={progress} onOpenSource={open} />
        )}
        <footer className="main-footer">
          <Atom size={14} /> React Mastery Lab{" "}
          <span>理解设计原因，而不只是记住函数名。</span>
        </footer>
      </main>
      {showSource && (
        <Suspense
          fallback={
            <aside className="source-panel">
              <p>正在准备源码工作台…</p>
            </aside>
          }
        >
          <SourceViewer target={source} onOpen={open} />
        </Suspense>
      )}
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
              {searchError ? (
                <p role="alert">{searchError}</p>
              ) : !searchData ? (
                <p>正在加载搜索索引…</p>
              ) : !query ? (
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
