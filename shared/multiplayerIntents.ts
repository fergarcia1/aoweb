import { STEP_DURATION_MS } from "../game-data/constants";
import type { MoveDirectionId } from "./types";

export type MoveIntentResult =
  | { ok: true }
  | { ok: false; reason: "cooldown" | "invalid_direction" };

export type AttackIntentResult = { ok: true } | { ok: false; reason: "cooldown" };

const MOVE_DIRECTIONS: ReadonlySet<string> = new Set(["up", "down", "left", "right"]);

export function validateMoveDirection(direction: unknown): direction is MoveDirectionId {
  return typeof direction === "string" && MOVE_DIRECTIONS.has(direction);
}

/** El servidor solo acepta un paso cada STEP_DURATION_MS (anti-speedhack). */
export function validateMoveIntent(now: number, nextMoveAt: number): MoveIntentResult {
  if (now < nextMoveAt) {
    return { ok: false, reason: "cooldown" };
  }
  return { ok: true };
}

export function moveCooldownUntil(now: number): number {
  return now + STEP_DURATION_MS;
}

export function validateAttackIntent(now: number, nextAttackAt: number): AttackIntentResult {
  if (now < nextAttackAt) {
    return { ok: false, reason: "cooldown" };
  }
  return { ok: true };
}

