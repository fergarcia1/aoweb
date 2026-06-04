import "dotenv/config";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { WorldInstance } from "./WorldInstance";
import { createCharacterRepositoryFromEnv } from "./persistence";

const PORT = Number(process.env.PORT ?? 3001);
/** Simulación autoritativa: snapshot al join, deltas por evento, broadcast por mapa. */
const characterRepository = createCharacterRepositoryFromEnv();
const world = new WorldInstance(characterRepository);

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("AOWEB game server OK\n");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket) => {
  world.handleConnection(socket);
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
      `Puerto ${PORT} en uso. Cerrá la instancia anterior del server o cambiá PORT en server/.env`
    );
    process.exit(1);
  }
  throw error;
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`AOWEB server escuchando en http://0.0.0.0:${PORT} (WebSocket)`);
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
