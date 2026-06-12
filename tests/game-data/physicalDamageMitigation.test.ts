import { describe, expect, it } from "vitest";
import { mitigatePhysicalDamage } from "../../game-data/physicalDamageMitigation";

describe("mitigatePhysicalDamage", () => {
  it("aplica solo reducción de armadura si no hay escudo", () => {
    const result = mitigatePhysicalDamage(200, {
      damageReductionPercent: 0.1,
      shieldBlockChancePercent: 0,
      shieldBlockReductionPercent: 0,
    });
    expect(result.damage).toBe(180);
    expect(result.blocked).toBe(false);
  });

  it("escudo tortuga: 18% de bloquear y 38% menos daño al bloquear", () => {
    const blocked = mitigatePhysicalDamage(200, {
      damageReductionPercent: 0,
      shieldBlockChancePercent: 0.18,
      shieldBlockReductionPercent: 0.38,
      roll: 0,
    });
    expect(blocked.blocked).toBe(true);
    expect(blocked.damage).toBe(124);

    const notBlocked = mitigatePhysicalDamage(200, {
      damageReductionPercent: 0,
      shieldBlockChancePercent: 0.18,
      shieldBlockReductionPercent: 0.38,
      roll: 0.5,
    });
    expect(notBlocked.blocked).toBe(false);
    expect(notBlocked.damage).toBe(200);
  });

  it("no aplica bloqueo de escudo a hechizos (se omite en el caller)", () => {
    const result = mitigatePhysicalDamage(200, {
      damageReductionPercent: 0,
      shieldBlockChancePercent: 0.18,
      shieldBlockReductionPercent: 0.38,
      roll: 0,
    });
    expect(result.blocked).toBe(true);
  });
});
