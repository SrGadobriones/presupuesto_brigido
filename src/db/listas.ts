import type { Database } from 'sql.js';
import type { ListaResumen } from './tipos';
import { filas, idInsertado } from './sqlite';
import { totalSql } from './precio';

const SELECT_LISTA = `SELECT l.id, l.nombre, l.tope, l.creada_en AS creadaEn,
  ${totalSql('l.id')} AS total,
  (SELECT COUNT(*) FROM productos px WHERE px.lista_id = l.id) AS productos
  FROM listas l`;

function validar(nombre: string, tope: number | null): { nombre: string; tope: number | null } {
  const limpio = nombre.trim();
  if (!limpio) throw new Error('El nombre es obligatorio');
  if (tope !== null && !(tope > 0)) throw new Error('El tope debe ser mayor que 0');
  return { nombre: limpio, tope };
}

export function crearLista(db: Database, nombre: string, tope: number | null): number {
  const d = validar(nombre, tope);
  db.run('INSERT INTO listas (nombre, tope) VALUES (?, ?)', [d.nombre, d.tope]);
  return idInsertado(db);
}

export function actualizarLista(db: Database, id: number, nombre: string, tope: number | null): void {
  const d = validar(nombre, tope);
  db.run('UPDATE listas SET nombre = ?, tope = ? WHERE id = ?', [d.nombre, d.tope, id]);
}

export function eliminarLista(db: Database, id: number): void {
  db.run('DELETE FROM listas WHERE id = ?', [id]);
}

export function obtenerLista(db: Database, id: number): ListaResumen | null {
  return filas<ListaResumen>(db, `${SELECT_LISTA} WHERE l.id = ?`, [id])[0] ?? null;
}

export function listarListas(db: Database): ListaResumen[] {
  return filas<ListaResumen>(db, `${SELECT_LISTA} ORDER BY l.id DESC`);
}

export function totalLista(db: Database, id: number): number {
  return filas<{ total: number }>(db, `SELECT ${totalSql('?')} AS total`, [id])[0].total;
}
