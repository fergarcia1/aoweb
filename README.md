# AOWEB

Prototipo de MMORPG estilo **Argentum Online** en el navegador: mapas en tiles, personajes con razas/clases/facciones, combate, inventario, NPCs, muerte con fantasma y **multijugador** con servidor autoritativo (WebSocket).

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- **PostgreSQL** (opcional): sin `DATABASE_URL` el servidor guarda personajes en memoria
- Assets gráficos de AO en `public/assets/ao/` (ver [tools/ao-export/README.md](tools/ao-export/README.md))

## Inicio rápido

```bash
npm install
cd server && npm install && cd ..
```

### Solo cliente (modo local)

```bash
npm run dev
```

Abre `http://localhost:5173`. El progreso se guarda en `localStorage`.

### Cliente + servidor (multijugador)

```bash
npm run dev:all
```

- Cliente: `http://localhost:5173`
- Servidor WebSocket: `http://0.0.0.0:3001`

Reiniciar solo el servidor:

```bash
npm run server:restart
```

## Variables de entorno

### Cliente (`.env` en la raíz del repo)

| Variable | Descripción |
|----------|-------------|
| `VITE_MULTIPLAYER` | `0` o `false` desactiva multijugador (solo local) |
| `VITE_WS_URL` | URL del WebSocket (por defecto `ws://localhost:3001`) |
| `VITE_AUTH_REQUIRED` | `true` oculta el acceso dev sin cuenta y fuerza login/registro |
| `VITE_UI_SKIN` | Skin inicial: `red`, `dark` o `clear` |

### Servidor (`server/.env`)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL. Si no está, persistencia en memoria |
| `PORT` | Puerto HTTP/WebSocket del servidor. Por defecto `3001` |
| `AUTH_REQUIRED` | `true` obliga token valido para entrar por WebSocket |
| `AUTH_TOKEN_SECRET` | Secreto para firmar tokens de login. En hosting debe ser unico y privado |
| `CORS_ORIGIN` | Origen permitido para rutas `/auth/*`. Por defecto `*` |
| `RATE_LIMIT_MAX_CONNECTIONS_PER_IP` | Maximo de conexiones WebSocket simultaneas por IP. Por defecto `3` |
| `RATE_LIMIT_MAX_ACTIONS_PER_SECOND` | Maximo de mensajes por segundo por socket. Por defecto `20` |
| `RATE_LIMIT_TEMP_BAN_MS` | Duracion del ban temporal por spam. Por defecto `300000` |

Health-check del servidor:

```bash
curl http://localhost:3001/health
```

Responde estado, uptime, persistencia activa, clientes WebSocket y estadisticas basicas del mundo.

Migrar esquema (con PostgreSQL):

```bash
cd server
npm run db:migrate
```

## Flujo de juego

1. **Menú** → selección de personaje (hasta 6 slots) o creación
2. **Creación**: raza, género, clase, facción (**Ciudadano** o **Caos**), cara
3. **Mundo**: movimiento tile a tile (WASD / flechas), combate cuerpo a cuerpo y hechizos, inventario, tienda, banco, NPCs sacerdote
4. **Muerte**: pierdes equipamiento/inventario dropeable, modo fantasma, revive en sacerdote (`/hogar`, click en NPC) o quedarte como fantasma
5. **Multijugador**: otros jugadores visibles por AOI; el servidor manda daño, loot en el suelo, inventario y oro

### Facciones y PvP

| Facción | Color del nombre | Puede atacar |
|---------|------------------|--------------|
| **Ciudadano** | Azul | Caos (no a otros ciudadanos) |
| **Caos** | Rojo | Ciudadanos y otros Caos |

En el mapa **Caja de arena** (`pueblo`) el servidor trata el combate entre jugadores según las reglas de facción. Otras zonas seguras se configuran en `game-data/constants.ts` (`SAFE_ZONE_MAP_IDS`).

### Multijugador (reglas actuales)

- Un mismo **personaje** (`characterId`) no puede estar conectado en dos sesiones: la segunda vuelve a selección de personaje
- Varios personajes distintos pueden estar online a la vez (útil para testing)
- Loot al morir lo genera el **servidor**; agarrar/tirar ítems en el suelo solo en mapas multijugador habilitados (hoy: `pueblo`)
- Snapshot completo solo al hacer join; después el estado llega por eventos (`player_moved`, `mob_updated`, `world_item_*`, etc.)

## Mapas

| ID | Nombre | Notas |
|----|--------|--------|
| `pueblo` | Caja de arena | Mapa inicial / sandbox multijugador |
| `bosque` | Bosque | |
| `desierto` | Desierto | |
| `montana` | Montaña | |

Definidos en `src/maps/`. Traslados entre mapas por bordes del mundo.

## Estructura del proyecto

```
AOWEB/
├── src/                    # Cliente Phaser + Vite
│   ├── scenes/             # Menú, selección, creación, GameScene
│   ├── scenes/gameSceneModules/  # MP, combate, inventario, mobs, etc.
│   ├── network/            # WebSocket, jugadores remotos
│   ├── maps/               # Definición de mapas
│   ├── data/               # Personajes, hechizos, mobs (JSON/TS)
│   └── game/               # Progreso, banco, stats
├── server/                 # Servidor Node (ws + simulación)
│   ├── src/WorldInstance.ts
│   ├── db/schema.sql
│   └── scripts/migrate.ts
├── shared/                 # Protocolo WS, tipos de red, facciones, AOI
├── game-data/              # Constantes e ítems compartidos cliente/servidor
├── game-data/items/        # Catálogo de ítems
├── public/assets/ao/       # Sprites exportados de AO
├── tools/ao-export/        # BMP → PNG, pipeline de armaduras
├── tests/                  # Vitest
└── docs/                   # Notas de desarrollo (GameScene, smoke tests)
```

`GameScene.ts` delega en módulos (`GameSceneMultiplayerController`, `GameSceneCombatController`, `WorldItemManager`, …). Ver [docs/GAMESCENE_INIT.md](docs/GAMESCENE_INIT.md).

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Cliente Vite |
| `npm run dev:all` | Cliente + servidor |
| `npm run build` | Build de producción del cliente |
| `npm test` | Tests (Vitest) |
| `npm run test:smoke` | Subconjunto rápido para CI |
| `npm run audit:sprites` | Auditar sprites |
| `npm run audit:mobs` | Auditar sprites de mobs |
| `npm run server:stop` | Cortar proceso en puerto 3001 (Windows) |

## Gráficos de Argentum Online

El repo [Recursos](https://github.com/ao-org/Recursos) no incluye los `.bmp` (`.gitignore`). Copiarlos desde el cliente instalado y convertir:

Guía: [`tools/ao-export/README.md`](tools/ao-export/README.md)

## Desarrollo

- **Tests**: `npm test` o `npm run test:watch`
- **Smoke tests**: [docs/SMOKE_TESTS.md](docs/SMOKE_TESTS.md)
- **Playtest alpha online**: [docs/ALPHA_PLAYTEST.md](docs/ALPHA_PLAYTEST.md)
- **Comandos de chat en juego**: `/gold`, `/give`, `/meditar`, `/hogar`, `/marcarhogar`, edición de mobs (`/mob`), etc. (ver `GameSceneChatCommands.ts`)
- Personaje admin de prueba: nombre `Lonler` (nombre verde en mundo)

## Estado actual (resumen)

Implementado en gran medida:

- Creación y slots de personajes (localStorage + opcional PostgreSQL)
- Movimiento, colisiones, cambio de mapa, minimapa
- Equipamiento, inventario, tirar/agarrar oro e ítems
- Combate vs mobs (IA, respawn) y PvP con reglas de facción
- Hechizos, meditación, pociones de atributos
- Muerte, fantasma, revive, persistencia de progreso
- Multijugador: join, AOI, sincronización de mobs/ítems/jugadores
- Banco, tienda, NPCs

Pendiente / parcial:

- Una sola sesión activa por **cuenta** (hoy solo por personaje)
- Más mapas con servidor autoritativo (solo `pueblo` en MP)
- Sistema de criminalidad / reputación aparte de la facción elegida en creación
- Autenticación de cuentas
