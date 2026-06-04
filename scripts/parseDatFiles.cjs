const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'C:\\Users\\imaga\\Desktop\\imperiumclassic\\Imperium-Clasico\\Server\\Dat';
const DEST_DIR = 'C:\\Users\\imaga\\Desktop\\AOWEB\\game-data\\imported';

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

function parseIni(content) {
  const lines = content.split(/\r?\n/);
  const data = {};
  let currentSection = null;

  for (let line of lines) {
    line = line.replace(/\0/g, '').trim();
    if (!line || line.startsWith("'")) continue;
    
    // Obfuscation in obj.dat often consists of just ? characters, but now that we use UTF-16LE, 
    // maybe there's real Arabic or Chinese characters that we should ignore.
    // If a line doesn't start with [ and has no =, it's garbage.
    
    if (line.startsWith('[')) {
      const match = line.match(/\[(.*?)\]/);
      if (match) {
        currentSection = match[1].toUpperCase();
        data[currentSection] = {};
      }
    } else if (currentSection && line.includes('=')) {
      const parts = line.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (/^[A-Za-z0-9_]+$/.test(key)) {
        data[currentSection][key] = val;
      }
    }
  }
  return data;
}

// 1. Parse Hechizos (Windows-1252/latin1)
function parseHechizos() {
  const buf = fs.readFileSync(path.join(SOURCE_DIR, 'Hechizos.dat'));
  const content = buf.toString('latin1');
  const data = parseIni(content);
  
  const spells = [];
  const init = data['INIT'];
  const count = init && init['NumeroHechizos'] ? parseInt(init['NumeroHechizos'], 10) : 0;
  
  for (let i = 1; i <= count; i++) {
    const sec = data[`HECHIZO${i}`];
    if (!sec) continue;
    spells.push({
      id: i,
      nombre: sec.Nombre || `Hechizo ${i}`,
      desc: sec.Desc || "",
      palabrasMagicas: sec.PalabrasMagicas || "",
      manaRequerido: parseInt(sec.ManaRequerido || "0", 10),
      staRequerido: parseInt(sec.StaRequerido || "0", 10),
      minSkill: parseInt(sec.MinSkill || "0", 10),
      tipo: parseInt(sec.Tipo || "1", 10),
      target: parseInt(sec.Target || "1", 10),
      minHP: parseInt(sec.MinHP || "0", 10),
      maxHP: parseInt(sec.MaxHP || "0", 10),
      wav: parseInt(sec.WAV || "0", 10),
      fx: parseInt(sec.Particle || sec.FXgrh || "0", 10),
    });
  }

  const tsCode = `export const IMPORTED_SPELLS = ${JSON.stringify(spells, null, 2)};\n`;
  fs.writeFileSync(path.join(DEST_DIR, 'spells_imported.ts'), tsCode);
  console.log(`Exported ${spells.length} spells.`);
}

// 2. Parse NPCs (UTF-16LE?)
function parseNpcs() {
  const buf = fs.readFileSync(path.join(SOURCE_DIR, 'NPCs.dat'));
  // Let's check if it's UTF-16LE or latin1. If the second byte is 0, it's likely UTF-16LE.
  const content = (buf[1] === 0) ? buf.toString('utf16le') : buf.toString('latin1');
  const data = parseIni(content);
  
  const npcs = [];
  let maxNpc = 0;
  for (const k of Object.keys(data)) {
    if (k.startsWith('NPC')) {
      const num = parseInt(k.replace('NPC', ''), 10);
      if (num > maxNpc) maxNpc = num;
    }
  }

  for (let i = 1; i <= maxNpc; i++) {
    const sec = data[`NPC${i}`];
    if (!sec || !sec.Name) continue;
    npcs.push({
      id: i,
      name: sec.Name,
      npcType: parseInt(sec.NpcType || "0", 10),
      heading: parseInt(sec.Heading || "3", 10),
      body: parseInt(sec.Body || "0", 10),
      head: parseInt(sec.Head || "0", 10),
      movement: parseInt(sec.Movement || "0", 10),
      agresivo: sec.Hostile === "1",
      hp: parseInt(sec.MaxHP || "0", 10),
      minHit: parseInt(sec.MinHIT || "0", 10),
      maxHit: parseInt(sec.MaxHIT || "0", 10),
      def: parseInt(sec.DEF || "0", 10),
      exp: parseInt(sec.GiveEXP || "0", 10),
      gold: parseInt(sec.GiveGLD || "0", 10)
    });
  }

  const tsCode = `export const IMPORTED_NPCS = ${JSON.stringify(npcs, null, 2)};\n`;
  fs.writeFileSync(path.join(DEST_DIR, 'npcs_imported.ts'), tsCode);
  console.log(`Exported ${npcs.length} NPCs.`);
}

// 3. Parse Objs (UTF-16LE!)
function parseObjs() {
  const buf = fs.readFileSync(path.join(SOURCE_DIR, 'obj.dat'));
  const content = buf.toString('utf16le');
  const data = parseIni(content);
  
  const objs = [];
  let maxObj = 0;
  for (const k of Object.keys(data)) {
    if (k.startsWith('OBJ')) {
      const num = parseInt(k.replace('OBJ', ''), 10);
      if (num > maxObj) maxObj = num;
    }
  }

  for (let i = 1; i <= maxObj; i++) {
    const sec = data[`OBJ${i}`];
    if (!sec || !sec.Name) continue;
    objs.push({
      id: i,
      name: sec.Name,
      objType: parseInt(sec.ObjType || "0", 10),
      grhIndex: parseInt(sec.GrhIndex || "0", 10),
      valor: parseInt(sec.Valor || "0", 10),
      crucial: parseInt(sec.Crucial || "0", 10),
      minHit: parseInt(sec.MinHIT || "0", 10),
      maxHit: parseInt(sec.MaxHIT || "0", 10),
      minDef: parseInt(sec.MINDEF || "0", 10),
      maxDef: parseInt(sec.MAXDEF || "0", 10),
      minHam: parseInt(sec.MinHam || "0", 10),
      minSed: parseInt(sec.MinSed || "0", 10),
      minHp: parseInt(sec.MinHP || "0", 10),
      minMana: parseInt(sec.MinMAN || "0", 10),
      razaEnana: parseInt(sec.RazaEnana || "0", 10),
      indexAbierta: parseInt(sec.IndexAbierta || "0", 10),
      indexCerrada: parseInt(sec.IndexCerrada || "0", 10),
      llave: parseInt(sec.Clave || sec.Llave || "0", 10)
    });
  }

  const tsCode = `export const IMPORTED_OBJS = ${JSON.stringify(objs, null, 2)};\n`;
  fs.writeFileSync(path.join(DEST_DIR, 'objs_imported.ts'), tsCode);
  console.log(`Exported ${objs.length} OBJs.`);
}

parseHechizos();
parseNpcs();
parseObjs();
