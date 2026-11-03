import { describe, it, expect } from 'vitest';
import { resumenPresupuesto } from '../../src/db/presupuesto';

describe('resumenPresupuesto', () => {
  it('sin tope no hay estado ni disponible', () => {
    expect(resumenPresupuesto(100, null)).toEqual({ estado: 'sin-tope', disponible: null, porcentaje: 0 });
  });

  it('está ok por debajo del 80 %', () => {
    expect(resumenPresupuesto(79, 100)).toEqual({ estado: 'ok', disponible: 21, porcentaje: 79 });
  });

  it('está cerca desde el 80 % hasta el tope inclusive', () => {
    expect(resumenPresupuesto(80, 100).estado).toBe('cerca');
    expect(resumenPresupuesto(100, 100)).toEqual({ estado: 'cerca', disponible: 0, porcentaje: 100 });
  });

  it('está excedido por encima del tope y limita el porcentaje a 100', () => {
    expect(resumenPresupuesto(150, 100)).toEqual({ estado: 'excedido', disponible: -50, porcentaje: 100 });
  });
});
