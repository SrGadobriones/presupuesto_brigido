import type { Database } from 'sql.js';
import type { DatosOpcion, DatosProducto } from './tipos';
import { enTransaccion } from './sqlite';
import { actualizarProducto, agregarProducto, guardarFoto } from './productos';
import { reemplazarOpciones } from './opciones';

export interface BorradorProducto {
  /** null = producto nuevo. */
  productoId: number | null;
  listaId: number;
  datos: DatosProducto;
  foto: Uint8Array | null;
  opciones: DatosOpcion[];
  /** Índice dentro de `opciones` de la opción elegida; null = automática (la más barata). */
  indiceElegida: number | null;
}

/** Guarda producto, foto y opciones de forma atómica. Devuelve el id del producto. */
export function guardarProducto(db: Database, b: BorradorProducto): number {
  return enTransaccion(db, () => {
    let id = b.productoId;
    if (id === null) {
      id = agregarProducto(db, b.listaId, b.datos, b.foto);
    } else {
      actualizarProducto(db, id, b.datos);
      guardarFoto(db, id, b.foto);
    }
    reemplazarOpciones(db, id, b.opciones, b.indiceElegida);
    return id;
  });
}
