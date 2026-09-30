import { Link } from "react-router-dom";
import {
  Bookmark,
  Check,
  ChevronDown,
  GraduationCap,
  Home,
} from "lucide-react";
import chapters from "../generated/chapters.json";
import { groups } from "../features/learning/model";
import type { Progress } from "../features/progress/useProgress";
import { chapterUrl } from "./routes";

export default function CourseSidebar({
  progress,
  activeChapterId,
  pathname,
  mobileOpen,
  onNavigate,
}: {
  progress: Progress;
  activeChapterId?: string;
  pathname: string;
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const validRead = progress.read.filter((id) =>
    chapters.some((chapter) => chapter.id === id),
  );
  const percent = Math.round(
    (validRead.length / Math.max(1, chapters.length)) * 100,
  );
  const courseGroups = [
    ...new Set([
      ...Object.keys(groups),
      ...chapters.map((chapter) => chapter.group),
    ]),
  ];
  return (
    <aside className={"sidebar " + (mobileOpen ? "mobile-open" : "")}>
      <div className="workspace-name">
        <span className="workspace-icon">
          <GraduationCap size={18} />
        </span>
        <span>
          React 原理精通<small>从使用者，到实现者</small>
        </span>
      </div>
      <div className="side-shortcuts">
        <Link
          to="/"
          onClick={() => onNavigate()}
          className={pathname === "/" ? "active" : ""}
        >
          <Home size={16} />
          学习路线
        </Link>
        <Link
          to="/saved"
          onClick={() => onNavigate()}
          className={pathname === "/saved" ? "active" : ""}
        >
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
                  className={c.id === activeChapterId ? "selected" : ""}
                  to={chapterUrl(c.id)}
                  onClick={() => onNavigate()}
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
                  {progress.bookmarks.includes(c.id) && <Bookmark size={10} />}
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
  );
}
