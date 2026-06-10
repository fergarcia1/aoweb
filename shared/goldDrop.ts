import { GOLD_WORLD_STACK_MAX } from "../game-data/constants";

/** Divide un monto en pilas de hasta 10.000 para dropear en el mundo. */
export function splitGoldIntoWorldStacks(amount: number): number[] {
  const stacks: number[] = [];
  let remaining = Math.max(0, Math.floor(amount));
  while (remaining > 0) {
    const stackSize = Math.min(remaining, GOLD_WORLD_STACK_MAX);
    stacks.push(stackSize);
    remaining -= stackSize;
  }
  return stacks;
}
