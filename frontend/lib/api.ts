const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:8080/api");

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("lcs_token");
}

export function saveSession(response: { token: string; user: unknown }) {
  window.localStorage.setItem("lcs_token", response.token);
  window.localStorage.setItem("lcs_user", JSON.stringify(response.user));
}

export function clearSession() {
  window.localStorage.removeItem("lcs_token");
  window.localStorage.removeItem("lcs_user");
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string | { message?: string } };
      message = typeof payload.error === "string" ? payload.error : payload.error?.message ?? message;
    } catch {
      // Keep the status message if the server returned non-JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
