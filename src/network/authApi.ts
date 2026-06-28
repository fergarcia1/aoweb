import { getMultiplayerHttpBaseUrl, getMultiplayerWsUrl } from "./multiplayerConfig";

const TOKEN_KEY = "aoweb_auth_token";
const ACCOUNT_KEY = "aoweb_auth_account";

export type AuthAccount = {
  id: string;
  username: string;
  role: string;
};

export type AuthResult =
  | { ok: true; token: string; account: AuthAccount }
  | { ok: false; error: string };

type AuthServerResponse = {
  token?: string;
  account?: AuthAccount;
  error?: string;
};

async function postAuth(path: string, body: unknown): Promise<AuthResult> {
  try {
    const response = await fetch(`${getMultiplayerHttpBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    const data = (await response.json()) as AuthServerResponse;
    if (!response.ok || !data.token || !data.account) {
      return { ok: false, error: data.error ?? "No se pudo autenticar." };
    }
    saveAuthSession(data.token, data.account);
    return { ok: true, token: data.token, account: data.account };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor de auth." };
  }
}

export async function refreshAuthToken(): Promise<boolean> {
  try {
    const response = await fetch(`${getMultiplayerHttpBaseUrl()}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      clearAuthSession();
      return false;
    }
    const data = (await response.json()) as { token: string };
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function getValidToken(): Promise<string | null> {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const payloadPart = token.split('.')[1];
    if (payloadPart) {
      const payload = JSON.parse(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")));
      const exp = payload.exp;
      // If token expires in less than 2 minutes, refresh it
      if (exp && (exp - Date.now() < 2 * 60 * 1000)) {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          return getAuthToken();
        }
      }
    }
  } catch (e) {
    // Ignore parse errors, just return token
  }
  
  return token;
}

export function saveAuthSession(token: string, account: AuthAccount): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export function clearAuthSession(): void {
  fetch(`${getMultiplayerHttpBaseUrl()}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
  
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthAccount(): AuthAccount | null {
  const raw = localStorage.getItem(ACCOUNT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthAccount;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken() && getAuthAccount());
}

export function buildAuthenticatedWsUrl(): string {
  const base = getMultiplayerWsUrl();
  const token = getAuthToken();
  if (!token) {
    return base;
  }
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(token)}`;
}

export async function buildAuthenticatedWsUrlAsync(): Promise<string> {
  const base = getMultiplayerWsUrl();
  const token = await getValidToken();
  if (!token) {
    return base;
  }
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(token)}`;
}

export function login(username: string, password: string): Promise<AuthResult> {
  return postAuth("/auth/login", { username, password });
}

export function register(username: string, password: string): Promise<AuthResult> {
  return postAuth("/auth/register", { username, password });
}
