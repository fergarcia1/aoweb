const AUTH_ACCOUNT_KEY = "aoweb_auth_account";

function normalizeAccountSegment(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized ? normalized.replace(/[^a-z0-9_-]/g, "_") : null;
}

export function getCurrentAccountStorageSuffix(): string {
  try {
    const raw = localStorage.getItem(AUTH_ACCOUNT_KEY);
    if (!raw) {
      return "guest";
    }
    const account = JSON.parse(raw) as { id?: unknown; username?: unknown };
    const username = normalizeAccountSegment(account.username);
    if (username) {
      return `account_${username}`;
    }
    const id = normalizeAccountSegment(account.id);
    return id ? `account_${id}` : "guest";
  } catch {
    return "guest";
  }
}

export function getAccountScopedStorageKey(baseKey: string): string {
  return `${baseKey}_${getCurrentAccountStorageSuffix()}`;
}
