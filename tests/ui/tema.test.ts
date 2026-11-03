import { describe, it, expect } from 'vitest';
import { aplicarTema, esTema, guardarTema, leerTema, SIGUIENTE_TEMA } from '../../src/ui/tema';

function almacenFalso(inicial: Record<string, string> = {}) {
  const datos = { ...inicial };
  return {
    datos,
    getItem: (k: string) => datos[k] ?? null,
    setItem: (k: string, v: string) => {
      datos[k] = v;
    },
  };
}

function raizFalsa() {
  const atributos: Record<string, string> = {};
  return {
    atributos,
    setAttribute: (k: string, v: string) => {
      atributos[k] = v;
    },
    removeAttribute: (k: string) => {
      delete atributos[k];
    },
  };
}

describe('tema', () => {
  it('reconoce solo los tres temas válidos', () => {
    expect(['sistema', 'claro', 'oscuro'].every(esTema)).toBe(true);
    expect(esTema('azul')).toBe(false);
    expect(esTema(null)).toBe(false);
  });

  it('rota sistema → claro → oscuro → sistema', () => {
    expect(SIGUIENTE_TEMA.sistema).toBe('claro');
    expect(SIGUIENTE_TEMA.claro).toBe('oscuro');
    expect(SIGUIENTE_TEMA.oscuro).toBe('sistema');
  });

  it('lee el tema guardado y usa sistema por defecto', () => {
    expect(leerTema(almacenFalso({ tema: 'oscuro' }))).toBe('oscuro');
    expect(leerTema(almacenFalso())).toBe('sistema');
    expect(leerTema(almacenFalso({ tema: 'basura' }))).toBe('sistema');
  });

  it('no falla si el almacenamiento lanza o no existe', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(leerTema(roto)).toBe('sistema');
    expect(() => guardarTema('claro', roto)).not.toThrow();
    expect(leerTema(undefined)).toBe('sistema');
  });

  it('guarda el tema elegido', () => {
    const almacen = almacenFalso();
    guardarTema('claro', almacen);
    expect(almacen.datos.tema).toBe('claro');
  });

  it('aplica el atributo data-tema, salvo en modo sistema', () => {
    const raiz = raizFalsa();
    aplicarTema('oscuro', raiz);
    expect(raiz.atributos['data-tema']).toBe('oscuro');
    aplicarTema('claro', raiz);
    expect(raiz.atributos['data-tema']).toBe('claro');
    aplicarTema('sistema', raiz);
    expect(raiz.atributos['data-tema']).toBeUndefined();
  });
});
