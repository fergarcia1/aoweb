export const FACE_SHEET_COLUMN_COUNT = 11;

export function clampFaceColumnIndex(faceIndex: number): number {
  if (FACE_SHEET_COLUMN_COUNT <= 0) return 0;
  const normalized = faceIndex % FACE_SHEET_COLUMN_COUNT;
  return normalized < 0 ? normalized + FACE_SHEET_COLUMN_COUNT : normalized;
}

/** Número de cara 1–11 (como en la UI de creación) → columna 0-based del spritesheet. */
export function caraToFaceColumnIndex(cara: number): number {
  return clampFaceColumnIndex(Math.floor(cara) - 1);
}

export function resolveStaticNpcFaceColumn(
  faceIndex: number,
  faceCara?: number
): number {
  if (faceCara != null && Number.isFinite(faceCara)) {
    return caraToFaceColumnIndex(faceCara);
  }
  return clampFaceColumnIndex(faceIndex);
}
