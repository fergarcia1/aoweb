import {
  getMultiplayerHttpBaseUrl,
  getMultiplayerWsUrl,
  isMultiplayerEnabled,
} from "./multiplayerConfig";

type ServerHealthPayload = {
  status?: string;
  persistence?: string;
  websocketClients?: number;
  authRequired?: boolean;
  world?: {
    joinedPlayers?: number;
  };
};

export type ServerStatusView =
  | { online: true; text: string }
  | { online: false; text: string };

export async function fetchServerStatus(timeoutMs = 2500): Promise<ServerStatusView> {
  if (!isMultiplayerEnabled()) {
    return { online: false, text: "Servidor: modo local" };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getMultiplayerHttpBaseUrl()}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return { online: false, text: `Servidor: error ${response.status}` };
    }

    const data = (await response.json()) as ServerHealthPayload;
    const connectedPlayers = data.world?.joinedPlayers ?? data.websocketClients ?? 0;
    const persistence = data.persistence === "postgres" ? "DB" : "memoria";
    const auth = data.authRequired ? "auth" : "dev";
    return {
      online: true,
      text: `Servidor online | ${connectedPlayers} online | ${persistence} | ${auth}`,
    };
  } catch {
    const wsOnline = await probeWebSocket(timeoutMs);
    if (wsOnline) {
      return { online: true, text: "Servidor online | estado limitado" };
    }
    return { online: false, text: "Servidor: sin conexion" };
  } finally {
    window.clearTimeout(timeout);
  }
}

function probeWebSocket(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let socket: WebSocket | null = null;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      socket?.close();
      resolve(false);
    }, Math.min(timeoutMs, 1800));

    const finish = (online: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      socket?.close();
      resolve(online);
    };

    try {
      socket = new WebSocket(getMultiplayerWsUrl());
      socket.addEventListener("open", () => finish(true), { once: true });
      socket.addEventListener("error", () => finish(false), { once: true });
      socket.addEventListener("close", () => finish(false), { once: true });
    } catch {
      finish(false);
    }
  });
}
