# Referencias del cliente AO (videos)

Carpeta local para frames extraídos de videos del AO real. **No se suben a Git** (ver `.gitignore`).

## Extraer frames

Requiere [FFmpeg](https://ffmpeg.org/) instalado (`winget install Gyan.FFmpeg`).

```powershell
node tools/extract-ao-reference-frames.mjs --input "C:\Users\imaga\Videos\2026-05-24 13-52-56.mp4" --name horizontal-walk --fps 10
```

Salida: `tools/reference/ao-client-frames/<name>/frame_001.png`, …

## Uso en desarrollo

- Comparar movimiento horizontal/vertical, UI, hechizos, etc.
- Adjuntar en el chat: **PNG** de 2–3 frames clave (más fácil que MP4 para el asistente).
- O indicar la carpeta `--name` ya extraída en el proyecto.
