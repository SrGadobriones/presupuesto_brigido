import type { DatosLista, DatosProducto, Opcion } from './tipos';
export function validarLista(d: DatosLista): DatosLista {
  const nombre = d.nombre.trim(); if (!nombre) throw new Error('El nombre es obligatorio');
  if (d.tope !== null && !(d.tope > 0)) throw new Error('El tope debe ser mayor que 0'); return { nombre, tope: d.tope };
}
export function validarProducto(d: DatosProducto): DatosProducto {
  const nombre = d.nombre.trim(); if (!nombre) throw new Error('El nombre es obligatorio');
  if (!Number.isInteger(d.cantidad) || d.cantidad < 1) throw new Error('La cantidad debe ser un entero mayor o igual a 1');
  const opciones = d.opciones.map((o: Opcion) => { if (!Number.isFinite(o.precio) || o.precio < 0) throw new Error('Cada opción necesita un precio válido (0 o más).'); return {...o, tienda:o.tienda.trim(), link:o.link.trim()}; });
  return {...d, nombre, categoria:d.categoria.trim(), notas:d.notas.trim(), link:d.link.trim(), opciones};
}
