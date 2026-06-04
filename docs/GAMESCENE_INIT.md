# GameScene — orden de inicialización

`GameScene.create()` concentra mucho estado. Si un subsistema se usa antes de crearse, aparecen errores como `Cannot read properties of undefined (reading 'createItem')` o desync en multijugador.

**Regla:** nada debe llamar a `createWorldItem`, `initMpController`, drops de muerte ni `syncLocalGoldFromServer` hasta que existan `mapController.setupCameras()`, `worldItemManager` e `inventoryController`.

## Orden obligatorio (resumen)

| Fase | Qué | Depende de |
|------|-----|------------|
| A | Sistemas sin mundo (`initShopBankSystem`, `initCombatController`, `initDeathSystem`, …) | — |
| B | Texturas / animaciones globales | — |
| C | `ProgressService` + `applyCharacterProgress` (si hay save) | `characterId` en `init()` |
| D | `initMapController` → `drawMap` → `createPlayer` → `initMobController` | mapa cargado |
| E | `GameUi` + chat + mobs visuales | player, mapa |
| F | Inventario inicial / HUD según save | `gameUi` |
| G | **`initConsumableController()`** | `gameUi` (antes de `refreshSkillsUi`) |
| H | **`mapController.setupCameras()`** | mapa, player |
| I | **`initWorldItemManager()`** | `uiCamera` (fase H) |
| J | **`initLocalPlayerSync()`** + **`initMpController()`** | world items (I) |
| K | **`initInventoryController()`** | MP (J) |
| L | `spawnAllItemsNearSpawn` (solo personaje nuevo) | world items (I) |
| M | `deathOverlay`, banco, tienda, input, NPCs | todo lo anterior |

## Al cambiar de personaje (Jugar / resume)

1. `handleScenePause` → `cancelScheduledPersist()` + guardar personaje **actual**.
2. Elegir otro personaje → `handleSceneResume`.
3. `cancelScheduledPersist()` otra vez.
4. `applyActiveCharacter` + `load(character.id)` del **nuevo** id.
5. `applyWorldStateFromProgress` + `syncDeathUiFromState`.
6. Reconectar MP (`disconnect` + `connect`) para nuevo join payload.

No confiar en timers de autosave pendientes del personaje anterior (ver `ProgressService` + tests).

## Multijugador (join)

El cliente debe enviar en el join: `gold`, `hp`, `mp`, `equipment`, `inventory`. El servidor aplica overrides en `applyJoinClientOverrides` (ver `shared/joinSession.ts` y tests).

## Módulos (`src/scenes/gameSceneModules/`)

| Módulo | Responsabilidad |
|--------|-----------------|
| `GameSceneMapController` | Mapa, cámara, minimapa, oclusión de escenario |
| `GameSceneEntitySync` | Profundidad, cara, equipo y mobs en frame |
| `GameSceneLocalPlayerVisuals` | Alpha de invisibilidad local |
| `GameSceneFrameInput` | Teclado por frame (movimiento, macros, mapa M) |
| `mapSceneryOcclusion` | Lógica pura de oclusión árboles/edificios |
| `gameScenePreload` | `preload()` — assets de mapa, items, FX |
| `gameSceneHud` | `refreshHud`, minimapa, ubicación en mapa |
| `gameSceneCreatePlayer` | Sprites del jugador local al entrar al mundo |
| `GameSceneMobController` | Mobs / dummies locales y red |
| `GameSceneMultiplayerController` | Conexión, movimiento, join |
| `GameSceneLocalPlayerSync` | Vitales, oro, inventario e ítems del suelo (servidor → local) |
| `GameSceneConsumableController` | Usar pociones, scrolls, ack de `use_item` |
| `GameSceneInventoryController` | Equipar, dropear, pickup |
| `GameSceneCombatController` | Ataque, hechizos, daño |
| `GameSceneChatCommands` | Comandos de chat |
| `WorldItemManager` | Ítems en el suelo |
| `characterProgressApply` | Aplicar snapshot de save (puro) |

## Tests relacionados

```bash
npm test
```

- `tests/shared/joinSession.test.ts` — oro en join
- `tests/shared/characterDeathState.test.ts` — muerte por personaje
- `tests/game/characterProgressIsolation.test.ts` — saves separados por id
- `tests/game/progressPersistGuard.test.ts` — debounce al cambiar personaje
- `tests/scenes/multiplayerJoinPayload.test.ts` — payload de join incluye gold

## Checklist manual rápido (antes de release / tras tocar `create()`)

- [ ] Personaje nuevo: spawnea items en el suelo sin crash
- [ ] Morir → overlay fantasma → revivir en sacerdote
- [ ] Morir con A → Jugar → entrar con B → B vivo (overlay oculto)
- [ ] MP: oro no pasa a 0 al reconectar
- [ ] MP: morir no deja al otro personaje muerto al cambiar slot
- [ ] Refresh completo (F5) tras cambios grandes (evitar estado raro de HMR)
