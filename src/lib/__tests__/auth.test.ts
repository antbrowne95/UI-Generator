// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify, SignJWT } from "jose";

// Mock "server-only" so the module can be imported in tests
vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: mockCookieSet, get: mockCookieGet }),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expirationTime = "7d") {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expirationTime)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  mockCookieSet.mockClear();
  mockCookieGet.mockClear();
});

test("createSession sets the auth-token cookie", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "user@example.com");

  expect(mockCookieSet).toHaveBeenCalledOnce();
  const [name] = mockCookieSet.mock.calls[0];
  expect(name).toBe("auth-token");
});

test("createSession cookie has correct security options", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "user@example.com");

  const [, , options] = mockCookieSet.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession cookie expires in ~7 days", async () => {
  const { createSession } = await import("@/lib/auth");
  const before = Date.now();

  await createSession("user-123", "user@example.com");

  const after = Date.now();
  const [, , options] = mockCookieSet.mock.calls[0];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession JWT contains correct userId and email", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-abc", "test@example.com");

  const [, token] = mockCookieSet.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-abc");
  expect(payload.email).toBe("test@example.com");
});

test("createSession JWT is signed with HS256", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "user@example.com");

  const [, token] = mockCookieSet.mock.calls[0];
  const header = JSON.parse(atob(token.split(".")[0]));
  expect(header.alg).toBe("HS256");
});

// --- getSession ---

test("getSession returns null when no cookie is present", async () => {
  const { getSession } = await import("@/lib/auth");
  mockCookieGet.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const { getSession } = await import("@/lib/auth");
  const token = await makeToken({ userId: "user-123", email: "user@example.com" });
  mockCookieGet.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("user@example.com");
});

test("getSession returns null for a tampered token", async () => {
  const { getSession } = await import("@/lib/auth");
  mockCookieGet.mockReturnValue({ value: "invalid.token.value" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const { getSession } = await import("@/lib/auth");
  const token = await makeToken({ userId: "user-123", email: "user@example.com" }, "0s");
  mockCookieGet.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});
