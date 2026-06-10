const fs = require('fs');

const mobsData = JSON.parse(fs.readFileSync('C:/Users/imaga/Desktop/AOWEB/src/data/mobs.json', 'utf8'));

const npcIdMap = {
  gallina: 594,
  conejo: 500,
  lobo: 133,
  serpiente: 504,
  arana: 510,
  oso: 538,
  golem_plata: 579,
  aparicion: 586,
  asesino: 531,
  basilisco: 573,
  bruja_drow: 550,
  demonio: 543,
  chaman_nieves: 603,
  ciclope: 584,
  aprendiz_mago: 531 // Missing from subagent, assigning generic humanoid
};

for (const mob of mobsData.mobs) {
  if (npcIdMap[mob.mobId]) {
    mob.npcId = npcIdMap[mob.mobId];
  }
}

// Add goblin and guardia
mobsData.mobs.push({
  mobId: "goblin",
  name: "Goblin",
  behavior: "aggressive",
  hitboxOffsetY: -32,
  hitboxHeightTiles: 1,
  hitboxWidthTiles: 1,
  sizeTiles: 1,
  modelId: "goblin", // will add to types
  npcId: 505,
  maxHp: 40,
  detectionRangeTiles: 5,
  leashRangeTiles: 12,
  attackDamage: 5,
  respawnMs: 6000,
  expReward: 25,
  drops: []
});

mobsData.mobs.push({
  mobId: "guardia",
  name: "Guardia Real",
  behavior: "peaceful", // Guards are peaceful until attacked or criminal
  hitboxOffsetY: -32,
  hitboxHeightTiles: 2,
  hitboxWidthTiles: 1,
  sizeTiles: 1,
  modelId: "guardia",
  npcId: 6,
  maxHp: 1000,
  detectionRangeTiles: 6,
  leashRangeTiles: 15,
  attackDamage: 50,
  respawnMs: 30000,
  expReward: 0,
  drops: []
});

// Add to mapSpawns
mobsData.mapSpawns.push({ mapId: "mapa2", mobId: "goblin", count: 10 });
// Guards in Ullathorpe (mapa1)
mobsData.mapSpawns.push({ mapId: "mapa1", mobId: "guardia", count: 8 });

fs.writeFileSync('C:/Users/imaga/Desktop/AOWEB/src/data/mobs.json', JSON.stringify(mobsData, null, 2));
console.log("Updated mobs.json");
