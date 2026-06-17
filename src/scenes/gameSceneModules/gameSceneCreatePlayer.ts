import Phaser from "phaser";
import {
  applyPlayerOrigin,
  textureKeyForPlayer,
  raceBodyTextureKey,
  type Facing,
  type Outfit,
  type PlayerArmorVisualOptions,
} from "../../player/playerSprites";
import { faceTextureKey, getFaceFrame } from "../../player/raceFaces";
import {
  getPlayerNameColors,
  type CharacterFactionId,
  type CharacterGenderId,
  type CharacterRaceId,
  type PlayerRole,
} from "../../data/characters";
import { createEquippedOverlaySprite } from "../../game/equippedGear";
import { SpellMagicWordsOverlay } from "../../ui/spellMagicWordsOverlay";
import {
  GAME_FONT,
  GAME_TEXT_RESOLUTION,
  WORLD_NAME_FONT_SIZE,
  WORLD_NAME_STROKE,
} from "../../ui/fonts";
import type { DeathPhase } from "../../systems/DeathSystem";
import { GHOST_RACE_ID } from "../../data/characters";

export type GameSceneCreatedPlayer = {
  player: Phaser.GameObjects.Sprite;
  playerFace: Phaser.GameObjects.Sprite;
  playerNameLabel: Phaser.GameObjects.Text;
  equippedWeaponSprite: Phaser.GameObjects.Sprite;
  equippedShieldSprite: Phaser.GameObjects.Sprite;
  equippedHelmetSprite: Phaser.GameObjects.Sprite;
  spellMagicWordsOverlay: SpellMagicWordsOverlay;
};

export type CreateGameScenePlayerParams = {
  scene: Phaser.Scene;
  tileX: number;
  tileY: number;
  feetX: number;
  feetY: number;
  depthFromFeetY: (feetY: number) => number;
  facing: Facing;
  deathPhase: DeathPhase;
  useGhostAppearance: boolean;
  equippedOutfit: Outfit;
  equippedArmorVisual?: PlayerArmorVisualOptions;
  visualBodyTextureKey: string;
  selectedRace: CharacterRaceId;
  selectedGender: CharacterGenderId;
  selectedFaceIndex: number;
  faceLayoutScale: number;
  playerName: string;
  selectedFaction: CharacterFactionId;
  playerRole: PlayerRole;
  uiCamera?: Phaser.Cameras.Scene2D.Camera;
  worldLayer?: Phaser.GameObjects.Container;
  setupHitbox: (player: Phaser.GameObjects.Sprite) => void;
  onPlayerPointerDown: () => void;
};

export function createGameScenePlayer(params: CreateGameScenePlayerParams): GameSceneCreatedPlayer {
  const {
    scene,
    feetX,
    feetY,
    depthFromFeetY,
    facing,
    deathPhase,
    useGhostAppearance,
    equippedOutfit,
    equippedArmorVisual,
    visualBodyTextureKey,
    selectedRace,
    selectedGender,
    selectedFaceIndex,
    faceLayoutScale,
    playerName,
    selectedFaction,
    playerRole,
    uiCamera,
    worldLayer,
    setupHitbox,
    onPlayerPointerDown,
  } = params;

  const bodyTexture =
    useGhostAppearance && deathPhase !== "alive"
      ? textureKeyForPlayer("base", raceBodyTextureKey(GHOST_RACE_ID, "male"), undefined)
      : textureKeyForPlayer(equippedOutfit, visualBodyTextureKey, equippedArmorVisual, selectedRace);

  const player = scene.add.sprite(feetX, feetY, bodyTexture, 0);
  applyPlayerOrigin(player);
  player.setDepth(depthFromFeetY(feetY));

  const playerFace = scene.add.sprite(
    feetX,
    feetY,
    faceTextureKey(selectedRace, selectedGender),
    getFaceFrame(selectedRace, selectedGender, selectedFaceIndex, facing)
  );
  playerFace.setOrigin(0.5, 1);
  playerFace.setScale(faceLayoutScale);
  playerFace.setDepth(player.depth + 0.02);

  const equippedWeaponSprite = createEquippedOverlaySprite(scene, feetX, feetY);
  const equippedShieldSprite = createEquippedOverlaySprite(scene, feetX, feetY);
  const equippedHelmetSprite = createEquippedOverlaySprite(scene, feetX, feetY);

  const nameColors = getPlayerNameColors(selectedFaction, playerRole);
  const playerNameLabel = scene.add
    .text(feetX, feetY + 2, playerName, {
      fontFamily: GAME_FONT,
      fontSize: `${WORLD_NAME_FONT_SIZE}px`,
      color: nameColors.fill,
      fontStyle: "bold",
      stroke: nameColors.stroke,
      strokeThickness: WORLD_NAME_STROKE,
      resolution: GAME_TEXT_RESOLUTION,
    })
    .setOrigin(0.5, 0)
    .setDepth(player.depth + 2);

  const spellMagicWordsOverlay = new SpellMagicWordsOverlay(
    scene,
    () => {
      if (!player.active) {
        return null;
      }
      return {
        x: player.x,
        y: player.y,
        depth: player.depth + 3,
      };
    },
    uiCamera,
    worldLayer
  );

  setupHitbox(player);
  player.on("pointerdown", onPlayerPointerDown);

  return {
    player,
    playerFace,
    playerNameLabel,
    equippedWeaponSprite,
    equippedShieldSprite,
    equippedHelmetSprite,
    spellMagicWordsOverlay,
  };
}
