/** Admin session (8 h, after Google + authenticator code) and API calls. */

const TOKEN_KEY = "lazur_admin_session";

export function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
}

function expiry(token: string): number {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(part)).exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

export function getSession(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token || Date.now() > expiry(token) - 30_000) {
    sessionStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

export function setSession(token: string) {
  // sessionStorage: the admin session ends when the tab or browser closes.
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function startGoogleLogin() {
  window.location.href = `${apiBase()}/auth/login/google?source=admin`;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const token = init?.token ?? getSession();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/auth")) {
      window.location.href = "/login?error=expired";
    }
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = typeof body.detail === "string" ? body.detail : message;
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export const fmt = {
  usd: (n: number | null | undefined, digits = 0) =>
    n == null ? "–" : `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`,
  num: (n: number | null | undefined) => (n == null ? "–" : n.toLocaleString("en-US")),
  pct: (n: number | null | undefined) => (n == null ? "–" : `${n}%`),
  date: (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "–",
  ago: (iso: string | null | undefined) => {
    if (!iso) return "never";
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
    return `${Math.round(mins / 1440)}d ago`;
  },
};
