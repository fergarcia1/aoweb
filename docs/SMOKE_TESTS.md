# Smoke tests — regresiones frecuentes

Ejecutar antes de merge o después de tocar `GameScene.create()`, multijugador o muerte:

```bash
npm run test:smoke
```

Suite completa:

```bash
npm test
```

## Qué cubre cada archivo

| Test | Protege contra |
|------|----------------|
| `joinSession.test.ts` | Oro en 0 al join MP |
| `multiplayerJoinPayload.test.ts` | Cliente sin `gold` en payload |
| `characterDeathState.test.ts` | Fantasma al cargar personaje vivo |
| `characterProgressIsolation.test.ts` | Muerte de un personaje en el save de otro |
| `progressPersistGuard.test.ts` | Autosave del personaje anterior tras cambiar slot |

## Manual (no automatizado aún)

Ver checklist al final de [GAMESCENE_INIT.md](./GAMESCENE_INIT.md).

Para pruebas online con amigos, usar tambien [ALPHA_PLAYTEST.md](./ALPHA_PLAYTEST.md).
