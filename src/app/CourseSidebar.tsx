import { useEffect, useRef } from "react";
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
  const activeChapterRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!activeChapterId) return;
    if (window.matchMedia?.("(max-width: 900px)")?.matches && !mobileOpen) {
      return;
    }
    activeChapterRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [activeChapterId, mobileOpen]);

  const readIds = new Set(progress.read);
  const validRead = chapters.filter((chapter) => readIds.has(chapter.id));
  const percent = Math.round(
    (validRead.length / Math.max(1, chapters.length)) * 100,
  );
  const basics = chapters.filter((chapter) => chapter.track === "basics");
  const basicsRead = basics.filter((chapter) => readIds.has(chapter.id)).length;
  const advancedRead = validRead.length - basicsRead;
  const advancedCount = chapters.length - basics.length;
  const courseGroups = [
    ...new Set([
      ...Object.keys(groups),
      ...chapters.map((chapter) => chapter.group),
    ]),
  ];
  const activeChapter = chapters.find(
    (chapter) => chapter.id === activeChapterId,
  );
  const activeGroup = activeChapter?.group ?? "basicsStart";
  const activeGroupLabel = (groups[activeGroup] || activeGroup).replace(
    /^基础\s*/,
    "",
  );
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
      {activeChapter && (
        <div className="sidebar-current" title={activeChapter.title}>
          当前阶段 · {activeGroupLabel}
        </div>
      )}
      <div className="course-tree">
        {tracks.map((track) => {
          const trackChapters = chapters.filter((chapter) =>
            track.groups.includes(chapter.group),
          );
          const count = trackChapters.length;
          const readCount = trackChapters.filter((chapter) =>
            readIds.has(chapter.id),
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
                <small title={`已读 ${readCount} / ${count} 篇`}>
                  {readCount}/{count} 已读
                </small>
                <ChevronDown size={15} />
              </summary>
              <div className="course-track-groups">
                {track.groups.map((group) => {
                  const list = chapters.filter(
                    (chapter) => chapter.group === group,
                  );
                  if (!list.length) return null;
                  const groupRead = list.filter((chapter) =>
                    readIds.has(chapter.id),
                  ).length;
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
                        <small title={`已读 ${groupRead} / ${list.length} 篇`}>
                          {groupRead}/{list.length}
                        </small>
                      </summary>
                      {list.map((chapter, index) => (
                        <Link
                          ref={
                            chapter.id === activeChapterId
                              ? activeChapterRef
                              : undefined
                          }
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
                              (readIds.has(chapter.id) ? "done" : "")
                            }
                          >
                            {readIds.has(chapter.id) ? (
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
          已完成 {validRead.length} / {chapters.length} 篇
          <br />
          基础 {basicsRead}/{basics.length} · 进阶 {advancedRead}/
          {advancedCount}
        </small>
      </div>
    </aside>
  );
}
