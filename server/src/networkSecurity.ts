import { logger } from "./logger";
import "dotenv/config";

const MAX_CONNECTIONS_PER_IP = parseInt(process.env.RATE_LIMIT_MAX_CONNECTIONS_PER_IP ?? "3", 10);
export const MAX_ACTIONS_PER_SECOND = parseInt(process.env.RATE_LIMIT_MAX_ACTIONS_PER_SECOND ?? "20", 10);
const TEMP_BAN_MS = parseInt(process.env.RATE_LIMIT_TEMP_BAN_MS ?? "300000", 10);

const connectionsByIp = new Map<string, number>();
const bannedIps = new Map<string, number>(); // ip -> ban expiration timestamp ms

/**
 * Registra una conexión entrante de una IP y verifica si está baneada o excede el límite.
 * Retorna true si se permite la conexión, o false si debe ser rechazada.
 */
export function registerConnection(ip: string): boolean {
  const now = Date.now();
  const banExpiration = bannedIps.get(ip);
  if (banExpiration) {
    if (now < banExpiration) {
      return false; // Still banned
    } else {
      bannedIps.delete(ip); // Ban expired
    }
  }

  const currentConnections = connectionsByIp.get(ip) ?? 0;
  if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
    return false; // Límite de conexiones alcanzado
  }

  connectionsByIp.set(ip, currentConnections + 1);
  return true;
}

/**
 * Remueve una conexión activa de la IP.
 */
export function unregisterConnection(ip: string) {
  const current = connectionsByIp.get(ip);
  if (current && current > 0) {
    const next = current - 1;
    if (next === 0) {
      connectionsByIp.delete(ip);
    } else {
      connectionsByIp.set(ip, next);
    }
  }
}

/**
 * Banea temporalmente una IP por exceder el límite de spam (DDoS/Bots).
 */
export function tempBanIp(ip: string) {
  const expiration = Date.now() + TEMP_BAN_MS;
  bannedIps.set(ip, expiration);
  logger.warn("networksecurity", `[AntiSpam] IP ${ip} ha sido baneada temporalmente hasta ${new Date(expiration).toISOString()}.`);
}

export function getNetworkSecurityStats(now = Date.now()) {
  let activeConnections = 0;
  for (const count of connectionsByIp.values()) {
    activeConnections += count;
  }
  let activeBans = 0;
  for (const expiration of bannedIps.values()) {
    if (expiration > now) {
      activeBans += 1;
    }
  }
  return {
    maxConnectionsPerIp: MAX_CONNECTIONS_PER_IP,
    maxActionsPerSecond: MAX_ACTIONS_PER_SECOND,
    tempBanMs: TEMP_BAN_MS,
    trackedIps: connectionsByIp.size,
    activeConnections,
    activeBans,
  };
}
