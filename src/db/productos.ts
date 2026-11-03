import type { Database } from 'sql.js';
import type { DatosProducto, Producto } from './tipos';
import { filas, idInsertado } from './sqlite';
import { ENLACE_VIGENTE_SQL, PRECIO_UNITARIO_SQL } from './precio';

const COLUMNAS = `p.id, p.lista_id AS listaId, p.nombre, p.cantidad, p.categoria, p.prioridad, p.notas, p.link,
  p.comprado, (p.foto IS NOT NULL) AS tieneFoto, p.opcion_elegida_id AS opcionElegidaId,
  ${PRECIO_UNITARIO_SQL} AS precioUnitario, ${ENLACE_VIGENTE_SQL} AS enlace`;

type FilaProducto = Omit<Producto, 'comprado' | 'tieneFoto'> & { comprado: number; tieneFoto: number };

const mapear = (f: FilaProducto): Producto => ({ ...f, comprado: f.comprado === 1, tieneFoto: f.tieneFoto === 1 });

function validar(d: DatosProducto): DatosProducto {
  const nombre = d.nombre.trim();
  if (!nombre) throw new Error('El nombre es obligatorio');
  if (!Number.isInteger(d.cantidad) || d.cantidad < 1) {
    throw new Error('La cantidad debe ser un entero mayor o igual a 1');
  }
  return { ...d, nombre, categoria: d.categoria.trim(), notas: d.notas.trim(), link: d.link.trim() };
}

export function agregarProducto(
  db: Database,
  listaId: number,
  datos: DatosProducto,
  foto: Uint8Array | null = null,
): number {
  const d = validar(datos);
  db.run(
    'INSERT INTO productos (lista_id, nombre, cantidad, categoria, prioridad, notas, link, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [listaId, d.nombre, d.cantidad, d.categoria, d.prioridad, d.notas, d.link, foto],
  );
  return idInsertado(db);
}

export function actualizarProducto(db: Database, id: number, datos: DatosProducto): void {
  const d = validar(datos);
  db.run('UPDATE productos SET nombre = ?, cantidad = ?, categoria = ?, prioridad = ?, notas = ?, link = ? WHERE id = ?', [
    d.nombre,
    d.cantidad,
    d.categoria,
    d.prioridad,
    d.notas,
    d.link,
    id,
  ]);
}

export function guardarFoto(db: Database, id: number, foto: Uint8Array | null): void {
  db.run('UPDATE productos SET foto = ? WHERE id = ?', [foto, id]);
}

export function obtenerFoto(db: Database, id: number): Uint8Array | null {
  const f = filas<{ foto: Uint8Array | null }>(db, 'SELECT foto FROM productos WHERE id = ?', [id])[0];
  return f?.foto ?? null;
}

export function eliminarProducto(db: Database, id: number): void {
  db.run('DELETE FROM productos WHERE id = ?', [id]);
}

export function marcarComprado(db: Database, id: number, comprado: boolean): void {
  db.run('UPDATE productos SET comprado = ? WHERE id = ?', [comprado ? 1 : 0, id]);
}

const marcas = (ids: number[]) => ids.map(() => '?').join(', ');

/** Marca o desmarca como comprados varios productos a la vez (una sola sentencia, atómica). */
export function marcarCompradoVarios(db: Database, ids: number[], comprado: boolean): void {
  if (ids.length === 0) return;
  db.run(`UPDATE productos SET comprado = ? WHERE id IN (${marcas(ids)})`, [comprado ? 1 : 0, ...ids]);
}

/** Elimina varios productos a la vez; sus opciones se borran en cascada. */
export function eliminarProductos(db: Database, ids: number[]): void {
  if (ids.length === 0) return;
  db.run(`DELETE FROM productos WHERE id IN (${marcas(ids)})`, ids);
}

export function obtenerProducto(db: Database, id: number): Producto | null {
  const f = filas<FilaProducto>(db, `SELECT ${COLUMNAS} FROM productos p WHERE p.id = ?`, [id])[0];
  return f ? mapear(f) : null;
}

export function listarProductos(db: Database, listaId: number): Producto[] {
  return filas<FilaProducto>(
    db,
    `SELECT ${COLUMNAS} FROM productos p WHERE p.lista_id = ?
     ORDER BY p.categoria,
              CASE p.prioridad WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
              p.nombre`,
    [listaId],
  ).map(mapear);
}

export function listarCategorias(db: Database, listaId: number): string[] {
  return filas<{ categoria: string }>(
    db,
    "SELECT DISTINCT categoria FROM productos WHERE lista_id = ? AND categoria <> '' ORDER BY categoria",
    [listaId],
  ).map((f) => f.categoria);
}
