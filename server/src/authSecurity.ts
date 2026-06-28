import type { IncomingMessage } from "node:http";
import { logger } from "./logger";

type AuthEndpoint = "login" | "register" | "refresh" | "logout";

type RateBucket = {
  count: number;
  resetAtMs: number;
};

type FailedLoginState = {
  count: number;
  firstAttemptAtMs: number;
  lockedUntilMs: number;
};

export type AuthLimitDecision =
  | { allowed: true }
  | {
      allowed: false;
      status: 429;
      error: string;
      retryAfterSeconds: number;
      reason: string;
    };

const rateBuckets = new Map<string, RateBucket>();
const failedLoginStates = new Map<string, FailedLoginState>();

function parsePositiveIntEnv(value: string | undefined, fallback: number, minimum: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

const TRUST_PROXY = parseBoolean(process.env.TRUST_PROXY);
const RATE_WINDOW_MS = parsePositiveIntEnv(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 60_000, 1_000);
const LOGIN_MAX_PER_WINDOW = parsePositiveIntEnv(
  process.env.AUTH_LOGIN_MAX_ATTEMPTS_PER_WINDOW,
  10,
  1
);
const REGISTER_MAX_PER_WINDOW = parsePositiveIntEnv(
  process.env.AUTH_REGISTER_MAX_ATTEMPTS_PER_WINDOW,
  5,
  1
);
const REFRESH_MAX_PER_WINDOW = parsePositiveIntEnv(
  process.env.AUTH_REFRESH_MAX_ATTEMPTS_PER_WINDOW,
  30,
  1
);
const LOGOUT_MAX_PER_WINDOW = parsePositiveIntEnv(
  process.env.AUTH_LOGOUT_MAX_ATTEMPTS_PER_WINDOW,
  30,
  1
);
const FAILED_LOGIN_WINDOW_MS = parsePositiveIntEnv(
  process.env.AUTH_FAILED_LOGIN_WINDOW_MS,
  15 * 60 * 1000,
  1_000
);
const FAILED_LOGIN_LOCK_MS = parsePositiveIntEnv(
  process.env.AUTH_FAILED_LOGIN_LOCK_MS,
  15 * 60 * 1000,
  1_000
);
const FAILED_LOGIN_LIMIT = parsePositiveIntEnv(process.env.AUTH_FAILED_LOGIN_LIMIT, 5, 1);

export const AUTH_REFRESH_TOKEN_TTL_MS = parsePositiveIntEnv(
  process.env.AUTH_REFRESH_TOKEN_TTL_MS,
  30 * 24 * 60 * 60 * 1000,
  60_000
);
export const AUTH_MAX_SESSIONS_PER_ACCOUNT = parsePositiveIntEnv(
  process.env.AUTH_MAX_SESSIONS_PER_ACCOUNT,
  5,
  1
);

function normalizePart(value: string): string {
  return value.trim().toLowerCase() || "unknown";
}

function retryAfterSeconds(untilMs: number, nowMs: number): number {
  return Math.max(1, Math.ceil((untilMs - nowMs) / 1000));
}

function getLimit(endpoint: AuthEndpoint): number {
  switch (endpoint) {
    case "login":
      return LOGIN_MAX_PER_WINDOW;
    case "register":
      return REGISTER_MAX_PER_WINDOW;
    case "refresh":
      return REFRESH_MAX_PER_WINDOW;
    case "logout":
      return LOGOUT_MAX_PER_WINDOW;
  }
}

function consumeBucket(key: string, limit: number, nowMs: number): AuthLimitDecision {
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAtMs <= nowMs) {
    rateBuckets.set(key, { count: 1, resetAtMs: nowMs + RATE_WINDOW_MS });
    return { allowed: true };
  }

  bucket.count += 1;
  if (bucket.count <= limit) {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 429,
    error: "Demasiadas solicitudes. Intenta nuevamente en unos segundos.",
    retryAfterSeconds: retryAfterSeconds(bucket.resetAtMs, nowMs),
    reason: `rate limit ${key}`,
  };
}

export function getAuthClientIp(req: IncomingMessage): string {
  const forwardedIpHeader = TRUST_PROXY
    ? req.headers["cf-connecting-ip"] ?? req.headers["x-forwarded-for"]
    : undefined;
  const ipHeader = forwardedIpHeader ?? req.socket.remoteAddress ?? "unknown";
  return (Array.isArray(ipHeader) ? ipHeader[0] : ipHeader.split(",")[0]).trim();
}

export function checkAuthRateLimit(
  endpoint: AuthEndpoint,
  ip: string,
  username?: string,
  nowMs = Date.now()
): AuthLimitDecision {
  const limit = getLimit(endpoint);
  const ipDecision = consumeBucket(`auth:${endpoint}:ip:${normalizePart(ip)}`, limit, nowMs);
  if (!ipDecision.allowed) {
    return ipDecision;
  }

  if (username && (endpoint === "login" || endpoint === "register")) {
    return consumeBucket(`auth:${endpoint}:user:${normalizePart(username)}`, limit, nowMs);
  }

  return { allowed: true };
}

export function checkLoginLock(ip: string, username: string, nowMs = Date.now()): AuthLimitDecision {
  const key = failedLoginKey(ip, username);
  const state = failedLoginStates.get(key);
  if (!state || state.lockedUntilMs <= nowMs) {
    if (state?.lockedUntilMs && state.lockedUntilMs <= nowMs) {
      failedLoginStates.delete(key);
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 429,
    error: "Demasiados intentos fallidos. Intenta nuevamente mas tarde.",
    retryAfterSeconds: retryAfterSeconds(state.lockedUntilMs, nowMs),
    reason: `login locked ${key}`,
  };
}

export function recordLoginFailure(
  ip: string,
  username: string,
  nowMs = Date.now()
): AuthLimitDecision {
  const key = failedLoginKey(ip, username);
  const current = failedLoginStates.get(key);
  const state =
    !current || current.firstAttemptAtMs + FAILED_LOGIN_WINDOW_MS <= nowMs
      ? { count: 0, firstAttemptAtMs: nowMs, lockedUntilMs: 0 }
      : current;

  state.count += 1;
  if (state.count >= FAILED_LOGIN_LIMIT) {
    state.lockedUntilMs = nowMs + FAILED_LOGIN_LOCK_MS;
    logger.warn(
      "authsecurity",
      `[auth] login bloqueado temporalmente para ${normalizePart(username)} desde ${normalizePart(
        ip
      )}`
    );
  }

  failedLoginStates.set(key, state);
  return checkLoginLock(ip, username, nowMs);
}

export function recordLoginSuccess(ip: string, username: string): void {
  failedLoginStates.delete(failedLoginKey(ip, username));
}

function failedLoginKey(ip: string, username: string): string {
  return `${normalizePart(ip)}:${normalizePart(username)}`;
}
