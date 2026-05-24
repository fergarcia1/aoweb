"""
Exporta uno o más Grh de graficos.ini a PNG recortados.
Uso:
  python export_grh.py --grh 63 --recursos RUTA/Recursos --out salida.png
  python export_grh.py --grh 100 --recursos RUTA/Recursos --out-dir carpeta/
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from export_bmp_to_png import TRANSPARENT_RGB, TOLERANCE

GRH_LINE = re.compile(r"^Grh(\d+)=(.+)$", re.IGNORECASE)


@dataclass
class GrhFrame:
    grh_id: int
    file_num: int
    x: int
    y: int
    width: int
    height: int


def load_graficos_ini(path: Path) -> dict[int, str]:
    grhs: dict[int, str] = {}
    with path.open(encoding="latin-1", errors="replace") as f:
        for line in f:
            line = line.strip()
            match = GRH_LINE.match(line)
            if match:
                grhs[int(match.group(1))] = match.group(2)
    return grhs


def parse_static_grh(grh_id: int, value: str) -> list[GrhFrame]:
    """Grh estático: 1-archivo-x-y-ancho-alto[-descripcion]"""
    parts = value.split("-")
    if len(parts) < 6:
        raise ValueError(f"Grh{grh_id} formato no reconocido: {value}")

    frame_count = int(parts[0])
    if frame_count != 1:
        raise ValueError(
            f"Grh{grh_id} es animación ({frame_count} frames). "
            f"Usá --grh con el id de animación o exportá cada frame por separado."
        )

    return [
        GrhFrame(
            grh_id=grh_id,
            file_num=int(parts[1]),
            x=int(parts[2]),
            y=int(parts[3]),
            width=int(parts[4]),
            height=int(parts[5]),
        )
    ]


def parse_animation_grh(grh_id: int, value: str, all_grhs: dict[int, str]) -> list[GrhFrame]:
    """Animación: N-grh1-grh2-...-velocidad"""
    parts = value.split("-")
    frame_count = int(parts[0])
    frame_ids = [int(p) for p in parts[1 : 1 + frame_count]]
    frames: list[GrhFrame] = []

    for fid in frame_ids:
        if fid not in all_grhs:
            raise KeyError(f"Frame Grh{fid} no encontrado (referenciado por Grh{grh_id})")
        frames.extend(parse_static_grh(fid, all_grhs[fid]))

    return frames


def resolve_frames(grh_id: int, all_grhs: dict[int, str]) -> list[GrhFrame]:
    if grh_id not in all_grhs:
        raise KeyError(f"Grh{grh_id} no existe en graficos.ini")

    value = all_grhs[grh_id]
    parts = value.split("-")
    frame_count = int(parts[0])

    if frame_count == 1:
        return parse_static_grh(grh_id, value)
    return parse_animation_grh(grh_id, value, all_grhs)


def find_bmp(bmp_dir: Path, file_num: int) -> Path:
    for ext in (".bmp", ".BMP"):
        candidate = bmp_dir / f"{file_num}{ext}"
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"No se encontró {file_num}.bmp en {bmp_dir}")


def crop_frame(bmp_path: Path, frame: GrhFrame) -> Image.Image:
    img = Image.open(bmp_path).convert("RGBA")
    cropped = img.crop(
        (frame.x, frame.y, frame.x + frame.width, frame.y + frame.height)
    )
    pixels = cropped.load()
    w, h = cropped.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if (
                abs(r - TRANSPARENT_RGB[0]) <= TOLERANCE
                and abs(g - TRANSPARENT_RGB[1]) <= TOLERANCE
                and abs(b - TRANSPARENT_RGB[2]) <= TOLERANCE
            ):
                pixels[x, y] = (0, 0, 0, 0)

    return cropped


def main() -> None:
    parser = argparse.ArgumentParser(description="Exportar Grh de AO a PNG")
    parser.add_argument("--grh", type=int, required=True, help="Número de Grh a exportar")
    parser.add_argument(
        "--recursos",
        required=True,
        help="Carpeta Recursos del clone (contiene init/graficos.ini y Graficos/bmp)",
    )
    parser.add_argument("--out", help="Archivo PNG de salida (un solo frame)")
    parser.add_argument("--out-dir", help="Carpeta de salida (varios frames)")
    args = parser.parse_args()

    recursos = Path(args.recursos)
    ini_path = recursos / "init" / "graficos.ini"
    bmp_dir = recursos / "Graficos" / "bmp"

    if not ini_path.exists():
        print(f"ERROR: No existe {ini_path}")
        return

    if not bmp_dir.is_dir():
        print(f"ERROR: No existe {bmp_dir}")
        print("Copiá los BMP desde la instalación de AO — ver README.md")
        return

    all_grhs = load_graficos_ini(ini_path)
    frames = resolve_frames(args.grh, all_grhs)

    if args.out_dir:
        out_dir = Path(args.out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        for i, frame in enumerate(frames):
            bmp_path = find_bmp(bmp_dir, frame.file_num)
            img = crop_frame(bmp_path, frame)
            out_path = out_dir / f"grh{frame.grh_id}_{i}.png"
            img.save(out_path, "PNG")
            print(f"Guardado: {out_path}")
        return

    if len(frames) > 1:
        print("Este Grh tiene varios frames. Usá --out-dir en lugar de --out.")
        return

    out = Path(args.out or f"grh{args.grh}.png")
    frame = frames[0]
    bmp_path = find_bmp(bmp_dir, frame.file_num)
    img = crop_frame(bmp_path, frame)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG")
    print(f"Guardado: {out} ({frame.width}x{frame.height} desde {bmp_path.name})")


if __name__ == "__main__":
    main()
