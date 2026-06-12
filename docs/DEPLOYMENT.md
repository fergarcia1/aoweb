# Deploy AOWEB

Arquitectura recomendada para testing con amigos:

- Frontend en Vercel: Phaser/Vite, assets, HTTPS y CDN.
- Server en un host Node persistente: WebSocket, auth, mundo autoritativo y persistencia.

Vercel es ideal para el cliente, pero no para el proceso MMO persistente. El server debe correr como un proceso Node vivo con WebSockets.

## Modo Gratis Para Debug

El `render.yaml` actual esta preparado para probar sin tarjeta y sin cargos:

- crea solo `aoweb-server` como Web Service `free`
- no crea PostgreSQL
- usa memoria en el server
- `AUTH_REQUIRED=false` para que sea facil entrar a probar

Limitaciones de este modo:

- las cuentas/personajes no persisten si Render reinicia, redeploya o duerme el servicio
- el servicio Free puede dormirse por inactividad y tardar cerca de un minuto en despertar
- sirve para debug con amigos, no para una version estable

En Vercel, para este modo gratis, usar:

```env
VITE_AUTH_REQUIRED=false
VITE_MULTIPLAYER=1
VITE_WS_URL=wss://URL_DEL_SERVER
```

## Frontend: Vercel

1. Subir el repo a GitHub.
2. Crear proyecto en Vercel apuntando a la raiz del repo.
3. Vercel usa `vercel.json`:
   - instala con `npm install`
   - compila con Vite directo
   - publica `dist`
4. Configurar variables:

```env
VITE_AUTH_REQUIRED=true
VITE_MULTIPLAYER=1
VITE_WS_URL=wss://URL_DEL_SERVER
```

`VITE_WS_URL` tambien se usa para derivar la URL HTTP de auth:

- `wss://server.example.com` -> `https://server.example.com/auth/login`
- `ws://localhost:3001` -> `http://localhost:3001/auth/login`

## Server: host Node persistente

El host debe permitir:

- proceso Node de larga duracion
- WebSockets
- variable `PORT`
- variables de entorno
- idealmente PostgreSQL

Opciones para probar:

- Render Web Service
- Railway
- Fly.io
- Koyeb
- VPS barato

## Server En Render

El repo incluye `render.yaml` para crear el deploy gratis:

- `aoweb-server`: Web Service Node Free.

Pasos:

1. Subir el repo a GitHub.
2. En Render, crear un Blueprint desde ese repo.
3. Revisar que el estimado sea `0` y que el servicio diga `Free`.
4. Configurar `CORS_ORIGIN` con la URL de Vercel cuando exista:

```env
CORS_ORIGIN=https://tu-aoweb.vercel.app
```

5. Render genera `AUTH_TOKEN_SECRET`.
6. El build command instala dependencias del server.
7. Deployar.
8. Verificar la URL del server:

```txt
https://aoweb-server.onrender.com/
```

Respuesta esperada:

```txt
AOWEB game server OK
```

La URL WebSocket para el cliente es la misma con `wss://`:

```env
VITE_WS_URL=wss://aoweb-server.onrender.com
```

Comandos esperados desde `server/`:

```bash
npm install
npm start
```

Variables recomendadas:

```env
PORT=3001
AUTH_REQUIRED=false
AUTH_TOKEN_SECRET=generar-un-secreto-largo
CORS_ORIGIN=https://tu-aoweb.vercel.app
RATE_LIMIT_MAX_CONNECTIONS_PER_IP=3
RATE_LIMIT_MAX_ACTIONS_PER_SECOND=20
RATE_LIMIT_TEMP_BAN_MS=300000
```

Si `DATABASE_URL` no existe, el server usa memoria. Sirve para pruebas rapidas, pero al reiniciar se pierden cuentas/personajes.

## Modo Persistente Mas Adelante

Cuando quieras persistencia real de cuentas/personajes:

1. Crear una base PostgreSQL.
2. Agregar `DATABASE_URL` al server.
3. Cambiar `AUTH_REQUIRED=true`.
4. Cambiar en Vercel `VITE_AUTH_REQUIRED=true`.
5. Restaurar el build command con migraciones:

```bash
npm install --prefix server && npm run db:migrate --prefix server
```

## Orden De Deploy

1. Deployar primero el server.
2. Verificar:

```txt
https://URL_DEL_SERVER/
```

Debe responder:

```txt
AOWEB game server OK
```

3. Configurar `VITE_WS_URL` en Vercel con la URL `wss://`.
4. Deployar frontend.
5. Entrar a la URL de Vercel y probar login + conexion.

## Para Migrar A Un Host Pago

La separacion ya queda lista:

- El frontend no cambia.
- El server se mueve a otra URL.
- Solo se actualiza `VITE_WS_URL` en Vercel y `CORS_ORIGIN` en el server.
