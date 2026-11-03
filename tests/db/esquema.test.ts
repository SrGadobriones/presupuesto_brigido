import { describe, it, expect } from 'vitest';
import { abrirDb, cargarSql, enTransaccion, filas } from '../../src/db/sqlite';
import { MIGRACIONES } from '../../src/db/esquema';

describe('abrirDb', () => {
  it('crea las tablas y fija la versión del esquema', async () => {
    const db = await abrirDb();
    const tablas = filas<{ name: string }>(
      db,
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    ).map((t) => t.name);
    expect(tablas).toEqual(['listas', 'opciones', 'productos']);
    expect(filas<{ user_version: number }>(db, 'PRAGMA user_version')[0].user_version).toBe(MIGRACIONES.length);
  });

  it('activa las claves foráneas', async () => {
    const db = await abrirDb();
    expect(filas<{ foreign_keys: number }>(db, 'PRAGMA foreign_keys')[0].foreign_keys).toBe(1);
  });

  it('reabrir una base ya migrada conserva la versión y los datos', async () => {
    const db = await abrirDb();
    db.run("INSERT INTO listas (nombre) VALUES ('Casa')");
    const reabierta = await abrirDb(db.export());
    expect(filas<{ user_version: number }>(reabierta, 'PRAGMA user_version')[0].user_version).toBe(MIGRACIONES.length);
    expect(filas<{ nombre: string }>(reabierta, 'SELECT nombre FROM listas')).toEqual([{ nombre: 'Casa' }]);
  });
});

describe('migración desde una base antigua (versión 1)', () => {
  it('añade la columna link a los productos sin perder datos', async () => {
    // Una base como la que guardaban las versiones anteriores de la app: solo la migración 1.
    const SQL = await cargarSql();
    const vieja = new SQL.Database();
    vieja.exec(MIGRACIONES[0]);
    vieja.run('PRAGMA user_version = 1');
    vieja.run("INSERT INTO listas (nombre, tope) VALUES ('Casa', 500)");
    vieja.run("INSERT INTO productos (lista_id, nombre, cantidad) VALUES (1, 'TV', 2)");
    vieja.run("INSERT INTO opciones (producto_id, tienda, precio) VALUES (1, 'A', 300)");

    const db = await abrirDb(vieja.export());

    expect(filas<{ user_version: number }>(db, 'PRAGMA user_version')[0].user_version).toBe(MIGRACIONES.length);
    expect(filas(db, 'SELECT nombre, cantidad, link FROM productos')).toEqual([{ nombre: 'TV', cantidad: 2, link: '' }]);
    expect(filas(db, 'SELECT tienda, precio FROM opciones')).toEqual([{ tienda: 'A', precio: 300 }]);
  });
});

describe('enTransaccion', () => {
  it('confirma los cambios si la función termina bien', async () => {
    const db = await abrirDb();
    const resultado = enTransaccion(db, () => {
      db.run("INSERT INTO listas (nombre) VALUES ('a')");
      return 42;
    });
    expect(resultado).toBe(42);
    expect(filas(db, 'SELECT * FROM listas')).toHaveLength(1);
  });

  it('revierte la transacción si la función lanza', async () => {
    const db = await abrirDb();
    expect(() =>
      enTransaccion(db, () => {
        db.run("INSERT INTO listas (nombre) VALUES ('a')");
        throw new Error('falla');
      }),
    ).toThrow('falla');
    expect(filas(db, 'SELECT * FROM listas')).toHaveLength(0);
  });
});
