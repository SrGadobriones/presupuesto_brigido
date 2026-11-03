import type { DatosProducto } from '../../src/db/tipos';

export const base: DatosProducto = {
  nombre: 'Producto',
  cantidad: 1,
  categoria: '',
  prioridad: 'media',
  notas: '',
  link: '',
};

export const producto = (parcial: Partial<DatosProducto> = {}): DatosProducto => ({ ...base, ...parcial });
