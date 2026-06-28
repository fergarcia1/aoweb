import { Pool } from "pg";
import { logger } from "./logger";

export type AccountRecord = {
  id: string;
  username: string;
  password_hash: string;
  role: string;
};

export interface AuthStore {
  getByUsername(username: string): Promise<AccountRecord | null>;
  create(account: AccountRecord): Promise<void>;
  saveSession(accountId: string, refreshToken: string, expiresAtMs: number): Promise<void>;
  verifySession(refreshToken: string, nowMs?: number): Promise<AccountRecord | null>;
  revokeSession(refreshToken: string): Promise<void>;
  pruneExpiredSessions(nowMs?: number): Promise<void>;
  trimAccountSessions(accountId: string, maxSessions: number): Promise<void>;
}

class MemoryAuthStore implements AuthStore {
  private readonly byUsername = new Map<string, AccountRecord>();
  private readonly sessions = new Map<
    string,
    { accountId: string; createdAtMs: number; expiresAtMs: number }
  >();

  async getByUsername(username: string): Promise<AccountRecord | null> {
    return this.byUsername.get(username.trim().toLowerCase()) ?? null;
  }

  async create(account: AccountRecord): Promise<void> {
    this.byUsername.set(account.username.trim().toLowerCase(), { ...account });
  }

  async saveSession(accountId: string, refreshToken: string, expiresAtMs: number): Promise<void> {
    this.sessions.set(refreshToken, {
      accountId,
      createdAtMs: Date.now(),
      expiresAtMs,
    });
  }

  async verifySession(refreshToken: string, nowMs = Date.now()): Promise<AccountRecord | null> {
    const session = this.sessions.get(refreshToken);
    if (!session) return null;
    if (session.expiresAtMs <= nowMs) {
      this.sessions.delete(refreshToken);
      return null;
    }
    return Array.from(this.byUsername.values()).find((account) => account.id === session.accountId) ?? null;
  }

  async revokeSession(refreshToken: string): Promise<void> {
    this.sessions.delete(refreshToken);
  }

  async pruneExpiredSessions(nowMs = Date.now()): Promise<void> {
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAtMs <= nowMs) {
        this.sessions.delete(token);
      }
    }
  }

  async trimAccountSessions(accountId: string, maxSessions: number): Promise<void> {
    const sessions = Array.from(this.sessions.entries())
      .filter(([, session]) => session.accountId === accountId)
      .sort((a, b) => b[1].createdAtMs - a[1].createdAtMs);
    for (const [token] of sessions.slice(maxSessions)) {
      this.sessions.delete(token);
    }
  }
}

class PgAuthStore implements AuthStore {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.pool.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token VARCHAR(255) PRIMARY KEY,
        account_id VARCHAR(255) NOT NULL,
        expires_at_ms BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS expires_at_ms BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_account_id ON auth_sessions(account_id);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at_ms ON auth_sessions(expires_at_ms);
    `).catch(err => logger.error("db", "Error creating auth_sessions table:", err));
  }

  async getByUsername(username: string): Promise<AccountRecord | null> {
    const result = await this.pool.query<AccountRecord>(
      "SELECT id, username, password_hash, role FROM accounts WHERE lower(username) = lower($1) LIMIT 1",
      [username.trim()]
    );
    return result.rows[0] ?? null;
  }

  async create(account: AccountRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO accounts (id, username, password_hash, role, updated_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [account.id, account.username, account.password_hash, account.role]
    );
  }

  async saveSession(accountId: string, refreshToken: string, expiresAtMs: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO auth_sessions (token, account_id, expires_at_ms)
       VALUES ($1, $2, $3)`,
      [refreshToken, accountId, expiresAtMs]
    );
  }

  async verifySession(refreshToken: string, nowMs = Date.now()): Promise<AccountRecord | null> {
    const result = await this.pool.query<{ account_id: string; expires_at_ms: string }>(
      `SELECT account_id, expires_at_ms FROM auth_sessions WHERE token = $1 LIMIT 1`,
      [refreshToken]
    );
    if (result.rows.length === 0) return null;

    const session = result.rows[0];
    if (Number(session.expires_at_ms) <= nowMs) {
      await this.revokeSession(refreshToken);
      return null;
    }

    await this.pool.query(`UPDATE auth_sessions SET last_used_at = NOW() WHERE token = $1`, [
      refreshToken,
    ]);

    const accountId = session.account_id;
    const accountResult = await this.pool.query<AccountRecord>(
      `SELECT id, username, password_hash, role FROM accounts WHERE id = $1 LIMIT 1`,
      [accountId]
    );
    return accountResult.rows[0] ?? null;
  }

  async revokeSession(refreshToken: string): Promise<void> {
    await this.pool.query(`DELETE FROM auth_sessions WHERE token = $1`, [refreshToken]);
  }

  async pruneExpiredSessions(nowMs = Date.now()): Promise<void> {
    await this.pool.query(`DELETE FROM auth_sessions WHERE expires_at_ms <= $1`, [nowMs]);
  }

  async trimAccountSessions(accountId: string, maxSessions: number): Promise<void> {
    await this.pool.query(
      `DELETE FROM auth_sessions
       WHERE token IN (
         SELECT token FROM (
           SELECT token, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS row_number
           FROM auth_sessions
           WHERE account_id = $1
         ) ranked
         WHERE ranked.row_number > $2
       )`,
      [accountId, maxSessions]
    );
  }
}

let singleton: AuthStore | null = null;

export function createAuthStoreFromEnv(): AuthStore {
  if (singleton) {
    return singleton;
  }
  const connectionString = process.env.DATABASE_URL;
  singleton = connectionString ? new PgAuthStore(connectionString) : new MemoryAuthStore();
  return singleton;
}
