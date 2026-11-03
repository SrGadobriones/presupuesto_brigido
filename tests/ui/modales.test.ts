import { describe, it, expect } from 'vitest';
import { cerrarModalSuperior, registrarModal } from '../../src/ui/modales';

describe('modales abiertos (botón atrás)', () => {
  it('sin modales no cierra nada', () => {
    expect(cerrarModalSuperior()).toBe(false);
  });

  it('cierra primero el último que se abrió', () => {
    const cerrados: string[] = [];
    const quitarA = registrarModal(() => cerrados.push('editar'));
    const quitarB = registrarModal(() => cerrados.push('confirmar'));
    expect(cerrarModalSuperior()).toBe(true);
    expect(cerrados).toEqual(['confirmar']);
    quitarB(); // al cerrarse, el modal se da de baja
    expect(cerrarModalSuperior()).toBe(true);
    expect(cerrados).toEqual(['confirmar', 'editar']);
    quitarA();
    expect(cerrarModalSuperior()).toBe(false);
  });

  it('dar de baja dos veces no rompe la pila', () => {
    const quitar = registrarModal(() => {});
    quitar();
    quitar();
    expect(cerrarModalSuperior()).toBe(false);
  });
});
