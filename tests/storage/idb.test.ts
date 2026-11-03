import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { cargarBytes, guardarBytes } from '../../src/storage/idb';

describe('idb', () => {
  it('devuelve null si no hay nada guardado', async () => {
    expect(await cargarBytes()).toBeNull();
  });

  it('guarda y recupera los bytes', async () => {
    await guardarBytes(new Uint8Array([1, 2, 3]));
    expect(Array.from((await cargarBytes())!)).toEqual([1, 2, 3]);
  });

  it('sobrescribe el valor anterior', async () => {
    await guardarBytes(new Uint8Array([9]));
    expect(Array.from((await cargarBytes())!)).toEqual([9]);
  });
});
