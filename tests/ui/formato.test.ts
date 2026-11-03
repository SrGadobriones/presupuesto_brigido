import { describe, it, expect } from 'vitest';
import { fechaLocal, formatearPrecio, mensajeError, parsearNumero } from '../../src/ui/formato';

describe('formato', () => {
  it('formatea precios con prefijo $ y coma decimal', () => {
    expect(formatearPrecio(1234.5)).toMatch(/^\$1\.?234,5$/);
    expect(formatearPrecio(0)).toBe('$0');
  });

  it('parsea números con coma o punto', () => {
    expect(parsearNumero('12,5')).toBe(12.5);
    expect(parsearNumero(' 7 ')).toBe(7);
    expect(parsearNumero('')).toBeNull();
    expect(parsearNumero('abc')).toBeNaN();
  });

  it('da la fecha local AAAA-MM-DD, no la UTC (a las 23:30 sigue siendo el mismo día)', () => {
    expect(fechaLocal(new Date(2026, 10, 3, 23, 30))).toBe('2026-11-03');
    expect(fechaLocal(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('extrae el mensaje de un Error o usa el valor por defecto', () => {
    expect(mensajeError(new Error('boom'), 'x')).toBe('boom');
    expect(mensajeError('texto', 'por defecto')).toBe('por defecto');
  });
});
