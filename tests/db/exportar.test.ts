import { describe, it, expect } from 'vitest';
import { abrirDb } from '../../src/db/sqlite';
import { crearLista, totalLista } from '../../src/db/listas';
import { agregarProducto, marcarComprado } from '../../src/db/productos';
import { agregarOpcion, elegirOpcion } from '../../src/db/opciones';
import { datosParaExportar } from '../../src/db/exportar';
import { producto } from './ayuda';

async function escenario() {
  const db = await abrirDb();
  const lista = crearLista(db, 'Casa', 1000);
  const tv = agregarProducto(db, lista, producto({ nombre: 'TV', cantidad: 2, categoria: 'Electro', prioridad: 'alta', notas: 'de 43"' }));
  const a = agregarOpcion(db, tv, { tienda: 'A', precio: 300, link: 'https://a.com/tv' });
  const b = agregarOpcion(db, tv, { tienda: 'B', precio: 250, link: 'https://b.com/tv' });
  const mesa = agregarProducto(db, lista, producto({ nombre: 'Mesa', cantidad: 1 }));
  return { db, lista, tv, a, b, mesa };
}

describe('datosParaExportar', () => {
  it('sin opción elegida usa la más barata y lista las demás', async () => {
    const { db, lista } = await escenario();
    const [l] = datosParaExportar(db, lista);
    const tv = l.productos.find((p) => p.producto === 'TV')!;
    expect(tv).toMatchObject({ categoria: 'Electro', cantidad: 2, prioridad: 'alta', tienda: 'B', precioUnitario: 250, subtotal: 500, link: 'https://b.com/tv', notas: 'de 43"', comprado: false });
    expect(tv.otrasOpciones).toEqual([{ tienda: 'A', precio: 300, link: 'https://a.com/tv' }]);
  });

  it('con una opción elegida usa esa, aunque sea más cara', async () => {
    const { db, lista, tv, a } = await escenario();
    elegirOpcion(db, tv, a);
    const [l] = datosParaExportar(db, lista);
    const fila = l.productos.find((p) => p.producto === 'TV')!;
    expect(fila).toMatchObject({ tienda: 'A', precioUnitario: 300, subtotal: 600, link: 'https://a.com/tv' });
    expect(fila.otrasOpciones).toEqual([{ tienda: 'B', precio: 250, link: 'https://b.com/tv' }]);
  });

  it('un producto sin opciones queda con precio 0 y sin tienda', async () => {
    const { db, lista } = await escenario();
    const [l] = datosParaExportar(db, lista);
    expect(l.productos.find((p) => p.producto === 'Mesa')).toMatchObject({ tienda: '', precioUnitario: 0, subtotal: 0, link: '', otrasOpciones: [] });
  });

  it('sin enlace en la opción vigente usa el enlace del producto', async () => {
    const db = await abrirDb();
    const lista = crearLista(db, 'L', null);
    const p = agregarProducto(db, lista, producto({ nombre: 'Cama', link: 'https://tienda.cl/cama' }));
    const o = agregarOpcion(db, p, { tienda: 'ABC', precio: 100, link: '' });
    elegirOpcion(db, p, o);
    expect(datosParaExportar(db, lista)[0].productos[0]).toMatchObject({ tienda: 'ABC', link: 'https://tienda.cl/cama' });
  });

  it('el enlace de la opción vigente tiene prioridad sobre el del producto', async () => {
    const db = await abrirDb();
    const lista = crearLista(db, 'L', null);
    const p = agregarProducto(db, lista, producto({ nombre: 'Cama', link: 'https://tienda.cl/cama' }));
    agregarOpcion(db, p, { tienda: 'ABC', precio: 100, link: 'https://abc.cl/cama' });
    expect(datosParaExportar(db, lista)[0].productos[0].link).toBe('https://abc.cl/cama');
  });

  it('los totales de la lista coinciden con la regla del total y cuentan los comprados', async () => {
    const { db, lista, mesa } = await escenario();
    marcarComprado(db, mesa, true);
    const [l] = datosParaExportar(db, lista);
    expect(l).toMatchObject({ nombre: 'Casa', tope: 1000, total: totalLista(db, lista), disponible: 500, comprados: 1 });
    expect(l.total).toBe(500);
  });

  it('sin tope no hay disponible', async () => {
    const db = await abrirDb();
    const lista = crearLista(db, 'Libre', null);
    const [l] = datosParaExportar(db, lista);
    expect(l).toMatchObject({ tope: null, disponible: null, total: 0, productos: [] });
  });

  it('sin id devuelve todas las listas, de la más antigua a la más reciente', async () => {
    const db = await abrirDb();
    crearLista(db, 'Primera', null);
    crearLista(db, 'Segunda', null);
    expect(datosParaExportar(db).map((l) => l.nombre)).toEqual(['Primera', 'Segunda']);
  });

  it('con un id inexistente devuelve una lista vacía', async () => {
    const db = await abrirDb();
    expect(datosParaExportar(db, 999)).toEqual([]);
  });
});
