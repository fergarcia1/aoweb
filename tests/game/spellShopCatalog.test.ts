import { describe, expect, it } from "vitest";

import {

  getMageVendorSpellCatalog,

  getMageVendorSpellIds,

  hasSpellShopIcon,

  MAGE_VENDOR_EXCLUDED_SPELL_IDS,

} from "../../game-data/spellShopCatalog";

import {

  STARTER_SPELL_CURAR_VENENO,

  STARTER_SPELL_PROYECTIL_MAGICO,

  STARTER_SPELL_SAETA_IGNEA,

} from "../../game-data/starterLoadout";

import { SPELL_DEFINITIONS } from "../../src/data/spells";



describe("spellShopCatalog", () => {

  it("incluye hechizos con pergamino propio, FX y precio", () => {

    const ids = getMageVendorSpellIds();

    expect(ids).not.toContain(1);

    expect(ids).not.toContain(2);

    expect(ids).not.toContain(4);

    expect(ids).toContain(7);

    expect(ids).toContain(11);

    expect(ids).toContain(13);

    expect(ids).toContain(52);

    expect(ids).toContain(93);

    expect(ids).toContain(94);

    expect(ids).not.toContain(36);

  });



  it("excluye starters, NPC, GM y Resucitar", () => {

    const catalog = getMageVendorSpellCatalog();

    for (const spell of catalog) {

      expect(hasSpellShopIcon(spell)).toBe(true);

    }

    expect(MAGE_VENDOR_EXCLUDED_SPELL_IDS.has(STARTER_SPELL_CURAR_VENENO)).toBe(true);

    expect(MAGE_VENDOR_EXCLUDED_SPELL_IDS.has(STARTER_SPELL_PROYECTIL_MAGICO)).toBe(true);

    expect(MAGE_VENDOR_EXCLUDED_SPELL_IDS.has(STARTER_SPELL_SAETA_IGNEA)).toBe(true);

    expect(catalog.some((s) => s.idSpell === 103)).toBe(false);

    expect(catalog.some((s) => s.idSpell === 1)).toBe(false);

    expect(catalog.some((s) => s.idSpell === 2)).toBe(false);

    const resucitar = SPELL_DEFINITIONS.find((s) => s.idSpell === 103);

    expect(resucitar).toBeDefined();

    expect(hasSpellShopIcon(resucitar!)).toBe(true);

  });

});


