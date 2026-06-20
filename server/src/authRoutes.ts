import { logger } from "./logger";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createAccountId,
  createAuthToken,
  hashPassword,
  validatePassword,
  validateUsername,
  verifyPassword,
} from "./auth";
import type { AuthStore } from "./authStore";

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

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN ?? "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function createAuthRouter(store: AuthStore) {
  return async function authRouter(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = req.url?.split("?")[0] ?? "";
    if (!url.startsWith("/auth/")) {
      return false;
    }
    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return true;
    }
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Metodo no permitido." });
      return true;
    }

    try {
      const body = await readJson(req);
      if (url === "/auth/register") {
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "");
        const usernameError = validateUsername(username);
        const passwordError = validatePassword(password);
        if (usernameError || passwordError) {
          sendJson(res, 400, { error: usernameError ?? passwordError });
          return true;
        }
        if (await store.getByUsername(username)) {
          sendJson(res, 409, { error: "Ese usuario ya existe." });
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
        sendJson(res, 201, {
          token,
          account: { id: account.id, username: account.username, role: account.role },
        });
        return true;
      }

      if (url === "/auth/login") {
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "");
        const account = await store.getByUsername(username);
        if (!account || !verifyPassword(password, account.password_hash)) {
          sendJson(res, 401, { error: "Usuario o contrasena incorrectos." });
          return true;
        }
        const token = createAuthToken({
          sub: account.id,
          username: account.username,
          role: account.role,
        });
        sendJson(res, 200, {
          token,
          account: { id: account.id, username: account.username, role: account.role },
        });
        return true;
      }

      sendJson(res, 404, { error: "Ruta de auth no encontrada." });
      return true;
    } catch (error) {
      logger.error("authroutes", "[auth] route error:", error);
      sendJson(res, 400, { error: "Solicitud invalida." });
      return true;
    }
  };
}
