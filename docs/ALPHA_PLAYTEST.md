# Alpha online playtest

Checklist corto para probar AOWEB con amigos sin mezclar bugs de deploy, cache y persistencia.

## 1. Antes de invitar gente

- Render `/health` responde `status: "ok"`.
- `/health` muestra `persistence: "postgres"` si la prueba debe guardar cuentas/personajes.
- Vercel tiene `VITE_MULTIPLAYER=1`.
- Vercel tiene `VITE_WS_URL=wss://...` apuntando al server actual.
- Si hay login real, Render tiene `AUTH_REQUIRED=true` y Vercel tiene `VITE_AUTH_REQUIRED=true`.
- Si cambiaste variables en Vercel, hacer redeploy y despues Ctrl+F5 en el navegador.

## 2. Prueba base de conexion

1. Entrar con un personaje existente.
2. Esperar el mensaje `Conectado al servidor multijugador`.
3. Mover un tile.
4. Abrir `/health` y verificar que `websocketClients` subio.
5. Salir y volver a entrar con el mismo personaje.

Resultado esperado: conserva oro, nivel, inventario, banco, posicion y hechizos.

## 3. Prueba con dos jugadores

1. Jugador A entra primero.
2. Jugador B entra despues.
3. Ambos se ven.
4. Ambos escriben chat local.
5. Ambos equipan/desequipan un item.
6. Ambos cambian de mapa y vuelven.

Resultado esperado: no comparten tile al entrar/cambiar mapa, no desaparece equipo y el chat aparece sobre el personaje correcto.

## 4. Persistencia critica

Hacer esta prueba solo con `persistence: "postgres"`.

1. Dar oro o conseguir oro.
2. Cambiar inventario/equipo.
3. Cerrar pestana sin `/salir`.
4. Esperar 15 segundos.
5. Entrar otra vez.

Resultado esperado: el estado vuelve igual. Si vuelve a 0 o sin inventario, parar la prueba y revisar logs de Render antes de seguir.

## 5. Reporte de bugs

Para cada bug anotar:

- URL usada: Vercel/local.
- Hora aproximada.
- Cuenta/personaje.
- Mapa y coordenadas si aplica.
- Que hizo el jugador justo antes.
- Screenshot de juego y consola si hay error rojo.

## 6. No bloquear alpha por esto

Estos puntos se pueden anotar y arreglar despues si no rompen la sesion:

- Un item con balance incorrecto.
- Un NPC vendedor incompleto.
- Una armadura visualmente corrida pocos pixeles.
- Un texto de UI que no afecte combate/inventario/persistencia.

Prioridad alta: crashes, perdida de progreso, desconexiones, duplicacion/perdida de items y tiles imposibles de cruzar en zonas clave.
