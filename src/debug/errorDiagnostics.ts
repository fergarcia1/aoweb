type ErrorKind = "error" | "unhandledrejection" | "startup";

type ErrorEntry = {
  id: number;
  timestamp: string;
  kind: ErrorKind;
  message: string;
  stack?: string;
  extra?: string;
};

const STORAGE_KEY = "aoweb:error-log:v1";
const MAX_STORED_ERRORS = 60;
const OVERLAY_ID = "aoweb-error-overlay";

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toErrorShape(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) {
    return {
      message: value.message || "Unknown Error",
      stack: value.stack,
    };
  }
  if (typeof value === "string") {
    return { message: value };
  }
  return { message: safeJson(value) };
}

function readStoredErrors(): ErrorEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ErrorEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-MAX_STORED_ERRORS);
  } catch {
    return [];
  }
}

function writeStoredErrors(entries: ErrorEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_STORED_ERRORS)));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

function formatEntryForOverlay(entry: ErrorEntry): string {
  const base = `[${entry.kind}] ${entry.message}`;
  if (!entry.stack) return base;
  const firstStackLine = entry.stack.split("\n")[1]?.trim();
  return firstStackLine ? `${base}\n${firstStackLine}` : base;
}

function ensureOverlay(): HTMLDivElement {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return existing as HTMLDivElement;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.position = "fixed";
  overlay.style.right = "8px";
  overlay.style.bottom = "8px";
  overlay.style.maxWidth = "420px";
  overlay.style.padding = "8px 10px";
  overlay.style.background = "rgba(45, 10, 10, 0.95)";
  overlay.style.border = "1px solid rgba(255, 110, 110, 0.7)";
  overlay.style.borderRadius = "4px";
  overlay.style.color = "#ffd5d5";
  overlay.style.fontFamily = "Consolas, 'Courier New', monospace";
  overlay.style.fontSize = "12px";
  overlay.style.lineHeight = "1.35";
  overlay.style.whiteSpace = "pre-wrap";
  overlay.style.zIndex = "99999";
  overlay.style.display = "none";
  overlay.style.pointerEvents = "none";
  document.body.appendChild(overlay);
  return overlay;
}

function updateOverlay(entry: ErrorEntry) {
  const overlay = ensureOverlay();
  overlay.textContent =
    `Se detecto un error (${new Date(entry.timestamp).toLocaleTimeString()})\n` +
    `${formatEntryForOverlay(entry)}\n` +
    "Abrir consola para mas detalles.";
  overlay.style.display = "block";
}

export function reportStartupError(error: unknown) {
  const details = toErrorShape(error);
  const entries = readStoredErrors();
  const next: ErrorEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    kind: "startup",
    message: details.message,
    stack: details.stack,
  };
  writeStoredErrors([...entries, next]);
  updateOverlay(next);
  console.error("[AOWEB][startup]", details.message, error);
}

export function setupErrorDiagnostics() {
  const globalKey = "__AOWEB_ERROR_DIAGNOSTICS_READY__";
  const host = window as unknown as Record<string, unknown>;
  if (host[globalKey]) return;
  host[globalKey] = true;

  let entries = readStoredErrors();
  let nextId = entries.length > 0 ? entries[entries.length - 1].id + 1 : Date.now();
  if (entries.length > 0) {
    const last = entries[entries.length - 1];
    console.warn("[AOWEB] Ultimo error guardado:", last);
  }

  const pushEntry = (kind: ErrorKind, payload: unknown, extra?: unknown) => {
    const shape = toErrorShape(payload);
    const entry: ErrorEntry = {
      id: nextId++,
      timestamp: new Date().toISOString(),
      kind,
      message: shape.message,
      stack: shape.stack,
      extra: extra === undefined ? undefined : safeJson(extra),
    };

    entries = [...entries, entry].slice(-MAX_STORED_ERRORS);
    writeStoredErrors(entries);
    updateOverlay(entry);

    console.groupCollapsed(`[AOWEB][${entry.kind}] ${entry.message}`);
    if (entry.extra) console.log("extra:", entry.extra);
    if (entry.stack) console.log(entry.stack);
    console.groupEnd();
  };

  window.addEventListener("error", (event) => {
    pushEntry("error", event.error ?? event.message, {
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    pushEntry("unhandledrejection", event.reason);
  });

  host.__AOWEB_DEBUG__ = {
    getErrors: () => [...entries],
    clearErrors: () => {
      entries = [];
      writeStoredErrors(entries);
      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay) {
        overlay.style.display = "none";
      }
    },
  };
}
