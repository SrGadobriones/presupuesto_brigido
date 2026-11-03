import type { Database } from 'sql.js';
import type { DatosOpcion, Opcion } from './tipos';
import { filas, idInsertado } from './sqlite';

function validar(d: DatosOpcion): DatosOpcion {
  if (!Number.isFinite(d.precio) || d.precio < 0) {
    throw new Error('El precio debe ser un número mayor o igual a 0');
  }
  return { tienda: d.tienda.trim(), precio: d.precio, link: d.link.trim() };
}

export function agregarOpcion(db: Database, productoId: number, datos: DatosOpcion): number {
  const d = validar(datos);
  db.run('INSERT INTO opciones (producto_id, tienda, precio, link) VALUES (?, ?, ?, ?)', [
    productoId,
    d.tienda,
    d.precio,
    d.link,
  ]);
  return idInsertado(db);
}

export function actualizarOpcion(db: Database, id: number, datos: DatosOpcion): void {
  const d = validar(datos);
  db.run('UPDATE opciones SET tienda = ?, precio = ?, link = ? WHERE id = ?', [d.tienda, d.precio, d.link, id]);
}

export function eliminarOpcion(db: Database, id: number): void {
  db.run('UPDATE productos SET opcion_elegida_id = NULL WHERE opcion_elegida_id = ?', [id]);
  db.run('DELETE FROM opciones WHERE id = ?', [id]);
}

export function listarOpciones(db: Database, productoId: number): Opcion[] {
  return filas<Opcion>(
    db,
    'SELECT id, producto_id AS productoId, tienda, precio, link FROM opciones WHERE producto_id = ? ORDER BY precio, id',
    [productoId],
  );
}

export function elegirOpcion(db: Database, productoId: number, opcionId: number | null): void {
  if (opcionId !== null) {
    const pertenece = filas(db, 'SELECT 1 AS x FROM opciones WHERE id = ? AND producto_id = ?', [opcionId, productoId]);
    if (pertenece.length === 0) throw new Error('La opción no pertenece al producto');
  }
  db.run('UPDATE productos SET opcion_elegida_id = ? WHERE id = ?', [opcionId, productoId]);
}

/** Sustituye todas las opciones del producto. No abre transacción: el llamador decide. */
export function reemplazarOpciones(
  db: Database,
  productoId: number,
  lista: DatosOpcion[],
  indiceElegida: number | null,
): void {
  db.run('UPDATE productos SET opcion_elegida_id = NULL WHERE id = ?', [productoId]);
  db.run('DELETE FROM opciones WHERE producto_id = ?', [productoId]);
  const ids = lista.map((d) => agregarOpcion(db, productoId, d));
  elegirOpcion(db, productoId, indiceElegida === null ? null : (ids[indiceElegida] ?? null));
}
