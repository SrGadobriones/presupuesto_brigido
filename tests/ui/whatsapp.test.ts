import { describe, it, expect } from 'vitest';
import type { Producto } from '../../src/dominio/tipos';
import { leerTextoWhatsapp, textoWhatsapp, enlaceWhatsapp } from '../../src/ui/whatsapp';

const producto = (p: Partial<Producto> & { nombre: string; precio: number }): Producto => ({
  id: p.nombre, listaId: 'l', nombre: p.nombre, cantidad: p.cantidad ?? 1, categoria: p.categoria ?? '',
  prioridad: p.prioridad ?? 'media', notas: p.notas ?? '', link: p.link ?? '', comprado: p.comprado ?? false,
  opcionElegidaId: null, opciones: [{ id: 'o', tienda: '', precio: p.precio, link: '' }], tieneFoto: false, miniatura: null,
});

describe('whatsapp', () => {
  const productos = [
    producto({ nombre: 'cama rosen', precio: 500, prioridad: 'alta', categoria: 'Dormitorio', link: 'https://x.cl/cama', notas: 'color gris' }),
    producto({ nombre: 'sábanas', precio: 12500, cantidad: 2, comprado: true, categoria: 'Dormitorio' }),
    producto({ nombre: 'lámpara x2 grande', precio: 1234.5, prioridad: 'baja' }),
  ];
  const texto = textoWhatsapp({ nombre: 'Casa *nueva*', tope: 2000000 }, productos);

  it('genera un texto legible con tope, categorías y total', () => {
    expect(texto).toContain('*Casa nueva*');
    expect(texto).toContain('Tope: $2.000.000');
    expect(texto).toContain('✅ sábanas x2 — $12.500 c/u · Media');
    expect(texto).toContain('*Sin categoría*');
    expect(texto).toMatch(/Total: \$/);
  });

  it('lo exportado se vuelve a leer igual', () => {
    const l = leerTextoWhatsapp(texto);
    expect(l.nombre).toBe('Casa nueva');
    expect(l.tope).toBe(2000000);
    expect(l.productos).toEqual([
      { nombre: 'cama rosen', cantidad: 1, categoria: 'Dormitorio', prioridad: 'alta', precio: 500, link: 'https://x.cl/cama', notas: 'color gris', comprado: false },
      { nombre: 'sábanas', cantidad: 2, categoria: 'Dormitorio', prioridad: 'media', precio: 12500, link: '', notas: '', comprado: true },
      { nombre: 'lámpara x2 grande', cantidad: 1, categoria: '', prioridad: 'baja', precio: 1234.5, link: '', notas: '', comprado: false },
    ]);
  });

  it('rechaza un texto sin productos', () => {
    expect(() => leerTextoWhatsapp('hola, ¿cómo estás?')).toThrow(/No se encontraron productos/);
  });

  it('arma el enlace de WhatsApp con el texto codificado', () => {
    expect(enlaceWhatsapp('a b\nc')).toBe('https://wa.me/?text=a%20b%0Ac');
  });
});
