import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';
import { migrar } from './esquema';

type LocateFile = (archivo: string) => string;

let sqlPromise: Promise<SqlJsStatic> | null = null;

/** Carga sql.js una sola vez. `locateFile` solo se usa en la primera llamada (navegador). */
export function cargarSql(locateFile?: LocateFile): Promise<SqlJsStatic> {
  sqlPromise ??= initSqlJs(locateFile ? { locateFile } : undefined);
  return sqlPromise;
}

export function activarClavesForaneas(db: Database): void {
  db.run('PRAGMA foreign_keys = ON');
}

export async function abrirDb(datos?: Uint8Array, locateFile?: LocateFile): Promise<Database> {
  const SQL = await cargarSql(locateFile);
  const db = datos ? new SQL.Database(datos) : new SQL.Database();
  activarClavesForaneas(db);
  migrar(db);
  return db;
}

export function filas<T>(db: Database, sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const resultado: T[] = [];
    while (stmt.step()) resultado.push(stmt.getAsObject() as unknown as T);
    return resultado;
  } finally {
    stmt.free();
  }
}

export function idInsertado(db: Database): number {
  return Number(db.exec('SELECT last_insert_rowid()')[0].values[0][0]);
}

export function enTransaccion<T>(db: Database, fn: () => T): T {
  db.run('BEGIN');
  try {
    const resultado = fn();
    db.run('COMMIT');
    return resultado;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}
