// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SourceViewer from "./SourceViewer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("中文注释作为讲解层展示，并保持官方源码原文和行号", async () => {
  const path = "packages/react-reconciler/src/ReactFiberHooks.js";
  const body = "// official source\nfunction renderWithHooks() {}\n";
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string) => {
      if (input.endsWith("project-source-index.json"))
        return Promise.resolve({
          ok: true,
          json: async () => ({ tag: "this-project", files: [] }),
        });
      if (input.endsWith("source-index.json"))
        return Promise.resolve({
          ok: true,
          json: async () => ({
            tag: "v19.3.0",
            files: [
              {
                path,
                lines: 3,
                sha256: "test",
                symbols: [{ name: "renderWithHooks", line: 2 }],
              },
            ],
          }),
        });
      return Promise.resolve({ ok: true, text: async () => body });
    }),
  );
  render(
    <MemoryRouter>
      <SourceViewer
        target={{ path, symbol: "renderWithHooks" }}
        onOpen={vi.fn()}
        sourceWidth={420}
        onResize={vi.fn()}
      />
    </MemoryRouter>,
  );

  expect(
    await screen.findByText("运行函数组件并选择 Hook Dispatcher"),
  ).toBeTruthy();
  await waitFor(() => {
    expect(screen.getByLabelText("源码内容").textContent).toContain(
      "function renderWithHooks() {}",
    );
    expect(screen.getByLabelText("源码内容").scrollTop).toBe(20);
  });
  expect(screen.getByLabelText("查看 renderWithHooks 的中文注释")).toBeTruthy();
  await userEvent.click(screen.getAllByLabelText("关闭中文注释")[0]);
  expect(screen.queryByText("运行函数组件并选择 Hook Dispatcher")).toBeNull();
  expect(screen.getByLabelText("源码内容").textContent).toContain(
    "function renderWithHooks() {}",
  );
});
