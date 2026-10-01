import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Search,
  Code2,
  Folder,
  ChevronRight,
  Languages,
} from "lucide-react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import { Link } from "react-router-dom";
import { chapterUrl } from "../../app/routes";
import { sourceAnnotations } from "./annotations";
import type { SourceOrigin, SourceTarget } from "../learning/model";
hljs.registerLanguage("javascript", javascript);
type File = {
  path: string;
  symbols: { name: string; line: number }[];
  lines: number;
  sha256: string;
};
type Index = { tag: string; files: File[] };
const cache = new Map<string, string>();
const base = import.meta.env.BASE_URL;
async function getSource(
  path: string,
  origin: SourceOrigin,
  signal?: AbortSignal,
) {
  const key = origin + ":" + path;
  if (cache.has(key)) return cache.get(key)!;
  const r = await fetch(
    base + (origin === "project" ? "project-source/" : "react-source/") + path,
    { signal },
  );
  if (!r.ok) throw Error("源码加载失败：" + r.status);
  const text = await r.text();
  if (text.startsWith("<!doctype")) throw Error("未找到源码文件");
  cache.set(key, text);
  return text;
}
function FileTree({
  files,
  open,
  origin,
}: {
  files: File[];
  origin: SourceOrigin;
  open: (t: SourceTarget) => void;
}) {
  const root: Record<string, File[]> = {};
  files.forEach((f) => {
    const group = f.path.split("/").slice(0, -1).join("/");
    (root[group] ??= []).push(f);
  });
  return (
    <div className="file-tree">
      {Object.entries(root).map(([p, fs]) => (
        <details key={p}>
          <summary>
            <Folder size={12} />
            {p.replace("packages/", "")}
          </summary>
          {fs.map((f) => (
            <button
              key={f.path}
              onClick={() => open({ path: f.path, line: 1, origin })}
            >
              {f.path.split("/").at(-1)}
            </button>
          ))}
        </details>
      ))}
    </div>
  );
}
export default function SourceViewer({
  target,
  onOpen,
  sourceWidth,
  onResize,
}: {
  target: SourceTarget | null;
  onOpen: (t: SourceTarget) => void;
  sourceWidth: number | null;
  onResize: (width: number) => void;
}) {
  const [indexes, setIndexes] = useState<Record<SourceOrigin, Index | null>>({
      react: null,
      project: null,
    }),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [loadedPath, setLoadedPath] = useState(""),
    [scrollTop, setScrollTop] = useState(0),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<SourceTarget[]>([]),
    [pos, setPos] = useState(-1),
    [tab, setTab] = useState("symbols"),
    [showNotes, setShowNotes] = useState(true),
    [query, setQuery] = useState(""),
    [matches, setMatches] = useState<
      { path: string; line: number; text: string }[]
    >([]),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState("");
  const selected = history[pos];
  const origin: SourceOrigin = selected?.origin ?? "react";
  const index = indexes[origin];
  const codeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const resizing = useRef(false);
  const previousUserSelect = useRef("");
  const start = Math.max(0, Math.floor(scrollTop / 20) - 15);
  const historyRef = useRef({ history, pos });
  useEffect(() => {
    historyRef.current = { history, pos };
  }, [history, pos]);
  const searchAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    for (const scope of ["react", "project"] as const) {
      fetch(
        base +
          (scope === "project"
            ? "project-source-index.json"
            : "source-index.json"),
      )
        .then((response) => {
          if (!response.ok) throw Error("索引加载失败：" + scope);
          return response.json();
        })
        .then((data: Index) =>
          setIndexes((previous) => ({ ...previous, [scope]: data })),
        )
        .catch((reason: unknown) => setError(String(reason)));
    }
    return () => searchAbort.current?.abort();
  }, []);
  useEffect(() => {
    if (!target) return;
    const h = historyRef.current;
    setHistory([...h.history.slice(0, h.pos + 1), target]);
    setPos(h.pos + 1);
  }, [target]);
  const file = index?.files.find((f) => f.path === selected?.path);
  const line = selected?.symbol
    ? (file?.symbols.find((s) => s.name === selected.symbol)?.line ?? 1)
    : (selected?.line ?? 1);
  const selectedPath = selected?.path;
  const selectedKey = selectedPath ? origin + ":" + selectedPath : "";
  const fileNotes =
    origin === "react"
      ? sourceAnnotations.filter((note) => note.path === selectedPath)
      : [];
  const notesByLine = new Map(
    fileNotes.flatMap((note) => {
      const sourceSymbol = file?.symbols.find(
        (symbol) => symbol.name === note.symbol,
      );
      return sourceSymbol ? [[sourceSymbol.line, note] as const] : [];
    }),
  );
  const activeNote =
    fileNotes.find((note) => note.symbol === selected?.symbol) ??
    notesByLine.get(line);
  useEffect(() => {
    if (!selectedPath) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setText("");
        setBusy(true);
        setError("");
      }
    });
    getSource(selectedPath, origin, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setText(value);
          setLoadedPath(selectedKey);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [selectedPath, origin, selectedKey]);
  useEffect(() => {
    if (text && !busy && codeRef.current && loadedPath === selectedKey) {
      const top = Math.max(
        0,
        (line - 1) * 20 - codeRef.current.clientHeight / 2,
      );
      codeRef.current.scrollTop = top;
      setScrollTop(top);
    }
  }, [text, line, busy, loadedPath, selectedKey]);
  const colored = useMemo(() => {
    const spans: string[] = [];
    return hljs
      .highlight(text, { language: "javascript", ignoreIllegals: true })
      .value.split("\n")
      .map((line) => {
        const prefix = spans.join("");
        for (const m of line.matchAll(/<span class="[^"]+">|<\/span>/g)) {
          if (m[0] === "</span>") spans.pop();
          else spans.push(m[0]);
        }
        return prefix + line + "</span>".repeat(spans.length);
      });
  }, [text]);
  const filtered =
    index?.files.filter((f) =>
      f.path.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];
  async function searchAll() {
    searchAbort.current?.abort();
    const c = new AbortController();
    searchAbort.current = c;
    setSearching(true);
    setSearchError("");
    setMatches([]);
    const found: { path: string; line: number; text: string }[] = [];
    let failures = 0;
    try {
      const fs = index?.files ?? [];
      for (let i = 0; i < fs.length && found.length < 150; i += 8) {
        if (c.signal.aborted) return;
        await Promise.all(
          fs.slice(i, i + 8).map(async (f) => {
            try {
              const source = await getSource(f.path, origin, c.signal);
              source.split("\n").forEach((s, j) => {
                if (
                  s.toLowerCase().includes(query.toLowerCase()) &&
                  found.length < 150
                )
                  found.push({ path: f.path, line: j + 1, text: s.trim() });
              });
            } catch {
              if (!c.signal.aborted) failures++;
            }
          }),
        );
        setMatches([...found]);
      }
      if (failures) setSearchError(`${failures} 个文件读取失败，结果不完整。`);
    } finally {
      if (!c.signal.aborted) setSearching(false);
    }
  }
  function resizeFrom(clientX: number) {
    const sidebar = document.querySelector(".sidebar")?.getBoundingClientRect();
    const maxWidth = Math.max(
      320,
      window.innerWidth - (sidebar?.width ?? 244) - 380,
    );
    onResize(
      Math.round(
        Math.min(maxWidth, Math.max(320, window.innerWidth - clientX)),
      ),
    );
  }
  function finishResize() {
    resizing.current = false;
    document.body.style.userSelect = previousUserSelect.current;
  }
  return (
    <aside className="source-panel" ref={panelRef}>
      <div
        className="source-resize-handle"
        role="separator"
        tabIndex={0}
        aria-label="拖拽调整源码窗口宽度"
        aria-orientation="vertical"
        aria-valuemin={320}
        aria-valuemax={Math.max(320, window.innerWidth - 624)}
        aria-valuenow={
          sourceWidth ??
          (window.innerWidth >= 1700
            ? 510
            : window.innerWidth <= 1250
              ? 335
              : 420)
        }
        title="拖动以调整源码窗口宽度；方向键微调"
        onPointerDown={(event) => {
          resizing.current = true;
          previousUserSelect.current = document.body.style.userSelect;
          document.body.style.userSelect = "none";
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (resizing.current) resizeFrom(event.clientX);
        }}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onKeyDown={(event) => {
          const current =
            sourceWidth ??
            panelRef.current?.getBoundingClientRect().width ??
            420;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const offset = event.key === "ArrowLeft" ? 32 : -32;
            resizeFrom(window.innerWidth - current - offset);
          }
        }}
      />
      <div className="panel-heading">
        <span>
          <Code2 size={16} /> 源码工作台
        </span>
        <span className="badge">
          {origin === "react" ? "v19.3.0" : "本项目"}
        </span>
      </div>
      <div className="source-tools">
        <button
          aria-label="源码后退"
          disabled={pos <= 0}
          onClick={() => setPos(pos - 1)}
        >
          <ArrowLeft size={15} />
        </button>
        <button
          aria-label="源码前进"
          disabled={pos >= history.length - 1}
          onClick={() => setPos(pos + 1)}
        >
          <ArrowRight size={15} />
        </button>
        <span>
          {origin === "react" ? "facebook / react" : "react-mastery-lab"}
        </span>
        {origin === "react" && (
          <button
            className={showNotes ? "notes-toggle active" : "notes-toggle"}
            aria-label={showNotes ? "关闭中文注释" : "显示中文注释"}
            aria-pressed={showNotes}
            onClick={() => setShowNotes((value) => !value)}
            title="切换中文讲解层；不修改官方源码"
          >
            <Languages size={14} /> {showNotes ? "关闭注释" : "显示注释"}
          </button>
        )}
        {selected && (
          <a
            aria-label="在 GitHub 查看"
            href={
              (origin === "react"
                ? "https://github.com/facebook/react/blob/v19.3.0/"
                : "https://github.com/xuyuanzhou/react-mastery-lab/blob/main/") +
              selected.path +
              "#L" +
              line
            }
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
      <div className="source-scope" role="group" aria-label="源码范围">
        <button
          className={origin === "react" ? "active" : ""}
          onClick={() =>
            onOpen({
              origin: "react",
              path: "packages/react-reconciler/src/ReactFiberHooks.js",
              symbol: "renderWithHooks",
            })
          }
        >
          React 官方源码
        </button>
        <button
          className={origin === "project" ? "active" : ""}
          onClick={() =>
            onOpen({ origin: "project", path: "src/app/App.tsx", line: 1 })
          }
        >
          本项目源码
        </button>
      </div>
      <div className="source-tabs">
        {[
          ["symbols", "函数索引"],
          ["notes", "中文注释"],
          ["files", "文件树"],
          ["search", "源码搜索"],
        ].map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => {
              setTab(id);
              setQuery("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="search-field">
        <Search size={14} />
        <input
          aria-label="查找源码"
          placeholder={
            tab === "search"
              ? "输入文本，搜索全部缓存源码…"
              : tab === "notes"
                ? "查找注释主题或函数…"
                : "查找文件或函数…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && tab === "search" && query.trim())
              void searchAll();
          }}
        />
      </label>
      <div className="source-explorer">
        {!index && !error && <p>正在加载源码索引…</p>}
        {tab === "files" && (
          <FileTree files={filtered} open={onOpen} origin={origin} />
        )}{" "}
        {tab === "symbols" && (
          <div className="symbols">
            {(query
              ? index?.files.flatMap((f) =>
                  f.symbols
                    .filter((s) =>
                      s.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((s) => ({ ...s, path: f.path })),
                )
              : file?.symbols.map((s) => ({ ...s, path: file.path }))
            )
              ?.slice(0, 150)
              .map((s, i) => (
                <button
                  key={s.path + s.name + i}
                  onClick={() => onOpen({ path: s.path, line: s.line, origin })}
                >
                  <span className="function-icon">ƒ</span>
                  <span>
                    {s.name}
                    <small>
                      {query ? s.path.split("/").at(-1) : "function"}
                    </small>
                  </span>
                  <span className="line-label">{s.line}</span>
                </button>
              ))}
            {!selected && !query && <p>点击教材中的源码链接，或搜索函数名。</p>}
          </div>
        )}
        {tab === "notes" && (
          <div className="source-notes-list">
            {origin === "project" ? (
              <p>中文源码注释目前针对 React v19.3.0 官方源码。</p>
            ) : (
              (query.trim()
                ? sourceAnnotations.filter((note) =>
                    (note.title + note.symbol + note.summary)
                      .toLowerCase()
                      .includes(query.trim().toLowerCase()),
                  )
                : selectedPath
                  ? fileNotes
                  : sourceAnnotations.slice(0, 8)
              ).map((note) => (
                <button
                  key={note.path + note.symbol}
                  onClick={() => {
                    setShowNotes(true);
                    onOpen({ path: note.path, symbol: note.symbol, origin });
                  }}
                >
                  <strong>{note.title}</strong>
                  <small>{note.symbol}</small>
                </button>
              ))
            )}
            {origin === "react" &&
              selectedPath &&
              !query &&
              fileNotes.length === 0 && (
                <p>此文件暂无人工注释，可继续使用函数索引或源码搜索。</p>
              )}
          </div>
        )}
        {tab === "search" && (
          <>
            <button
              className="small-primary"
              disabled={!query.trim() || searching}
              onClick={() => void searchAll()}
            >
              {searching ? "正在搜索…" : "搜索所有源码文件"}
            </button>
            {searching && (
              <button
                onClick={() => {
                  searchAbort.current?.abort();
                  setSearching(false);
                }}
              >
                停止搜索
              </button>
            )}
            <p className="muted">
              最多显示 150 条结果 · 首次搜索会读取本站缓存
            </p>
            {searchError && <p role="alert">{searchError}</p>}
            {matches.map((m, i) => (
              <button
                className="search-match"
                key={i}
                onClick={() => onOpen({ ...m, origin })}
              >
                <b>
                  {m.path.split("/").at(-1)}:{m.line}
                </b>
                <small>{m.text}</small>
              </button>
            ))}
          </>
        )}
      </div>
      <div className="code-path">
        {selected?.path.replace("packages/", "") || "选择一个源码入口"}{" "}
        <ChevronRight size={12} />
      </div>
      {selected?.symbol &&
        file &&
        !file.symbols.some((s) => s.name === selected.symbol) && (
          <p role="alert">未找到符号 {selected.symbol}，已打开文件顶部。</p>
        )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {origin === "react" && showNotes && activeNote && (
        <div className="source-note-card" role="note">
          <div className="source-note-heading">
            <Languages size={14} />
            <strong>{activeNote.title}</strong>
            <button
              aria-label="关闭中文注释"
              title="关闭中文注释"
              onClick={() => setShowNotes(false)}
            >
              ×
            </button>
          </div>
          <p>{activeNote.summary}</p>
          <p className="source-note-watch">阅读时看：{activeNote.watch}</p>
          <Link to={chapterUrl(activeNote.chapter)}>阅读对应教材 →</Link>
        </div>
      )}
      {busy || (!error && !!selected && loadedPath !== selectedKey) ? (
        <p className="loading">正在读取源码…</p>
      ) : (
        <div
          className="source-code"
          ref={codeRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          tabIndex={0}
          aria-label="源码内容"
        >
          <div style={{ height: start * 20 }} aria-hidden="true" />
          {colored.slice(start, start + 100).map((html, offset) => {
            const i = start + offset;
            const note = showNotes ? notesByLine.get(i + 1) : undefined;
            return (
              <div
                key={i}
                id={"source-line-" + (i + 1)}
                className={
                  i + 1 === line
                    ? "code-line selected"
                    : note
                      ? "code-line annotated"
                      : "code-line"
                }
              >
                <button
                  aria-label={"定位第 " + (i + 1) + " 行"}
                  onClick={() =>
                    selected &&
                    onOpen({ path: selected.path, line: i + 1, origin })
                  }
                >
                  {i + 1}
                </button>
                {note && (
                  <button
                    className="source-note-marker"
                    aria-label={`查看 ${note.symbol} 的中文注释`}
                    title={note.title}
                    onClick={() =>
                      onOpen({ path: note.path, symbol: note.symbol, origin })
                    }
                  >
                    译
                  </button>
                )}
                {!note && (
                  <span className="source-note-spacer" aria-hidden="true" />
                )}
                <code dangerouslySetInnerHTML={{ __html: html || " " }} />
              </div>
            );
          })}
          <div
            style={{ height: Math.max(0, colored.length - start - 100) * 20 }}
            aria-hidden="true"
          />
        </div>
      )}
      <footer className="source-footer">
        <span className="status-dot" />
        {origin === "react"
          ? "官方 tag 本地缓存 · MIT"
          : "本项目构建期源码快照"}{" "}
        <span>{file?.lines ?? 0} 行</span>
      </footer>
    </aside>
  );
}
