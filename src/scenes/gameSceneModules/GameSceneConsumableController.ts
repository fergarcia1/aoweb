import Phaser from "phaser";
import {
  ATTRIBUTE_POTION_GAIN_MAX,
  ATTRIBUTE_POTION_GAIN_MIN,
} from "../../../game-data/constants";
import {
  ATTRIBUTE_POTION_BUFF_MAX,
  resolveCoreStats,
  STAT_MAX,
} from "../../game/characterStats";
import { OFFLINE_GAMEPLAY_MESSAGE } from "../../game/mmoMode";
import { CLASS_USES_MANA } from "./constants";
import { canUseItem } from "../../game/itemUsability";
import { getItemDefinition, type ItemId } from "../../../game-data/items/definitions";
import type { InventorySlot } from "../../items/inventoryStack";
import { SPELL_DEFINITIONS } from "../../data/spells";
import type { ServerUseItemAckMessage } from "../../../shared/protocol";
import type { ClassId, RaceId } from "./types";

export type GameSceneConsumableDeps = {
  getSelectedClass: () => ClassId;
  getSelectedRace: () => RaceId;
  getPlayerProgress: () => {
    level: number;
    hp: number;
    hpMax: number;
    mp: number;
    mpMax: number;
  };
  getInventory: () => (InventorySlot | null)[];
  getAttributeBuffs: () => { strength: number; agility: number };
  setAttributeBuffs: (buffs: { strength: number; agility: number }) => void;
  getAttributeBuffExpiresAt: () => number;
  setAttributeBuffExpiresAt: (ms: number) => void;

  hasLearnedSpell: (id: number) => boolean;
  learnSpell: (id: number) => void;
  addChatLine: (text: string) => void;
  refreshHud: () => void;
  setNavigatingFromServer?: (active: boolean) => void;

  refreshKnownSpellsUi: () => void;
  getCoreStats: () => ReturnType<typeof resolveCoreStats>;
  clearInventorySlotUi: (slotIndex: number) => void;
  setInventorySlotUi: (
    slotIndex: number,
    textureKey: string,
    count: number,
    itemId: ItemId
  ) => void;
  isMultiplayerActive: () => boolean;
  isMultiplayerConnected: () => boolean;
  isSpawnSynced: () => boolean;
  isPlayerAdmin: () => boolean;
  sendUseItemToServer: (itemId: ItemId, slotIndex: number) => void;
  schedulePersistProgress: () => void;
  cancelScheduledPersist: () => void;
  deferConsumableUiWork: (work: () => void) => void;
  resetAttributeBuffTimer: () => void;
  getTimeNow: () => number;
  playPotionUseSound?: () => void;
};

function isHpOrMpPotion(item: ReturnType<typeof getItemDefinition>): boolean {
  const fx = item.consumableEffects;
  return Boolean(
    (fx?.healHpPercent && fx.healHpPercent > 0) ||
      (fx?.restoreMpPercent && fx.restoreMpPercent > 0)
  );
}

export class GameSceneConsumableController {
  constructor(private readonly deps: GameSceneConsumableDeps) {}

  private persistInventoryAfterConsume(): void {
    this.deps.cancelScheduledPersist();
    this.deps.schedulePersistProgress();
  }

  handleServerUseItemAck(ack: ServerUseItemAckMessage): void {
    const progress = this.deps.getPlayerProgress();
    if (typeof ack.hp === "number") {
      progress.hp = ack.hp;
    }
    if (typeof ack.mp === "number") {
      progress.mp = ack.mp;
    }
    if (ack.attributeBuffs) {
      this.deps.setAttributeBuffs({
        strength: ack.attributeBuffs.strength,
        agility: ack.attributeBuffs.agility,
      });
      this.deps.resetAttributeBuffTimer();
    }
    this.deps.refreshHud();

    if (ack.navigationMode === "boat") {
      this.deps.setNavigatingFromServer?.(true);
      this.deps.deferConsumableUiWork(() => {
        this.deps.addChatLine(ack.message);
      });
      return;
    }
    if (ack.navigationMode === null) {
      this.deps.setNavigatingFromServer?.(false);
      this.deps.deferConsumableUiWork(() => {
        this.deps.addChatLine(ack.message);
      });
      return;
    }

    if (ack.clientOnly && typeof ack.inventorySlot === "number") {
      this.deps.deferConsumableUiWork(() => {
        this.useConsumableFromSlot(ack.inventorySlot!, { skipMultiplayer: true });
        this.persistInventoryAfterConsume();
      });
      return;
    }

    const ackItem = getItemDefinition(ack.itemId as ItemId);
    if (isHpOrMpPotion(ackItem)) {
      this.deps.playPotionUseSound?.();
      const slotIndex = this.resolveInventorySlotForItemAck(ack);
      if (slotIndex >= 0) {
        this.consumeOneFromSlot(slotIndex, ackItem.textureKey);
      }
      return;
    }

    this.deps.deferConsumableUiWork(() => {
      this.deps.addChatLine(ack.message);

      const slotIndex = this.resolveInventorySlotForItemAck(ack);
      if (slotIndex >= 0) {
        this.consumeOneFromSlot(slotIndex, ackItem.textureKey);
      }
    });
  }

  useConsumableFromSlot(
    slotIndex: number,
    options?: { skipMultiplayer?: boolean }
  ): void {
    const inventory = this.deps.getInventory();
    const stack = inventory[slotIndex];
    if (!stack) {
      return;
    }

    const item = getItemDefinition(stack.itemId);
    const progress = this.deps.getPlayerProgress();
    const usability = canUseItem(
      this.deps.getSelectedClass(),
      this.deps.getSelectedRace(),
      progress.level,
      item,
      this.deps.isPlayerAdmin()
    );
    if (!usability.allowed) {
      this.deps.addChatLine(usability.reason ?? "No podés usar ese objeto.");
      return;
    }

    if (item.type !== "consumable" || !item.consumableEffects) {
      this.deps.addChatLine(`${item.name} no se puede usar.`);
      return;
    }

    const { healHpPercent, restoreMpPercent, learnSpellId, attributeBuff } =
      item.consumableEffects;

    if (
      !options?.skipMultiplayer &&
      this.deps.isMultiplayerConnected() &&
      !learnSpellId &&
      (healHpPercent || restoreMpPercent || attributeBuff)
    ) {
      if (!this.deps.isMultiplayerActive()) {
        this.deps.addChatLine("Conectando con el servidor...");
        return;
      }
      if (!this.deps.isSpawnSynced()) {
        this.deps.addChatLine("Esperá a que termine la conexión con el servidor.");
        return;
      }
      this.deps.sendUseItemToServer(stack.itemId, slotIndex);
      return;
    }

    if (learnSpellId) {
      const learned = this.tryLearnSpellFromScroll(learnSpellId, item.name);
      if (!learned) {
        return;
      }
      this.consumeOneFromSlot(slotIndex, item.textureKey);
      this.deps.refreshKnownSpellsUi();
      this.persistInventoryAfterConsume();
      return;
    }

    if (healHpPercent || restoreMpPercent || attributeBuff) {
      if (!this.deps.isMultiplayerActive()) {
        this.deps.addChatLine(OFFLINE_GAMEPLAY_MESSAGE);
        return;
      }
    }

    if (attributeBuff === "strength" || attributeBuff === "agility") {
      this.expireAttributePotionBuffsIfNeeded(this.deps.getTimeNow());
      const statLabel = attributeBuff === "strength" ? "Fuerza" : "Agilidad";
      const result = this.tryApplyAttributeBuffFromPotion(attributeBuff);
      this.deps.resetAttributeBuffTimer();

      this.consumeOneFromSlot(slotIndex, item.textureKey);

      this.deps.refreshHud();

      if (result.atCap && result.gained <= 0) {
        this.deps.addChatLine(
          `Usaste ${item.name}. Renovaste el efecto por 90 s (ya tenés el máximo de ${statLabel}).`
        );
        this.persistInventoryAfterConsume();
        return;
      }

      const buffs = this.deps.getAttributeBuffs();
      const totalBonus = Math.floor(buffs[attributeBuff]);
      this.deps.addChatLine(
        `Usaste ${item.name} y ganaste +${result.gained} ${statLabel} (bono +${totalBonus}, stat ${result.newStatValue}/${STAT_MAX + ATTRIBUTE_POTION_BUFF_MAX}, 90 s).`
      );
      return;
    }

    if (restoreMpPercent && restoreMpPercent > 0) {
      if (!CLASS_USES_MANA[this.deps.getSelectedClass()] || progress.mpMax <= 0) {
        this.deps.addChatLine("Tu clase no usa maná.");
        return;
      }
      if (progress.mp >= progress.mpMax) {
        this.deps.addChatLine("Ya tenés el maná al máximo.");
        return;
      }

      const manaAmount = Math.max(1, Math.floor(progress.mpMax * restoreMpPercent));
      const before = progress.mp;
      progress.mp = Math.min(progress.mpMax, progress.mp + manaAmount);
      const restored = progress.mp - before;

      this.consumeOneFromSlot(slotIndex, item.textureKey);
      this.deps.refreshHud();
      this.deps.playPotionUseSound?.();
      this.deps.addChatLine(
        `Usaste ${item.name} y recuperaste ${restored} MP (${Math.round(restoreMpPercent * 100)}%).`
      );
      this.persistInventoryAfterConsume();
      return;
    }

    if (!healHpPercent || healHpPercent <= 0) {
      this.deps.addChatLine(`${item.name} no tiene efecto definido.`);
      return;
    }

    if (progress.hp >= progress.hpMax) {
      this.deps.addChatLine("Ya tenés la vida al máximo.");
      return;
    }

    const healAmount = Math.max(1, Math.floor(progress.hpMax * healHpPercent));
    const beforeHp = progress.hp;
    progress.hp = Math.min(progress.hpMax, progress.hp + healAmount);
    const restoredHp = progress.hp - beforeHp;

    this.consumeOneFromSlot(slotIndex, item.textureKey);
    this.deps.refreshHud();
    this.deps.playPotionUseSound?.();
    this.deps.addChatLine(
      `Usaste ${item.name} y recuperaste ${restoredHp} HP (${Math.round(healHpPercent * 100)}%).`
    );
    this.persistInventoryAfterConsume();
  }

  clearAttributePotionBuffs(notify = false): void {
    const buffs = this.deps.getAttributeBuffs();
    const expiresAt = this.deps.getAttributeBuffExpiresAt();
    const hadBuff = buffs.strength > 0 || buffs.agility > 0 || expiresAt > 0;
    this.deps.setAttributeBuffs({ strength: 0, agility: 0 });
    this.deps.setAttributeBuffExpiresAt(0);
    if (notify && hadBuff) {
      this.deps.addChatLine("El efecto de las pociones de fuerza y agilidad terminó.");

    }
  }

  expireAttributePotionBuffsIfNeeded(now: number): boolean {
    const expiresAt = this.deps.getAttributeBuffExpiresAt();
    if (expiresAt <= 0 || now < expiresAt) {
      return false;
    }
    this.clearAttributePotionBuffs(true);
    return true;
  }

  private tryApplyAttributeBuffFromPotion(stat: "strength" | "agility"): {
    gained: number;
    atCap: boolean;
    newStatValue: number;
  } {
    const buffs = this.deps.getAttributeBuffs();
    const current = Math.floor(buffs[stat]);
    if (current >= ATTRIBUTE_POTION_BUFF_MAX) {
      const natural = resolveCoreStats(
        this.deps.getSelectedRace(),
        this.deps.getSelectedClass()
      );
      return {
        gained: 0,
        atCap: true,
        newStatValue: natural[stat] + current,
      };
    }

    const roll = Phaser.Math.Between(ATTRIBUTE_POTION_GAIN_MIN, ATTRIBUTE_POTION_GAIN_MAX);
    const gained = Math.min(roll, ATTRIBUTE_POTION_BUFF_MAX - current);
    buffs[stat] = current + gained;
    const core = this.deps.getCoreStats();
    return { gained, atCap: false, newStatValue: core[stat] };
  }

  private tryLearnSpellFromScroll(spellId: number, itemName: string): boolean {
    const spell = SPELL_DEFINITIONS.find((entry) => entry.idSpell === spellId);
    if (!spell) {
      this.deps.addChatLine(`${itemName} no tiene un hechizo válido.`);
      return false;
    }
    if (!spell.usableBy.includes(this.deps.getSelectedClass())) {
      this.deps.addChatLine(`Tu clase no puede aprender ${spell.nombre}.`);
      return false;
    }
    if (spell.nivelRequerido > this.deps.getPlayerProgress().level) {
      this.deps.addChatLine(
        `Necesitás ser nivel ${spell.nivelRequerido} para aprender ${spell.nombre}.`
      );
      return false;
    }
    if (this.deps.hasLearnedSpell(spellId)) {
      this.deps.addChatLine(`Ya conocés ${spell.nombre}.`);
      return false;
    }

    this.deps.learnSpell(spellId);
    this.deps.addChatLine(`Aprendiste ${spell.nombre}.`);
    return true;
  }

  private consumeOneFromSlot(slotIndex: number, textureKey: string): void {
    const inventory = this.deps.getInventory();
    const stack = inventory[slotIndex];
    if (!stack) {
      return;
    }

    stack.count -= 1;
    if (stack.count <= 0) {
      inventory[slotIndex] = null;
      this.deps.clearInventorySlotUi(slotIndex);
      return;
    }

    this.deps.setInventorySlotUi(slotIndex, textureKey, stack.count, stack.itemId);
  }

  private resolveInventorySlotForItemAck(ack: ServerUseItemAckMessage): number {
    const inventory = this.deps.getInventory();
    if (typeof ack.inventorySlot === "number" && ack.inventorySlot >= 0) {
      const preferred = inventory[ack.inventorySlot];
      if (preferred?.itemId === ack.itemId && preferred.count > 0) {
        return ack.inventorySlot;
      }
    }
    return inventory.findIndex(
      (stack) => stack?.itemId === ack.itemId && stack.count > 0
    );
  }
}
