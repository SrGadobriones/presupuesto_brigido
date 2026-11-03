import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ESPERA_DESHACER_MS, confirmarPendiente, deshacerEliminacion, idsOcultos, mensajePendiente, programarEliminacion,
} from '../../src/ui/eliminaciones';

const eliminacion = (ids: string[], ejecutar = vi.fn(async () => {}), alFallar = vi.fn()) => ({
  ids, mensaje: 'Lista eliminada', ejecutar, alFallar,
});

describe('eliminaciones con deshacer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    await confirmarPendiente();
    vi.useRealTimers();
  });

  it('oculta los elementos y no borra hasta que pasa el tiempo', async () => {
    const e = eliminacion(['a', 'b']);
    programarEliminacion(e);
    expect([...idsOcultos()].sort()).toEqual(['a', 'b']);
    expect(mensajePendiente()).toBe('Lista eliminada');
    expect(e.ejecutar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(ESPERA_DESHACER_MS);
    expect(e.ejecutar).toHaveBeenCalledTimes(1);
    expect(idsOcultos().size).toBe(0); // ya borrado de verdad: nada que ocultar
    expect(mensajePendiente()).toBeNull();
  });

  it('deshacer vuelve a mostrar todo y no borra nunca', async () => {
    const e = eliminacion(['a']);
    programarEliminacion(e);
    deshacerEliminacion();
    expect(idsOcultos().size).toBe(0);
    await vi.advanceTimersByTimeAsync(ESPERA_DESHACER_MS * 2);
    expect(e.ejecutar).not.toHaveBeenCalled();
  });

  it('una eliminación nueva borra ya la anterior', async () => {
    const primera = eliminacion(['a']);
    const segunda = eliminacion(['b']);
    programarEliminacion(primera);
    programarEliminacion(segunda);
    expect(primera.ejecutar).toHaveBeenCalledTimes(1);
    expect(segunda.ejecutar).not.toHaveBeenCalled();
    expect(idsOcultos().has('b')).toBe(true);
  });

  it('si el borrado falla, avisa y los elementos reaparecen', async () => {
    const fallo = new Error('sin permiso');
    const e = eliminacion(['a'], vi.fn(async () => { throw fallo; }));
    programarEliminacion(e);
    await vi.advanceTimersByTimeAsync(ESPERA_DESHACER_MS);
    expect(e.alFallar).toHaveBeenCalledWith(fallo);
    expect(idsOcultos().size).toBe(0);
  });

  it('mientras se borra de verdad siguen ocultos para que no parpadeen', async () => {
    let terminar!: () => void;
    const e = eliminacion(['a'], vi.fn(() => new Promise<void>((r) => { terminar = r; })));
    programarEliminacion(e);
    await vi.advanceTimersByTimeAsync(ESPERA_DESHACER_MS);
    expect(idsOcultos().has('a')).toBe(true);
    terminar();
    await vi.advanceTimersByTimeAsync(0);
    expect(idsOcultos().size).toBe(0);
  });
});
