// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import chapters from "../generated/chapters.json";
import type { Progress } from "../features/progress/useProgress";
import CourseSidebar from "./CourseSidebar";

const progress: Progress = {
  read: [],
  bookmarks: [],
  recent: [],
  theme: "dark",
};

describe("课程目录层级", () => {
  it("按基础与进阶分轨，只展开当前章节所在阶段", () => {
    const first = chapters.find((chapter) => chapter.group === "basicsStart");
    const advanced = chapters.find((chapter) => chapter.group === "runtime");
    expect(first).toBeDefined();
    expect(advanced).toBeDefined();

    const view = render(
      <MemoryRouter>
        <CourseSidebar
          progress={progress}
          activeChapterId={first!.id}
          pathname="/learn"
          mobileOpen={false}
          onNavigate={() => {}}
        />
      </MemoryRouter>,
    );
    const tracks =
      view.container.querySelectorAll<HTMLDetailsElement>(".course-track");
    expect(tracks).toHaveLength(2);
    expect(tracks[0].open).toBe(true);
    expect(tracks[1].open).toBe(false);
    expect(view.getByText("当前阶段 · 01 / React 入门")).toBeTruthy();
    expect(
      tracks[0].querySelectorAll<HTMLDetailsElement>(".course-section[open]"),
    ).toHaveLength(1);

    const nextBasics = chapters.find((chapter) => chapter.group === "basicsUi");
    expect(nextBasics).toBeDefined();
    view.rerender(
      <MemoryRouter>
        <CourseSidebar
          progress={progress}
          activeChapterId={nextBasics!.id}
          pathname="/learn"
          mobileOpen={false}
          onNavigate={() => {}}
        />
      </MemoryRouter>,
    );
    const basicsSections = view.container.querySelectorAll<HTMLDetailsElement>(
      ".course-track:first-child .course-section",
    );
    expect([...basicsSections].filter((section) => section.open)).toHaveLength(
      1,
    );
    expect(basicsSections[1].open).toBe(true);
    expect(view.getByText("当前阶段 · 02 / 组件与交互")).toBeTruthy();

    view.rerender(
      <MemoryRouter>
        <CourseSidebar
          progress={progress}
          activeChapterId={advanced!.id}
          pathname="/learn"
          mobileOpen={false}
          onNavigate={() => {}}
        />
      </MemoryRouter>,
    );
    const moved =
      view.container.querySelectorAll<HTMLDetailsElement>(".course-track");
    expect(moved[0].open).toBe(false);
    expect(moved[1].open).toBe(true);
    expect(
      moved[1].querySelectorAll<HTMLDetailsElement>(".course-section[open]"),
    ).toHaveLength(1);
  });

  it("分别展示基础与进阶的已读进度", () => {
    const basics = chapters.find((chapter) => chapter.group === "basicsStart")!;
    const advanced = chapters.find((chapter) => chapter.group === "runtime")!;
    const advancedCount = chapters.filter(
      (chapter) => chapter.track !== "basics",
    ).length;
    const view = render(
      <MemoryRouter>
        <CourseSidebar
          progress={{ ...progress, read: [basics.id, basics.id, advanced.id] }}
          activeChapterId={basics.id}
          pathname="/learn"
          mobileOpen={false}
          onNavigate={() => {}}
        />
      </MemoryRouter>,
    );

    expect(view.getByText("1/34 已读")).toBeTruthy();
    expect(view.getByText(`1/${advancedCount} 已读`)).toBeTruthy();
    expect(
      view.container.querySelector(".progress-card small")?.textContent,
    ).toMatch(new RegExp(`基础\\s*1/34\\s*·\\s*进阶\\s*1/${advancedCount}`));
  });
});
