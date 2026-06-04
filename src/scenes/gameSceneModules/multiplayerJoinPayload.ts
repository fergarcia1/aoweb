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
  bankGold: number;
  bankInventory: NonNullable<ClientJoinMessage["bankInventory"]>;
  learnedSpellIds: number[];
  exp: number;
  expToNext: number;
  usersKilled: number;
  isNewCharacter: boolean;
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
    bankGold: input.bankGold,
    bankInventory: input.bankInventory,
    learnedSpellIds: input.learnedSpellIds,
    exp: input.exp,
    expToNext: input.expToNext,
    usersKilled: input.usersKilled,
    isNewCharacter: input.isNewCharacter,
    equipment: input.equipment,
    inventory: input.inventory,
  };
}

export function buildJoinBankSlots(
  bankSlots: Array<{ itemId: string; count: number } | null>
): NonNullable<ClientJoinMessage["bankInventory"]> {
  return bankSlots.map((slot, slotIndex) => ({
    slotIndex,
    itemId: slot?.itemId ?? null,
    amount: slot?.count ?? 0,
  }));
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
