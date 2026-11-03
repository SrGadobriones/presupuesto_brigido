import type { Opcion, Producto } from './tipos';
export const redondear = (n: number) => Math.round(n * 100) / 100;
export function opcionVigente(p: Producto): Opcion | undefined {
  return p.opciones.find((o) => o.id === p.opcionElegidaId) ?? [...p.opciones].sort((a,b) => a.precio - b.precio || a.id.localeCompare(b.id))[0];
}
export const precioVigente = (p: Producto) => opcionVigente(p)?.precio ?? 0;
export const enlaceVigente = (p: Producto) => opcionVigente(p)?.link || p.link || '';
export const totalProductos = (productos: Producto[]) => redondear(productos.reduce((n,p) => n + p.cantidad * precioVigente(p), 0));
