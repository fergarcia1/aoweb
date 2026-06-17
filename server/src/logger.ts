type LogLevel = "info" | "warn" | "error";

function serializeMeta(meta: unknown): string {
  if (meta == null) {
    return "";
  }
  if (meta instanceof Error) {
    return ` ${meta.stack ?? meta.message}`;
  }
  if (typeof meta === "string") {
    return ` ${meta}`;
  }
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
}

function write(level: LogLevel, scope: string, message: string, meta?: unknown): void {
  const line = `${new Date().toISOString()} ${level.toUpperCase()} [${scope}] ${message}${serializeMeta(meta)}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info: (scope: string, message: string, meta?: unknown) => write("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: unknown) => write("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: unknown) => write("error", scope, message, meta),
};
