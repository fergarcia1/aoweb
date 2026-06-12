import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET ?? process.env.JWT_SECRET ?? "dev-auth-secret";
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 64;

export type AuthTokenPayload = {
  sub: string;
  username: string;
  role: string;
  exp: number;
};

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  return Buffer.from(padded, "base64");
}

function sign(data: string): string {
  return base64UrlEncode(createHmac("sha256", TOKEN_SECRET).update(data).digest());
}

export function createAuthToken(
  payload: Omit<AuthTokenPayload, "exp">,
  ttlMs = TOKEN_TTL_MS
): string {
  const fullPayload: AuthTokenPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAuthToken(token: string | null | undefined): AuthTokenPayload | null {
  if (!token) {
    return null;
  }
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }
  if (sign(encodedPayload) !== signature) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as AuthTokenPayload;
    if (!payload.sub || !payload.username || !payload.role || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [scheme, salt, expectedHex] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !expectedHex) {
    return false;
  }
  const actual = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function createAccountId(): string {
  return randomUUID();
}

export function validateUsername(username: string): string | null {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return "El usuario debe tener 3-20 caracteres y usar letras, numeros o guion bajo.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6 || password.length > 72) {
    return "La contrasena debe tener entre 6 y 72 caracteres.";
  }
  return null;
}
