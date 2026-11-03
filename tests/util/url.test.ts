import { describe, it, expect } from 'vitest';
import { normalizarUrl } from '../../src/util/url';

describe('normalizarUrl', () => {
  it('conserva http y https', () => {
    expect(normalizarUrl('http://x.com/a')).toBe('http://x.com/a');
    expect(normalizarUrl(' https://x.com ')).toBe('https://x.com/');
  });

  it('añade https:// si falta el esquema', () => {
    expect(normalizarUrl('example.com/a')).toBe('https://example.com/a');
  });

  it('rechaza esquemas peligrosos o distintos de http(s)', () => {
    expect(normalizarUrl('javascript:alert(1)')).toBeNull();
    expect(normalizarUrl('data:text/html,hola')).toBeNull();
    expect(normalizarUrl('mailto:a@b.c')).toBeNull();
  });

  it('rechaza textos con espacios o sin dominio (no son páginas de una tienda)', () => {
    expect(normalizarUrl('hola mundo')).toBeNull();
    expect(normalizarUrl('https://hola mundo')).toBeNull();
    expect(normalizarUrl('https://www.abc.cl/cama roja')).toBeNull();
    expect(normalizarUrl('tienda')).toBeNull();
    expect(normalizarUrl('https://tienda')).toBeNull();
  });

  it('acepta direcciones con punto en el dominio, con ruta y parámetros', () => {
    expect(normalizarUrl('www.abc.cl/cama?x=1&y=2')).toBe('https://www.abc.cl/cama?x=1&y=2');
    expect(normalizarUrl('https://sub.tienda.com.ar/p/1')).toBe('https://sub.tienda.com.ar/p/1');
  });

  it('devuelve null para vacío o basura', () => {
    expect(normalizarUrl('')).toBeNull();
    expect(normalizarUrl('   ')).toBeNull();
    expect(normalizarUrl('http://')).toBeNull();
  });
});
