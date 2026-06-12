# Colisión y puertas en mapa1 (Ullathorpe)

## Dónde editar

| Qué | Archivo |
|-----|---------|
| Tiles **caminables** forzados (puertas) | `game-data/maps/mapa1.collision.json` → `allow` |
| Tiles **bloqueados** manualmente | `game-data/maps/mapa1.collision.json` → `deny` |
| Rectángulos bloqueados | `denyRects` |
| Interiores extra (techo / banco / templo) | `roofTriggerRects` |
| Lógica general (L3, heurísticas) | `shared/mapWalkability.ts` |
| Puertas abiertas/cerradas (runtime) | `shared/mapTileOverrides.ts` — no editar `mapa1.ts` |
| Posición de **carteles** de tienda | `src/maps/mapa1SignPlacements.ts` |

Tras cambiar `mapa1.collision.json`, reiniciá cliente y servidor.

## Formato de coordenadas

- Cada tile: `"tileX,tileY"` (ej. `"72,36"`).
- Rectángulos: `x0`, `y0`, `x1`, `y1` inclusive (esquina superior-izquierda y inferior-derecha).

## Cómo probar

```bash
npx vitest run tests/shared/mapWalkability.test.ts
```

El test `carga overrides desde mapa1.collision.json` verifica que cada entrada en `allow` sea caminable en runtime.

## Reglas automáticas (no hace falta listar cada tile)

1. **Puertas en `allow`** — siempre caminables (incluso con L3).
2. **L3** en el CSM — sólido salvo que esté en `allow`.
3. **roofTrigger** — interior caminable (pasto); tile 6 (bloqueado) solo si está en `allow` o es puerta detectada.
4. **`deny`** — bloquea aunque el CSM diga pasto caminable.

## Puertas (multijugador / cliente)

Al abrir o cerrar una puerta (obj tipo 6), el servidor y el cliente guardan un **override** de tile (`GRASS` abierta, `GRASS_BLOCKED` cerrada) en memoria. El `GameMap` importado **no se muta**; al cambiar de mapa se limpian los overrides del cliente.

## Carteles

Los carteles no bloquean el paso. Usan `graficos/{grh}.png` (ej. `21.png` = Alquimia). No usar el cartel genérico del CSM (`objIndex` 1).

## Próximo paso (opcional)

Generar `allow`/`deny` desde `scripts/convertMaps.cjs` al importar el `.csm`, para reducir edición manual.
