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

export function saveAuthSession(token: string, account: AuthAccount): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export function clearAuthSession(): void {
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

export function login(username: string, password: string): Promise<AuthResult> {
  return postAuth("/auth/login", { username, password });
}

export function register(username: string, password: string): Promise<AuthResult> {
  return postAuth("/auth/register", { username, password });
}
