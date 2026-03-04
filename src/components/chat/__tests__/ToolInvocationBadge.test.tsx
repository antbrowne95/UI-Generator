import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getToolLabel } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => cleanup());

// --- getToolLabel unit tests (public API, preserved for backward compat) ---

test("getToolLabel: str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "src/components/Card.tsx" })).toBe("Creating Card.tsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "src/components/Button.tsx" })).toBe("Editing Button.tsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "src/lib/utils.ts" })).toBe("Editing utils.ts");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "src/app/page.tsx" })).toBe("Reading page.tsx");
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "src/index.ts" })).toBe("Undoing edit in index.ts");
});

test("getToolLabel: file_manager rename includes destination", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "src/old.tsx", new_path: "src/new.tsx" })).toBe("Renaming old.tsx \u2192 new.tsx");
});

test("getToolLabel: file_manager rename without new_path omits arrow", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "src/old.tsx" })).toBe("Renaming old.tsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "src/components/Unused.tsx" })).toBe("Deleting Unused.tsx");
});

test("getToolLabel: uses only the filename, not the full path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "src/deeply/nested/folder/Component.tsx" })).toBe("Creating Component.tsx");
});

test("getToolLabel: missing path returns fallback", () => {
  expect(getToolLabel("str_replace_editor", { command: "create" })).toBe("Editing file");
});

test("getToolLabel: missing path for file_manager returns fallback", () => {
  expect(getToolLabel("file_manager", { command: "delete" })).toBe("Managing file");
});

test("getToolLabel: unknown tool returns tool name", () => {
  expect(getToolLabel("some_other_tool", {})).toBe("some_other_tool");
});

// --- hidden: view commands render nothing ---

test("ToolInvocationBadge: view in call state renders nothing", () => {
  const toolInvocation: ToolInvocation = {
    state: "call",
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "view", path: "src/app/page.tsx" },
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(container.firstChild).toBeNull();
});

test("ToolInvocationBadge: view in result state renders nothing", () => {
  const toolInvocation: ToolInvocation = {
    state: "result",
    toolCallId: "2",
    toolName: "str_replace_editor",
    args: { command: "view", path: "src/app/page.tsx" },
    result: "file contents",
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(container.firstChild).toBeNull();
});

// --- in-progress: operation-specific spinner colors ---

test("ToolInvocationBadge: create in-progress shows blue spinner", () => {
  const toolInvocation: ToolInvocation = {
    state: "call",
    toolCallId: "3",
    toolName: "str_replace_editor",
    args: { command: "create", path: "src/components/Card.tsx" },
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
  expect(container.querySelector(".animate-spin.text-blue-600")).not.toBeNull();
});

test("ToolInvocationBadge: edit in-progress shows amber spinner", () => {
  const toolInvocation: ToolInvocation = {
    state: "call",
    toolCallId: "4",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "src/components/Button.tsx" },
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(container.querySelector(".animate-spin.text-amber-600")).not.toBeNull();
});

test("ToolInvocationBadge: delete in-progress shows red spinner", () => {
  const toolInvocation: ToolInvocation = {
    state: "call",
    toolCallId: "5",
    toolName: "file_manager",
    args: { command: "delete", path: "src/components/OldComponent.tsx" },
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(screen.getByText("Deleting OldComponent.tsx")).toBeDefined();
  expect(container.querySelector(".animate-spin.text-red-600")).not.toBeNull();
});

test("ToolInvocationBadge: rename in-progress shows violet spinner", () => {
  const toolInvocation: ToolInvocation = {
    state: "call",
    toolCallId: "6",
    toolName: "file_manager",
    args: { command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" },
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(container.querySelector(".animate-spin.text-violet-600")).not.toBeNull();
});

// --- completed: no spinner, muted icon ---

test("ToolInvocationBadge: completed shows no spinner and muted icon", () => {
  const toolInvocation: ToolInvocation = {
    state: "result",
    toolCallId: "7",
    toolName: "str_replace_editor",
    args: { command: "create", path: "src/components/Card.tsx" },
    result: "File created",
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
  expect(container.querySelector(".text-neutral-400")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

// --- error state ---

test("ToolInvocationBadge: str_replace_editor error string shows AlertCircle", () => {
  const toolInvocation: ToolInvocation = {
    state: "result",
    toolCallId: "8",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "src/components/Card.tsx" },
    result: "Error: old_str not found in file",
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(container.querySelector(".text-red-500")).not.toBeNull();
  expect(container.querySelector(".text-red-600")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolInvocationBadge: file_manager { success: false } shows AlertCircle", () => {
  const toolInvocation: ToolInvocation = {
    state: "result",
    toolCallId: "9",
    toolName: "file_manager",
    args: { command: "delete", path: "src/components/Missing.tsx" },
    result: { success: false, error: "File not found" },
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(container.querySelector(".text-red-500")).not.toBeNull();
});

test("ToolInvocationBadge: { success: true } is not treated as error", () => {
  const toolInvocation: ToolInvocation = {
    state: "result",
    toolCallId: "10",
    toolName: "file_manager",
    args: { command: "delete", path: "src/Old.tsx" },
    result: { success: true, message: "Deleted" },
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(container.querySelector(".text-red-500")).toBeNull();
  expect(container.querySelector(".text-neutral-400")).not.toBeNull();
});

// --- rename destination ---

test("ToolInvocationBadge: rename with new_path shows arrow in label", () => {
  const toolInvocation: ToolInvocation = {
    state: "call",
    toolCallId: "11",
    toolName: "file_manager",
    args: { command: "rename", path: "src/Old.tsx", new_path: "src/New.tsx" },
  };
  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(screen.getByText("Renaming Old.tsx \u2192 New.tsx")).toBeDefined();
});

test("ToolInvocationBadge: rename partial-call without new_path does not crash", () => {
  const toolInvocation: ToolInvocation = {
    state: "partial-call",
    toolCallId: "12",
    toolName: "file_manager",
    args: { command: "rename", path: "src/Old.tsx" },
  };
  render(<ToolInvocationBadge toolInvocation={toolInvocation} />);
  expect(screen.getByText("Renaming Old.tsx")).toBeDefined();
});
