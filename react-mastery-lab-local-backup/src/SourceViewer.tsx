import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Search,
  Code2,
  Folder,
  ChevronRight,
} from "lucide-react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import type { SourceTarget } from "./model";
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
async function getSource(path: string, signal?: AbortSignal) {
  if (cache.has(path)) return cache.get(path)!;
  const r = await fetch(base + "react-source/" + path, { signal });
  if (!r.ok) throw Error("源码加载失败：" + r.status);
  const text = await r.text();
  if (text.startsWith("<!doctype")) throw Error("未找到源码文件");
  cache.set(path, text);
  return text;
}
function FileTree({
  files,
  open,
}: {
  files: File[];
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
              onClick={() => open({ path: f.path, line: 1 })}
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
}: {
  target: SourceTarget | null;
  onOpen: (t: SourceTarget) => void;
}) {
  const [index, setIndex] = useState<Index | null>(null),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [loadedPath, setLoadedPath] = useState(""),
    [scrollTop, setScrollTop] = useState(0),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<SourceTarget[]>([]),
    [pos, setPos] = useState(-1),
    [tab, setTab] = useState("symbols"),
    [query, setQuery] = useState(""),
    [matches, setMatches] = useState<
      { path: string; line: number; text: string }[]
    >([]),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState("");
  const selected = history[pos];
  const codeRef = useRef<HTMLDivElement>(null);
  const start = Math.max(0, Math.floor(scrollTop / 20) - 15);
  const historyRef = useRef({ history, pos });
  historyRef.current = { history, pos };
  const searchAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    fetch(base + "source-index.json")
      .then((r) => {
        if (!r.ok) throw Error("索引加载失败");
        return r.json();
      })
      .then(setIndex)
      .catch((e) => setError(e.message));
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
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setText("");
    setBusy(true);
    setError("");
    getSource(selected.path, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setText(value);
          setLoadedPath(selected.path);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [selected?.path]);
  useEffect(() => {
    if (text && !busy && codeRef.current && loadedPath === selected?.path) {
      const top = Math.max(
        0,
        (line - 1) * 20 - codeRef.current.clientHeight / 2,
      );
      codeRef.current.scrollTop = top;
      setScrollTop(top);
    }
  }, [text, line, busy, loadedPath, selected?.path]);
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
              const source = await getSource(f.path, c.signal);
              source.split("\n").forEach((s, j) => {
                if (
                  s.toLowerCase().includes(query.toLowerCase()) &&
                  found.length < 150
                )
                  found.push({ path: f.path, line: j + 1, text: s.trim() });
              });
            } catch (e) {
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
  return (
    <aside className="source-panel">
      <div className="panel-heading">
        <span>
          <Code2 size={16} /> 源码工作台
        </span>
        <span className="badge">v19.3.0</span>
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
        <span>facebook / react</span>
        {selected && (
          <a
            aria-label="在 GitHub 查看"
            href={
              "https://github.com/facebook/react/blob/v19.3.0/" +
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
      <div className="source-tabs">
        {[
          ["symbols", "函数索引"],
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
            tab === "search" ? "输入文本，搜索全部缓存源码…" : "查找文件或函数…"
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
        {tab === "files" && <FileTree files={filtered} open={onOpen} />}{" "}
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
                  onClick={() => onOpen({ path: s.path, line: s.line })}
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
                onClick={() => onOpen(m)}
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
      {busy || (!error && !!selected && loadedPath !== selected.path) ? (
        <p className="loading">正在读取官方源码…</p>
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
            return (
              <div
                key={i}
                id={"source-line-" + (i + 1)}
                className={i + 1 === line ? "code-line selected" : "code-line"}
              >
                <button
                  aria-label={"定位第 " + (i + 1) + " 行"}
                  onClick={() =>
                    selected && onOpen({ path: selected.path, line: i + 1 })
                  }
                >
                  {i + 1}
                </button>
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
        官方 tag 本地缓存 · MIT <span>{file?.lines ?? 0} 行</span>
      </footer>
    </aside>
  );
}
