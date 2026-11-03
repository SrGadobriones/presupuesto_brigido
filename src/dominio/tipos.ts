export type Prioridad = 'alta' | 'media' | 'baja';

export interface Lista { id: string; nombre: string; tope: number | null; creadaEn: string }
export interface Opcion { id: string; tienda: string; precio: number; link: string }
export interface Producto {
  id: string; listaId: string; nombre: string; cantidad: number; categoria: string;
  prioridad: Prioridad; notas: string; link: string; comprado: boolean;
  opcionElegidaId: string | null; opciones: Opcion[]; tieneFoto: boolean; miniatura: Uint8Array | null;
}
export interface DatosLista { nombre: string; tope: number | null }
export interface DatosProducto {
  id?: string; listaId: string; nombre: string; cantidad: number; categoria: string; prioridad: Prioridad;
  notas: string; link: string; comprado?: boolean; opcionElegidaId: string | null;
  opciones: Opcion[]; foto?: Uint8Array | null;
}
export interface ListaResumen extends Lista { total: number; comprado: number; productos: number }
export interface Todo { listas: Lista[]; productos: Producto[] }
