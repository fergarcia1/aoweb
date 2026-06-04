type FlushFn = () => void;

let flushFn: FlushFn | null = null;

export function registerEmergencyProgressFlush(fn: FlushFn | null): void {
  flushFn = fn;
}

/** Sincroniza progreso local antes de cerrar la pestaña (F5 / navegar). */
export function flushProgressOnPageHide(): void {
  flushFn?.();
}
