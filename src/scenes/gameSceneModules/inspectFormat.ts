import {
  FACTION_LABELS,
  formatRaceGenderLabel,
  type CharacterFactionId,
  type CharacterGenderId,
  type PlayerRole,
} from "../../data/characters";
import { isMobImmobilizedAt } from "../../../shared/combat";
import type { ClassId, DummyState, RaceId } from "./types";

export function formatImmobilizeDuration(durationMs: number): string {
  if (durationMs >= 60_000) {
    const minutes = Math.round(durationMs / 60_000);
    return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
  }
  return `${Math.ceil(durationMs / 1000)} segundos`;
}

export function formatImmobilizeRemaining(remainingMs: number): string {
  if (remainingMs >= 60_000) {
    const minutes = Math.ceil(remainingMs / 60_000);
    return minutes === 1 ? "1 min" : `${minutes} min`;
  }
  return `${Math.ceil(remainingMs / 1000)}s`;
}

export function formatCharacterInspectLine(
  name: string,
  factionId: CharacterFactionId,
  classId: ClassId,
  raceId: RaceId,
  genderId: CharacterGenderId,
  level: number,
  role: PlayerRole = "player"
): string {
  const factionLabel = role === "admin" ? "GameMaster" : FACTION_LABELS[factionId];
  const classLabelById: Record<ClassId, string> = {
    paladin: "Paladín",
    clerigo: "Clérigo",
    mago: "Mago",
    nigromante: "Nigromante",
    druida: "Druida",
    bardo: "Bardo",
    guerrero: "Guerrero",
    cazador: "Cazador",
    asesino: "Asesino",
  };
  const classLabel = classLabelById[classId];
  const raceLabel = formatRaceGenderLabel(raceId, genderId);
  return `${name} - ${factionLabel} - ${classLabel} ${raceLabel} Nivel ${level}`;
}

export function getDummyActiveDebuffsForInspect(
  dummy: DummyState,
  now: number = Date.now()
): string[] {
  const debuffs: string[] = [];
  if (isMobImmobilizedAt(dummy.immobilizedUntilMs, now)) {
    debuffs.push("Inmovilizado");
  }
  return debuffs;
}

export function formatInspectLineWithDebuffs(baseText: string, debuffs: string[]): string {
  if (debuffs.length === 0) {
    return baseText;
  }
  return `${baseText} - ${debuffs.join(", ")}`;
}
