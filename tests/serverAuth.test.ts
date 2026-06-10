import { describe, expect, it } from "vitest";
import {
  createAuthToken,
  hashPassword,
  validatePassword,
  validateUsername,
  verifyAuthToken,
  verifyPassword,
} from "../server/src/auth";

describe("server auth", () => {
  it("hashea y verifica contrasenas sin guardar texto plano", () => {
    const hash = hashPassword("secreto123");

    expect(hash).not.toContain("secreto123");
    expect(verifyPassword("secreto123", hash)).toBe(true);
    expect(verifyPassword("otro-pass", hash)).toBe(false);
  });

  it("firma y valida tokens de cuenta", () => {
    const token = createAuthToken({
      sub: "account-1",
      username: "lonler",
      role: "player",
    });

    expect(verifyAuthToken(token)).toMatchObject({
      sub: "account-1",
      username: "lonler",
      role: "player",
    });
    expect(verifyAuthToken(`${token}x`)).toBeNull();
  });

  it("valida usuario y contrasena del MVP", () => {
    expect(validateUsername("lonler_1")).toBeNull();
    expect(validateUsername("lo")).toBeTruthy();
    expect(validatePassword("123456")).toBeNull();
    expect(validatePassword("123")).toBeTruthy();
  });
});
