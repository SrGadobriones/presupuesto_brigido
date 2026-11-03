import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { crearGuardador } from '../../src/storage/guardador';

describe('guardador', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('agrupa varias llamadas en una sola escritura', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    const g = crearGuardador(() => new Uint8Array([1]), escribir, () => {}, 500);
    g.programar();
    g.programar();
    g.programar();
    await vi.advanceTimersByTimeAsync(499);
    expect(escribir).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(escribir).toHaveBeenCalledTimes(1);
  });

  it('ahora() escribe de inmediato y cancela el temporizador', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    const g = crearGuardador(() => new Uint8Array([1]), escribir, () => {}, 500);
    g.programar();
    await g.ahora();
    expect(escribir).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(escribir).toHaveBeenCalledTimes(1);
  });

  it('ahora() no hace nada si no hay cambios pendientes', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    const g = crearGuardador(() => new Uint8Array([1]), escribir, () => {}, 500);
    await g.ahora();
    expect(escribir).not.toHaveBeenCalled();
  });

  it('informa el error si la escritura falla', async () => {
    const error = new Error('sin espacio');
    const alError = vi.fn();
    const g = crearGuardador(() => new Uint8Array([1]), vi.fn().mockRejectedValue(error), alError, 500);
    g.programar();
    await vi.advanceTimersByTimeAsync(500);
    expect(alError).toHaveBeenCalledWith(error);
  });
});
