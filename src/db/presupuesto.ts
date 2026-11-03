export type EstadoPresupuesto = 'sin-tope' | 'ok' | 'cerca' | 'excedido';

export interface ResumenPresupuesto {
  estado: EstadoPresupuesto;
  /** Lo que queda del tope (negativo si se excede); null si no hay tope. */
  disponible: number | null;
  /** 0–100, limitado a 100. */
  porcentaje: number;
}

export const UMBRAL_CERCA = 0.8;

export function resumenPresupuesto(total: number, tope: number | null): ResumenPresupuesto {
  if (tope === null || !(tope > 0)) return { estado: 'sin-tope', disponible: null, porcentaje: 0 };
  const razon = total / tope;
  const estado: EstadoPresupuesto = razon > 1 ? 'excedido' : razon >= UMBRAL_CERCA ? 'cerca' : 'ok';
  return {
    estado,
    disponible: Math.round((tope - total) * 100) / 100,
    porcentaje: Math.min(100, Math.round(razon * 100)),
  };
}
