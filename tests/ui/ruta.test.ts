import { describe, it, expect } from 'vitest';
import { debeVolverArriba, hrefInicio, hrefLista, hrefProducto, parsearRuta } from '../../src/ui/ruta';

describe('parsearRuta', () => {
  it('vacío o desconocido va al inicio', () => {
    expect(parsearRuta('')).toEqual({ vista: 'inicio' });
    expect(parsearRuta('#/')).toEqual({ vista: 'inicio' });
    expect(parsearRuta('#/otra/cosa')).toEqual({ vista: 'inicio' });
    expect(parsearRuta('#/lista/abc!')).toEqual({ vista: 'inicio' });
  });

  it('reconoce una lista', () => {
    expect(parsearRuta('#/lista/3')).toEqual({ vista: 'lista', listaId: '3' });
    expect(parsearRuta('#/lista/FirebaseId_01')).toEqual({ vista: 'lista', listaId: 'FirebaseId_01' });
  });

  it('reconoce un producto nuevo y uno existente', () => {
    expect(parsearRuta('#/lista/3/producto/nuevo')).toEqual({ vista: 'producto', listaId: '3', productoId: null });
    expect(parsearRuta('#/lista/3/producto/7')).toEqual({ vista: 'producto', listaId: '3', productoId: '7' });
  });

  it('los href generados se parsean de vuelta', () => {
    expect(parsearRuta(hrefInicio())).toEqual({ vista: 'inicio' });
    expect(parsearRuta(hrefLista('5'))).toEqual({ vista: 'lista', listaId: '5' });
    expect(parsearRuta(hrefProducto('5', null))).toEqual({ vista: 'producto', listaId: '5', productoId: null });
    expect(parsearRuta(hrefProducto('5', '9'))).toEqual({ vista: 'producto', listaId: '5', productoId: '9' });
  });
});

describe('debeVolverArriba', () => {
  const inicio = parsearRuta('#/');
  const lista3 = parsearRuta('#/lista/3');
  const producto3 = parsearRuta('#/lista/3/producto/7');
  const lista4 = parsearRuta('#/lista/4');

  it('no se mueve al abrir o cerrar el producto sobre la misma lista', () => {
    expect(debeVolverArriba(lista3, producto3)).toBe(false);
    expect(debeVolverArriba(producto3, lista3)).toBe(false);
  });

  it('vuelve arriba al cambiar de pantalla o de lista', () => {
    expect(debeVolverArriba(inicio, lista3)).toBe(true);
    expect(debeVolverArriba(lista3, inicio)).toBe(true);
    expect(debeVolverArriba(lista3, lista4)).toBe(true);
    expect(debeVolverArriba(producto3, lista4)).toBe(true);
  });
});
