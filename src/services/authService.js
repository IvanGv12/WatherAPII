import axios from "axios";

// ─── Error class ────────────────────────────────────────────────────────────

export class AuthServiceError extends Error {
  /**
   * @param {"VALIDATION" | "UNAUTHORIZED" | "NETWORK" | "UNEXPECTED"} type
   * @param {Record<string, string[]>} [errors] - field-level validation errors (422 only)
   */
  constructor(type, errors) {
    const messages = {
      VALIDATION: "Error de validación",
      UNAUTHORIZED: "Credenciales incorrectas o sesión expirada",
      NETWORK: "No se pudo conectar con el servidor. Intenta de nuevo.",
      UNEXPECTED: "Ocurrió un error inesperado. Intenta de nuevo.",
    };
    super(messages[type] ?? "Error desconocido");
    this.type = type;
    this.errors = errors ?? null;
    this.name = "AuthServiceError";
  }
}

// ─── Axios instance ──────────────────────────────────────────────────────────

const axiosAuth = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Fetches a fresh CSRF cookie from Laravel Sanctum.
 * Must be called before any state-mutating request.
 */
async function fetchCsrf() {
  await axiosAuth.get("/sanctum/csrf-cookie");
}

/**
 * Wraps an axios call and maps HTTP / network errors to AuthServiceError.
 * @param {() => Promise<import("axios").AxiosResponse>} requestFn
 * @param {number[]} successCodes - HTTP status codes considered successful
 * @param {boolean} [retryOn419=true] - whether to retry once after a 419
 * @returns {Promise<import("axios").AxiosResponse>}
 */
async function executeRequest(requestFn, successCodes, retryOn419 = true) {
  try {
    const response = await requestFn();
    if (successCodes.includes(response.status)) {
      return response;
    }
    throw new AuthServiceError("UNEXPECTED");
  } catch (error) {
    if (error instanceof AuthServiceError) throw error;

    if (error.response) {
      const { status, data } = error.response;

      if (status === 422) {
        throw new AuthServiceError("VALIDATION", data?.errors);
      }
      if (status === 401) {
        throw new AuthServiceError("UNAUTHORIZED");
      }
      if (status === 419) {
        if (retryOn419) {
          // Retry once with a fresh CSRF token
          await fetchCsrf();
          return executeRequest(requestFn, successCodes, false);
        }
        throw new AuthServiceError("UNAUTHORIZED");
      }
      throw new AuthServiceError("UNEXPECTED");
    }

    // No response → network error
    const errorInfo = new AuthServiceError("NETWORK");
    errorInfo.message =
      "No se pudo conectar con el servidor. Asegúrate de tener el backend de Laravel corriendo en http://127.0.0.1:8000";
    throw errorInfo;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Logs in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{id: number, name: string, email: string}>}
 */
export async function login(email, password) {
  await fetchCsrf();
  await executeRequest(
    () => axiosAuth.post("/login", { email, password }),
    [200]
  );
  const userResponse = await axiosAuth.get("/api/user");
  return userResponse.data;
}

/**
 * Registers a new user.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @param {string} passwordConfirmation
 * @returns {Promise<{id: number, name: string, email: string}>}
 */
export async function register(name, email, password, passwordConfirmation) {
  await fetchCsrf();
  await executeRequest(
    () =>
      axiosAuth.post("/register", {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      }),
    [200, 201]
  );
  const userResponse = await axiosAuth.get("/api/user");
  return userResponse.data;
}

/**
 * Logs out the current user.
 * Always resolves — never throws — so the client can always clean up locally.
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await axiosAuth.post("/logout");
  } catch {
    // Intentionally swallowed: local session cleanup must always proceed.
  }
}

/**
 * Returns the currently authenticated user, or null if there is no active session.
 * Never throws.
 * @returns {Promise<{id: number, name: string, email: string} | null>}
 */
export async function getUser() {
  try {
    const response = await axiosAuth.get("/api/user");
    return response.data;
  } catch {
    return null;
  }
}

export default axiosAuth;
