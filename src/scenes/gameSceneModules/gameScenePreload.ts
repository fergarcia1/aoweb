import Phaser from "phaser";
import { getAllMaps } from "../../maps";
import {
  collectLegacyObjGrhFileNums,
  type GrhIndexEntry,
} from "../../maps/legacyMapObjects";
import grhIndexJson from "../../../public/assets/ao/grh_index.json";
import { registerMapObjectAssets } from "../../maps/mapObjects";
import {
  registerArmorSpritesheet,
  registerPlayerSprites,
  textureKeyFromAssetPath,
} from "../../player/playerSprites";
import { registerRaceFaces } from "../../player/raceFaces";
import { registerAoTerrain } from "../../terrain/aoTerrain";
import { registerInventoryPanelAssets } from "../../ui/inventoryPanel";
import { preloadAoFont2 } from "../../ui/aoBitmapFont";
import { registerNpcAssets } from "../../npcs/npcAssets";
import { loadMobVisualAssets } from "../../game/mobs/mobVisualRuntime";
import { loadAllImperiumNpcVisualAssets } from "../../game/npcs/loadImperiumNpcVisualAssets";
import { ITEM_DEFINITIONS } from "../../items/itemDefinitions";
import { SPELL_DEFINITIONS } from "../../data/spells";
import { preloadFootstepWavs } from "../../audio/footstepWav";
import { preloadNamedWavs } from "../../audio/namedWav";
import { preloadSpellWavs } from "../../audio/spellWav";
import { ALL_FX_SHEETS } from "../../spells/spellEffects";
import { preloadMeditationVisuals } from "../../systems/meditationVisuals";
import { macroSpellTextureKey } from "./progressFormulas";
import {
  HUD_AGILITY_POTION_TEXTURE_KEY,
  HUD_STRENGTH_POTION_TEXTURE_KEY,
  TREE_TEXTURE_KEY,
  TREE_TEXTURE_PATH,
} from "./constants";

/** Precarga de assets de GameScene (Phaser loader). */
export function runGameScenePreload(scene: Phaser.Scene): void {
  registerPlayerSprites(scene);
  registerNpcAssets(scene);
  registerAoTerrain(scene);
  registerRaceFaces(scene);
  registerInventoryPanelAssets(scene);
  loadMobVisualAssets(scene);
  loadAllImperiumNpcVisualAssets(scene);

  ALL_FX_SHEETS.forEach((fx) => {
    scene.load.spritesheet(fx.sheetKey, fx.path, {
      frameWidth: fx.frameWidth,
      frameHeight: fx.frameHeight,
    });
  });

  preloadMeditationVisuals(scene);
  scene.load.image(TREE_TEXTURE_KEY, TREE_TEXTURE_PATH);
  registerMapObjectAssets(scene);

  SPELL_DEFINITIONS.forEach((spell) => {
    if (!spell.iconAssetPath) return;
    scene.load.image(macroSpellTextureKey(spell.idSpell), spell.iconAssetPath);
  });

  Object.values(ITEM_DEFINITIONS).forEach((item) => {
    scene.load.image(item.textureKey, item.assetPath);
    if (item.equippedTextureKey && item.equippedAssetPath) {
      if (item.equippedFrameWidth && item.equippedFrameHeight) {
        scene.load.spritesheet(item.equippedTextureKey, item.equippedAssetPath, {
          frameWidth: item.equippedFrameWidth,
          frameHeight: item.equippedFrameHeight,
        });
      } else {
        scene.load.image(item.equippedTextureKey, item.equippedAssetPath);
      }
    }
  });

  Object.values(ITEM_DEFINITIONS).forEach((item) => {
    if (item.type !== "armor") return;
    const armorSheets = [
      item.spritesheetStdPath,
      item.spritesheetBajosPath,
      ...(item.spritesheetPathsByRace
        ? Object.values(item.spritesheetPathsByRace)
        : []),
    ].filter((path): path is string => Boolean(path));
    armorSheets.forEach((sheetPath) => {
      registerArmorSpritesheet(scene, textureKeyFromAssetPath(sheetPath), sheetPath);
    });
  });

  scene.load.image("world_gold", "assets/ao/otherItems/oro.png");
  scene.load.image(HUD_STRENGTH_POTION_TEXTURE_KEY, "assets/ao/otherItems/pocionVerde.png");
  scene.load.image(HUD_AGILITY_POTION_TEXTURE_KEY, "assets/ao/otherItems/pocionAmarilla.png");

  const grhIndex = grhIndexJson as Record<string, GrhIndexEntry>;
  for (const map of getAllMaps()) {
    for (const overlay of map.groundOverlays ?? []) {
      scene.load.image(overlay.textureKey, overlay.texturePath);
    }
    const legacyFileNums = new Set<number>();
    if (map.legacyCsmData?.fileNums) {
      for (const fileNum of map.legacyCsmData.fileNums) {
        legacyFileNums.add(fileNum);
      }
    }
    for (const fileNum of collectLegacyObjGrhFileNums(map, grhIndex)) {
      legacyFileNums.add(fileNum);
    }
    for (const fileNum of legacyFileNums) {
      scene.load.image(`grh_file_${fileNum}`, `assets/ao/graficos/${fileNum}.png`);
    }
  }

  scene.load.json("grh_index", "assets/ao/grh_index.json");
  preloadAoFont2(scene);
  preloadSpellWavs(scene);
  preloadNamedWavs(scene);
  preloadFootstepWavs(scene);
}
