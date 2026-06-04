# Catálogo Imperium (NPCs.dat)

Datos unificados de **todas** las entradas `[NPCn]` de Imperium Clásico, clasificadas para AOWEB sin mezclar runtime:

| `kind` | Uso en AOWEB |
|--------|----------------|
| `service` | Banquero, sacerdote, tienda, entrenador, guardia, etc. (`NpcManager` + roles) |
| `creature` | Criaturas / combate (`MobSystem`, spawns, EXP, loot) |
| `ambient` | NPCs con cuerpo pero sin tienda ni combate (aldeanos, decoración) |

## Regenerar

```bash
# Catálogo (NPCs.dat → kind / roles)
npm run import:npc-catalog

# Gráficos de cuerpo (Personajes.ind + Graficos.ind + BMP → PNG + manifest)
npm run import:npc-visuals

# Cabezas aleatorias estables por npcId (raza/género/cara)
npm run import:npc-heads

# Pipeline completo
npm run import:npc-all
```

Requiere `tools/imperium-clasico-ref/` con `Server/Dat/NPCs.dat`, `Cliente/Recursos/Scripts.IAC` y `Cliente/Recursos/Graficos/*.bmp`.

### Archivos generados

| Archivo | Contenido |
|---------|-----------|
| `npcCatalog.json` | Plantillas + campo `visual` por entrada |
| `npcBodyVisuals.json` | Spritesheet por `bodyId` (141 únicos) |
| `public/assets/ao/imperium/npc_bodies/body_{id}.png` | Hoja S/W/A/D importada desde BMP (solo NPCs de servicio; usar Jimp, no bmp-js) |

**No confundir** con `public/assets/ao/imperium/mobs/npc_bodies/` (PNG modelados a mano: `lobo.png`, `goblin.png`, …).  
Las **criaturas de combate** deben usar solo `mobs/npc_bodies` vía `MOB_VISUAL_CONFIGS`; el catálogo `body_*.png` queda para banqueros, sacerdotes y NPCs de servicio. Si los PNG de `npc_bodies` se ven azulados, regenerá con `npm run import:npc-visuals` (el import antiguo con bmp-js rompía la paleta).

### Runtime (sin spawns aún)

```ts
import { getImperiumNpcBodySpriteConfig } from "../game/npcs/imperiumNpcVisual";
const sprite = getImperiumNpcBodySpriteConfig(bodyId); // null si falta BMP

import { getImperiumNpcSpriteConfigFromCatalog } from "./npcs/imperiumNpcCatalog";
const full = getImperiumNpcSpriteConfigFromCatalog(catalogEntry); // body + face
```

## Consumir en código

```ts
import {
  getImperiumNpcCatalogEntry,
  listImperiumCreatureTemplates,
  listImperiumServiceTemplates,
} from "../../game-data/imperium/npcCatalog";
```

Los NPCs estáticos de `src/npcs/npcDefinitions.ts` siguen siendo manuales; el catálogo es la fuente para importar spawns y sprites después.
