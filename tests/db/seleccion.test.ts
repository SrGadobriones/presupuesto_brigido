import { describe, it, expect } from 'vitest';
import { abrirDb, filas } from '../../src/db/sqlite';
import { crearLista } from '../../src/db/listas';
import { agregarProducto, eliminarProductos, listarProductos, marcarCompradoVarios } from '../../src/db/productos';
import { agregarOpcion } from '../../src/db/opciones';
import { producto } from './ayuda';

async function conTres() {
  const db = await abrirDb();
  const lista = crearLista(db, 'L', null);
  const a = agregarProducto(db, lista, producto({ nombre: 'A' }));
  const b = agregarProducto(db, lista, producto({ nombre: 'B' }));
  const c = agregarProducto(db, lista, producto({ nombre: 'C' }));
  return { db, lista, a, b, c };
}

const estado = (db: Awaited<ReturnType<typeof abrirDb>>, lista: number) =>
  Object.fromEntries(listarProductos(db, lista).map((p) => [p.nombre, p.comprado]));

describe('marcarCompradoVarios', () => {
  it('marca solo los indicados y luego los devuelve a pendiente', async () => {
    const { db, lista, a, c } = await conTres();
    marcarCompradoVarios(db, [a, c], true);
    expect(estado(db, lista)).toEqual({ A: true, B: false, C: true });
    marcarCompradoVarios(db, [a], false);
    expect(estado(db, lista)).toEqual({ A: false, B: false, C: true });
  });

  it('no hace nada con una lista vacía', async () => {
    const { db, lista } = await conTres();
    marcarCompradoVarios(db, [], true);
    expect(estado(db, lista)).toEqual({ A: false, B: false, C: false });
  });
});

describe('eliminarProductos', () => {
  it('elimina solo los indicados, con sus opciones', async () => {
    const { db, lista, a, b, c } = await conTres();
    agregarOpcion(db, a, { tienda: 'T', precio: 10, link: '' });
    agregarOpcion(db, b, { tienda: 'T', precio: 20, link: '' });
    eliminarProductos(db, [a, c]);
    expect(listarProductos(db, lista).map((p) => p.nombre)).toEqual(['B']);
    expect(filas<{ producto_id: number }>(db, 'SELECT producto_id FROM opciones')).toEqual([{ producto_id: b }]);
  });

  it('no hace nada con una lista vacía', async () => {
    const { db, lista } = await conTres();
    eliminarProductos(db, []);
    expect(listarProductos(db, lista)).toHaveLength(3);
  });
});
