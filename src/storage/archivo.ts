import type { Database } from 'sql.js';
import { activarClavesForaneas, cargarSql, filas } from '../db/sqlite';
import { migrar } from '../db/esquema';

const CABECERA_SQLITE = 'SQLite format 3\0';
const TABLAS_REQUERIDAS = ['listas', 'productos', 'opciones'];

/** Exporta la base. `db.export()` reabre la conexión y reinicia los PRAGMA, así que se reactivan. */
export function exportarBytes(db: Database): Uint8Array {
  const bytes = db.export();
  activarClavesForaneas(db);
  return bytes;
}

class ErrorImportacion extends Error {}

/** Abre un `.db` exportado por la app. Comprueba que sea de la app ANTES de migrar. */
export async function importarBytes(bytes: Uint8Array): Promise<Database> {
  if (new TextDecoder('latin1').decode(bytes.subarray(0, 16)) !== CABECERA_SQLITE) {
    throw new ErrorImportacion('El archivo no es una base SQLite válida');
  }
  const SQL = await cargarSql();
  let db: Database | null = null;
  try {
    db = new SQL.Database(bytes);
    const tablas = new Set(
      filas<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type = 'table'").map((t) => t.name),
    );
    if (!TABLAS_REQUERIDAS.every((t) => tablas.has(t))) {
      throw new ErrorImportacion('El archivo no pertenece a Presupuesto Brígido');
    }
    activarClavesForaneas(db);
    migrar(db);
    return db;
  } catch (error) {
    db?.close();
    throw error instanceof ErrorImportacion ? error : new ErrorImportacion('El archivo está dañado y no se pudo leer');
  }
}
