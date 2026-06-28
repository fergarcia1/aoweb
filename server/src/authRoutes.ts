import { logger } from "./logger";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createAccountId,
  createAuthToken,
  generateRefreshToken,
  hashPassword,
  validatePassword,
  validateUsername,
  verifyPassword,
} from "./auth";
import type { AuthStore } from "./authStore";
import {
  AUTH_MAX_SESSIONS_PER_ACCOUNT,
  AUTH_REFRESH_TOKEN_TTL_MS,
  checkAuthRateLimit,
  checkLoginLock,
  getAuthClientIp,
  recordLoginFailure,
  recordLoginSuccess,
  type AuthLimitDecision,
} from "./authSecurity";

const REFRESH_COOKIE_NAME = "refresh_token";

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function isRefreshCookieSecure(): boolean {
  if (process.env.AUTH_COOKIE_SECURE !== undefined) {
    return parseBoolean(process.env.AUTH_COOKIE_SECURE);
  }
  return process.env.NODE_ENV === "production";
}

function refreshCookie(refreshToken: string, maxAgeSeconds: number): string {
  const secure = isRefreshCookieSecure() ? "; Secure" : "";
  return `${REFRESH_COOKIE_NAME}=${refreshToken}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function clearRefreshCookie(): string {
  const secure = isRefreshCookieSecure() ? "; Secure" : "";
  return `${REFRESH_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 16_384) {
        reject(new Error("Payload demasiado grande."));
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
    req.on("error", reject);
  });
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const list = req.headers.cookie;
  if (!list) return {};
  return list.split(";").reduce((acc, cookie) => {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      acc[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
    return acc;
  }, {} as Record<string, string>);
}

function sendJson(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string | string[]>
): void {
  const payload = JSON.stringify(body);
  const origin = req.headers.origin || "http://localhost:5173";
  res.writeHead(status, {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload).toString(),
    ...extraHeaders,
  });
  res.end(payload);
}

function sendLimitDecision(
  req: IncomingMessage,
  res: ServerResponse,
  ip: string,
  decision: AuthLimitDecision
): boolean {
  if (decision.allowed) {
    return false;
  }
  logger.warn("authroutes", `[auth] ${decision.reason} desde ${ip}`);
  sendJson(req, res, decision.status, { error: decision.error }, {
    "Retry-After": String(decision.retryAfterSeconds),
  });
  return true;
}

async function issueRefreshSession(store: AuthStore, accountId: string): Promise<string> {
  const refreshToken = generateRefreshToken();
  const expiresAtMs = Date.now() + AUTH_REFRESH_TOKEN_TTL_MS;
  await store.pruneExpiredSessions();
  await store.saveSession(accountId, refreshToken, expiresAtMs);
  await store.trimAccountSessions(accountId, AUTH_MAX_SESSIONS_PER_ACCOUNT);
  return refreshToken;
}

export function createAuthRouter(store: AuthStore) {
  return async function authRouter(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = req.url?.split("?")[0] ?? "";
    if (!url.startsWith("/auth/")) {
      return false;
    }
    if (req.method === "OPTIONS") {
      sendJson(req, res, 204, {});
      return true;
    }
    if (req.method !== "POST") {
      sendJson(req, res, 405, { error: "Metodo no permitido." });
      return true;
    }

    try {
      const clientIp = getAuthClientIp(req);

      if (url === "/auth/logout") {
        const limitDecision = checkAuthRateLimit("logout", clientIp);
        if (sendLimitDecision(req, res, clientIp, limitDecision)) {
          return true;
        }
        const cookies = parseCookies(req);
        if (cookies[REFRESH_COOKIE_NAME]) {
          await store.revokeSession(cookies[REFRESH_COOKIE_NAME]);
          logger.info("authroutes", `[auth] logout desde ${clientIp}`);
        }
        sendJson(
          req,
          res,
          200,
          { ok: true },
          { "Set-Cookie": clearRefreshCookie() }
        );
        return true;
      }

      if (url === "/auth/refresh") {
        const limitDecision = checkAuthRateLimit("refresh", clientIp);
        if (sendLimitDecision(req, res, clientIp, limitDecision)) {
          return true;
        }
        const cookies = parseCookies(req);
        if (!cookies[REFRESH_COOKIE_NAME]) {
          logger.warn("authroutes", `[auth] refresh sin cookie desde ${clientIp}`);
          sendJson(req, res, 401, { error: "No refresh token" });
          return true;
        }
        const account = await store.verifySession(cookies[REFRESH_COOKIE_NAME]);
        if (!account) {
          logger.warn("authroutes", `[auth] refresh invalido desde ${clientIp}`);
          sendJson(req, res, 401, { error: "Invalid refresh token" });
          return true;
        }
        const token = createAuthToken({
          sub: account.id,
          username: account.username,
          role: account.role,
        });
        sendJson(req, res, 200, { token });
        return true;
      }

      const body = await readJson(req);

      if (url === "/auth/register") {
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "");
        const limitDecision = checkAuthRateLimit("register", clientIp, username);
        if (sendLimitDecision(req, res, clientIp, limitDecision)) {
          return true;
        }
        const usernameError = validateUsername(username);
        const passwordError = validatePassword(password);
        if (usernameError || passwordError) {
          sendJson(req, res, 400, { error: usernameError ?? passwordError });
          return true;
        }
        if (await store.getByUsername(username)) {
          logger.warn("authroutes", `[auth] registro duplicado para ${username} desde ${clientIp}`);
          sendJson(req, res, 409, { error: "Ese usuario ya existe." });
          return true;
        }
        const account = {
          id: createAccountId(),
          username,
          password_hash: hashPassword(password),
          role: "player",
        };
        await store.create(account);
        const token = createAuthToken({
          sub: account.id,
          username: account.username,
          role: account.role,
        });
        const refreshToken = await issueRefreshSession(store, account.id);
        logger.info("authroutes", `[auth] cuenta creada ${account.username} desde ${clientIp}`);
        sendJson(
          req,
          res,
          201,
          { token, account: { id: account.id, username: account.username, role: account.role } },
          {
            "Set-Cookie": refreshCookie(
              refreshToken,
              Math.floor(AUTH_REFRESH_TOKEN_TTL_MS / 1000)
            ),
          }
        );
        return true;
      }

      if (url === "/auth/login") {
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "");
        const limitDecision = checkAuthRateLimit("login", clientIp, username);
        if (sendLimitDecision(req, res, clientIp, limitDecision)) {
          return true;
        }
        const lockDecision = checkLoginLock(clientIp, username);
        if (sendLimitDecision(req, res, clientIp, lockDecision)) {
          return true;
        }
        const account = await store.getByUsername(username);
        if (!account || !verifyPassword(password, account.password_hash)) {
          const failureDecision = recordLoginFailure(clientIp, username);
          logger.warn("authroutes", `[auth] login fallido para ${username} desde ${clientIp}`);
          if (sendLimitDecision(req, res, clientIp, failureDecision)) {
            return true;
          }
          sendJson(req, res, 401, { error: "Usuario o contrasena incorrectos." });
          return true;
        }
        recordLoginSuccess(clientIp, username);
        const token = createAuthToken({
          sub: account.id,
          username: account.username,
          role: account.role,
        });
        const refreshToken = await issueRefreshSession(store, account.id);
        logger.info("authroutes", `[auth] login correcto para ${account.username} desde ${clientIp}`);
        sendJson(
          req,
          res,
          200,
          { token, account: { id: account.id, username: account.username, role: account.role } },
          {
            "Set-Cookie": refreshCookie(
              refreshToken,
              Math.floor(AUTH_REFRESH_TOKEN_TTL_MS / 1000)
            ),
          }
        );
        return true;
      }

      sendJson(req, res, 404, { error: "Ruta de auth no encontrada." });
      return true;
    } catch (error) {
      logger.error("authroutes", "[auth] route error:", error);
      sendJson(req, res, 400, { error: "Solicitud invalida." });
      return true;
    }
  };
}
