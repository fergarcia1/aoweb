import { NetworkClient } from "./NetworkClient";

/** Una sola conexión WS activa (evita fantasmas al recargar / HMR). */
let activeClient: NetworkClient | null = null;

export function registerMultiplayerClient(client: NetworkClient) {
  if (activeClient && activeClient !== client) {
    activeClient.disconnect();
  }
  activeClient = client;
}

export function unregisterMultiplayerClient(client: NetworkClient) {
  if (activeClient === client) {
    activeClient.disconnect();
    activeClient = null;
  }
}

export function disconnectActiveMultiplayer() {
  activeClient?.disconnect();
  activeClient = null;
}
