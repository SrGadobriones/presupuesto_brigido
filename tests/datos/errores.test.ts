import { describe, it, expect } from 'vitest';
import { mensajeErrorDatos } from '../../src/datos/errores';

const error = (code: string, message = '') => Object.assign(new Error(message || `Firebase: ${code}`), { code });

describe('mensajeErrorDatos', () => {
  it('permiso denegado: manda a publicar las reglas y a comprobar la base de datos', () => {
    const m = mensajeErrorDatos(error('permission-denied'));
    expect(m).toMatch(/reglas/i);
    expect(m).toMatch(/Publicar/);
    expect(m).toMatch(/Firestore Database/);
  });

  it('base de datos inexistente: dice cómo crearla', () => {
    const m = mensajeErrorDatos(error('not-found', 'The database (default) does not exist for project x'));
    expect(m).toMatch(/Crear base de datos/);
    expect(m).toMatch(/Firestore Database/);
  });

  it('sin conexión: lo explica sin alarmar', () => {
    expect(mensajeErrorDatos(error('unavailable'))).toMatch(/conexi/i);
  });

  it('cuota agotada: dice que vuelva mañana', () => {
    expect(mensajeErrorDatos(error('resource-exhausted'))).toMatch(/límite gratuito/i);
  });

  it('sesión vencida: pide entrar de nuevo', () => {
    expect(mensajeErrorDatos(error('unauthenticated'))).toMatch(/inicia sesión/i);
  });

  it('un error desconocido incluye su código para poder investigarlo', () => {
    expect(mensajeErrorDatos(error('algo-raro'))).toContain('algo-raro');
  });

  it('un valor que no es un error de Firebase no rompe nada', () => {
    expect(mensajeErrorDatos(undefined)).toMatch(/No se pudieron cargar/);
    expect(mensajeErrorDatos('texto')).toMatch(/No se pudieron cargar/);
  });
});
