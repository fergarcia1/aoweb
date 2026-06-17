import Phaser from "phaser";
import { registerMapObjectAssets } from "../../maps/mapObjects";
import { registerPlayerSprites } from "../../player/playerSprites";
import { registerRaceFaces } from "../../player/raceFaces";
import { registerAoTerrain } from "../../terrain/aoTerrain";
import { registerInventoryPanelAssets } from "../../ui/inventoryPanel";
import { preloadAoFont2 } from "../../ui/aoBitmapFont";
import { registerNpcAssets } from "../../npcs/npcAssets";
import { loadMobVisualAssetsForModels } from "../../game/mobs/mobVisualRuntime";
import { loadImperiumNpcVisualAssetsForBodyIds } from "../../game/npcs/loadImperiumNpcVisualAssets";
import { SPELL_DEFINITIONS } from "../../data/spells";
import { preloadFootstepWavs } from "../../audio/footstepWav";
import { preloadNamedWavs } from "../../audio/namedWav";
import { preloadSpellAudioForSpellIds, preloadSpellWavs } from "../../audio/spellWav";
import { ALL_FX_SHEETS, getSpellEffectConfig } from "../../spells/spellEffects";
import { preloadMeditationVisuals } from "../../systems/meditationVisuals";
import { macroSpellTextureKey } from "./progressFormulas";
import {
  HUD_AGILITY_POTION_TEXTURE_KEY,
  HUD_STRENGTH_POTION_TEXTURE_KEY,
  TREE_TEXTURE_KEY,
  TREE_TEXTURE_PATH,
} from "./constants";
import { preloadPortalAnimationAssets } from "../../maps/portalVisuals";
import type { GrhIndexEntry } from "../../maps/legacyMapObjects";
import { getMap } from "../../../shared/maps";
import type { GameScenePreloadContext } from "./gameScenePreloadContext";
import {
  queueEquippableVisualAssets,
  queueImageIfMissing,
  queueItemAssetsById,
  queueMapVisualAssets,
  queueSpritesheetIfMissing,
} from "./gameSceneAssetQueue";

const ESSENTIAL_NAMED_WAVS = [
  "step",
  "step2",
  "pasoGolem",
  "pasoGolem2",
  "lvlUp",
  "spawnInWorld",
  "pocionAzul",
  "goldDrop",
  "golpeAire",
] as const;

function getCachedGrhIndex(scene: Phaser.Scene): Record<string, GrhIndexEntry> | null {
  const grhIndex = scene.cache.json.get("grh_index") as Record<string, GrhIndexEntry> | undefined;
  return grhIndex ?? null;
}

/** Núcleo mínimo para arrancar la escena (UI, jugador, terreno, fuentes). */
export function runGameSceneEssentialPreload(scene: Phaser.Scene): void {
  registerPlayerSprites(scene);
  registerNpcAssets(scene);
  registerAoTerrain(scene);
  registerRaceFaces(scene);
  registerInventoryPanelAssets(scene);
  queueEquippableVisualAssets(scene);

  preloadMeditationVisuals(scene);
  preloadPortalAnimationAssets(scene);
  scene.load.image(TREE_TEXTURE_KEY, TREE_TEXTURE_PATH);
  registerMapObjectAssets(scene);

  scene.load.image("world_gold", "assets/ao/otherItems/oro.png");
  scene.load.image(HUD_STRENGTH_POTION_TEXTURE_KEY, "assets/ao/otherItems/pocionVerde.png");
  scene.load.image(HUD_AGILITY_POTION_TEXTURE_KEY, "assets/ao/otherItems/pocionAmarilla.png");

  scene.load.json("grh_index", "assets/ao/grh_index.json");
  preloadAoFont2(scene);
  preloadFootstepWavs(scene);
  preloadNamedWavs(scene);

  // Preload all spell animations (so animations cast by any player or mob are visible)
  for (const fx of ALL_FX_SHEETS) {
    queueSpritesheetIfMissing(
      scene,
      fx.sheetKey,
      fx.path,
      fx.frameWidth,
      fx.frameHeight
    );
  }

  // Preload all spell audio WAV files
  preloadSpellWavs(scene);
}

/** Assets del personaje y del mapa inicial (sin precargar todo el juego). */
export function runGameSceneScopedPreload(
  scene: Phaser.Scene,
  context: GameScenePreloadContext
): void {
  const grhIndex = getCachedGrhIndex(scene);
  for (const mapId of context.preloadMapIds) {
    queueMapVisualAssets(scene, getMap(mapId), grhIndex ?? undefined);
  }

  loadMobVisualAssetsForModels(scene, context.mobModelIds);
  loadImperiumNpcVisualAssetsForBodyIds(scene, context.imperiumBodyIds);

  for (const spellId of context.spellIds) {
    const spell = SPELL_DEFINITIONS.find((entry) => entry.idSpell === spellId);
    if (spell?.iconAssetPath) {
      queueImageIfMissing(scene, macroSpellTextureKey(spell.idSpell), spell.iconAssetPath);
    }

    const fx = getSpellEffectConfig(spellId);
    if (fx) {
      queueSpritesheetIfMissing(
        scene,
        fx.sheetKey,
        fx.path,
        fx.frameWidth,
        fx.frameHeight
      );
    }
  }

  for (const itemId of context.itemIds) {
    queueItemAssetsById(scene, itemId, { raceId: context.raceId });
  }

  preloadSpellAudioForSpellIds(scene, context.spellIds);
}

/** Precarga de GameScene: esencial + solo lo que el personaje necesita al entrar. */
export function runGameScenePreload(
  scene: Phaser.Scene,
  context: GameScenePreloadContext
): void {
  runGameSceneEssentialPreload(scene);
  runGameSceneScopedPreload(scene, context);
  scene.load.once("filecomplete-json-grh_index", () => {
    runGameSceneScopedPreload(scene, context);
  });
}
