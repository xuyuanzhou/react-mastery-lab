// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MarkdownArticle from "./MarkdownArticle";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderArticle(bodyResponse: {
  ok: boolean;
  status?: number;
  text?: () => Promise<string>;
}) {
  const onOpenSource = vi.fn();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(bodyResponse));
  render(
    <MemoryRouter>
      <MarkdownArticle
        doc={{ id: "engineering/01-example.md" }}
        anchor={null}
        onToc={vi.fn()}
        onTerm={vi.fn()}
        onOpenSource={onOpenSource}
      />
    </MemoryRouter>,
  );
  return onOpenSource;
}

test("正文按需加载，点击项目源码链接定位文件", async () => {
  const user = userEvent.setup();
  const onOpenSource = renderArticle({
    ok: true,
    text: async () => "# 工程课程\n\n[查看 App](project:src/app/App.tsx#L12)",
  });
  expect(await screen.findByRole("heading", { name: "工程课程" })).toBeTruthy();
  await user.click(screen.getByRole("link", { name: /查看 App/ }));
  expect(onOpenSource).toHaveBeenCalledWith({
    origin: "project",
    path: "src/app/App.tsx",
    line: 12,
  });
});

test("正文请求失败时显示明确错误", async () => {
  renderArticle({ ok: false, status: 404 });
  expect((await screen.findByRole("alert")).textContent).toContain("404");
});
