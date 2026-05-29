import type { ClientJoinMessage } from "../../../shared/protocol";
import type { Facing } from "../../player/playerSprites";
import type { ItemId } from "../../items/itemDefinitions";
import type { NetPlayerEquipment } from "../../../shared/types";

export type MultiplayerJoinPayloadInput = {
  name: string;
  characterId: string;
  mapId: string;
  raceId: string;
  genderId: string;
  classId: string;
  factionId: string;
  faceIndex: number;
  tileX: number;
  tileY: number;
  facing: Facing;
  level: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  gold: number;
  equipment: NetPlayerEquipment;
  inventory: NonNullable<ClientJoinMessage["inventory"]>;
};

/** Payload de join MP; debe incluir gold para no resetear oro en el servidor. */
export function buildMultiplayerJoinPayload(
  input: MultiplayerJoinPayloadInput
): Omit<ClientJoinMessage, "type"> {
  return {
    name: input.name,
    characterId: input.characterId,
    mapId: input.mapId,
    raceId: input.raceId,
    genderId: input.genderId,
    classId: input.classId,
    factionId: input.factionId,
    faceIndex: input.faceIndex,
    tileX: input.tileX,
    tileY: input.tileY,
    facing: input.facing,
    level: input.level,
    hp: input.hp,
    hpMax: input.hpMax,
    mp: input.mp,
    mpMax: input.mpMax,
    gold: input.gold,
    equipment: input.equipment,
    inventory: input.inventory,
  };
}

export function buildJoinInventorySlots(
  inventory: Array<{ itemId: ItemId; count: number } | null>
): NonNullable<ClientJoinMessage["inventory"]> {
  return inventory.map((slot, slotIndex) => ({
    slotIndex,
    itemId: slot?.itemId ?? null,
    amount: slot?.count ?? 0,
    isEquipped: false,
  }));
}
