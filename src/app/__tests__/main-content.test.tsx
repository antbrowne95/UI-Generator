import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock heavy context providers
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
  useFileSystem: vi.fn(() => ({
    fileSystem: { serialize: () => ({}) },
    selectedFile: null,
    setSelectedFile: vi.fn(),
    getAllFiles: vi.fn(() => new Map()),
    refreshTrigger: 0,
    handleToolCall: vi.fn(),
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div>{children}</div>,
  useChat: vi.fn(() => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    status: "idle",
  })),
}));

// Mock child components to keep tests focused on toggle logic
vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">PreviewFrame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">HeaderActions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

test("shows Preview tab as active by default", () => {
  render(<MainContent />);
  // PreviewFrame is always mounted; code editor should not be present
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
});

test("clicking Code tab switches to code view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  await user.click(screen.getByRole("tab", { name: "Code" }));

  // PreviewFrame stays mounted (hidden), code editor appears
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();
});

test("clicking Preview tab after Code tab hides the code editor", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Switch to Code
  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();

  // Switch back to Preview
  await user.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
});

test("toggle between tabs multiple times works correctly", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Start in Preview — no code editor
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();

  // Code
  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();

  // Preview — code editor unmounts, preview stays mounted
  await user.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
  expect(screen.getByTestId("preview-frame")).toBeInTheDocument();

  // Code again
  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeInTheDocument();
});

test("Preview tab button is marked active by default", () => {
  render(<MainContent />);
  const previewTab = screen.getByRole("tab", { name: "Preview" });
  expect(previewTab).toHaveAttribute("data-state", "active");
});

test("Code tab becomes active after clicking it", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  expect(codeTab).toHaveAttribute("data-state", "inactive");

  await user.click(codeTab);
  expect(codeTab).toHaveAttribute("data-state", "active");
});
