import "dotenv/config";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { verifyAuthToken } from "./auth";
import { createAuthRouter } from "./authRoutes";
import { createAuthStoreFromEnv } from "./authStore";
import { WorldInstance } from "./WorldInstance";
import { createCharacterRepositoryFromEnv } from "./persistence";

const PORT = Number(process.env.PORT ?? 3001);
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === "true";

/** Simulacion autoritativa: snapshot al join, deltas por evento, broadcast por mapa. */
const characterRepository = createCharacterRepositoryFromEnv();
const world = new WorldInstance(characterRepository);
const authStore = createAuthStoreFromEnv();
const authRouter = createAuthRouter(authStore);

const httpServer = createServer(async (req, res) => {
  if (await authRouter(req, res)) {
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("AOWEB game server OK\n");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", async (socket, req) => {
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const account = verifyAuthToken(url.searchParams.get("token"));
    if (AUTH_REQUIRED && !account) {
      socket.close(4001, "Unauthorized");
      return;
    }
    if (account) {
      const storedAccount = await authStore.getByUsername(account.username);
      if (!storedAccount || storedAccount.id !== account.sub) {
        socket.close(4001, "Unauthorized");
        return;
      }
      (socket as typeof socket & { accountId?: string; accountRole?: string }).accountId =
        account.sub;
      (socket as typeof socket & { accountId?: string; accountRole?: string }).accountRole =
        account.role;
    }
    world.handleConnection(socket);
  } catch (error) {
    console.error("[auth] websocket validation failed:", error);
    socket.close(4001, "Unauthorized");
  }
});

world.start();

process.on("uncaughtException", (error) => {
  console.error("[fatal] uncaughtException:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[fatal] unhandledRejection:", reason);
});

httpServer.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Puerto ${PORT} en uso. Cerra la instancia anterior del server o cambia PORT en server/.env`
    );
    process.exit(1);
  }
  throw error;
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`AOWEB server escuchando en http://0.0.0.0:${PORT} (WebSocket)`);
  console.log(`Auth WS requerida: ${AUTH_REQUIRED ? "si" : "no"}`);
});

process.on("SIGINT", () => {
  world.stop();
  httpServer.close();
  if (typeof characterRepository.close === "function") {
    void characterRepository.close().finally(() => process.exit(0));
    return;
  }
  process.exit(0);
});
