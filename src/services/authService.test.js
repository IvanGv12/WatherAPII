// Feature: react-auth-login
// Tests for authService.js — unit tests (2.5) + property tests (2.6, 2.7, 2.8)

import { describe, test, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// ─── Mock axios ──────────────────────────────────────────────────────────────
// vi.mock factories are hoisted before ALL variable declarations (even `const`),
// so we cannot reference any module-level variable from inside the factory.
// Strategy: keep the factory minimal — just return a stable mock instance —
// and read the axios.create() call args in a beforeAll() after the module loads.

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  defaults: { headers: { common: {} } },
};

vi.mock("axios", () => {
  // NOTE: `mockAxiosInstance` is also hoisted here because it's a `const` at
  // module scope — but Vitest's hoisting only moves `vi.mock` calls, not the
  // surrounding variable declarations. To avoid TDZ issues we define the
  // instance inline and export it so tests can import it.
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { headers: { common: {} } },
  };
  const create = vi.fn(() => instance);
  return { default: { create }, create };
});

// Import AFTER mocking so the module picks up the mock.
import { login, register, logout, getUser, AuthServiceError } from "./authService";

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 2.5 Unit tests ──────────────────────────────────────────────────────────

describe("authService — axios instance configuration", () => {
  test("creates axios instance with withCredentials: true", () => {
    expect(_capture.createConfig?.withCredentials).toBe(true);
  });

  test("creates axios instance with X-Requested-With: XMLHttpRequest header", () => {
    expect(_capture.createConfig?.headers?.["X-Requested-With"]).toBe(
      "XMLHttpRequest"
    );
  });

  test("creates axios instance with a baseURL key", () => {
    expect(_capture.createConfig).toHaveProperty("baseURL");
  });
});

describe("authService — login()", () => {
  test("calls GET /sanctum/csrf-cookie before POST /login", async () => {
    const user = { id: 1, name: "Ana", email: "ana@example.com" };

    mockAxiosInstance.get
      .mockResolvedValueOnce({ status: 200, data: {} }) // csrf-cookie
      .mockResolvedValueOnce({ status: 200, data: user }); // /api/user
    mockAxiosInstance.post.mockResolvedValueOnce({ status: 200, data: {} });

    await login("ana@example.com", "secret");

    const getCalls = mockAxiosInstance.get.mock.calls.map((c) => c[0]);
    expect(getCalls[0]).toBe("/sanctum/csrf-cookie");
    // csrf-cookie invocation order must precede /login
    expect(
      mockAxiosInstance.get.mock.invocationCallOrder[0]
    ).toBeLessThan(mockAxiosInstance.post.mock.invocationCallOrder[0]);
  });

  test("returns user object on HTTP 200", async () => {
    const user = { id: 42, name: "Bob", email: "bob@example.com" };

    mockAxiosInstance.get
      .mockResolvedValueOnce({ status: 200, data: {} }) // csrf-cookie
      .mockResolvedValueOnce({ status: 200, data: user }); // /api/user
    mockAxiosInstance.post.mockResolvedValueOnce({ status: 200, data: {} });

    const result = await login("bob@example.com", "pass");
    expect(result).toEqual(user);
  });

  test("throws AuthServiceError(VALIDATION) on HTTP 422", async () => {
    const errors = { email: ["El email ya está en uso."] };

    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: {} }); // csrf-cookie
    mockAxiosInstance.post.mockRejectedValueOnce({
      response: { status: 422, data: { errors } },
    });

    const err = await login("x@x.com", "pass").catch((e) => e);
    expect(err).toBeInstanceOf(AuthServiceError);
    expect(err.type).toBe("VALIDATION");
    expect(err.errors).toEqual(errors);
  });

  test("throws AuthServiceError(UNAUTHORIZED) on HTTP 401", async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: {} }); // csrf-cookie
    mockAxiosInstance.post.mockRejectedValueOnce({
      response: { status: 401, data: {} },
    });

    const err = await login("x@x.com", "wrong").catch((e) => e);
    expect(err).toBeInstanceOf(AuthServiceError);
    expect(err.type).toBe("UNAUTHORIZED");
  });

  test("retries once after HTTP 419 then throws AuthServiceError(UNAUTHORIZED)", async () => {
    // First csrf-cookie (before initial attempt)
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: {} });
    // First /login → 419
    mockAxiosInstance.post.mockRejectedValueOnce({
      response: { status: 419, data: {} },
    });
    // Second csrf-cookie (retry)
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: {} });
    // Second /login → 419 again
    mockAxiosInstance.post.mockRejectedValueOnce({
      response: { status: 419, data: {} },
    });

    const err = await login("x@x.com", "pass").catch((e) => e);

    expect(err).toBeInstanceOf(AuthServiceError);
    expect(err.type).toBe("UNAUTHORIZED");

    const csrfCalls = mockAxiosInstance.get.mock.calls.filter(
      (c) => c[0] === "/sanctum/csrf-cookie"
    );
    expect(csrfCalls).toHaveLength(2);
    expect(
      mockAxiosInstance.post.mock.calls.filter((c) => c[0] === "/login")
    ).toHaveLength(2);
  });

  test("throws AuthServiceError(NETWORK) on network error", async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: {} }); // csrf-cookie
    mockAxiosInstance.post.mockRejectedValueOnce(new Error("Network Error")); // no .response

    const err = await login("x@x.com", "pass").catch((e) => e);
    expect(err).toBeInstanceOf(AuthServiceError);
    expect(err.type).toBe("NETWORK");
  });
});

describe("authService — register()", () => {
  test("calls GET /sanctum/csrf-cookie before POST /register", async () => {
    const user = { id: 5, name: "Carlos", email: "carlos@example.com" };

    mockAxiosInstance.get
      .mockResolvedValueOnce({ status: 200, data: {} }) // csrf-cookie
      .mockResolvedValueOnce({ status: 200, data: user }); // /api/user
    mockAxiosInstance.post.mockResolvedValueOnce({ status: 201, data: {} });

    await register("Carlos", "carlos@example.com", "pass1234", "pass1234");

    const getCalls = mockAxiosInstance.get.mock.calls.map((c) => c[0]);
    expect(getCalls[0]).toBe("/sanctum/csrf-cookie");
    expect(
      mockAxiosInstance.get.mock.invocationCallOrder[0]
    ).toBeLessThan(mockAxiosInstance.post.mock.invocationCallOrder[0]);
  });

  test("returns user object on HTTP 200", async () => {
    const user = { id: 7, name: "Diana", email: "diana@example.com" };

    mockAxiosInstance.get
      .mockResolvedValueOnce({ status: 200, data: {} })
      .mockResolvedValueOnce({ status: 200, data: user });
    mockAxiosInstance.post.mockResolvedValueOnce({ status: 200, data: {} });

    const result = await register("Diana", "diana@example.com", "pass", "pass");
    expect(result).toEqual(user);
  });

  test("returns user object on HTTP 201", async () => {
    const user = { id: 8, name: "Eve", email: "eve@example.com" };

    mockAxiosInstance.get
      .mockResolvedValueOnce({ status: 200, data: {} })
      .mockResolvedValueOnce({ status: 200, data: user });
    mockAxiosInstance.post.mockResolvedValueOnce({ status: 201, data: {} });

    const result = await register("Eve", "eve@example.com", "pass", "pass");
    expect(result).toEqual(user);
  });
});

describe("authService — logout()", () => {
  test("resolves even when the server returns an error", async () => {
    mockAxiosInstance.post.mockRejectedValueOnce(new Error("Server down"));
    await expect(logout()).resolves.toBeUndefined();
  });

  test("resolves on HTTP 200", async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({ status: 200, data: {} });
    await expect(logout()).resolves.toBeUndefined();
  });
});

describe("authService — getUser()", () => {
  test("returns user object on HTTP 200", async () => {
    const user = { id: 1, name: "Ana", email: "ana@example.com" };
    mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: user });

    const result = await getUser();
    expect(result).toEqual(user);
  });

  test("returns null on HTTP 401 without throwing", async () => {
    mockAxiosInstance.get.mockRejectedValueOnce({
      response: { status: 401, data: {} },
    });

    const result = await getUser();
    expect(result).toBeNull();
  });

  test("returns null on network error without throwing", async () => {
    mockAxiosInstance.get.mockRejectedValueOnce(new Error("Network Error"));

    const result = await getUser();
    expect(result).toBeNull();
  });
});

// ─── 2.6 Property test: login() sends exactly the provided credentials ────────

describe("Property 3: login() envía exactamente las credenciales proporcionadas", () => {
  // Feature: react-auth-login, Property 3: login() envía exactamente las credenciales proporcionadas
  test("POST /login body contains exactly the provided email and password", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        async (email, password) => {
          vi.clearAllMocks();

          const user = { id: 1, name: "Test", email };
          mockAxiosInstance.get
            .mockResolvedValueOnce({ status: 200, data: {} }) // csrf-cookie
            .mockResolvedValueOnce({ status: 200, data: user }); // /api/user
          mockAxiosInstance.post.mockResolvedValueOnce({ status: 200, data: {} });

          await login(email, password);

          const loginCall = mockAxiosInstance.post.mock.calls.find(
            (c) => c[0] === "/login"
          );
          if (!loginCall) return false;

          const body = loginCall[1];
          return body.email === email && body.password === password;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 2.7 Property test: register() sends exactly the provided data ────────────

describe("Property 7: register() envía exactamente los datos proporcionados", () => {
  // Feature: react-auth-login, Property 7: register() envía exactamente los datos proporcionados
  test("POST /register body contains exactly name, email, password, password_confirmation", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        async (name, email, password) => {
          vi.clearAllMocks();

          const user = { id: 1, name, email };
          mockAxiosInstance.get
            .mockResolvedValueOnce({ status: 200, data: {} }) // csrf-cookie
            .mockResolvedValueOnce({ status: 200, data: user }); // /api/user
          mockAxiosInstance.post.mockResolvedValueOnce({ status: 201, data: {} });

          await register(name, email, password, password);

          const registerCall = mockAxiosInstance.post.mock.calls.find(
            (c) => c[0] === "/register"
          );
          if (!registerCall) return false;

          const body = registerCall[1];
          return (
            body.name === name &&
            body.email === email &&
            body.password === password &&
            body.password_confirmation === password
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── 2.8 Property test: unexpected HTTP codes produce descriptive errors ──────

describe("Property 13: Códigos HTTP inesperados producen errores descriptivos", () => {
  // Feature: react-auth-login, Property 13: Códigos HTTP inesperados producen errores descriptivos
  const unexpectedStatus = fc
    .integer({ min: 100, max: 599 })
    .filter((s) => ![200, 201, 204, 401, 419, 422].includes(s));

  test("login() throws AuthServiceError with non-empty message for unexpected status codes", async () => {
    await fc.assert(
      fc.asyncProperty(unexpectedStatus, async (status) => {
        vi.clearAllMocks();

        mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: {} }); // csrf-cookie
        mockAxiosInstance.post.mockRejectedValueOnce({
          response: { status, data: {} },
        });

        const err = await login("x@x.com", "pass").catch((e) => e);

        return (
          err instanceof AuthServiceError &&
          typeof err.message === "string" &&
          err.message.length > 0
        );
      }),
      { numRuns: 100 }
    );
  });

  test("register() throws AuthServiceError with non-empty message for unexpected status codes", async () => {
    await fc.assert(
      fc.asyncProperty(unexpectedStatus, async (status) => {
        vi.clearAllMocks();

        mockAxiosInstance.get.mockResolvedValueOnce({ status: 200, data: {} }); // csrf-cookie
        mockAxiosInstance.post.mockRejectedValueOnce({
          response: { status, data: {} },
        });

        const err = await register(
          "Name",
          "x@x.com",
          "pass1234",
          "pass1234"
        ).catch((e) => e);

        return (
          err instanceof AuthServiceError &&
          typeof err.message === "string" &&
          err.message.length > 0
        );
      }),
      { numRuns: 100 }
    );
  });
});
