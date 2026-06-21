/** URL del servidor WebSocket. Definir VITE_WS_URL en .env si hace falta. */
export function getMultiplayerWsUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim();
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  return `${protocol}//${host}:3001`;
}

export function getMultiplayerHttpBaseUrl(): string {
  const wsUrl = getMultiplayerWsUrl();
  try {
    const url = new URL(wsUrl);
    url.protocol = url.protocol === "wss:" ? "https:" : "http:";
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return wsUrl.replace(/^ws(s?):\/\//, "http$1://").split(/[?#]/)[0].replace(/\/$/, "");
  }
}

/** Siempre MMO salvo tests/build con VITE_MULTIPLAYER=0 explicito. */
export function isMultiplayerEnabled(): boolean {
  const flag = import.meta.env.VITE_MULTIPLAYER as string | undefined;
  if (flag === "0" || flag === "false") {
    return false;
  }
  return true;
}
