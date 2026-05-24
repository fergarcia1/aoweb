"""
Convierte BMP de Argentum Online a PNG con fondo negro transparente.
Uso:
  python export_bmp_to_png.py --bmp-dir RUTA_A_Graficos/bmp --out-dir RUTA_SALIDA
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

# En el cliente AO el negro puro suele ser transparente.
TRANSPARENT_RGB = (0, 0, 0)
TOLERANCE = 8


def bmp_to_png(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if (
                abs(r - TRANSPARENT_RGB[0]) <= TOLERANCE
                and abs(g - TRANSPARENT_RGB[1]) <= TOLERANCE
                and abs(b - TRANSPARENT_RGB[2]) <= TOLERANCE
            ):
                pixels[x, y] = (0, 0, 0, 0)

    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "PNG")


def main() -> None:
    parser = argparse.ArgumentParser(description="BMP AO → PNG con transparencia")
    parser.add_argument(
        "--bmp-dir",
        required=True,
        help="Carpeta con archivos .bmp (ej. RecursosAO/Recursos/Graficos/bmp)",
    )
    parser.add_argument(
        "--out-dir",
        required=True,
        help="Carpeta de salida para los .png",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Máximo de archivos a convertir (0 = todos). Útil para probar.",
    )
    args = parser.parse_args()

    bmp_dir = Path(args.bmp_dir)
    out_dir = Path(args.out_dir)

    if not bmp_dir.is_dir():
        print(f"ERROR: No existe la carpeta BMP:\n  {bmp_dir}")
        print("\nCopiá los .bmp desde la instalación de AO (Steam) — ver README.md")
        return

    files = sorted(bmp_dir.glob("*.bmp")) + sorted(bmp_dir.glob("*.BMP"))
    if not files:
        print(f"ERROR: No hay archivos .bmp en:\n  {bmp_dir}")
        return

    if args.limit > 0:
        files = files[: args.limit]

    total = len(files)
    print(f"Convirtiendo {total} archivos...")
    print(f"  Origen: {bmp_dir}")
    print(f"  Destino: {out_dir}")

    for i, bmp_path in enumerate(files, 1):
        png_path = out_dir / f"{bmp_path.stem}.png"
        bmp_to_png(bmp_path, png_path)
        if i % 200 == 0 or i == total:
            print(f"  {i}/{total}")

    print("Listo.")


if __name__ == "__main__":
    main()
