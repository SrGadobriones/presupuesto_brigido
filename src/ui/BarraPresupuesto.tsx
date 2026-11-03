import { resumenPresupuesto } from '../db/presupuesto';
import { formatearPrecio } from './formato';

export default function BarraPresupuesto({ total, tope }: { total: number; tope: number | null }) {
  const r = resumenPresupuesto(total, tope);
  if (r.estado === 'sin-tope') return null;
  return (
    <div>
      <div class="progreso" role="progressbar" aria-valuenow={r.porcentaje} aria-valuemin={0} aria-valuemax={100}>
        <div class={`progreso-barra ${r.estado}`} style={{ width: `${r.porcentaje}%` }} />
      </div>
      {r.estado === 'excedido' && (
        <small class="texto-excedido">Superas el tope por {formatearPrecio(-(r.disponible ?? 0))}</small>
      )}
    </div>
  );
}
