import { getMultiplayerHttpBaseUrl, isMultiplayerEnabled } from "./multiplayerConfig";

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
    return { online: false, text: "Servidor: sin conexion" };
  } finally {
    window.clearTimeout(timeout);
  }
}
