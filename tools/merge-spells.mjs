import fs from 'fs';
import path from 'path';

// Parse the imported spells
const importedPath = path.resolve('game-data/imported/spells_imported.ts');
let importedText = fs.readFileSync(importedPath, 'utf8');
importedText = importedText.replace('export const IMPORTED_SPELLS =', '');
// Evaluate the array safely
importedText = importedText.trim().replace(/;$/, '');
const IMPORTED_SPELLS = eval(importedText);

// Parse the existing spells.ts
const spellsPath = path.resolve('src/data/spells.ts');
let spellsContent = fs.readFileSync(spellsPath, 'utf8');

// Find the maximum ID currently in SPELL_DEFINITIONS
let maxId = 0;
const idMatches = [...spellsContent.matchAll(/idSpell:\s*(\d+)/g)];
for (const match of idMatches) {
  const id = parseInt(match[1], 10);
  if (id > maxId) maxId = id;
}

// Generate new spells code
let newSpellsCode = '';
for (const spell of IMPORTED_SPELLS) {
  if (spell.id <= maxId) continue; // Skip existing spells

  const isHeal = spell.tipo === 2;
  const isAoe = spell.target === 4;

  const mapped = `  {
    idSpell: ${spell.id},
    nombre: ${JSON.stringify(spell.nombre)},
    descripcion: ${JSON.stringify(spell.desc)},
    valor: 0,
    nivelMagiaRequerido: ${spell.minSkill},
    manaCost: ${spell.manaRequerido},
    danioMin: ${isHeal ? 0 : spell.minHP},
    danioMax: ${isHeal ? 0 : spell.maxHP},
    healMin: ${isHeal ? spell.minHP : 0},
    healMax: ${isHeal ? spell.maxHP : 0},
    puedeUsarseEnAliados: ${isHeal || spell.target === 1},
    remueveDebuff: null,
    usableBy: ["mago", "druida", "paladin", "asesino", "clerigo", "bardo"],
    iconAssetPath: "/assets/ao/spells/spell_default.png",
    isStarter: false,
    aoe: ${isAoe},
    aoeRadiusTiles: ${isAoe ? 2 : 0},
  },
`;
  newSpellsCode += mapped;
}

// Insert before the last `];`
const closingBracketIndex = spellsContent.lastIndexOf('];');
if (closingBracketIndex !== -1) {
  const finalContent = 
    spellsContent.substring(0, closingBracketIndex) + 
    newSpellsCode + 
    spellsContent.substring(closingBracketIndex);
  
  fs.writeFileSync(spellsPath, finalContent);
  console.log(`Merged ${IMPORTED_SPELLS.length - maxId} new spells.`);
} else {
  console.error('Could not find the end of SPELL_DEFINITIONS array.');
}
