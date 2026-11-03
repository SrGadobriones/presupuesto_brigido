import type { Prioridad } from '../db/tipos';

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export function formatearPrecio(n: number): string {
  return '$' + n.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** '' → null; número válido → número; texto inválido → NaN. Acepta coma decimal. */
export function parsearNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** Fecha local como AAAA-MM-DD (toISOString da la UTC, que cerca de medianoche cae en otro día). */
export function fechaLocal(fecha: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export function mensajeError(e: unknown, defecto: string): string {
  return e instanceof Error ? e.message : defecto;
}
