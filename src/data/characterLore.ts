import type { CharacterClassId } from "./items";
import type { CharacterFactionId, CharacterRaceId } from "./characters";

export const CLASS_DESCRIPTIONS: Record<CharacterClassId, string> = {
  paladin:
    "Soldados de fe inquebrantable. Dominan el combate cuerpo a cuerpo y cuentan con magia limitada, pero su vitalidad y habilidad con la espada los convierten en aliados confiables.",
  mago:
    "Maestros de las artes arcanas. Su poder destructivo es formidable, aunque su cuerpo frágil exige mantener la distancia en combate.",
  druida:
    "Guardianes de la naturaleza que equilibran sanación, control y daño mágico. Versátiles en grupo y en aventuras solitarias.",
  guerrero:
    "Combatientes frontales con gran resistencia y golpes contundentes. Ideales para resistir el daño y proteger al equipo.",
  cazador:
    "Especialistas en combate a distancia y trampas. Alta agilidad y precisión con arcos y proyectiles.",
  asesino:
    "Sigilosos y letales. Combinan agilidad extrema con habilidades oscuras para eliminar objetivos rápidamente.",
};

export const RACE_DESCRIPTIONS: Record<CharacterRaceId, string> = {
  human:
    "Los humanos son versátiles y equilibrados. Se adaptan a cualquier rol y progresan con facilidad en combate y magia.",
  elf:
    "Ágiles y dotados para la magia. Los elfos destacan en arquería y hechizos, con constitución más frágil.",
  drow:
    "Guerreros oscuros de gran fuerza. Menos resistentes, pero letales en combate cercano.",
  dwarf:
    "Robustos y resistentes. Excelentes tanques con gran fuerza física.",
  gnome:
    "Pequeños pero brillantes. Su inteligencia y agilidad los hacen magos y ladrones naturales.",
  orc:
    "Fuerza bruta y ferocidad. Los orcos dominan el combate marcial a costa de menor astucia mágica.",
  fantasma:
    "Forma espiritual tras la muerte. No se elige al crear personaje.",
};

export const FACTION_DESCRIPTIONS: Record<CharacterFactionId, string> = {
  ciudadano:
    "Los Ciudadanos defienden el orden del reino. No pueden atacar a otros ciudadanos, pero sí enfrentar a los seguidores del Caos.",
  caos:
    "Los seguidores del Caos pueden atacar a ciudadanos y a otros caóticos. Viven fuera de la ley del reino.",
};
