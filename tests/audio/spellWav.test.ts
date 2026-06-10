import { describe, expect, it } from "vitest";
import { SPELL_CAST_META_BY_ID } from "../../game-data/spellCastMeta";
import { NAMED_WAV_FILES } from "../../game-data/namedWavs";

function resolveSpellAudioTargets(spellIds: Iterable<number>) {
  const wavIndices = new Set<number>();
  const namedWavs = new Set<string>();
  for (const spellId of spellIds) {
    const meta = SPELL_CAST_META_BY_ID[spellId];
    if (!meta) continue;
    if (meta.namedWav && meta.namedWav in NAMED_WAV_FILES) {
      namedWavs.add(meta.namedWav);
      continue;
    }
    if (meta.wav > 0) {
      wavIndices.add(meta.wav);
    }
  }
  return { wavIndices, namedWavs };
}

describe("spell cast audio targets", () => {
  it("usa named wav para Furia de Uhkrul", () => {
    const { namedWavs, wavIndices } = resolveSpellAudioTargets([13]);
    expect(namedWavs.has("furiaUkhrul")).toBe(true);
    expect(wavIndices.size).toBe(0);
  });

  it("usa índice numérico para hechizos sin named wav", () => {
    const { wavIndices } = resolveSpellAudioTargets([1]);
    expect(wavIndices.has(239)).toBe(true);
  });
});
