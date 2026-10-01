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
  const basics = chapters.filter((chapter) => chapter.track === "basics");
  const basicsRead = basics.filter((chapter) =>
    validRead.includes(chapter.id),
  ).length;
  const courseGroups = [
    ...new Set([
      ...Object.keys(groups),
      ...chapters.map((chapter) => chapter.group),
    ]),
  ];
  const activeGroup =
    chapters.find((chapter) => chapter.id === activeChapterId)?.group ??
    "basicsStart";
  const activeTrack = activeGroup.startsWith("basics") ? "basics" : "advanced";
  const tracks = [
    {
      id: "basics",
      title: "React 基础",
      subtitle: "先会使用",
      groups: courseGroups.filter((group) => group.startsWith("basics")),
    },
    {
      id: "advanced",
      title: "源码进阶",
      subtitle: "再理解实现",
      groups: courseGroups.filter((group) => !group.startsWith("basics")),
    },
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
        {tracks.map((track) => {
          const count = chapters.filter((chapter) =>
            track.groups.includes(chapter.group),
          ).length;
          return (
            <details
              className="course-track"
              key={`${track.id}-${activeTrack}`}
              open={track.id === activeTrack}
            >
              <summary className="course-track-summary">
                <div>
                  <strong>{track.title}</strong>
                  <span>{track.subtitle}</span>
                </div>
                <small>{count} 篇</small>
                <ChevronDown size={15} />
              </summary>
              <div className="course-track-groups">
                {track.groups.map((group) => {
                  const list = chapters.filter(
                    (chapter) => chapter.group === group,
                  );
                  if (!list.length) return null;
                  const label = (groups[group] || group).replace(
                    /^基础\s*/,
                    "",
                  );
                  return (
                    <details
                      className="course-section"
                      key={`${group}-${activeGroup}`}
                      open={group === activeGroup}
                    >
                      <summary className="course-section-summary">
                        <ChevronDown size={13} />
                        <span>{label}</span>
                        <small>{list.length}</small>
                      </summary>
                      {list.map((chapter, index) => (
                        <Link
                          title={chapter.title}
                          key={chapter.id}
                          className={
                            chapter.id === activeChapterId ? "selected" : ""
                          }
                          to={chapterUrl(chapter.id)}
                          onClick={() => onNavigate()}
                        >
                          <span
                            className={
                              "chapter-status " +
                              (progress.read.includes(chapter.id) ? "done" : "")
                            }
                          >
                            {progress.read.includes(chapter.id) ? (
                              <Check size={11} />
                            ) : (
                              String(index + 1).padStart(2, "0")
                            )}
                          </span>
                          <span>
                            {chapter.title.replace(/^\d+[.、\s-]*/, "")}
                          </span>
                          {progress.bookmarks.includes(chapter.id) && (
                            <Bookmark size={10} />
                          )}
                        </Link>
                      ))}
                    </details>
                  );
                })}
              </div>
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
          已完成 {validRead.length} / {chapters.length} 篇 · 基础 {basicsRead} /{" "}
          {basics.length} 篇
        </small>
      </div>
    </aside>
  );
}
