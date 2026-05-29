import { describe, expect, it } from "vitest";
import type { ServerErrorMessage } from "../../shared/protocol";

describe("duplicate character login protocol", () => {
  it("error message includes character_already_online code", () => {
    const msg: ServerErrorMessage = {
      type: "error",
      code: "character_already_online",
      message: "Este personaje ya está conectado en otra sesión.",
    };
    expect(msg.code).toBe("character_already_online");
  });
});
