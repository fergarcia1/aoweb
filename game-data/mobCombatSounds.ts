import type { MobModelId } from "./mobs";
import type { NamedWavId } from "./namedWavs";

/** Sonido al recibir daño (varias variantes = alternancia). */
type MobHitSoundModelId = MobModelId | "medusa" | "medusaM" | "medusa_m";

export const MOB_HIT_SOUND_BY_MODEL: Partial<Record<MobHitSoundModelId, readonly NamedWavId[]>> = {
  arana: ["arana"],
  basilisco: ["basilisco"],
  bruja_drow: ["bruja"],
  ciclope: ["ciclope", "ciclope2"],
  escorpion: ["escorpion"],
  fango: ["fango"],
  lobo: ["lobo"],
  lobo_invernal: ["lobo"],
  medusa: ["medu"],
  medusaM: ["medu2"],
  medusa_m: ["medu2"],
  serpiente: ["serpienteHit"],
};

/** Gólems y dragón: pasos pesados (pasoGolem / pasoGolem2). */
export const HEAVY_MOB_FOOTSTEP_MODELS: ReadonlySet<MobModelId> = new Set([
  "golem_plata",
  "golem_bronce",
  "golem_hielo",
  "golem_infernal",
  "golem_piedra",
  "yeti",
  "dragon_rojo",
]);

const mobHitSoundIndexByModel = new Map<string, number>();

export function resolveMobHitSoundId(modelId: MobHitSoundModelId): NamedWavId | undefined {
  const variants = MOB_HIT_SOUND_BY_MODEL[modelId];
  if (!variants?.length) {
    return undefined;
  }
  const prev = mobHitSoundIndexByModel.get(modelId) ?? 0;
  const soundId = variants[prev % variants.length];
  mobHitSoundIndexByModel.set(modelId, prev + 1);
  return soundId;
}

export function usesHeavyMobFootsteps(modelId: MobModelId): boolean {
  return HEAVY_MOB_FOOTSTEP_MODELS.has(modelId);
}
