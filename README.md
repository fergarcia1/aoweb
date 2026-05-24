# AOWEB — Paso 1

Prototipo mínimo estilo Argentum Online: mapa en tiles, personaje y cámara.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior

## Cómo ejecutarlo

```bash
cd AOWEB
npm install
npm run dev
```

Se abrirá el navegador en `http://localhost:5173`. Usá **WASD** o las **flechas** para moverte **un tile por paso** (estilo Argentum).

## Estructura del proyecto

```
src/
  main.ts              → Arranca Phaser
  config.ts            → Constantes (tile 32px, duración del paso)
  maps/
    pueblo.ts          → Mapa 1 (inicio)
    bosque.ts          → Mapa 2
    index.ts           → Registro y traslados entre mapas
  player/
    playerSprites.ts   → Sprite de prueba + animaciones walk/idle
  scenes/
    GameScene.ts       → Cambio de mapa, movimiento, colisiones
```

## Qué aprender en cada archivo

| Archivo | Qué hace |
|---------|----------|
| `main.ts` | Crea el juego Phaser (resolución, escena, pixel art) |
| `config.ts` | Números que vas a tocar seguido (32px = un tile como en AO) |
| `GameScene.ts` | Movimiento tile a tile y traslados (casillas doradas) |
| `maps/*.ts` | Definición de cada mapa y conexiones estilo AO |
| `playerSprites.ts` | Spritesheet generado en código (4 direcciones × 4 frames) |

## Gráficos de Argentum Online (BMP → PNG)

El repo [Recursos](https://github.com/ao-org/Recursos) **no incluye** los `.bmp` (están en `.gitignore`). Hay que copiarlos desde el juego instalado (Steam) y convertirlos:

Ver guía completa: [`tools/ao-export/README.md`](tools/ao-export/README.md)

## Próximos pasos (cuando esto funcione)

1. Exportar PNG con `tools/ao-export` y cargarlos en Phaser.
2. Cargar un tileset real (pasto, agua, etc.).
3. Pasar el mapa de un array en código a un archivo (JSON o Tiled Editor).
