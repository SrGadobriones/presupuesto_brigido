export type Prioridad = 'alta' | 'media' | 'baja';

export interface Lista {
  id: number;
  nombre: string;
  tope: number | null;
  creadaEn: string;
}

export interface ListaResumen extends Lista {
  total: number;
  productos: number;
}

export interface DatosProducto {
  nombre: string;
  cantidad: number;
  categoria: string;
  prioridad: Prioridad;
  notas: string;
  /** Enlace a la página del producto; '' si no tiene. Se guarda tal como se escribe (sin espacios sobrantes). */
  link: string;
}

export interface Producto extends DatosProducto {
  id: number;
  listaId: number;
  comprado: boolean;
  tieneFoto: boolean;
  opcionElegidaId: number | null;
  /** Precio vigente: opción elegida, o la más barata, o 0. */
  precioUnitario: number;
  /** Enlace a abrir: el de la tienda vigente o, si no tiene, el del producto; '' si no hay ninguno. */
  enlace: string;
}

export interface DatosOpcion {
  tienda: string;
  precio: number;
  link: string;
}

export interface Opcion extends DatosOpcion {
  id: number;
  productoId: number;
}
