import type { Prioridad } from '../db/tipos';

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

/** Número en formato chileno: punto = miles (siempre, también en 4 cifras), coma = decimales. Sin depender del locale del dispositivo. */
export function formatearNumero(n: number): string {
  const [entero, decimales] = Math.abs(n).toFixed(2).replace(/0+$/, '').replace(/\.$/, '').split('.');
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + miles + (decimales ? ',' + decimales : '');
}

export function formatearPrecio(n: number): string {
  return '$' + formatearNumero(n);
}

/** '' → null; número válido → número; texto inválido → NaN. Formato chileno: punto = miles, coma = decimales. */
export function parsearNumero(texto: string): number | null {
  const t = texto.trim().replace(/^\$\s*/, '').replace(/[.\s]/g, '').replace(',', '.');
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

/** Primer nombre y primer apellido (con 4 o más palabras se asume nombre compuesto): "Gabriel Briones Aravena" → ["Gabriel", "Briones"]. */
function nombreYApellido(nombre: string): [string, string] {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return ['', ''];
  const apellido = p.length === 1 ? '' : p.length <= 3 ? p[1] : p[2];
  return [p[0], apellido];
}

/** "Gabriel Briones Aravena" → "GB": inicial del primer nombre y del primer apellido. */
export function iniciales(nombre: string): string {
  return nombreYApellido(nombre).map((x) => x[0] ?? '').join('').toLocaleUpperCase('es');
}

/** "Gabriel Briones Aravena" → "Gabriel Briones". */
export function nombreCorto(nombre: string): string {
  return nombreYApellido(nombre).filter(Boolean).join(' ');
}
