import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ARMORS, WEAPONS, SHIELDS, HELMETS, CONSUMABLES, MISC_ITEMS } from "../game-data/items/catalog";
import { SHOP_CATALOGS } from "../game-data/shopCatalogs";
import { ITEM_DEFINITIONS } from "../game-data/items/definitions";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

const issues: string[] = [];
const missingAssets = new Set<string>();

const allItems = [...WEAPONS, ...SHIELDS, ...HELMETS, ...ARMORS, ...CONSUMABLES, ...MISC_ITEMS];

for (const item of allItems) {
  if (!item) continue;
  if (!item.iconAssetPath) {
    issues.push(`Item ${item.itemId} is missing iconAssetPath`);
  } else {
    const iconPath = path.join(publicDir, item.iconAssetPath);
    if (!fs.existsSync(iconPath)) {
      missingAssets.add(item.iconAssetPath);
      issues.push(`Item ${item.itemId} has broken iconAssetPath: ${item.iconAssetPath}`);
    }
  }

  if (!item.nombre) issues.push(`Item ${item.itemId} is missing nombre`);
  if (item.valor === undefined) issues.push(`Item ${item.itemId} is missing valor (price)`);
  
  if (!ITEM_DEFINITIONS[item.itemId as any]) {
    issues.push(`Item ${item.itemId} is missing in ITEM_DEFINITIONS (probably forgot to add to definitions.ts)`);
  }

  if ("spritesheetStdPath" in item && item.spritesheetStdPath) {
    if (!fs.existsSync(path.join(publicDir, item.spritesheetStdPath))) {
      missingAssets.add(item.spritesheetStdPath);
      issues.push(`Armor ${item.itemId} missing spritesheetStdPath: ${item.spritesheetStdPath}`);
    }
  }
  if ("spritesheetBajosPath" in item && item.spritesheetBajosPath) {
    if (!fs.existsSync(path.join(publicDir, item.spritesheetBajosPath))) {
      missingAssets.add(item.spritesheetBajosPath);
      issues.push(`Armor ${item.itemId} missing spritesheetBajosPath: ${item.spritesheetBajosPath}`);
    }
  }
}

const vendableItems = allItems.filter(i => i.valor && i.valor > 0);
const allShopItems = new Set<string>();
for (const cat of Object.values(SHOP_CATALOGS)) {
  if (Array.isArray(cat)) {
    for (const shopItem of cat) {
      allShopItems.add(shopItem);
    }
  }
}

const unassignedItems = vendableItems.filter(i => !allShopItems.has(i.itemId));
for (const un of unassignedItems) {
  issues.push(`Unassigned to any vendor: ${un.itemId} (${un.nombre})`);
}

const femaleArmors = ARMORS.filter(a => a.itemId.includes("fem") || a.nombre.toLowerCase().includes("fem"));
for (const fa of femaleArmors) {
  issues.push(`Female visual check required: ${fa.itemId} - ${fa.nombre}. outfitOverride: ${fa.outfitOverride}`);
}
const cuirassAndLeather = ARMORS.filter(a => a.itemId.includes("coraza") || a.itemId.includes("cuero"));
for (const a of cuirassAndLeather) {
  issues.push(`Armor visual check required: ${a.itemId} - ${a.nombre}. outfitOverride: ${a.outfitOverride}`);
}

console.log(JSON.stringify({ issues, missingAssets: Array.from(missingAssets) }, null, 2));
