const ACCESS_TOKEN_KEY = "lazur_admin_access_token";
const REFRESH_TOKEN_KEY = "lazur_admin_refresh_token";

export type AdminProfile = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  plan: string;
};

type JwtPayload = {
  exp?: number;
};

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewMs = 30_000): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000 - skewMs;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeTokens(accessToken: string, refreshToken?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasValidSessionToken(): boolean {
  const token = getAccessToken();
  return !!token && !isTokenExpired(token);
}

export function startGoogleLogin() {
  window.location.href = `${apiBase()}/auth/login/google?source=admin`;
}

export async function fetchAdminMe(): Promise<AdminProfile | null> {
  const token = getAccessToken();
  if (!token || isTokenExpired(token)) {
    clearSession();
    return null;
  }

  const res = await fetch(`${apiBase()}/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 403) {
    clearSession();
    throw new Error("not_admin");
  }
  if (!res.ok) {
    if (res.status === 401) clearSession();
    return null;
  }

  return (await res.json()) as AdminProfile;
}

export function logout() {
  clearSession();
  window.location.href = "/login";
}

export { apiBase };
