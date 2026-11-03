import { describe, it, expect } from 'vitest';
import { abrirDb, filas } from '../../src/db/sqlite';
import { crearLista } from '../../src/db/listas';
import { obtenerFoto, obtenerProducto } from '../../src/db/productos';
import { listarOpciones } from '../../src/db/opciones';
import { guardarProducto } from '../../src/db/guardar';
import { producto } from './ayuda';

const op = (precio: number, tienda: string) => ({ tienda, precio, link: '' });

describe('guardarProducto', () => {
  it('crea el producto con foto, opciones y la elegida por índice', async () => {
    const db = await abrirDb();
    const listaId = crearLista(db, 'L', null);
    const id = guardarProducto(db, {
      productoId: null,
      listaId,
      datos: producto({ nombre: 'TV' }),
      foto: new Uint8Array([1, 2]),
      opciones: [op(300, 'A'), op(200, 'B')],
      indiceElegida: 0,
    });
    expect(obtenerProducto(db, id)).toMatchObject({ nombre: 'TV', precioUnitario: 300, tieneFoto: true });
    expect(Array.from(obtenerFoto(db, id)!)).toEqual([1, 2]);
    expect(listarOpciones(db, id)).toHaveLength(2);
  });

  it('edita: reemplaza las opciones y la foto', async () => {
    const db = await abrirDb();
    const listaId = crearLista(db, 'L', null);
    const id = guardarProducto(db, {
      productoId: null,
      listaId,
      datos: producto({ nombre: 'TV' }),
      foto: new Uint8Array([1]),
      opciones: [op(300, 'A')],
      indiceElegida: null,
    });
    guardarProducto(db, {
      productoId: id,
      listaId,
      datos: producto({ nombre: 'TV 4K', cantidad: 2 }),
      foto: null,
      opciones: [op(500, 'C')],
      indiceElegida: null,
    });
    expect(obtenerProducto(db, id)).toMatchObject({ nombre: 'TV 4K', cantidad: 2, tieneFoto: false, precioUnitario: 500 });
    expect(listarOpciones(db, id).map((o) => o.tienda)).toEqual(['C']);
  });

  it('revierte todo si una opción es inválida', async () => {
    const db = await abrirDb();
    const listaId = crearLista(db, 'L', null);
    expect(() =>
      guardarProducto(db, {
        productoId: null,
        listaId,
        datos: producto({ nombre: 'TV' }),
        foto: null,
        opciones: [op(100, 'A'), op(-5, 'B')],
        indiceElegida: null,
      }),
    ).toThrow('El precio debe ser un número');
    expect(filas(db, 'SELECT * FROM productos')).toHaveLength(0);
    expect(filas(db, 'SELECT * FROM opciones')).toHaveLength(0);
  });
});
