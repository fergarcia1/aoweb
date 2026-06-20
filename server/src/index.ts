import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer } from "ws";
import { verifyAuthToken } from "./auth";
import { createAuthRouter } from "./authRoutes";
import { createAuthStoreFromEnv } from "./authStore";
import { WorldInstance } from "./WorldInstance";
import { createCharacterRepositoryFromEnv } from "./persistence";
import {
  getNetworkSecurityStats,
  registerConnection,
  unregisterConnection,
} from "./networkSecurity";
import { logger } from "./logger";

const STARTED_AT_MS = Date.now();
const DEFAULT_PORT = 3001;
const SHUTDOWN_TIMEOUT_MS = 10_000;

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? DEFAULT_PORT);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    logger.warn("config", `Invalid PORT=${value}; using ${DEFAULT_PORT}`);
    return DEFAULT_PORT;
  }
  return parsed;
}

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function getRequestPath(req: IncomingMessage): string {
  return new URL(req.url ?? "/", "http://localhost").pathname;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendText(res: ServerResponse, status: number, text: string): void {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getClientIp(req: IncomingMessage): string {
  const ipHeader =
    req.headers["cf-connecting-ip"] ??
    req.headers["x-forwarded-for"] ??
    req.socket.remoteAddress ??
    "unknown";
  return (Array.isArray(ipHeader) ? ipHeader[0] : ipHeader.split(",")[0]).trim();
}

const PORT = parsePort(process.env.PORT);
const AUTH_REQUIRED = parseBoolean(process.env.AUTH_REQUIRED);
const persistenceMode = process.env.DATABASE_URL?.trim() ? "postgres" : "memory";

const characterRepository = createCharacterRepositoryFromEnv();
const world = new WorldInstance(characterRepository);
const authStore = createAuthStoreFromEnv();
const authRouter = createAuthRouter(authStore);
const wss = new WebSocketServer({ noServer: true });

function healthPayload() {
  return {
    status: "ok",
    startedAt: new Date(STARTED_AT_MS).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - STARTED_AT_MS) / 1000),
    authRequired: AUTH_REQUIRED,
    persistence: persistenceMode,
    websocketClients: wss.clients.size,
    world: world.getRuntimeStats(),
    security: getNetworkSecurityStats(),
  };
}

const httpServer = createServer(async (req, res) => {
  const path = getRequestPath(req);

  if (req.method === "GET" && (path === "/health" || path === "/ready")) {
    sendJson(res, 200, healthPayload());
    return;
  }

  if (await authRouter(req, res)) {
    return;
  }

  if (req.method === "GET" && path === "/") {
    sendText(res, 200, "AOWEB game server OK\n");
    return;
  }

  logger.warn("http", `Unhandled ${req.method ?? "UNKNOWN"} ${path}`);
  sendJson(res, 404, { error: "Not found" });
});

httpServer.on("upgrade", (req, socket, head) => {
  const realIp = getClientIp(req);

  if (!registerConnection(realIp)) {
    logger.warn("security", `Rejected websocket upgrade from ${realIp}: rate limit`);
    socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    (ws as typeof ws & { realIp?: string }).realIp = realIp;
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", async (socket, req) => {
  const realIp = (socket as typeof socket & { realIp?: string }).realIp ?? "unknown";
  socket.on("close", () => {
    unregisterConnection(realIp);
  });

  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const account = verifyAuthToken(url.searchParams.get("token"));
    if (AUTH_REQUIRED && !account) {
      logger.warn("auth", `Unauthorized websocket from ${realIp}: missing token`);
      socket.close(4001, "Unauthorized");
      return;
    }
    if (account) {
      const storedAccount = await authStore.getByUsername(account.username);
      if (!storedAccount || storedAccount.id !== account.sub) {
        logger.warn("auth", `Unauthorized websocket from ${realIp}: invalid account`);
        socket.close(4001, "Unauthorized");
        return;
      }
      (socket as typeof socket & { accountId?: string; accountRole?: string }).accountId =
        account.sub;
      (socket as typeof socket & { accountId?: string; accountRole?: string }).accountRole =
        account.role;
    }
    logger.info("ws", `Accepted websocket from ${realIp}`);
    world.handleConnection(socket);
  } catch (error) {
    logger.error("auth", "Websocket validation failed", error);
    socket.close(4001, "Unauthorized");
  }
});

world.start();

let shutdownStarted = false;

async function shutdown(reason: string, exitCode = 0): Promise<void> {
  if (shutdownStarted) {
    return;
  }
  shutdownStarted = true;
  logger.warn("shutdown", `Starting graceful shutdown: ${reason}`);

  const forceExit = setTimeout(() => {
    logger.error("shutdown", `Forced exit after ${SHUTDOWN_TIMEOUT_MS}ms`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  await world.stop();

  for (const client of wss.clients) {
    client.close(1001, "server shutdown");
  }

  await Promise.race([
    new Promise<void>((resolve) => wss.close(() => resolve())),
    wait(2_000).then(() => {
      for (const client of wss.clients) {
        client.terminate();
      }
    }),
  ]);

  await new Promise<void>((resolve) => {
    httpServer.close((error) => {
      if (error) {
        logger.error("shutdown", "HTTP server close failed", error);
      }
      resolve();
    });
  });

  if (typeof characterRepository.close === "function") {
    await characterRepository.close().catch((error) => {
      logger.error("shutdown", "Repository close failed", error);
    });
  }

  clearTimeout(forceExit);
  logger.info("shutdown", "Graceful shutdown complete");
  process.exit(exitCode);
}

process.on("uncaughtException", (error) => {
  logger.error("fatal", "uncaughtException", error);
  void shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("fatal", "unhandledRejection", reason);
});

httpServer.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    logger.error(
      "server",
      `Port ${PORT} is already in use. Stop the previous server or change PORT in server/.env`
    );
    process.exit(1);
  }
  throw error;
});

httpServer.listen(PORT, "0.0.0.0", () => {
  logger.info("server", `AOWEB server listening on http://0.0.0.0:${PORT} (WebSocket)`);
  logger.info("server", `Health check: http://0.0.0.0:${PORT}/health`);
  logger.info("config", `Auth WS required: ${AUTH_REQUIRED ? "yes" : "no"}`);
  logger.info("config", `Persistence: ${persistenceMode}`);
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
