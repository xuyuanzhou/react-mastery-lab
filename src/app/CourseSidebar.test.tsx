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
});
