import { formatRaceGenderLabel } from "../../data/characters";
import type { CharacterGenderId, PlayerRole } from "../../data/characters";
import type { ClassId, DummyState, PlayerAffiliation, RaceId } from "./types";

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
  affiliation: PlayerAffiliation,
  classId: ClassId,
  raceId: RaceId,
  genderId: CharacterGenderId,
  level: number,
  role: PlayerRole = "player"
): string {
  const affiliationLabel =
    role === "admin" ? "GameMaster" : affiliation === "ciudadano" ? "Ciudadano" : "Criminal";
  const classLabelById: Record<ClassId, string> = {
    paladin: "Paladín",
    mago: "Mago",
    druida: "Druida",
    guerrero: "Guerrero",
    cazador: "Cazador",
    asesino: "Asesino",
  };
  const classLabel = classLabelById[classId];
  const raceLabel = formatRaceGenderLabel(raceId, genderId);
  return `${name} - ${affiliationLabel} - ${classLabel} ${raceLabel} Nivel ${level}`;
}

export function getDummyActiveDebuffsForInspect(dummy: DummyState, now: number): string[] {
  const debuffs: string[] = [];
  if (now < dummy.immobilizedUntilMs) {
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
