import type { Database } from 'sql.js';
import type { Prioridad } from './tipos';
import { listarListas, obtenerLista } from './listas';
import { listarProductos } from './productos';
import { listarOpciones } from './opciones';

export interface OpcionExportada {
  tienda: string;
  precio: number;
  link: string;
}

export interface FilaExportacion {
  categoria: string;
  producto: string;
  cantidad: number;
  prioridad: Prioridad;
  comprado: boolean;
  /** Tienda de la opción vigente (la elegida o, si no hay, la más barata); '' si no tiene opciones. */
  tienda: string;
  precioUnitario: number;
  subtotal: number;
  link: string;
  /** Las demás opciones, de la más barata a la más cara. */
  otrasOpciones: OpcionExportada[];
  notas: string;
}

export interface ListaExportacion {
  nombre: string;
  tope: number | null;
  total: number;
  /** Lo que queda del tope (negativo si se excede); null si no hay tope. */
  disponible: number | null;
  comprados: number;
  productos: FilaExportacion[];
}

const redondear = (n: number) => Math.round(n * 100) / 100;

function exportarLista(db: Database, listaId: number): ListaExportacion | null {
  const lista = obtenerLista(db, listaId);
  if (!lista) return null;
  const productos = listarProductos(db, listaId).map((p): FilaExportacion => {
    const opciones = listarOpciones(db, p.id); // ya vienen de la más barata a la más cara
    const vigente = opciones.find((o) => o.id === p.opcionElegidaId) ?? opciones[0];
    return {
      categoria: p.categoria,
      producto: p.nombre,
      cantidad: p.cantidad,
      prioridad: p.prioridad,
      comprado: p.comprado,
      tienda: vigente?.tienda ?? '',
      precioUnitario: p.precioUnitario,
      subtotal: redondear(p.cantidad * p.precioUnitario),
      link: p.enlace,
      otrasOpciones: opciones.filter((o) => o !== vigente).map((o) => ({ tienda: o.tienda, precio: o.precio, link: o.link })),
      notas: p.notas,
    };
  });
  return {
    nombre: lista.nombre,
    tope: lista.tope,
    total: lista.total,
    disponible: lista.tope === null ? null : redondear(lista.tope - lista.total),
    comprados: productos.filter((p) => p.comprado).length,
    productos,
  };
}

/** Datos listos para exportar: una lista (si se da el id) o todas, de la más antigua a la más reciente. */
export function datosParaExportar(db: Database, listaId?: number): ListaExportacion[] {
  const ids = listaId === undefined ? listarListas(db).map((l) => l.id).reverse() : [listaId];
  return ids.map((id) => exportarLista(db, id)).filter((l): l is ListaExportacion => l !== null);
}
