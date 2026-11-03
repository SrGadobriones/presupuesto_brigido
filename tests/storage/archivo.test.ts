import { describe, it, expect } from 'vitest';
import { abrirDb, cargarSql, filas } from '../../src/db/sqlite';
import { crearLista, eliminarLista, obtenerLista } from '../../src/db/listas';
import { agregarProducto, obtenerFoto, obtenerProducto } from '../../src/db/productos';
import { agregarOpcion, listarOpciones } from '../../src/db/opciones';
import { exportarBytes, importarBytes } from '../../src/storage/archivo';
import { producto } from '../db/ayuda';

describe('exportar / importar', () => {
  it('ida y vuelta conserva listas, productos, fotos y opciones', async () => {
    const db = await abrirDb();
    const lista = crearLista(db, 'Casa', 1000);
    const id = agregarProducto(db, lista, producto({ nombre: 'TV', cantidad: 2 }), new Uint8Array([7, 7]));
    agregarOpcion(db, id, { tienda: 'A', precio: 300, link: 'https://a.com' });

    const importada = await importarBytes(exportarBytes(db));

    expect(obtenerLista(importada, lista)).toMatchObject({ nombre: 'Casa', tope: 1000, total: 600 });
    expect(obtenerProducto(importada, id)).toMatchObject({ nombre: 'TV', cantidad: 2 });
    expect(Array.from(obtenerFoto(importada, id)!)).toEqual([7, 7]);
    expect(listarOpciones(importada, id)).toHaveLength(1);
  });

  it('exportar no desactiva las claves foráneas de la base en uso', async () => {
    const db = await abrirDb();
    const lista = crearLista(db, 'L', null);
    agregarProducto(db, lista, producto());
    exportarBytes(db);
    eliminarLista(db, lista);
    expect(filas(db, 'SELECT * FROM productos')).toHaveLength(0);
  });

  it('la base importada también tiene claves foráneas activas', async () => {
    const db = await abrirDb();
    const lista = crearLista(db, 'L', null);
    agregarProducto(db, lista, producto());
    const importada = await importarBytes(exportarBytes(db));
    eliminarLista(importada, lista);
    expect(filas(importada, 'SELECT * FROM productos')).toHaveLength(0);
  });

  it('rechaza archivos que no son SQLite', async () => {
    await expect(importarBytes(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow('no es una base SQLite válida');
  });

  it('rechaza bases SQLite ajenas a la app sin modificarlas', async () => {
    const SQL = await cargarSql();
    const ajena = new SQL.Database();
    ajena.run('CREATE TABLE otra (a INTEGER)');
    await expect(importarBytes(ajena.export())).rejects.toThrow('no pertenece a Presupuesto Brígido');
  });
});
