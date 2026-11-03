import { describe, it, expect } from 'vitest';
import { compararVersiones, idDesdeHtml } from '../../src/ui/actualizar';

describe('buscar actualizaciones', () => {
  it('lee el id de compilación del HTML publicado', () => {
    expect(idDesdeHtml('<head><meta charset="utf-8"><meta name="build-id" content="mh3k9a"></head>')).toBe('mh3k9a');
    expect(idDesdeHtml('<head></head>')).toBeNull();
  });

  it('hay versión nueva solo si el id publicado es distinto', () => {
    expect(compararVersiones('a1', 'a1')).toBe('al-dia');
    expect(compararVersiones('a1', 'b2')).toBe('nueva');
    expect(compararVersiones(null, 'b2')).toBe('nueva'); // la página en ejecución es anterior a este mecanismo
    expect(compararVersiones('a1', null)).toBe('al-dia'); // sin id publicado no se puede afirmar nada
  });
});
