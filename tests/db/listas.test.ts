import { describe, it, expect } from 'vitest';
import { abrirDb } from '../../src/db/sqlite';
import { actualizarLista, crearLista, eliminarLista, listarListas, obtenerLista, totalLista } from '../../src/db/listas';

describe('listas', () => {
  it('crea una lista y la lista con total 0 y sin productos', async () => {
    const db = await abrirDb();
    const id = crearLista(db, '  Casa nueva ', 500);
    const lista = obtenerLista(db, id);
    expect(lista).toMatchObject({ id, nombre: 'Casa nueva', tope: 500, total: 0, productos: 0 });
    expect(totalLista(db, id)).toBe(0);
  });

  it('lista primero la más reciente', async () => {
    const db = await abrirDb();
    crearLista(db, 'Primera', null);
    crearLista(db, 'Segunda', null);
    expect(listarListas(db).map((l) => l.nombre)).toEqual(['Segunda', 'Primera']);
  });

  it('rechaza nombre vacío y tope no positivo', async () => {
    const db = await abrirDb();
    expect(() => crearLista(db, '   ', null)).toThrow('El nombre es obligatorio');
    expect(() => crearLista(db, 'x', 0)).toThrow('El tope debe ser mayor que 0');
    expect(() => crearLista(db, 'x', NaN)).toThrow('El tope debe ser mayor que 0');
  });

  it('actualiza nombre y tope', async () => {
    const db = await abrirDb();
    const id = crearLista(db, 'Vieja', 100);
    actualizarLista(db, id, 'Nueva', null);
    expect(obtenerLista(db, id)).toMatchObject({ nombre: 'Nueva', tope: null });
  });

  it('elimina una lista', async () => {
    const db = await abrirDb();
    const id = crearLista(db, 'Borrar', null);
    eliminarLista(db, id);
    expect(obtenerLista(db, id)).toBeNull();
  });
});
