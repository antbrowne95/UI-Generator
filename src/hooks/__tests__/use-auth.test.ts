import { test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
});

// --- signIn ---

test("signIn returns success result and navigates when successful", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  let returnValue: unknown;
  await act(async () => {
    returnValue = await result.current.signIn("user@example.com", "password");
  });

  expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password");
  expect(returnValue).toEqual({ success: true });
  expect(mockPush).toHaveBeenCalledWith("/proj-1");
});

test("signIn returns failure result and does not navigate when unsuccessful", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  let returnValue: unknown;
  await act(async () => {
    returnValue = await result.current.signIn("user@example.com", "wrong");
  });

  expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  expect(mockPush).not.toHaveBeenCalled();
});

test("signIn sets isLoading to true during execution and false after", async () => {
  let resolveSignIn!: (v: unknown) => void;
  mockSignIn.mockReturnValue(new Promise((res) => { resolveSignIn = res; }));

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  expect(result.current.isLoading).toBe(false);

  let signInPromise: Promise<unknown>;
  act(() => {
    signInPromise = result.current.signIn("a@b.com", "pass");
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveSignIn({ success: false });
    await signInPromise!;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading to false even when action throws", async () => {
  mockSignIn.mockRejectedValue(new Error("Network error"));

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "pass").catch(() => {});
  });

  expect(result.current.isLoading).toBe(false);
});

// --- signUp ---

test("signUp returns success result and navigates when successful", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([{ id: "proj-2" }]);

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  let returnValue: unknown;
  await act(async () => {
    returnValue = await result.current.signUp("new@example.com", "password");
  });

  expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password");
  expect(returnValue).toEqual({ success: true });
  expect(mockPush).toHaveBeenCalledWith("/proj-2");
});

test("signUp returns failure result and does not navigate when unsuccessful", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  let returnValue: unknown;
  await act(async () => {
    returnValue = await result.current.signUp("taken@example.com", "pass");
  });

  expect(returnValue).toEqual({ success: false, error: "Email taken" });
  expect(mockPush).not.toHaveBeenCalled();
});

test("signUp resets isLoading to false even when action throws", async () => {
  mockSignUp.mockRejectedValue(new Error("Server error"));

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("a@b.com", "pass").catch(() => {});
  });

  expect(result.current.isLoading).toBe(false);
});

// --- handlePostSignIn: anon work scenarios ---

test("navigates to new project created from anon work when messages exist", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: { "/": {} },
  });
  mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "pass");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [{ role: "user", content: "hello" }],
      data: { "/": {} },
    })
  );
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
  expect(mockGetProjects).not.toHaveBeenCalled();
});

test("does not use anon work when messages array is empty", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
  mockGetProjects.mockResolvedValue([{ id: "existing-proj" }]);

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "pass");
  });

  expect(mockCreateProject).not.toHaveBeenCalled();
  expect(mockClearAnonWork).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/existing-proj");
});

// --- handlePostSignIn: existing projects ---

test("navigates to most recent project when user has projects and no anon work", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([
    { id: "recent-proj" },
    { id: "older-proj" },
  ]);

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "pass");
  });

  expect(mockPush).toHaveBeenCalledWith("/recent-proj");
  expect(mockCreateProject).not.toHaveBeenCalled();
});

// --- handlePostSignIn: new project fallback ---

test("creates a new project when user has no projects and no anon work", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "brand-new-proj" });

  const { useAuth } = await import("@/hooks/use-auth");
  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "pass");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(mockPush).toHaveBeenCalledWith("/brand-new-proj");
});
