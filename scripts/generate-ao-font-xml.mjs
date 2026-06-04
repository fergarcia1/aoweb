/**
 * Convierte fontN.dat (formato Imperium/AO, mDx8_Text.bas) a BMFont XML para Phaser.
 * Uso: node scripts/generate-ao-font-xml.mjs [ruta-a-font2.dat]
 */
import fs from "node:fs";
import path from "node:path";

const defaultDat = path.resolve("public/assets/ao/fonts/font2.dat");

function parseAoFontDat(buffer) {
  let o = 0;
  const readI32 = () => {
    const v = buffer.readInt32LE(o);
    o += 4;
    return v;
  };
  const readU8 = () => buffer.readUInt8(o++);

  const bitmapWidth = readI32();
  const bitmapHeight = readI32();
  const cellWidth = readI32();
  const cellHeight = readI32();
  const baseCharOffset = readU8();
  const charWidth = [];
  for (let i = 0; i < 256; i++) {
    charWidth.push(readU8());
  }

  const rowPitch = Math.floor(bitmapWidth / cellWidth);
  const charHeight = cellHeight - 4;

  return {
    bitmapWidth,
    bitmapHeight,
    cellWidth,
    cellHeight,
    baseCharOffset,
    charWidth,
    rowPitch,
    charHeight,
  };
}

function charFrame(font, code) {
  const index = code - font.baseCharOffset;
  if (index < 0) {
    return null;
  }
  const row = Math.floor(index / font.rowPitch);
  const col = index - row * font.rowPitch;
  return {
    x: col * font.cellWidth,
    y: row * font.cellHeight,
    width: font.cellWidth,
    height: font.cellHeight,
    xadvance: font.charWidth[code] ?? font.cellWidth,
  };
}

function buildBmFontXml(font, pngFileName) {
  const chars = [];
  for (let code = 0; code < 256; code++) {
    const frame = charFrame(font, code);
    if (!frame || frame.xadvance <= 0) {
      continue;
    }
    chars.push(
      `<char id="${code}" x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" xoffset="0" yoffset="0" xadvance="${frame.xadvance}" page="0" chnl="15"/>`
    );
  }

  return `<?xml version="1.0"?>
<font>
  <info face="ao-font2" size="${font.charHeight}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="0" padding="0,0,0,0" spacing="0,0" outline="0"/>
  <common lineHeight="${font.charHeight}" base="${Math.max(0, font.charHeight - 6)}" scaleW="${font.bitmapWidth}" scaleH="${font.bitmapHeight}" pages="1" packed="0" alphaChnl="0" redChnl="4" greenChnl="4" blueChnl="4"/>
  <pages>
    <page id="0" file="${pngFileName}"/>
  </pages>
  <chars count="${chars.length}">
${chars.join("\n")}
  </chars>
  <kernings count="0"/>
</font>
`;
}

const datPath = path.resolve(process.argv[2] ?? defaultDat);
const outDir = path.dirname(datPath);
const buffer = fs.readFileSync(datPath);
const font = parseAoFontDat(buffer);
const pngName = path.basename(datPath, ".dat") + ".png";
const xml = buildBmFontXml(font, pngName);
const outPath = path.join(outDir, path.basename(datPath, ".dat") + ".xml");
fs.writeFileSync(outPath, xml, "utf8");
console.log(`Wrote ${outPath} (${font.bitmapWidth}x${font.bitmapHeight}, cell ${font.cellWidth}x${font.cellHeight}, ${charsCount(font)} glyphs)`);

console.log("Tip: el fondo negro se quita al cargar el juego (applyAoFont2TransparentBackground).");

function charsCount(font) {
  let n = 0;
  for (let code = 0; code < 256; code++) {
    const frame = charFrame(font, code);
    if (frame && frame.xadvance > 0) n++;
  }
  return n;
}
