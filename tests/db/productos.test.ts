import { describe, it, expect } from 'vitest';
import { abrirDb } from '../../src/db/sqlite';
import { crearLista } from '../../src/db/listas';
import {
  actualizarProducto,
  agregarProducto,
  eliminarProducto,
  guardarFoto,
  listarCategorias,
  listarProductos,
  marcarComprado,
  obtenerFoto,
  obtenerProducto,
} from '../../src/db/productos';
import { agregarOpcion, elegirOpcion } from '../../src/db/opciones';
import { producto } from './ayuda';

async function nueva() {
  const db = await abrirDb();
  const lista = crearLista(db, 'Lista', null);
  return { db, lista };
}

describe('productos', () => {
  it('agrega un producto con valores por defecto y precio 0 sin opciones', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto({ nombre: ' Cafetera ', cantidad: 2 }));
    expect(obtenerProducto(db, id)).toEqual({
      id,
      listaId: lista,
      nombre: 'Cafetera',
      cantidad: 2,
      categoria: '',
      prioridad: 'media',
      notas: '',
      link: '',
      enlace: '',
      comprado: false,
      tieneFoto: false,
      opcionElegidaId: null,
      precioUnitario: 0,
    });
  });

  it('guarda el enlace del producto (sin espacios sobrantes) y permite cambiarlo o quitarlo', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto({ link: '  https://www.abc.cl/cama?x=1&y=2  ' }));
    expect(obtenerProducto(db, id)?.link).toBe('https://www.abc.cl/cama?x=1&y=2');
    actualizarProducto(db, id, producto({ link: 'https://otra.com/p' }));
    expect(obtenerProducto(db, id)?.link).toBe('https://otra.com/p');
    actualizarProducto(db, id, producto({ link: '' }));
    expect(obtenerProducto(db, id)?.link).toBe('');
  });

  describe('enlace vigente (el que abre el botón "Abrir" de la lista)', () => {
    const conOpciones = async (linkProducto: string) => {
      const { db, lista } = await nueva();
      const id = agregarProducto(db, lista, producto({ link: linkProducto }));
      return { db, lista, id };
    };

    it('sin opciones usa el enlace del producto', async () => {
      const { db, id } = await conOpciones('https://p.cl/x');
      expect(obtenerProducto(db, id)?.enlace).toBe('https://p.cl/x');
    });

    it('sin nada es una cadena vacía', async () => {
      const { db, id } = await conOpciones('');
      expect(obtenerProducto(db, id)?.enlace).toBe('');
    });

    it('sin opción elegida usa el enlace de la más barata', async () => {
      const { db, id } = await conOpciones('https://p.cl/x');
      agregarOpcion(db, id, { tienda: 'Cara', precio: 300, link: 'https://cara.cl' });
      agregarOpcion(db, id, { tienda: 'Barata', precio: 100, link: 'https://barata.cl' });
      expect(obtenerProducto(db, id)?.enlace).toBe('https://barata.cl');
    });

    it('con opción elegida usa el de esa, aunque no sea la más barata', async () => {
      const { db, id } = await conOpciones('https://p.cl/x');
      agregarOpcion(db, id, { tienda: 'Barata', precio: 100, link: 'https://barata.cl' });
      const cara = agregarOpcion(db, id, { tienda: 'Cara', precio: 300, link: 'https://cara.cl' });
      elegirOpcion(db, id, cara);
      expect(obtenerProducto(db, id)?.enlace).toBe('https://cara.cl');
    });

    it('si la tienda vigente no tiene enlace cae al del producto', async () => {
      const { db, id } = await conOpciones('https://p.cl/x');
      agregarOpcion(db, id, { tienda: 'Sin enlace', precio: 100, link: '' });
      expect(obtenerProducto(db, id)?.enlace).toBe('https://p.cl/x');
    });

    it('también viene en el listado de la lista', async () => {
      const { db, lista, id } = await conOpciones('https://p.cl/x');
      agregarOpcion(db, id, { tienda: 'T', precio: 1, link: 'https://t.cl' });
      expect(listarProductos(db, lista)[0].enlace).toBe('https://t.cl');
    });
  });

  it('rechaza nombre vacío y cantidades inválidas', async () => {
    const { db, lista } = await nueva();
    expect(() => agregarProducto(db, lista, producto({ nombre: ' ' }))).toThrow('El nombre es obligatorio');
    expect(() => agregarProducto(db, lista, producto({ cantidad: 0 }))).toThrow('La cantidad debe ser un entero');
    expect(() => agregarProducto(db, lista, producto({ cantidad: 1.5 }))).toThrow('La cantidad debe ser un entero');
  });

  it('ordena por categoría, luego prioridad y luego nombre', async () => {
    const { db, lista } = await nueva();
    agregarProducto(db, lista, producto({ nombre: 'Lámpara', categoria: 'Hogar', prioridad: 'baja' }));
    agregarProducto(db, lista, producto({ nombre: 'Sofá', categoria: 'Hogar', prioridad: 'alta' }));
    agregarProducto(db, lista, producto({ nombre: 'Pilas', categoria: '', prioridad: 'media' }));
    expect(listarProductos(db, lista).map((p) => p.nombre)).toEqual(['Pilas', 'Sofá', 'Lámpara']);
  });

  it('actualiza los datos de un producto', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto({ nombre: 'A' }));
    actualizarProducto(db, id, producto({ nombre: 'B', cantidad: 3, prioridad: 'alta', categoria: 'Cocina', notas: 'urgente' }));
    expect(obtenerProducto(db, id)).toMatchObject({ nombre: 'B', cantidad: 3, prioridad: 'alta', categoria: 'Cocina', notas: 'urgente' });
  });

  it('marca y desmarca como comprado', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto());
    marcarComprado(db, id, true);
    expect(obtenerProducto(db, id)?.comprado).toBe(true);
    marcarComprado(db, id, false);
    expect(obtenerProducto(db, id)?.comprado).toBe(false);
  });

  it('guarda, lee y quita la foto', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto());
    expect(obtenerFoto(db, id)).toBeNull();
    guardarFoto(db, id, new Uint8Array([1, 2, 3]));
    expect(obtenerProducto(db, id)?.tieneFoto).toBe(true);
    expect(Array.from(obtenerFoto(db, id)!)).toEqual([1, 2, 3]);
    guardarFoto(db, id, null);
    expect(obtenerProducto(db, id)?.tieneFoto).toBe(false);
    expect(obtenerFoto(db, id)).toBeNull();
  });

  it('acepta la foto al crear el producto', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto(), new Uint8Array([9, 8]));
    expect(Array.from(obtenerFoto(db, id)!)).toEqual([9, 8]);
  });

  it('elimina un producto', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto());
    eliminarProducto(db, id);
    expect(obtenerProducto(db, id)).toBeNull();
  });

  it('lista las categorías distintas, sin vacías y ordenadas', async () => {
    const { db, lista } = await nueva();
    agregarProducto(db, lista, producto({ categoria: 'Hogar' }));
    agregarProducto(db, lista, producto({ categoria: 'Cocina' }));
    agregarProducto(db, lista, producto({ categoria: 'Hogar' }));
    agregarProducto(db, lista, producto({ categoria: '' }));
    expect(listarCategorias(db, lista)).toEqual(['Cocina', 'Hogar']);
  });
});
