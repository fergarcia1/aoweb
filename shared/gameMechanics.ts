/**
 * Constantes y tiempos de las mecánicas clásicas de AO (Inspiración IAO 1.4.5)
 */

export const MECHANICS = {
  // Intervalos de acciones principales (ms)
  INTERVAL_MELEE_ATTACK: 1200,
  INTERVAL_SPELL_CAST: 200,
  
  // Intervalos cruzados (inlan)
  INTERVAL_MELEE_TO_SPELL: 600,
  INTERVAL_SPELL_TO_MELEE: 1400,
  
  // Intervalo de uso de objetos (Pociones U-U-U)
  INTERVAL_POTION_USE: 250,

  // Intervalo de movimiento (paso a paso)
  // 214ms es aprox 18 FPS clásico de VB6 (1000 / 18 * 4 frames por tile = ~222ms, pero 214ms da un poco más de fluidez).
  INTERVAL_MOVE_STEP: 214,

  // Meditacion: el servidor recupera mana una vez por segundo.
  INTERVAL_MEDITATION_REGEN: 1000,
  MEDITATION_MP_REGEN_PERCENT_PER_TICK: 0.08,
};
