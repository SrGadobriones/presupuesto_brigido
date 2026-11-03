import { describe, it, expect } from 'vitest';
import { abrirDb, filas } from '../../src/db/sqlite';
import { crearLista, eliminarLista, totalLista } from '../../src/db/listas';
import { agregarProducto, eliminarProducto, marcarComprado, obtenerProducto } from '../../src/db/productos';
import {
  actualizarOpcion,
  agregarOpcion,
  eliminarOpcion,
  elegirOpcion,
  listarOpciones,
  reemplazarOpciones,
} from '../../src/db/opciones';
import { producto } from './ayuda';

async function conProducto(cantidad = 1) {
  const db = await abrirDb();
  const lista = crearLista(db, 'L', null);
  const id = agregarProducto(db, lista, producto({ nombre: 'TV', cantidad }));
  return { db, lista, id };
}
const op = (precio: number, tienda = 'T') => ({ tienda, precio, link: '' });

describe('regla del total', () => {
  it('sin opciones el precio es 0', async () => {
    const { db, lista, id } = await conProducto();
    expect(obtenerProducto(db, id)?.precioUnitario).toBe(0);
    expect(totalLista(db, lista)).toBe(0);
  });

  it('usa la opción más barata si no hay elegida', async () => {
    const { db, lista, id } = await conProducto();
    agregarOpcion(db, id, op(300));
    agregarOpcion(db, id, op(250));
    agregarOpcion(db, id, op(400));
    expect(obtenerProducto(db, id)?.precioUnitario).toBe(250);
    expect(totalLista(db, lista)).toBe(250);
  });

  it('usa la opción elegida aunque no sea la más barata', async () => {
    const { db, lista, id } = await conProducto();
    agregarOpcion(db, id, op(250));
    const cara = agregarOpcion(db, id, op(400));
    elegirOpcion(db, id, cara);
    expect(obtenerProducto(db, id)).toMatchObject({ opcionElegidaId: cara, precioUnitario: 400 });
    expect(totalLista(db, lista)).toBe(400);
  });

  it('elegir null vuelve al modo automático', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(250));
    const cara = agregarOpcion(db, id, op(400));
    elegirOpcion(db, id, cara);
    elegirOpcion(db, id, null);
    expect(obtenerProducto(db, id)?.precioUnitario).toBe(250);
  });

  it('multiplica por la cantidad y suma todos los productos, comprados o no', async () => {
    const { db, lista, id } = await conProducto(3);
    agregarOpcion(db, id, op(100));
    const otro = agregarProducto(db, lista, producto({ nombre: 'Mesa', cantidad: 2 }));
    agregarOpcion(db, otro, op(50));
    marcarComprado(db, otro, true);
    expect(totalLista(db, lista)).toBe(400);
  });

  it('redondea el total a 2 decimales', async () => {
    const { db, lista, id } = await conProducto();
    agregarOpcion(db, id, op(0.1));
    const otro = agregarProducto(db, lista, producto({ nombre: 'Otro' }));
    agregarOpcion(db, otro, op(0.2));
    expect(totalLista(db, lista)).toBe(0.3);
  });

  it('al eliminar la opción elegida vuelve a la más barata', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(250));
    const cara = agregarOpcion(db, id, op(400));
    elegirOpcion(db, id, cara);
    eliminarOpcion(db, cara);
    expect(obtenerProducto(db, id)).toMatchObject({ opcionElegidaId: null, precioUnitario: 250 });
  });
});

describe('opciones', () => {
  it('las lista de la más barata a la más cara', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(300, 'B'));
    agregarOpcion(db, id, op(100, 'A'));
    expect(listarOpciones(db, id).map((o) => o.tienda)).toEqual(['A', 'B']);
  });

  it('actualiza una opción', async () => {
    const { db, id } = await conProducto();
    const o = agregarOpcion(db, id, op(300, 'B'));
    actualizarOpcion(db, o, { tienda: ' Nueva ', precio: 120, link: 'https://x.com' });
    expect(listarOpciones(db, id)[0]).toMatchObject({ id: o, tienda: 'Nueva', precio: 120, link: 'https://x.com' });
  });

  it('rechaza precios negativos o no numéricos', async () => {
    const { db, id } = await conProducto();
    expect(() => agregarOpcion(db, id, op(-1))).toThrow('El precio debe ser un número');
    expect(() => agregarOpcion(db, id, op(NaN))).toThrow('El precio debe ser un número');
  });

  it('rechaza elegir una opción de otro producto', async () => {
    const { db, lista, id } = await conProducto();
    const otro = agregarProducto(db, lista, producto({ nombre: 'Otro' }));
    const ajena = agregarOpcion(db, otro, op(10));
    expect(() => elegirOpcion(db, id, ajena)).toThrow('La opción no pertenece al producto');
  });

  it('reemplazarOpciones sustituye todo y marca la elegida por índice', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(999));
    reemplazarOpciones(db, id, [op(300, 'A'), op(200, 'B')], 0);
    const opciones = listarOpciones(db, id);
    expect(opciones.map((o) => o.tienda)).toEqual(['B', 'A']);
    expect(obtenerProducto(db, id)).toMatchObject({ precioUnitario: 300 });
    reemplazarOpciones(db, id, [], null);
    expect(listarOpciones(db, id)).toEqual([]);
    expect(obtenerProducto(db, id)).toMatchObject({ opcionElegidaId: null, precioUnitario: 0 });
  });
});

describe('borrado en cascada', () => {
  it('eliminar un producto elimina sus opciones', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(10));
    eliminarProducto(db, id);
    expect(filas(db, 'SELECT * FROM opciones')).toHaveLength(0);
  });

  it('eliminar una lista elimina sus productos y opciones', async () => {
    const { db, lista, id } = await conProducto();
    agregarOpcion(db, id, op(10));
    eliminarLista(db, lista);
    expect(filas(db, 'SELECT * FROM productos')).toHaveLength(0);
    expect(filas(db, 'SELECT * FROM opciones')).toHaveLength(0);
  });
});
