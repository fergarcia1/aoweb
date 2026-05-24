# Exportar gráficos de Argentum Online a PNG

## Por qué no ves archivos `.bmp` en Steam (AO 20)

En **Argentum 20** los gráficos **no están sueltos**. Están **comprimidos** en un solo archivo sin extensión:

```
C:\Program Files (x86)\Steam\steamapps\common\Argentum 20\Argentum20\Recursos\OUTPUT\Graficos
```

Ese archivo pesa ~450 MB. **No es una carpeta** — por eso no encontrás `Graficos\bmp\*.bmp`.

Al lado está `AO.bin` (200 bytes): guarda la contraseña para descomprimir.

Lo mismo pasa con `init`, `Mapas`, `Interface`, `OGG`, etc. en `OUTPUT\`.

---

## Importante: el Git de Recursos tampoco trae BMP

En `RecursosAO` clonaste índices (`graficos.ini`, `obj.dat`), pero en GitHub los `.bmp` están en `.gitignore` (`Graficos/bmp/*`).

---

## Paso 1 — Extraer los BMP del juego (herramienta oficial)

### A) Descargar el compresor de AO

1. Abrí: [github.com/ao-org/argentum_compressor/releases](https://github.com/ao-org/argentum_compressor/releases)
2. Descargá `Argentum_Compressor-x86-Release.zip`
3. Descomprimí en:

```
C:\Users\imaga\Desktop\AOWEB\tools\ao-export\compressor\Argentum_Compressor-x86-Release\
```

4. **Importante:** el ZIP no trae la DLL. Descargala y ponela **junto al .exe**:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ao-org/argentum_compressor/main/diCryptoSys.dll" -OutFile "C:\Users\imaga\Desktop\AOWEB\tools\ao-export\compressor\Argentum_Compressor-x86-Release\diCryptoSys.dll"
```

Sin `diCryptoSys.dll`, el `.exe` **no muestra nada** y parece que “no hace nada”.

### B) Extraer gráficos (forma fácil)

Clic derecho en `extraer-graficos-ao20.ps1` → **Ejecutar con PowerShell**

O en PowerShell:

```powershell
cd C:\Users\imaga\Desktop\AOWEB\tools\ao-export
powershell -ExecutionPolicy Bypass -File .\extraer-graficos-ao20.ps1
```

Extrae **1432 archivos** (casi todos `.png`, algunos `.bmp`) a:

```
C:\Users\imaga\Desktop\RecursosAO\Recursos\Graficos_extraido
```

### Sobre AO.bin y la contraseña

- **No abras AO.bin con el Bloc de notas** — se ve “raro” porque está **cifrado/ofuscado**. Eso es normal.
- **No tenés que escribir la contraseña a mano.** El script la lee de `AO.bin` automáticamente.
- El modo `extract_ao` del compresor a veces falla con `Invalid password`; por eso el script usa `extract -p` con la clave decodificada.

### C) Comando manual (si querés hacerlo vos)

```powershell
cd "C:\Users\imaga\Desktop\AOWEB\tools\ao-export\compressor\Argentum_Compressor-x86-Release"

.\argentum_compressor.exe dump -i "C:\Program Files (x86)\Steam\steamapps\common\Argentum 20\Argentum20\Recursos\OUTPUT\Graficos"
```

Para extraer (la contraseña la obtiene el script `read-ao-bin.mjs` o `extraer-graficos-ao20.ps1`).

### D) Usar los gráficos en AOWEB

AO 20 ya extrae **PNG** (no hace falta convertir BMP en la mayoría de los casos):

```powershell
Copy-Item "C:\Users\imaga\Desktop\RecursosAO\Recursos\Graficos_extraido\*.png" `
  "C:\Users\imaga\Desktop\AOWEB\public\assets\ao\png\" -ErrorAction SilentlyContinue
```

Si necesitás convertir algún `.bmp` suelto:

```powershell
node export-bmp-to-png.mjs "C:\Users\imaga\Desktop\RecursosAO\Recursos\Graficos_extraido" "C:\Users\imaga\Desktop\AOWEB\public\assets\ao\png"
```

## Paso 2 — Instalar dependencias del exportador (Node.js)

Ya tenés Node por AOWEB. En PowerShell:

```powershell
cd C:\Users\imaga\Desktop\AOWEB\tools\ao-export
npm install
```

*(Opcional: si preferís Python, también hay scripts `.py` + `pip install -r requirements.txt`.)*

## Paso 3 — Convertir todos los BMP a PNG

```powershell
node export-bmp-to-png.mjs "C:\Users\imaga\Desktop\RecursosAO\Recursos\Graficos\bmp" "C:\Users\imaga\Desktop\AOWEB\public\assets\ao\png"
```

Para probar solo 10 archivos primero:

```powershell
node export-bmp-to-png.mjs --bmp-dir "C:\Users\imaga\Desktop\RecursosAO\Recursos\Graficos\bmp" --out-dir "C:\Users\imaga\Desktop\AOWEB\public\assets\ao\png" --limit 10
```

Esto genera un PNG por cada BMP. El fondo **negro** pasa a transparente (como en el cliente de AO).

## Paso 4 — Exportar un tile o sprite puntual (por número Grh)

Los gráficos del juego se referencian por **Grh** en `graficos.ini`:

```
Grh63=1-1011-768-224-32-32
       │  │    │   │  │  └── alto
       │  │    │   │  └───── ancho
       │  │    │   └──────── pos Y en el BMP
       │  │    └──────────── pos X en el BMP
       │  └───────────────── número de archivo (1011.bmp)
       └──────────────────── cantidad de frames (1 = estático)
```

Exportar ese Grh a un PNG suelto:

```powershell
node export-grh.mjs --grh 63 --recursos "C:\Users\imaga\Desktop\RecursosAO\Recursos" --out "C:\Users\imaga\Desktop\AOWEB\public\assets\ao\grh\grh63.png"
```

## Paso 5 — Exportar varios Grh de una animación

Si en `graficos.ini` una línea tiene varios frames, por ejemplo `Grh100=4-101-102-103-104-1`, usá:

```powershell
node export-grh.mjs --grh 100 --recursos "C:\Users\imaga\Desktop\RecursosAO\Recursos" --out-dir "C:\Users\imaga\Desktop\AOWEB\public\assets\ao\anim"
```

## ¿Y los personajes / pasto / items?

| Qué querés | Dónde mirar |
|------------|-------------|
| Tile de pasto/agua | `graficos.ini` — Grh de 32×32 (terreno suele estar en archivos 1xxx.bmp) |
| Objeto inventario | `Dat\obj.dat` → clave `GrhIndex=` del objeto |
| Cuerpo / ropa | `init\cuerpos.dat` → `FileNum` + índices en `graficos.ini` |
| Cabeza | `init\cabezas.ini` |

En la [galería](http://recursos.argentumonline.org) podés ver gráficos y anotar números de Grh para exportar.

## Siguiente paso en AOWEB

Cuando tengas PNG en `public/assets/ao/`, avisame y los cableamos en Phaser (tileset + sprite del personaje).
