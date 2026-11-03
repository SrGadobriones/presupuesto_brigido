import { describe, it, expect } from 'vitest';
import { mensajeErrorAcceso } from '../../src/sesion/errores';

const error = (code: string) => Object.assign(new Error(`Firebase: Error (${code}).`), { code });

describe('mensajeErrorAcceso', () => {
  it('ventana bloqueada: explica cómo permitirla', () => {
    expect(mensajeErrorAcceso(error('auth/popup-blocked'), 'localhost')).toMatch(/bloque/i);
    expect(mensajeErrorAcceso(error('auth/popup-blocked'), 'localhost')).toMatch(/ventanas emergentes/i);
  });

  it('si el usuario cierra o cancela la ventana no es un error que avisar', () => {
    expect(mensajeErrorAcceso(error('auth/popup-closed-by-user'), 'localhost')).toBeNull();
    expect(mensajeErrorAcceso(error('auth/cancelled-popup-request'), 'localhost')).toBeNull();
  });

  it('dominio sin autorizar: nombra el dominio y dónde añadirlo', () => {
    const m = mensajeErrorAcceso(error('auth/unauthorized-domain'), 'usuario.github.io')!;
    expect(m).toContain('usuario.github.io');
    expect(m).toMatch(/Authorized domains/);
  });

  it('acceso con Google sin activar o Authentication sin iniciar: dice dónde activarlo', () => {
    for (const code of ['auth/operation-not-allowed', 'auth/configuration-not-found']) {
      expect(mensajeErrorAcceso(error(code), 'localhost')).toMatch(/Authentication.*Sign-in method.*Google/s);
    }
  });

  it('sin red: lo dice con claridad', () => {
    expect(mensajeErrorAcceso(error('auth/network-request-failed'), 'localhost')).toMatch(/conexi/i);
  });

  it('clave de API inválida: remite al archivo de configuración', () => {
    expect(mensajeErrorAcceso(error('auth/invalid-api-key'), 'localhost')).toMatch(/config\.ts/);
  });

  it('un error desconocido incluye su código para poder investigarlo', () => {
    expect(mensajeErrorAcceso(error('auth/algo-raro'), 'localhost')).toContain('auth/algo-raro');
  });

  it('un valor que no es un error de Firebase no rompe nada', () => {
    expect(mensajeErrorAcceso('texto suelto', 'localhost')).toMatch(/No se pudo iniciar sesión/);
    expect(mensajeErrorAcceso(undefined, 'localhost')).toMatch(/No se pudo iniciar sesión/);
  });
});
