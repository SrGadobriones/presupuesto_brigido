import { resumenPresupuesto } from '../db/presupuesto';
import { formatearPrecio } from './formato';

interface Props {
  total: number;
  /** Parte del total que ya está marcada como comprada. */
  comprado: number;
  tope: number | null;
  /** Muestra bajo la barra lo comprado y lo que resta del tope. */
  leyenda?: boolean;
}

/** Barra del tope: tramo sólido = comprado, tramo claro = pendiente de comprar, resto = disponible. */
export default function BarraPresupuesto({ total, comprado, tope, leyenda = false }: Props) {
  const r = resumenPresupuesto(total, tope);
  if (r.estado === 'sin-tope' || !tope) return null;
  const pct = (n: number) => Math.max(0, Math.min(100, (n / tope) * 100));
  const pctComprado = pct(comprado);
  const pctPendiente = Math.min(pct(total) - pctComprado, 100 - pctComprado);
  const restante = Math.round((tope - comprado) * 100) / 100;
  return (
    <div class="presupuesto">
      <div class="progreso" role="progressbar" aria-label="Comprado del tope" aria-valuenow={Math.round(pctComprado)} aria-valuemin={0} aria-valuemax={100}>
        <div class={`progreso-barra ${r.estado}`} style={{ width: `${pctComprado}%` }} />
        <div class={`progreso-barra pendiente ${r.estado}`} style={{ width: `${pctPendiente}%` }} />
      </div>
      {leyenda && (
        <div class="progreso-leyenda">
          <span>Comprado <strong>{formatearPrecio(comprado)}</strong></span>
          <span>{restante >= 0 ? 'Restante' : 'Excedido'} <strong>{formatearPrecio(Math.abs(restante))}</strong></span>
        </div>
      )}
      {r.estado === 'excedido' && (
        <small class="texto-excedido">Superas el tope por {formatearPrecio(-(r.disponible ?? 0))}</small>
      )}
    </div>
  );
}
