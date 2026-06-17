import Phaser from "phaser";
import { registerMeditationAnimations } from "../../systems/meditationVisuals";
import { registerPortalAnimations } from "../../maps/portalVisuals";
import {
  registerPlayerAnimations,
  setupPlayerTexture,
} from "../../player/playerSprites";
import { setupAoTerrainTexture } from "../../terrain/aoTerrain";
import { setupRaceFacesTextures } from "../../player/raceFaces";
import { setupInventoryPanelTextures } from "../../ui/inventoryPanel";
import { registerMobWalkAnimations } from "../../game/mobs/registerMobWalkAnimations";
import { IMPERIUM_NPC_CATALOG } from "../../../game-data/imperium/npcCatalog";
import { getImperiumNpcSpriteConfigFromCatalog } from "../../game/npcs/imperiumNpcVisual";
import { registerImperiumNpcWalkAnims } from "../../game/npcs/imperiumNpcRuntime";
import { ALL_FX_SHEETS, spellEffectAnimKey } from "../../../game-data/spellEffects";
import { TREE_TEXTURE_KEY } from "./constants";

/**
 * Orquestador central para registrar todas las animaciones y configuraciones de texturas
 * iniciales necesarias para la escena del juego.
 */
export function registerAllGameVisuals(scene: Phaser.Scene): void {
  // 1. Setup de texturas estáticas y filtrado
  setupPlayerTexture(scene);
  setupAoTerrainTexture(scene);
  setupRaceFacesTextures(scene);
  setupInventoryPanelTextures(scene);

  const treeTexture = scene.textures.get(TREE_TEXTURE_KEY);
  if (treeTexture.key !== "__MISSING") {
    treeTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  // 2. Registro de animaciones
  registerPlayerAnimations(scene);
  registerPortalAnimations(scene);
  registerMobWalkAnimations(scene);
  registerMeditationAnimations(scene);
  
  registerSpellAnimations(scene);
  registerImperiumNpcWalkAnimations(scene);
}

/** Registra las animaciones de hechizos basadas en la configuración de datos. */
export function registerSpellAnimations(scene: Phaser.Scene) {
  ALL_FX_SHEETS.forEach((fx) => {
    const animKey = spellEffectAnimKey(fx.idSpell);
    if (scene.anims.exists(animKey)) {
      return;
    }

    const texture = scene.textures.get(fx.sheetKey);
    if (texture.key === "__MISSING") {
      return;
    }

    const frames = fx.frameSequence
      ? fx.frameSequence.map((frame) => ({ key: fx.sheetKey, frame }))
      : scene.anims.generateFrameNumbers(fx.sheetKey, {
          start: 0,
          end: fx.frameCount - 1,
        });

    scene.anims.create({
      key: animKey,
      frames,
      frameRate: fx.frameRate,
      repeat: 0,
    });
  });
}

/** Registra las animaciones de caminata para NPCs del catálogo Imperium. */
export function registerImperiumNpcWalkAnimations(scene: Phaser.Scene): void {
  for (const entry of IMPERIUM_NPC_CATALOG) {
    if (!entry.visual || entry.visual.status !== "ready") continue;
    const config = getImperiumNpcSpriteConfigFromCatalog(entry);
    if (!config) continue;
    registerImperiumNpcWalkAnims(scene, entry.npcId, config);
  }
}
