import { describe, it, expect } from 'vitest';
import { calcularDimensiones } from '../../src/util/imagen';

describe('calcularDimensiones', () => {
  it('no amplía imágenes pequeñas', () => {
    expect(calcularDimensiones(400, 300)).toEqual({ ancho: 400, alto: 300 });
  });

  it('reduce las apaisadas al ancho máximo conservando la proporción', () => {
    expect(calcularDimensiones(1600, 1200)).toEqual({ ancho: 800, alto: 600 });
  });

  it('reduce las verticales al alto máximo', () => {
    expect(calcularDimensiones(1200, 1600)).toEqual({ ancho: 600, alto: 800 });
  });

  it('nunca devuelve dimensiones menores que 1', () => {
    expect(calcularDimensiones(8000, 1)).toEqual({ ancho: 800, alto: 1 });
  });
});
