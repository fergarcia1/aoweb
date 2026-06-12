import { describe, expect, it } from "vitest";
import {
  ANTI_ONESHOT_WINDOW_MS,
  applyAntiOneshotToSpellDamage,
  resolveAntiOneshotSpellMultiplier,
} from "../../game-data/antiOneshot";

describe("antiOneshot PvP spell mitigation", () => {
  const t0 = 1_000_000;

  it("primer hechizo de una fuente hace 100% del daño", () => {
    const result = applyAntiOneshotToSpellDamage(200, [], "mage-a", t0);
    expect(result.damage).toBe(200);
    expect(result.records).toHaveLength(1);
  });

  it("el mismo jugador puede encadenar hechizos al 100%", () => {
    const first = applyAntiOneshotToSpellDamage(200, [], "mage-a", t0);
    const second = applyAntiOneshotToSpellDamage(200, first.records, "mage-a", t0 + 100);
    expect(second.damage).toBe(200);
  });

  it("segunda fuente distinta en la ventana hace 70%", () => {
    const first = applyAntiOneshotToSpellDamage(200, [], "mage-a", t0);
    const second = applyAntiOneshotToSpellDamage(200, first.records, "mage-b", t0 + 200);
    expect(second.damage).toBe(140);
  });

  it("tercera fuente distinta en la ventana hace 50%", () => {
    let records: ReturnType<typeof applyAntiOneshotToSpellDamage>["records"] = [];
    records = applyAntiOneshotToSpellDamage(200, records, "mage-a", t0).records;
    records = applyAntiOneshotToSpellDamage(200, records, "mage-b", t0 + 100).records;
    const third = applyAntiOneshotToSpellDamage(200, records, "mage-c", t0 + 200);
    expect(third.damage).toBe(100);
  });

  it("una fuente que vuelve a pegar tras otros magos sigue al 100%", () => {
    let records: ReturnType<typeof applyAntiOneshotToSpellDamage>["records"] = [];
    records = applyAntiOneshotToSpellDamage(200, records, "mage-a", t0).records;
    records = applyAntiOneshotToSpellDamage(200, records, "mage-b", t0 + 100).records;
    const again = applyAntiOneshotToSpellDamage(200, records, "mage-a", t0 + 300);
    expect(again.damage).toBe(200);
  });

  it("resetea el conteo tras 2 segundos sin golpes de esa fuente", () => {
    const first = applyAntiOneshotToSpellDamage(200, [], "mage-a", t0);
    const afterWindow = resolveAntiOneshotSpellMultiplier(
      first.records,
      "mage-b",
      t0 + ANTI_ONESHOT_WINDOW_MS + 1
    );
    expect(afterWindow.multiplier).toBe(1);
  });
});
