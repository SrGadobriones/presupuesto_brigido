import { describe, it, expect } from 'vitest';
import initSqlJs from 'sql.js';

describe('sql.js', () => {
  it('ejecuta una consulta en memoria', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const resultado = db.exec('SELECT 1 AS x');
    expect(resultado[0].values[0][0]).toBe(1);
  });
});
