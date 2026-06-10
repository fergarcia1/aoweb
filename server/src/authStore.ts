import { Pool } from "pg";

export type AccountRecord = {
  id: string;
  username: string;
  password_hash: string;
  role: string;
};

export interface AuthStore {
  getByUsername(username: string): Promise<AccountRecord | null>;
  create(account: AccountRecord): Promise<void>;
}

class MemoryAuthStore implements AuthStore {
  private readonly byUsername = new Map<string, AccountRecord>();

  async getByUsername(username: string): Promise<AccountRecord | null> {
    return this.byUsername.get(username.trim().toLowerCase()) ?? null;
  }

  async create(account: AccountRecord): Promise<void> {
    this.byUsername.set(account.username.trim().toLowerCase(), { ...account });
  }
}

class PgAuthStore implements AuthStore {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
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
