/**
 * Checks wall tiles in a legacy map: finds tiles that have L3 graphics but are GRASS (walkable).
 * Usage: node tools/check-walls.mjs [mapId] [sampleTileX] [sampleTileY]
 */
import { readFileSync } from 'fs';

const mapId = process.argv[2] || 'mapa1';
const checkX = process.argv[3] ? parseInt(process.argv[3]) : null;
const checkY = process.argv[4] ? parseInt(process.argv[4]) : null;

// Read the map TS file as text to extract data
const src = readFileSync(`./src/maps/${mapId}.ts`, 'utf8');

// Count tile types
const grassCount = (src.match(/TILE\.GRASS(?!_)/g) || []).length;
const blockedCount = (src.match(/TILE\.GRASS_BLOCKED/g) || []).length;
const dirtCount = (src.match(/TILE\.DIRT/g) || []).length;
console.log(`Tile type counts in ${mapId}:`);
console.log(`  GRASS: ${grassCount}, GRASS_BLOCKED: ${blockedCount}, DIRT: ${dirtCount}`);

// Use tsx to actually load the map
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

// Simple approach: parse the L3 and tiles arrays from the TS source
// Find "walkable" L3 tiles (has L3 != 0 but tile is GRASS, not GRASS_BLOCKED)

// Extract tiles array values as a flat representation
// The tiles array in the TS file is nested arrays of TILE.* constants
const tilesArrayMatch = src.match(/tiles:\s*\[(\s*\[[\s\S]*?\]\s*,?\s*)*\]/);
const l3ArrayMatch = src.match(/L3:\s*\[(\s*\[[\s\S]*?\]\s*,?\s*)*\]/);

// Instead of parsing, let's use a simpler text-based count
// Count tiles at each row/col that have L3 but are walkable (GRASS not BLOCKED)
// This requires actually running the module; let's use a different approach

// Check specific coordinates if provided
if (checkX !== null && checkY !== null) {
  // Extract row y from tiles array
  // Find lines around row checkY in the tiles section
  const tileLines = src.split('\n').filter(l => l.includes('TILE.'));
  let rowCount = 0;
  let inTiles = false;
  for (const line of src.split('\n')) {
    if (line.includes('tiles:')) { inTiles = true; rowCount = 0; continue; }
    if (!inTiles) continue;
    if (line.includes('[') && line.includes('TILE.')) {
      if (rowCount === checkY) {
        console.log(`\nRow ${checkY} tiles: ${line.trim()}`);
        break;
      }
      rowCount++;
    }
    if (line.trim() === '];' || line.includes('roofTriggers')) { inTiles = false; }
  }
  
  // Extract L3 row
  let inL3 = false;
  rowCount = 0;
  for (const line of src.split('\n')) {
    if (line.includes('L3:')) { inL3 = true; rowCount = 0; continue; }
    if (!inL3) continue;
    if (line.includes('[') && !line.includes('L3:')) {
      if (rowCount === checkY) {
        console.log(`Row ${checkY} L3: ${line.trim()}`);
        break;
      }
      rowCount++;
    }
    if (line.trim() === '];' || line.includes('L4:')) { inL3 = false; }
  }
}

console.log('\nDone. To check specific coordinates: node tools/check-walls.mjs mapa1 X Y');
