import type { Database } from 'sql.js';

/** Cada elemento migra de la versión i a la i + 1. Nunca se edita una migración ya publicada. */
export const MIGRACIONES: string[] = [
  `
  CREATE TABLE listas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tope REAL,
    creada_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lista_id INTEGER NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    categoria TEXT NOT NULL DEFAULT '',
    prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    notas TEXT NOT NULL DEFAULT '',
    comprado INTEGER NOT NULL DEFAULT 0,
    foto BLOB,
    opcion_elegida_id INTEGER
  );
  CREATE TABLE opciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tienda TEXT NOT NULL DEFAULT '',
    precio REAL NOT NULL CHECK (precio >= 0),
    link TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX idx_productos_lista ON productos(lista_id);
  CREATE INDEX idx_opciones_producto ON opciones(producto_id);
  `,
  // 2: enlace propio del producto (página del producto en la tienda), aparte de los enlaces de cada opción.
  `ALTER TABLE productos ADD COLUMN link TEXT NOT NULL DEFAULT '';`,
];

export function migrar(db: Database): void {
  const actual = Number(db.exec('PRAGMA user_version')[0].values[0][0]);
  for (let v = actual; v < MIGRACIONES.length; v++) {
    db.exec(MIGRACIONES[v]);
    db.run(`PRAGMA user_version = ${v + 1}`);
  }
}
