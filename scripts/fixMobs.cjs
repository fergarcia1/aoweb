const fs = require('fs');

let content = fs.readFileSync('game-data/mobVisualConfig.ts', 'utf8');

const leviatanStr = `  leviatan: {
    type: "directionSheets",
    textureKeyPrefix: "leviatan",
    frameWidth: 328,
    frameHeight: 200,
    columns: 5,
    paths: {
      down: "assets/ao/imperium/mobs/npc_bodies/leviatanS.png",
      up: "assets/ao/imperium/mobs/npc_bodies/leviatanW.png",
      left: "assets/ao/imperium/mobs/npc_bodies/leviatanA.png",
      right: "assets/ao/imperium/mobs/npc_bodies/leviatanD.png",
    },
    walkFrames: [0, 1, 2, 3, 4],
    scale: 1.5,
    notes: "Leviatán: 1640×200 por PNG, grilla 5×1.",
  },`;

const leviatanNew = `  leviatan: {
    type: "singleSheet",
    textureKeyPrefix: "leviatan",
    path: "assets/ao/imperium/mobs/npc_bodies/leviatan.png",
    frameWidth: 328,
    frameHeight: 200,
    columns: 5,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4],
    walkColumnCountByFacing: { left: 4, right: 4 },
    scale: 1.5,
    notes: "Leviatán: 1640x800 SWAD, grilla 5x4. S/W 5 frames, A/D 4.",
  },`;

content = content.replace(leviatanStr, leviatanNew);

const sirenaStr = `  sirena: {
    type: "singleSheet",
    textureKeyPrefix: "sirena",
    path: "assets/ao/imperium/mobs/npc_bodies/sirena.png",
    frameWidth: 110,
    frameHeight: 110,
    columns: 6,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4, 5],
    scale: mobScaleForFrameHeight(110, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 0.95,
    notes: "Sirena: 660x440 SWAD, grilla 6x4. Mob aquatico.",
  },`;

const sirenaNew = `  sirena: {
    type: "singleSheet",
    textureKeyPrefix: "sirena",
    path: "assets/ao/imperium/mobs/npc_bodies/sirena.png",
    frameWidth: 132,
    frameHeight: 110,
    columns: 5,
    directionRows: MOB_DIRECTION_ROWS_SWAD,
    idleColumn: 0,
    walkFrames: [0, 1, 2, 3, 4],
    walkColumnCountByFacing: { left: 4, right: 4 },
    scale: mobScaleForFrameHeight(110, MOB_LARGE_TARGET_DISPLAY_HEIGHT_PX) * 0.95,
    notes: "Sirena: 660x440 SWAD, grilla 5x4. S/W 5 frames, A/D 4.",
  },`;

content = content.replace(sirenaStr, sirenaNew);

fs.writeFileSync('game-data/mobVisualConfig.ts', content);
console.log('Fixed mobVisualConfig.ts');
