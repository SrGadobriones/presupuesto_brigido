# Presupuesto Brígido — Plan de implementación

> **Para agentes:** SUB-HABILIDAD REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** App personal de presupuestos de compras, solo frontend, con SQLite en el navegador, desplegada en GitHub Pages.

**Arquitectura:** Astro sirve una única página que monta una isla Preact con `client:only`. La isla abre una base SQLite (sql.js) cuyo archivo completo se guarda en IndexedDB tras cada cambio. Toda la lógica de datos vive en `src/db/` (testeable en Node con sql.js en memoria); la UI solo llama a esas funciones.

**Stack:** Astro, Preact, sql.js, TypeScript, Vitest, fake-indexeddb (solo pruebas), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-03-presupuesto_brigido-design.md`

## Restricciones globales

- **Idioma:** español neutro con tuteo en TODO (UI, mensajes, comentarios, commits). Prohibido el voseo (`Agregá`, `tenés`, `acá`…). Preferir la forma impersonal ("No hay resultados").
- **Sin backend, sin CDN:** sql.js y su `.wasm` se sirven desde el propio sitio (el `.wasm` se importa con `?url` desde `node_modules`).
- **Todo el SQL vive en `src/db/`.** La UI y `storage/` no escriben SQL (salvo las consultas de validación de importación en `storage/archivo.ts`).
- **Regla del total:** precio de un producto = precio de la opción elegida; si no hay elegida, el de la opción más barata; si no tiene opciones, 0. Total de la lista = suma de precio × cantidad de todos los productos (comprados o no), redondeado a 2 decimales.
- **Prioridades:** `alta | media | baja`.
- **Gotcha sql.js:** `db.export()` reabre la base y reinicia los PRAGMA; hay que volver a ejecutar `PRAGMA foreign_keys = ON` tras cada export (lo hace `exportarBytes`).
- **Commits:** terminan con la línea `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (segundo `-m`).
- Ejecutar los comandos desde `C:\presupuesto_brigido` (en Git Bash: `/c/presupuesto_brigido`).

## Estructura de archivos

```
astro.config.mjs               base/site para GitHub Pages
vitest.config.ts
src/pages/index.astro          monta <Raiz client:only="preact" />
src/db/tipos.ts                tipos compartidos
src/db/esquema.ts              migraciones (PRAGMA user_version)
src/db/sqlite.ts               abrirDb, filas, idInsertado, enTransaccion
src/db/precio.ts               SQL de la regla del total
src/db/presupuesto.ts          resumenPresupuesto (estado/disponible/porcentaje)
src/db/listas.ts               CRUD de listas + total
src/db/productos.ts            CRUD de productos, fotos, categorías
src/db/opciones.ts             CRUD de opciones, elegir, reemplazar
src/db/guardar.ts              guardarProducto (producto + foto + opciones, transaccional)
src/storage/idb.ts             guardarBytes / cargarBytes en IndexedDB
src/storage/archivo.ts         exportarBytes / importarBytes
src/storage/descarga.ts        descargar / leerArchivo (DOM)
src/storage/guardador.ts       guardado con retardo
src/util/imagen.ts             reducir fotos a JPEG ~800 px
src/util/url.ts                normalizarUrl (solo http/https)
src/ui/estilos.css
src/ui/formato.ts              formatearPrecio, parsearNumero, mensajeError, ETIQUETA_PRIORIDAD
src/ui/ruta.ts                 router por hash
src/ui/contexto.tsx            contexto de la app
src/ui/useUrlFoto.ts           bytes -> object URL
src/ui/Raiz.tsx                arranque: carga/guarda la base, avisos, enrutado
src/ui/Inicio.tsx              listas
src/ui/BarraPresupuesto.tsx
src/ui/MenuDatos.tsx           exportar/importar
src/ui/PantallaLista.tsx       detalle de lista
src/ui/EditarLista.tsx
src/ui/FilaProducto.tsx
src/ui/Miniatura.tsx
src/ui/PantallaProducto.tsx    formulario de producto + opciones
tests/**                       Vitest (Node)
.github/workflows/deploy.yml
README.md
```

---

### Tarea 1: Andamiaje (Astro + Preact + Vitest)

**Archivos:**
- Crear: `package.json` (vía npm), `.gitignore`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/pages/index.astro`, `tests/sqljs.test.ts`
- Modificar: `docs/superpowers/specs/2026-11-03-presupuesto_brigido-design.md` (línea del wasm)

**Interfaces:**
- Produce: scripts `npm run dev | build | preview | test`; Vitest con `include: tests/**/*.test.ts` en entorno Node.

- [ ] **Paso 1: Inicializar e instalar dependencias**

```bash
cd /c/presupuesto_brigido
npm init -y
npm install astro @astrojs/preact preact sql.js
npm install -D vitest typescript @types/sql.js fake-indexeddb
```

- [ ] **Paso 2: Ajustar `package.json`**

Conserva `dependencies` y `devDependencies` generadas; deja estos campos (reemplaza `main`, `scripts`, y añade `type`):

```json
{
  "name": "presupuesto_brigido",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run"
  }
}
```

Elimina los campos `main`, `keywords`, `author`, `license` y `description` si `npm init` los creó.

- [ ] **Paso 3: Crear archivos de configuración**

`.gitignore`:
```
node_modules
dist
.astro
```

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// En GitHub Actions el sitio vive en https://<usuario>.github.io/<repo>/
const [propietario, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const enActions = Boolean(process.env.GITHUB_ACTIONS && repo);
const esPaginaDeUsuario = Boolean(repo?.endsWith('.github.io'));

export default defineConfig({
  integrations: [preact()],
  site: enActions ? `https://${propietario}.github.io` : undefined,
  base: enActions && !esPaginaDeUsuario ? `/${repo}` : '/',
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```

`src/pages/index.astro` (provisional; se reemplaza en la Tarea 7):
```astro
---
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Presupuesto Brígido</title>
  </head>
  <body>
    <p>Presupuesto Brígido</p>
  </body>
</html>
```

- [ ] **Paso 4: Prueba de humo de sql.js**

`tests/sqljs.test.ts`:
```ts
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
```

- [ ] **Paso 5: Verificar pruebas y build**

Run: `npm test`
Expected: `1 passed`.

Run: `npm run build`
Expected: termina sin errores y crea `dist/index.html`.

- [ ] **Paso 6: Actualizar la spec (el wasm se importa con `?url`)**

En `docs/superpowers/specs/2026-11-03-presupuesto_brigido-design.md`:
- Reemplaza la línea `sql.js se sirve localmente (\`public/sql-wasm.wasm\`), sin CDN.` por `sql.js se sirve localmente: el \`.wasm\` se importa con \`?url\` desde \`node_modules/sql.js/dist\` y Vite lo copia al build, sin CDN.`
- En el árbol de carpetas, elimina la línea `├─ public/sql-wasm.wasm`.

- [ ] **Paso 7: Commit**

```bash
git add -A
git commit -m "chore: andamiaje de Astro, Preact y Vitest" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 2: Capa de base de datos — esquema y utilidades

**Archivos:**
- Crear: `src/db/tipos.ts`, `src/db/esquema.ts`, `src/db/sqlite.ts`
- Prueba: `tests/db/esquema.test.ts`

**Interfaces:**
- Produce (`sqlite.ts`):
  - `cargarSql(locateFile?: (archivo: string) => string): Promise<SqlJsStatic>` (memoizado)
  - `abrirDb(datos?: Uint8Array, locateFile?: (archivo: string) => string): Promise<Database>` (activa FK y migra)
  - `activarClavesForaneas(db: Database): void`
  - `filas<T>(db: Database, sql: string, params?: SqlValue[]): T[]`
  - `idInsertado(db: Database): number`
  - `enTransaccion<T>(db: Database, fn: () => T): T`
- Produce (`esquema.ts`): `MIGRACIONES: string[]`, `migrar(db: Database): void`
- Produce (`tipos.ts`): tipos usados por las demás tareas (ver código).

- [ ] **Paso 1: Escribir la prueba que falla**

`tests/db/esquema.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { abrirDb, enTransaccion, filas } from '../../src/db/sqlite';

describe('abrirDb', () => {
  it('crea las tablas y fija la versión del esquema', async () => {
    const db = await abrirDb();
    const tablas = filas<{ name: string }>(
      db,
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    ).map((t) => t.name);
    expect(tablas).toEqual(['listas', 'opciones', 'productos']);
    expect(filas<{ user_version: number }>(db, 'PRAGMA user_version')[0].user_version).toBe(1);
  });

  it('activa las claves foráneas', async () => {
    const db = await abrirDb();
    expect(filas<{ foreign_keys: number }>(db, 'PRAGMA foreign_keys')[0].foreign_keys).toBe(1);
  });

  it('reabrir una base ya migrada conserva la versión y los datos', async () => {
    const db = await abrirDb();
    db.run("INSERT INTO listas (nombre) VALUES ('Casa')");
    const reabierta = await abrirDb(db.export());
    expect(filas<{ user_version: number }>(reabierta, 'PRAGMA user_version')[0].user_version).toBe(1);
    expect(filas<{ nombre: string }>(reabierta, 'SELECT nombre FROM listas')).toEqual([{ nombre: 'Casa' }]);
  });
});

describe('enTransaccion', () => {
  it('confirma los cambios si la función termina bien', async () => {
    const db = await abrirDb();
    const resultado = enTransaccion(db, () => {
      db.run("INSERT INTO listas (nombre) VALUES ('a')");
      return 42;
    });
    expect(resultado).toBe(42);
    expect(filas(db, 'SELECT * FROM listas')).toHaveLength(1);
  });

  it('revierte la transacción si la función lanza', async () => {
    const db = await abrirDb();
    expect(() =>
      enTransaccion(db, () => {
        db.run("INSERT INTO listas (nombre) VALUES ('a')");
        throw new Error('falla');
      }),
    ).toThrow('falla');
    expect(filas(db, 'SELECT * FROM listas')).toHaveLength(0);
  });
});
```

- [ ] **Paso 2: Verificar que falla**

Run: `npx vitest run tests/db/esquema.test.ts`
Expected: FAIL — no se puede resolver `../../src/db/sqlite`.

- [ ] **Paso 3: Implementar**

`src/db/tipos.ts`:
```ts
export type Prioridad = 'alta' | 'media' | 'baja';

export interface Lista {
  id: number;
  nombre: string;
  tope: number | null;
  creadaEn: string;
}

export interface ListaResumen extends Lista {
  total: number;
  productos: number;
}

export interface DatosProducto {
  nombre: string;
  cantidad: number;
  categoria: string;
  prioridad: Prioridad;
  notas: string;
}

export interface Producto extends DatosProducto {
  id: number;
  listaId: number;
  comprado: boolean;
  tieneFoto: boolean;
  opcionElegidaId: number | null;
  /** Precio vigente: opción elegida, o la más barata, o 0. */
  precioUnitario: number;
}

export interface DatosOpcion {
  tienda: string;
  precio: number;
  link: string;
}

export interface Opcion extends DatosOpcion {
  id: number;
  productoId: number;
}
```

`src/db/esquema.ts`:
```ts
import type { Database } from 'sql.js';

/** Cada elemento migra de la versión i a la i + 1. Nunca se edita una migración ya publicada. */
export const MIGRACIONES: string[] = [
  `
  CREATE TABLE listas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tope REAL,
    creada_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lista_id INTEGER NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    categoria TEXT NOT NULL DEFAULT '',
    prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
    notas TEXT NOT NULL DEFAULT '',
    comprado INTEGER NOT NULL DEFAULT 0,
    foto BLOB,
    opcion_elegida_id INTEGER
  );
  CREATE TABLE opciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tienda TEXT NOT NULL DEFAULT '',
    precio REAL NOT NULL CHECK (precio >= 0),
    link TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX idx_productos_lista ON productos(lista_id);
  CREATE INDEX idx_opciones_producto ON opciones(producto_id);
  `,
];

export function migrar(db: Database): void {
  const actual = Number(db.exec('PRAGMA user_version')[0].values[0][0]);
  for (let v = actual; v < MIGRACIONES.length; v++) {
    db.exec(MIGRACIONES[v]);
    db.run(`PRAGMA user_version = ${v + 1}`);
  }
}
```

`opcion_elegida_id` no lleva `REFERENCES` a propósito (evita la referencia circular productos↔opciones); la integridad la mantienen `elegirOpcion` y `eliminarOpcion` en la Tarea 4.

`src/db/sqlite.ts`:
```ts
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';
import { migrar } from './esquema';

type LocateFile = (archivo: string) => string;

let sqlPromise: Promise<SqlJsStatic> | null = null;

/** Carga sql.js una sola vez. `locateFile` solo se usa en la primera llamada (navegador). */
export function cargarSql(locateFile?: LocateFile): Promise<SqlJsStatic> {
  sqlPromise ??= initSqlJs(locateFile ? { locateFile } : undefined);
  return sqlPromise;
}

export function activarClavesForaneas(db: Database): void {
  db.run('PRAGMA foreign_keys = ON');
}

export async function abrirDb(datos?: Uint8Array, locateFile?: LocateFile): Promise<Database> {
  const SQL = await cargarSql(locateFile);
  const db = datos ? new SQL.Database(datos) : new SQL.Database();
  activarClavesForaneas(db);
  migrar(db);
  return db;
}

export function filas<T>(db: Database, sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const resultado: T[] = [];
    while (stmt.step()) resultado.push(stmt.getAsObject() as unknown as T);
    return resultado;
  } finally {
    stmt.free();
  }
}

export function idInsertado(db: Database): number {
  return Number(db.exec('SELECT last_insert_rowid()')[0].values[0][0]);
}

export function enTransaccion<T>(db: Database, fn: () => T): T {
  db.run('BEGIN');
  try {
    const resultado = fn();
    db.run('COMMIT');
    return resultado;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}
```

- [ ] **Paso 4: Verificar que pasa**

Run: `npx vitest run tests/db/esquema.test.ts`
Expected: PASS (5 pruebas).

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat(db): esquema, migraciones y utilidades de sql.js" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 3: Listas y productos

**Archivos:**
- Crear: `src/db/precio.ts`, `src/db/listas.ts`, `src/db/productos.ts`
- Prueba: `tests/db/ayuda.ts`, `tests/db/listas.test.ts`, `tests/db/productos.test.ts`

**Interfaces:**
- Consume: `abrirDb`, `filas`, `idInsertado` (Tarea 2); tipos de `tipos.ts`.
- Produce (`precio.ts`): `PRECIO_UNITARIO_SQL: string` (usa el alias `p` de `productos`), `totalSql(listaExpr: string): string` (subconsulta escalar redondeada a 2 decimales).
- Produce (`listas.ts`): `crearLista(db, nombre: string, tope: number | null): number`, `actualizarLista(db, id: number, nombre: string, tope: number | null): void`, `eliminarLista(db, id): void`, `obtenerLista(db, id): ListaResumen | null`, `listarListas(db): ListaResumen[]` (más reciente primero), `totalLista(db, id): number`.
- Produce (`productos.ts`): `agregarProducto(db, listaId: number, datos: DatosProducto, foto?: Uint8Array | null): number`, `actualizarProducto(db, id, datos: DatosProducto): void`, `guardarFoto(db, id, foto: Uint8Array | null): void`, `obtenerFoto(db, id): Uint8Array | null`, `eliminarProducto(db, id): void`, `marcarComprado(db, id, comprado: boolean): void`, `obtenerProducto(db, id): Producto | null`, `listarProductos(db, listaId): Producto[]` (orden: categoría, prioridad alta→baja, nombre), `listarCategorias(db, listaId): string[]`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`tests/db/ayuda.ts`:
```ts
import type { DatosProducto } from '../../src/db/tipos';

export const base: DatosProducto = {
  nombre: 'Producto',
  cantidad: 1,
  categoria: '',
  prioridad: 'media',
  notas: '',
};

export const producto = (parcial: Partial<DatosProducto> = {}): DatosProducto => ({ ...base, ...parcial });
```

`tests/db/listas.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { abrirDb } from '../../src/db/sqlite';
import { actualizarLista, crearLista, eliminarLista, listarListas, obtenerLista, totalLista } from '../../src/db/listas';

describe('listas', () => {
  it('crea una lista y la lista con total 0 y sin productos', async () => {
    const db = await abrirDb();
    const id = crearLista(db, '  Casa nueva ', 500);
    const lista = obtenerLista(db, id);
    expect(lista).toMatchObject({ id, nombre: 'Casa nueva', tope: 500, total: 0, productos: 0 });
    expect(totalLista(db, id)).toBe(0);
  });

  it('lista primero la más reciente', async () => {
    const db = await abrirDb();
    crearLista(db, 'Primera', null);
    crearLista(db, 'Segunda', null);
    expect(listarListas(db).map((l) => l.nombre)).toEqual(['Segunda', 'Primera']);
  });

  it('rechaza nombre vacío y tope no positivo', async () => {
    const db = await abrirDb();
    expect(() => crearLista(db, '   ', null)).toThrow('El nombre es obligatorio');
    expect(() => crearLista(db, 'x', 0)).toThrow('El tope debe ser mayor que 0');
    expect(() => crearLista(db, 'x', NaN)).toThrow('El tope debe ser mayor que 0');
  });

  it('actualiza nombre y tope', async () => {
    const db = await abrirDb();
    const id = crearLista(db, 'Vieja', 100);
    actualizarLista(db, id, 'Nueva', null);
    expect(obtenerLista(db, id)).toMatchObject({ nombre: 'Nueva', tope: null });
  });

  it('elimina una lista', async () => {
    const db = await abrirDb();
    const id = crearLista(db, 'Borrar', null);
    eliminarLista(db, id);
    expect(obtenerLista(db, id)).toBeNull();
  });
});
```

`tests/db/productos.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { abrirDb } from '../../src/db/sqlite';
import { crearLista } from '../../src/db/listas';
import {
  actualizarProducto,
  agregarProducto,
  eliminarProducto,
  guardarFoto,
  listarCategorias,
  listarProductos,
  marcarComprado,
  obtenerFoto,
  obtenerProducto,
} from '../../src/db/productos';
import { producto } from './ayuda';

async function nueva() {
  const db = await abrirDb();
  const lista = crearLista(db, 'Lista', null);
  return { db, lista };
}

describe('productos', () => {
  it('agrega un producto con valores por defecto y precio 0 sin opciones', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto({ nombre: ' Cafetera ', cantidad: 2 }));
    expect(obtenerProducto(db, id)).toEqual({
      id,
      listaId: lista,
      nombre: 'Cafetera',
      cantidad: 2,
      categoria: '',
      prioridad: 'media',
      notas: '',
      comprado: false,
      tieneFoto: false,
      opcionElegidaId: null,
      precioUnitario: 0,
    });
  });

  it('rechaza nombre vacío y cantidades inválidas', async () => {
    const { db, lista } = await nueva();
    expect(() => agregarProducto(db, lista, producto({ nombre: ' ' }))).toThrow('El nombre es obligatorio');
    expect(() => agregarProducto(db, lista, producto({ cantidad: 0 }))).toThrow('La cantidad debe ser un entero');
    expect(() => agregarProducto(db, lista, producto({ cantidad: 1.5 }))).toThrow('La cantidad debe ser un entero');
  });

  it('ordena por categoría, luego prioridad y luego nombre', async () => {
    const { db, lista } = await nueva();
    agregarProducto(db, lista, producto({ nombre: 'Lámpara', categoria: 'Hogar', prioridad: 'baja' }));
    agregarProducto(db, lista, producto({ nombre: 'Sofá', categoria: 'Hogar', prioridad: 'alta' }));
    agregarProducto(db, lista, producto({ nombre: 'Pilas', categoria: '', prioridad: 'media' }));
    expect(listarProductos(db, lista).map((p) => p.nombre)).toEqual(['Pilas', 'Sofá', 'Lámpara']);
  });

  it('actualiza los datos de un producto', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto({ nombre: 'A' }));
    actualizarProducto(db, id, producto({ nombre: 'B', cantidad: 3, prioridad: 'alta', categoria: 'Cocina', notas: 'urgente' }));
    expect(obtenerProducto(db, id)).toMatchObject({ nombre: 'B', cantidad: 3, prioridad: 'alta', categoria: 'Cocina', notas: 'urgente' });
  });

  it('marca y desmarca como comprado', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto());
    marcarComprado(db, id, true);
    expect(obtenerProducto(db, id)?.comprado).toBe(true);
    marcarComprado(db, id, false);
    expect(obtenerProducto(db, id)?.comprado).toBe(false);
  });

  it('guarda, lee y quita la foto', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto());
    expect(obtenerFoto(db, id)).toBeNull();
    guardarFoto(db, id, new Uint8Array([1, 2, 3]));
    expect(obtenerProducto(db, id)?.tieneFoto).toBe(true);
    expect(Array.from(obtenerFoto(db, id)!)).toEqual([1, 2, 3]);
    guardarFoto(db, id, null);
    expect(obtenerProducto(db, id)?.tieneFoto).toBe(false);
    expect(obtenerFoto(db, id)).toBeNull();
  });

  it('acepta la foto al crear el producto', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto(), new Uint8Array([9, 8]));
    expect(Array.from(obtenerFoto(db, id)!)).toEqual([9, 8]);
  });

  it('elimina un producto', async () => {
    const { db, lista } = await nueva();
    const id = agregarProducto(db, lista, producto());
    eliminarProducto(db, id);
    expect(obtenerProducto(db, id)).toBeNull();
  });

  it('lista las categorías distintas, sin vacías y ordenadas', async () => {
    const { db, lista } = await nueva();
    agregarProducto(db, lista, producto({ categoria: 'Hogar' }));
    agregarProducto(db, lista, producto({ categoria: 'Cocina' }));
    agregarProducto(db, lista, producto({ categoria: 'Hogar' }));
    agregarProducto(db, lista, producto({ categoria: '' }));
    expect(listarCategorias(db, lista)).toEqual(['Cocina', 'Hogar']);
  });
});
```

- [ ] **Paso 2: Verificar que fallan**

Run: `npx vitest run tests/db/listas.test.ts tests/db/productos.test.ts`
Expected: FAIL — módulos `listas` y `productos` no existen.

- [ ] **Paso 3: Implementar**

`src/db/precio.ts`:
```ts
/** Precio vigente de un producto (alias `p`): opción elegida, o la más barata, o 0. */
export const PRECIO_UNITARIO_SQL = `COALESCE(
  (SELECT o.precio FROM opciones o WHERE o.id = p.opcion_elegida_id AND o.producto_id = p.id),
  (SELECT MIN(o.precio) FROM opciones o WHERE o.producto_id = p.id),
  0
)`;

/** Subconsulta escalar: total de la lista cuyo id es `listaExpr` (columna o `?`). */
export function totalSql(listaExpr: string): string {
  return `(SELECT ROUND(COALESCE(SUM(p.cantidad * ${PRECIO_UNITARIO_SQL}), 0), 2) FROM productos p WHERE p.lista_id = ${listaExpr})`;
}
```

`src/db/listas.ts`:
```ts
import type { Database } from 'sql.js';
import type { ListaResumen } from './tipos';
import { filas, idInsertado } from './sqlite';
import { totalSql } from './precio';

const SELECT_LISTA = `SELECT l.id, l.nombre, l.tope, l.creada_en AS creadaEn,
  ${totalSql('l.id')} AS total,
  (SELECT COUNT(*) FROM productos px WHERE px.lista_id = l.id) AS productos
  FROM listas l`;

function validar(nombre: string, tope: number | null): { nombre: string; tope: number | null } {
  const limpio = nombre.trim();
  if (!limpio) throw new Error('El nombre es obligatorio');
  if (tope !== null && !(tope > 0)) throw new Error('El tope debe ser mayor que 0');
  return { nombre: limpio, tope };
}

export function crearLista(db: Database, nombre: string, tope: number | null): number {
  const d = validar(nombre, tope);
  db.run('INSERT INTO listas (nombre, tope) VALUES (?, ?)', [d.nombre, d.tope]);
  return idInsertado(db);
}

export function actualizarLista(db: Database, id: number, nombre: string, tope: number | null): void {
  const d = validar(nombre, tope);
  db.run('UPDATE listas SET nombre = ?, tope = ? WHERE id = ?', [d.nombre, d.tope, id]);
}

export function eliminarLista(db: Database, id: number): void {
  db.run('DELETE FROM listas WHERE id = ?', [id]);
}

export function obtenerLista(db: Database, id: number): ListaResumen | null {
  return filas<ListaResumen>(db, `${SELECT_LISTA} WHERE l.id = ?`, [id])[0] ?? null;
}

export function listarListas(db: Database): ListaResumen[] {
  return filas<ListaResumen>(db, `${SELECT_LISTA} ORDER BY l.id DESC`);
}

export function totalLista(db: Database, id: number): number {
  return filas<{ total: number }>(db, `SELECT ${totalSql('?')} AS total`, [id])[0].total;
}
```

`src/db/productos.ts`:
```ts
import type { Database } from 'sql.js';
import type { DatosProducto, Producto } from './tipos';
import { filas, idInsertado } from './sqlite';
import { PRECIO_UNITARIO_SQL } from './precio';

const COLUMNAS = `p.id, p.lista_id AS listaId, p.nombre, p.cantidad, p.categoria, p.prioridad, p.notas,
  p.comprado, (p.foto IS NOT NULL) AS tieneFoto, p.opcion_elegida_id AS opcionElegidaId,
  ${PRECIO_UNITARIO_SQL} AS precioUnitario`;

type FilaProducto = Omit<Producto, 'comprado' | 'tieneFoto'> & { comprado: number; tieneFoto: number };

const mapear = (f: FilaProducto): Producto => ({ ...f, comprado: f.comprado === 1, tieneFoto: f.tieneFoto === 1 });

function validar(d: DatosProducto): DatosProducto {
  const nombre = d.nombre.trim();
  if (!nombre) throw new Error('El nombre es obligatorio');
  if (!Number.isInteger(d.cantidad) || d.cantidad < 1) {
    throw new Error('La cantidad debe ser un entero mayor o igual a 1');
  }
  return { ...d, nombre, categoria: d.categoria.trim(), notas: d.notas.trim() };
}

export function agregarProducto(
  db: Database,
  listaId: number,
  datos: DatosProducto,
  foto: Uint8Array | null = null,
): number {
  const d = validar(datos);
  db.run(
    'INSERT INTO productos (lista_id, nombre, cantidad, categoria, prioridad, notas, foto) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [listaId, d.nombre, d.cantidad, d.categoria, d.prioridad, d.notas, foto],
  );
  return idInsertado(db);
}

export function actualizarProducto(db: Database, id: number, datos: DatosProducto): void {
  const d = validar(datos);
  db.run('UPDATE productos SET nombre = ?, cantidad = ?, categoria = ?, prioridad = ?, notas = ? WHERE id = ?', [
    d.nombre,
    d.cantidad,
    d.categoria,
    d.prioridad,
    d.notas,
    id,
  ]);
}

export function guardarFoto(db: Database, id: number, foto: Uint8Array | null): void {
  db.run('UPDATE productos SET foto = ? WHERE id = ?', [foto, id]);
}

export function obtenerFoto(db: Database, id: number): Uint8Array | null {
  const f = filas<{ foto: Uint8Array | null }>(db, 'SELECT foto FROM productos WHERE id = ?', [id])[0];
  return f?.foto ?? null;
}

export function eliminarProducto(db: Database, id: number): void {
  db.run('DELETE FROM productos WHERE id = ?', [id]);
}

export function marcarComprado(db: Database, id: number, comprado: boolean): void {
  db.run('UPDATE productos SET comprado = ? WHERE id = ?', [comprado ? 1 : 0, id]);
}

export function obtenerProducto(db: Database, id: number): Producto | null {
  const f = filas<FilaProducto>(db, `SELECT ${COLUMNAS} FROM productos p WHERE p.id = ?`, [id])[0];
  return f ? mapear(f) : null;
}

export function listarProductos(db: Database, listaId: number): Producto[] {
  return filas<FilaProducto>(
    db,
    `SELECT ${COLUMNAS} FROM productos p WHERE p.lista_id = ?
     ORDER BY p.categoria,
              CASE p.prioridad WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
              p.nombre`,
    [listaId],
  ).map(mapear);
}

export function listarCategorias(db: Database, listaId: number): string[] {
  return filas<{ categoria: string }>(
    db,
    "SELECT DISTINCT categoria FROM productos WHERE lista_id = ? AND categoria <> '' ORDER BY categoria",
    [listaId],
  ).map((f) => f.categoria);
}
```

- [ ] **Paso 4: Verificar que pasan**

Run: `npx vitest run tests/db`
Expected: PASS (esquema + listas + productos).

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat(db): CRUD de listas y productos" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 4: Opciones, regla del total, tope y guardado completo

**Archivos:**
- Crear: `src/db/opciones.ts`, `src/db/presupuesto.ts`, `src/db/guardar.ts`
- Prueba: `tests/db/opciones.test.ts`, `tests/db/presupuesto.test.ts`, `tests/db/guardar.test.ts`

**Interfaces:**
- Consume: Tareas 2 y 3 (`abrirDb`, `enTransaccion`, `filas`, `idInsertado`, `crearLista`, `totalLista`, `agregarProducto`, `actualizarProducto`, `guardarFoto`, `obtenerProducto`, `eliminarProducto`, `eliminarLista`).
- Produce (`opciones.ts`): `agregarOpcion(db, productoId: number, datos: DatosOpcion): number`, `actualizarOpcion(db, id, datos: DatosOpcion): void`, `eliminarOpcion(db, id): void` (si era la elegida, el producto vuelve a "automática"), `listarOpciones(db, productoId): Opcion[]` (precio ascendente, luego id), `elegirOpcion(db, productoId, opcionId: number | null): void` (lanza si la opción es de otro producto), `reemplazarOpciones(db, productoId, lista: DatosOpcion[], indiceElegida: number | null): void`.
- Produce (`presupuesto.ts`): `type EstadoPresupuesto = 'sin-tope' | 'ok' | 'cerca' | 'excedido'`, `interface ResumenPresupuesto { estado; disponible: number | null; porcentaje: number }`, `resumenPresupuesto(total: number, tope: number | null): ResumenPresupuesto`. "cerca" = ≥ 80 % del tope; "excedido" = total > tope.
- Produce (`guardar.ts`): `interface BorradorProducto { productoId: number | null; listaId: number; datos: DatosProducto; foto: Uint8Array | null; opciones: DatosOpcion[]; indiceElegida: number | null }`, `guardarProducto(db, borrador): number` (transaccional; devuelve el id).

- [ ] **Paso 1: Escribir las pruebas que fallan**

`tests/db/opciones.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { abrirDb, filas } from '../../src/db/sqlite';
import { crearLista, eliminarLista, totalLista } from '../../src/db/listas';
import { agregarProducto, eliminarProducto, marcarComprado, obtenerProducto } from '../../src/db/productos';
import {
  actualizarOpcion,
  agregarOpcion,
  eliminarOpcion,
  elegirOpcion,
  listarOpciones,
  reemplazarOpciones,
} from '../../src/db/opciones';
import { producto } from './ayuda';

async function conProducto(cantidad = 1) {
  const db = await abrirDb();
  const lista = crearLista(db, 'L', null);
  const id = agregarProducto(db, lista, producto({ nombre: 'TV', cantidad }));
  return { db, lista, id };
}
const op = (precio: number, tienda = 'T') => ({ tienda, precio, link: '' });

describe('regla del total', () => {
  it('sin opciones el precio es 0', async () => {
    const { db, lista, id } = await conProducto();
    expect(obtenerProducto(db, id)?.precioUnitario).toBe(0);
    expect(totalLista(db, lista)).toBe(0);
  });

  it('usa la opción más barata si no hay elegida', async () => {
    const { db, lista, id } = await conProducto();
    agregarOpcion(db, id, op(300));
    agregarOpcion(db, id, op(250));
    agregarOpcion(db, id, op(400));
    expect(obtenerProducto(db, id)?.precioUnitario).toBe(250);
    expect(totalLista(db, lista)).toBe(250);
  });

  it('usa la opción elegida aunque no sea la más barata', async () => {
    const { db, lista, id } = await conProducto();
    agregarOpcion(db, id, op(250));
    const cara = agregarOpcion(db, id, op(400));
    elegirOpcion(db, id, cara);
    expect(obtenerProducto(db, id)).toMatchObject({ opcionElegidaId: cara, precioUnitario: 400 });
    expect(totalLista(db, lista)).toBe(400);
  });

  it('elegir null vuelve al modo automático', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(250));
    const cara = agregarOpcion(db, id, op(400));
    elegirOpcion(db, id, cara);
    elegirOpcion(db, id, null);
    expect(obtenerProducto(db, id)?.precioUnitario).toBe(250);
  });

  it('multiplica por la cantidad y suma todos los productos, comprados o no', async () => {
    const { db, lista, id } = await conProducto(3);
    agregarOpcion(db, id, op(100));
    const otro = agregarProducto(db, lista, producto({ nombre: 'Mesa', cantidad: 2 }));
    agregarOpcion(db, otro, op(50));
    marcarComprado(db, otro, true);
    expect(totalLista(db, lista)).toBe(400);
  });

  it('redondea el total a 2 decimales', async () => {
    const { db, lista, id } = await conProducto();
    agregarOpcion(db, id, op(0.1));
    const otro = agregarProducto(db, lista, producto({ nombre: 'Otro' }));
    agregarOpcion(db, otro, op(0.2));
    expect(totalLista(db, lista)).toBe(0.3);
  });

  it('al eliminar la opción elegida vuelve a la más barata', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(250));
    const cara = agregarOpcion(db, id, op(400));
    elegirOpcion(db, id, cara);
    eliminarOpcion(db, cara);
    expect(obtenerProducto(db, id)).toMatchObject({ opcionElegidaId: null, precioUnitario: 250 });
  });
});

describe('opciones', () => {
  it('las lista de la más barata a la más cara', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(300, 'B'));
    agregarOpcion(db, id, op(100, 'A'));
    expect(listarOpciones(db, id).map((o) => o.tienda)).toEqual(['A', 'B']);
  });

  it('actualiza una opción', async () => {
    const { db, id } = await conProducto();
    const o = agregarOpcion(db, id, op(300, 'B'));
    actualizarOpcion(db, o, { tienda: ' Nueva ', precio: 120, link: 'https://x.com' });
    expect(listarOpciones(db, id)[0]).toMatchObject({ id: o, tienda: 'Nueva', precio: 120, link: 'https://x.com' });
  });

  it('rechaza precios negativos o no numéricos', async () => {
    const { db, id } = await conProducto();
    expect(() => agregarOpcion(db, id, op(-1))).toThrow('El precio debe ser un número');
    expect(() => agregarOpcion(db, id, op(NaN))).toThrow('El precio debe ser un número');
  });

  it('rechaza elegir una opción de otro producto', async () => {
    const { db, lista, id } = await conProducto();
    const otro = agregarProducto(db, lista, producto({ nombre: 'Otro' }));
    const ajena = agregarOpcion(db, otro, op(10));
    expect(() => elegirOpcion(db, id, ajena)).toThrow('La opción no pertenece al producto');
  });

  it('reemplazarOpciones sustituye todo y marca la elegida por índice', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(999));
    reemplazarOpciones(db, id, [op(300, 'A'), op(200, 'B')], 0);
    const opciones = listarOpciones(db, id);
    expect(opciones.map((o) => o.tienda)).toEqual(['B', 'A']);
    expect(obtenerProducto(db, id)).toMatchObject({ precioUnitario: 300 });
    reemplazarOpciones(db, id, [], null);
    expect(listarOpciones(db, id)).toEqual([]);
    expect(obtenerProducto(db, id)).toMatchObject({ opcionElegidaId: null, precioUnitario: 0 });
  });
});

describe('borrado en cascada', () => {
  it('eliminar un producto elimina sus opciones', async () => {
    const { db, id } = await conProducto();
    agregarOpcion(db, id, op(10));
    eliminarProducto(db, id);
    expect(filas(db, 'SELECT * FROM opciones')).toHaveLength(0);
  });

  it('eliminar una lista elimina sus productos y opciones', async () => {
    const { db, lista, id } = await conProducto();
    agregarOpcion(db, id, op(10));
    eliminarLista(db, lista);
    expect(filas(db, 'SELECT * FROM productos')).toHaveLength(0);
    expect(filas(db, 'SELECT * FROM opciones')).toHaveLength(0);
  });
});
```

`tests/db/presupuesto.test.ts`:
```ts
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
```

`tests/db/guardar.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { abrirDb, filas } from '../../src/db/sqlite';
import { crearLista } from '../../src/db/listas';
import { obtenerFoto, obtenerProducto } from '../../src/db/productos';
import { listarOpciones } from '../../src/db/opciones';
import { guardarProducto } from '../../src/db/guardar';
import { producto } from './ayuda';

const op = (precio: number, tienda: string) => ({ tienda, precio, link: '' });

describe('guardarProducto', () => {
  it('crea el producto con foto, opciones y la elegida por índice', async () => {
    const db = await abrirDb();
    const listaId = crearLista(db, 'L', null);
    const id = guardarProducto(db, {
      productoId: null,
      listaId,
      datos: producto({ nombre: 'TV' }),
      foto: new Uint8Array([1, 2]),
      opciones: [op(300, 'A'), op(200, 'B')],
      indiceElegida: 0,
    });
    expect(obtenerProducto(db, id)).toMatchObject({ nombre: 'TV', precioUnitario: 300, tieneFoto: true });
    expect(Array.from(obtenerFoto(db, id)!)).toEqual([1, 2]);
    expect(listarOpciones(db, id)).toHaveLength(2);
  });

  it('edita: reemplaza las opciones y la foto', async () => {
    const db = await abrirDb();
    const listaId = crearLista(db, 'L', null);
    const id = guardarProducto(db, {
      productoId: null,
      listaId,
      datos: producto({ nombre: 'TV' }),
      foto: new Uint8Array([1]),
      opciones: [op(300, 'A')],
      indiceElegida: null,
    });
    guardarProducto(db, {
      productoId: id,
      listaId,
      datos: producto({ nombre: 'TV 4K', cantidad: 2 }),
      foto: null,
      opciones: [op(500, 'C')],
      indiceElegida: null,
    });
    expect(obtenerProducto(db, id)).toMatchObject({ nombre: 'TV 4K', cantidad: 2, tieneFoto: false, precioUnitario: 500 });
    expect(listarOpciones(db, id).map((o) => o.tienda)).toEqual(['C']);
  });

  it('revierte todo si una opción es inválida', async () => {
    const db = await abrirDb();
    const listaId = crearLista(db, 'L', null);
    expect(() =>
      guardarProducto(db, {
        productoId: null,
        listaId,
        datos: producto({ nombre: 'TV' }),
        foto: null,
        opciones: [op(100, 'A'), op(-5, 'B')],
        indiceElegida: null,
      }),
    ).toThrow('El precio debe ser un número');
    expect(filas(db, 'SELECT * FROM productos')).toHaveLength(0);
    expect(filas(db, 'SELECT * FROM opciones')).toHaveLength(0);
  });
});
```

- [ ] **Paso 2: Verificar que fallan**

Run: `npx vitest run tests/db`
Expected: FAIL — `opciones`, `presupuesto` y `guardar` no existen.

- [ ] **Paso 3: Implementar**

`src/db/opciones.ts`:
```ts
import type { Database } from 'sql.js';
import type { DatosOpcion, Opcion } from './tipos';
import { filas, idInsertado } from './sqlite';

function validar(d: DatosOpcion): DatosOpcion {
  if (!Number.isFinite(d.precio) || d.precio < 0) {
    throw new Error('El precio debe ser un número mayor o igual a 0');
  }
  return { tienda: d.tienda.trim(), precio: d.precio, link: d.link.trim() };
}

export function agregarOpcion(db: Database, productoId: number, datos: DatosOpcion): number {
  const d = validar(datos);
  db.run('INSERT INTO opciones (producto_id, tienda, precio, link) VALUES (?, ?, ?, ?)', [
    productoId,
    d.tienda,
    d.precio,
    d.link,
  ]);
  return idInsertado(db);
}

export function actualizarOpcion(db: Database, id: number, datos: DatosOpcion): void {
  const d = validar(datos);
  db.run('UPDATE opciones SET tienda = ?, precio = ?, link = ? WHERE id = ?', [d.tienda, d.precio, d.link, id]);
}

export function eliminarOpcion(db: Database, id: number): void {
  db.run('UPDATE productos SET opcion_elegida_id = NULL WHERE opcion_elegida_id = ?', [id]);
  db.run('DELETE FROM opciones WHERE id = ?', [id]);
}

export function listarOpciones(db: Database, productoId: number): Opcion[] {
  return filas<Opcion>(
    db,
    'SELECT id, producto_id AS productoId, tienda, precio, link FROM opciones WHERE producto_id = ? ORDER BY precio, id',
    [productoId],
  );
}

export function elegirOpcion(db: Database, productoId: number, opcionId: number | null): void {
  if (opcionId !== null) {
    const pertenece = filas(db, 'SELECT 1 AS x FROM opciones WHERE id = ? AND producto_id = ?', [opcionId, productoId]);
    if (pertenece.length === 0) throw new Error('La opción no pertenece al producto');
  }
  db.run('UPDATE productos SET opcion_elegida_id = ? WHERE id = ?', [opcionId, productoId]);
}

/** Sustituye todas las opciones del producto. No abre transacción: el llamador decide. */
export function reemplazarOpciones(
  db: Database,
  productoId: number,
  lista: DatosOpcion[],
  indiceElegida: number | null,
): void {
  db.run('UPDATE productos SET opcion_elegida_id = NULL WHERE id = ?', [productoId]);
  db.run('DELETE FROM opciones WHERE producto_id = ?', [productoId]);
  const ids = lista.map((d) => agregarOpcion(db, productoId, d));
  elegirOpcion(db, productoId, indiceElegida === null ? null : (ids[indiceElegida] ?? null));
}
```

`src/db/presupuesto.ts`:
```ts
export type EstadoPresupuesto = 'sin-tope' | 'ok' | 'cerca' | 'excedido';

export interface ResumenPresupuesto {
  estado: EstadoPresupuesto;
  /** Lo que queda del tope (negativo si se excede); null si no hay tope. */
  disponible: number | null;
  /** 0–100, limitado a 100. */
  porcentaje: number;
}

export const UMBRAL_CERCA = 0.8;

export function resumenPresupuesto(total: number, tope: number | null): ResumenPresupuesto {
  if (tope === null || !(tope > 0)) return { estado: 'sin-tope', disponible: null, porcentaje: 0 };
  const razon = total / tope;
  const estado: EstadoPresupuesto = razon > 1 ? 'excedido' : razon >= UMBRAL_CERCA ? 'cerca' : 'ok';
  return {
    estado,
    disponible: Math.round((tope - total) * 100) / 100,
    porcentaje: Math.min(100, Math.round(razon * 100)),
  };
}
```

`src/db/guardar.ts`:
```ts
import type { Database } from 'sql.js';
import type { DatosOpcion, DatosProducto } from './tipos';
import { enTransaccion } from './sqlite';
import { actualizarProducto, agregarProducto, guardarFoto } from './productos';
import { reemplazarOpciones } from './opciones';

export interface BorradorProducto {
  /** null = producto nuevo. */
  productoId: number | null;
  listaId: number;
  datos: DatosProducto;
  foto: Uint8Array | null;
  opciones: DatosOpcion[];
  /** Índice dentro de `opciones` de la opción elegida; null = automática (la más barata). */
  indiceElegida: number | null;
}

/** Guarda producto, foto y opciones de forma atómica. Devuelve el id del producto. */
export function guardarProducto(db: Database, b: BorradorProducto): number {
  return enTransaccion(db, () => {
    let id = b.productoId;
    if (id === null) {
      id = agregarProducto(db, b.listaId, b.datos, b.foto);
    } else {
      actualizarProducto(db, id, b.datos);
      guardarFoto(db, id, b.foto);
    }
    reemplazarOpciones(db, id, b.opciones, b.indiceElegida);
    return id;
  });
}
```

- [ ] **Paso 4: Verificar que pasan**

Run: `npx vitest run tests/db`
Expected: PASS (todas las pruebas de `tests/db`).

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat(db): opciones, regla del total, tope y guardado atómico de productos" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 5: Almacenamiento (IndexedDB, exportar/importar, guardado con retardo)

**Archivos:**
- Crear: `src/storage/idb.ts`, `src/storage/archivo.ts`, `src/storage/descarga.ts`, `src/storage/guardador.ts`
- Prueba: `tests/storage/idb.test.ts`, `tests/storage/archivo.test.ts`, `tests/storage/guardador.test.ts`

**Interfaces:**
- Consume: `abrirDb`, `cargarSql`, `activarClavesForaneas`, `filas` (Tarea 2); `migrar` (Tarea 2); funciones de db para armar datos de prueba.
- Produce:
  - `guardarBytes(bytes: Uint8Array): Promise<void>`, `cargarBytes(): Promise<Uint8Array | null>` (IndexedDB `presupuesto_brigido`, almacén `archivos`, clave `principal`).
  - `exportarBytes(db: Database): Uint8Array` (restablece `foreign_keys`), `importarBytes(bytes: Uint8Array): Promise<Database>` (lanza `Error` con mensaje en español si el archivo no es válido; NO migra ni modifica archivos ajenos).
  - `descargar(bytes: Uint8Array, nombre: string): void`, `leerArchivo(archivo: File): Promise<Uint8Array>`.
  - `interface Guardador { programar(): void; ahora(): Promise<void> }`, `crearGuardador(obtenerBytes: () => Uint8Array, escribir: (b: Uint8Array) => Promise<void>, alError: (e: unknown) => void, ms?: number): Guardador` (ms por defecto 500).

- [ ] **Paso 1: Escribir las pruebas que fallan**

`tests/storage/idb.test.ts`:
```ts
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
```

`tests/storage/archivo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { abrirDb, cargarSql, filas } from '../../src/db/sqlite';
import { crearLista, eliminarLista, obtenerLista } from '../../src/db/listas';
import { agregarProducto, obtenerFoto, obtenerProducto } from '../../src/db/productos';
import { agregarOpcion, listarOpciones } from '../../src/db/opciones';
import { exportarBytes, importarBytes } from '../../src/storage/archivo';
import { producto } from '../db/ayuda';

describe('exportar / importar', () => {
  it('ida y vuelta conserva listas, productos, fotos y opciones', async () => {
    const db = await abrirDb();
    const lista = crearLista(db, 'Casa', 1000);
    const id = agregarProducto(db, lista, producto({ nombre: 'TV', cantidad: 2 }), new Uint8Array([7, 7]));
    agregarOpcion(db, id, { tienda: 'A', precio: 300, link: 'https://a.com' });

    const importada = await importarBytes(exportarBytes(db));

    expect(obtenerLista(importada, lista)).toMatchObject({ nombre: 'Casa', tope: 1000, total: 600 });
    expect(obtenerProducto(importada, id)).toMatchObject({ nombre: 'TV', cantidad: 2 });
    expect(Array.from(obtenerFoto(importada, id)!)).toEqual([7, 7]);
    expect(listarOpciones(importada, id)).toHaveLength(1);
  });

  it('exportar no desactiva las claves foráneas de la base en uso', async () => {
    const db = await abrirDb();
    const lista = crearLista(db, 'L', null);
    agregarProducto(db, lista, producto());
    exportarBytes(db);
    eliminarLista(db, lista);
    expect(filas(db, 'SELECT * FROM productos')).toHaveLength(0);
  });

  it('la base importada también tiene claves foráneas activas', async () => {
    const db = await abrirDb();
    const lista = crearLista(db, 'L', null);
    agregarProducto(db, lista, producto());
    const importada = await importarBytes(exportarBytes(db));
    eliminarLista(importada, lista);
    expect(filas(importada, 'SELECT * FROM productos')).toHaveLength(0);
  });

  it('rechaza archivos que no son SQLite', async () => {
    await expect(importarBytes(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow('no es una base SQLite válida');
  });

  it('rechaza bases SQLite ajenas a la app sin modificarlas', async () => {
    const SQL = await cargarSql();
    const ajena = new SQL.Database();
    ajena.run('CREATE TABLE otra (a INTEGER)');
    await expect(importarBytes(ajena.export())).rejects.toThrow('no pertenece a Presupuesto Brígido');
  });
});
```

`tests/storage/guardador.test.ts`:
```ts
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
```

- [ ] **Paso 2: Verificar que fallan**

Run: `npx vitest run tests/storage`
Expected: FAIL — módulos de `src/storage` no existen.

- [ ] **Paso 3: Implementar**

`src/storage/idb.ts`:
```ts
const NOMBRE_DB = 'presupuesto_brigido';
const ALMACEN = 'archivos';
const CLAVE = 'principal';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(NOMBRE_DB, 1);
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(ALMACEN);
    };
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, op: (almacen: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const idb = await abrir();
  return new Promise<T>((resolve, reject) => {
    const tx = idb.transaction(ALMACEN, modo);
    const peticion = op(tx.objectStore(ALMACEN));
    tx.oncomplete = () => {
      idb.close();
      resolve(peticion.result);
    };
    tx.onerror = tx.onabort = () => {
      idb.close();
      reject(tx.error);
    };
  });
}

export async function guardarBytes(bytes: Uint8Array): Promise<void> {
  await operar('readwrite', (a) => a.put(bytes, CLAVE));
}

export async function cargarBytes(): Promise<Uint8Array | null> {
  const valor = await operar<unknown>('readonly', (a) => a.get(CLAVE));
  return valor ? new Uint8Array(valor as ArrayBuffer | Uint8Array) : null;
}
```

`src/storage/archivo.ts`:
```ts
import type { Database } from 'sql.js';
import { activarClavesForaneas, cargarSql, filas } from '../db/sqlite';
import { migrar } from '../db/esquema';

const CABECERA_SQLITE = 'SQLite format 3\0';
const TABLAS_REQUERIDAS = ['listas', 'productos', 'opciones'];

/** Exporta la base. `db.export()` reabre la conexión y reinicia los PRAGMA, así que se reactivan. */
export function exportarBytes(db: Database): Uint8Array {
  const bytes = db.export();
  activarClavesForaneas(db);
  return bytes;
}

class ErrorImportacion extends Error {}

/** Abre un `.db` exportado por la app. Comprueba que sea de la app ANTES de migrar. */
export async function importarBytes(bytes: Uint8Array): Promise<Database> {
  if (new TextDecoder('latin1').decode(bytes.subarray(0, 16)) !== CABECERA_SQLITE) {
    throw new ErrorImportacion('El archivo no es una base SQLite válida');
  }
  const SQL = await cargarSql();
  let db: Database | null = null;
  try {
    db = new SQL.Database(bytes);
    const tablas = new Set(
      filas<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type = 'table'").map((t) => t.name),
    );
    if (!TABLAS_REQUERIDAS.every((t) => tablas.has(t))) {
      throw new ErrorImportacion('El archivo no pertenece a Presupuesto Brígido');
    }
    activarClavesForaneas(db);
    migrar(db);
    return db;
  } catch (error) {
    db?.close();
    throw error instanceof ErrorImportacion ? error : new ErrorImportacion('El archivo está dañado y no se pudo leer');
  }
}
```

`src/storage/descarga.ts`:
```ts
export function descargar(bytes: Uint8Array, nombre: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/x-sqlite3' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function leerArchivo(archivo: File): Promise<Uint8Array> {
  return new Uint8Array(await archivo.arrayBuffer());
}
```

`src/storage/guardador.ts`:
```ts
export interface Guardador {
  /** Pide guardar; varias llamadas seguidas se agrupan en una sola escritura. */
  programar(): void;
  /** Guarda de inmediato si hay cambios pendientes. */
  ahora(): Promise<void>;
}

export function crearGuardador(
  obtenerBytes: () => Uint8Array,
  escribir: (bytes: Uint8Array) => Promise<void>,
  alError: (error: unknown) => void,
  ms = 500,
): Guardador {
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let pendiente = false;

  async function ejecutar(): Promise<void> {
    temporizador = null;
    pendiente = false;
    try {
      await escribir(obtenerBytes());
    } catch (error) {
      alError(error);
    }
  }

  return {
    programar() {
      pendiente = true;
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(() => void ejecutar(), ms);
    },
    async ahora() {
      if (temporizador) clearTimeout(temporizador);
      temporizador = null;
      if (pendiente) await ejecutar();
    },
  };
}
```

- [ ] **Paso 4: Verificar que pasan**

Run: `npm test`
Expected: PASS (todas las suites).

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat(storage): persistencia en IndexedDB, exportar/importar y guardado con retardo" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 6: Utilidades de imagen y URL

**Archivos:**
- Crear: `src/util/imagen.ts`, `src/util/url.ts`
- Prueba: `tests/util/imagen.test.ts`, `tests/util/url.test.ts`
- Modificar: spec (línea de pruebas de imagen)

**Interfaces:**
- Produce: `calcularDimensiones(ancho: number, alto: number, max?: number): { ancho: number; alto: number }` (no amplía; máx. 800), `reducirImagen(archivo: Blob, max?: number, calidad?: number): Promise<Uint8Array>` (JPEG; usa canvas, solo navegador), `normalizarUrl(texto: string): string | null` (solo `http`/`https`; añade `https://` si falta esquema; `null` si es inválida o vacía).

- [ ] **Paso 1: Escribir las pruebas que fallan**

`tests/util/imagen.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { calcularDimensiones } from '../../src/util/imagen';

describe('calcularDimensiones', () => {
  it('no amplía imágenes pequeñas', () => {
    expect(calcularDimensiones(400, 300)).toEqual({ ancho: 400, alto: 300 });
  });

  it('reduce las apaisadas al ancho máximo conservando la proporción', () => {
    expect(calcularDimensiones(1600, 1200)).toEqual({ ancho: 800, alto: 600 });
  });

  it('reduce las verticales al alto máximo', () => {
    expect(calcularDimensiones(1200, 1600)).toEqual({ ancho: 600, alto: 800 });
  });

  it('nunca devuelve dimensiones menores que 1', () => {
    expect(calcularDimensiones(8000, 1)).toEqual({ ancho: 800, alto: 1 });
  });
});
```

`tests/util/url.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizarUrl } from '../../src/util/url';

describe('normalizarUrl', () => {
  it('conserva http y https', () => {
    expect(normalizarUrl('http://x.com/a')).toBe('http://x.com/a');
    expect(normalizarUrl(' https://x.com ')).toBe('https://x.com/');
  });

  it('añade https:// si falta el esquema', () => {
    expect(normalizarUrl('example.com/a')).toBe('https://example.com/a');
  });

  it('rechaza esquemas peligrosos o distintos de http(s)', () => {
    expect(normalizarUrl('javascript:alert(1)')).toBeNull();
    expect(normalizarUrl('data:text/html,hola')).toBeNull();
    expect(normalizarUrl('mailto:a@b.c')).toBeNull();
  });

  it('devuelve null para vacío o basura', () => {
    expect(normalizarUrl('')).toBeNull();
    expect(normalizarUrl('   ')).toBeNull();
    expect(normalizarUrl('http://')).toBeNull();
  });
});
```

- [ ] **Paso 2: Verificar que fallan**

Run: `npx vitest run tests/util`
Expected: FAIL — módulos no existen.

- [ ] **Paso 3: Implementar**

`src/util/imagen.ts`:
```ts
export function calcularDimensiones(ancho: number, alto: number, max = 800): { ancho: number; alto: number } {
  const escala = Math.min(1, max / Math.max(ancho, alto));
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  };
}

/** Reduce la imagen a `max` px por lado y la comprime a JPEG. Requiere navegador (canvas). */
export async function reducirImagen(archivo: Blob, max = 800, calidad = 0.8): Promise<Uint8Array> {
  const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  const { ancho, alto } = calcularDimensiones(mapa.width, mapa.height, max);
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(mapa, 0, 0, ancho, alto);
  mapa.close();
  const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', calidad));
  if (!blob) throw new Error('No se pudo procesar la imagen');
  return new Uint8Array(await blob.arrayBuffer());
}
```

`src/util/url.ts`:
```ts
/** Devuelve una URL http(s) válida o null. Evita esquemas como `javascript:`. */
export function normalizarUrl(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try {
    const url = new URL(conEsquema);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
```

- [ ] **Paso 4: Verificar que pasan**

Run: `npx vitest run tests/util`
Expected: PASS.

- [ ] **Paso 5: Ajustar la spec**

En la sección "Pruebas" de la spec, reemplaza `- \`util/imagen\`: reduce tamaño y devuelve JPEG.` por `- \`util/imagen\`: el cálculo de dimensiones se prueba en Node; el redimensionado a JPEG (usa canvas) se verifica a mano en el navegador. \`util/url\`: solo se aceptan enlaces http(s).`

- [ ] **Paso 6: Commit**

```bash
git add -A
git commit -m "feat(util): redimensionado de fotos y validación de enlaces" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 7: Base de la interfaz (arranque, contexto, rutas, estilos)

**Archivos:**
- Crear: `src/ui/formato.ts`, `src/ui/ruta.ts`, `src/ui/contexto.tsx`, `src/ui/useUrlFoto.ts`, `src/ui/estilos.css`, `src/ui/Raiz.tsx`, y stubs provisionales `src/ui/Inicio.tsx`, `src/ui/PantallaLista.tsx`, `src/ui/PantallaProducto.tsx`
- Modificar: `src/pages/index.astro`
- Prueba: `tests/ui/formato.test.ts`, `tests/ui/ruta.test.ts`

**Interfaces:**
- Consume: `abrirDb` (Tarea 2), `cargarBytes`/`guardarBytes` (5), `exportarBytes` (5), `crearGuardador` (5).
- Produce (`formato.ts`): `formatearPrecio(n: number): string` (prefijo `$`), `parsearNumero(texto: string): number | null` (acepta coma decimal; `''` → `null`; inválido → `NaN`), `mensajeError(e: unknown, defecto: string): string`, `ETIQUETA_PRIORIDAD: Record<Prioridad, string>`.
- Produce (`ruta.ts`): `type Ruta = { vista: 'inicio' } | { vista: 'lista'; listaId: number } | { vista: 'producto'; listaId: number; productoId: number | null }`, `parsearRuta(hash: string): Ruta`, `useRuta(): Ruta`, `irA(href: string): void`, `hrefInicio(): string` (`#/`), `hrefLista(id: number): string` (`#/lista/ID`), `hrefProducto(listaId: number, productoId: number | null): string` (`#/lista/ID/producto/PID` o `/nuevo`).
- Produce (`contexto.tsx`): `interface Contexto { db: Database; version: number; cambiar(fn: (db: Database) => void): void; reemplazarDb(nueva: Database): void; avisar(mensaje: string): void }`, `ContextoApp`, `useApp(): Contexto`. `cambiar` ejecuta `fn`, incrementa `version` y programa el guardado; si `fn` lanza, propaga el error sin incrementar.
- Produce (`useUrlFoto.ts`): `useUrlFoto(bytes: Uint8Array | null): string | null`.
- Produce (`Raiz.tsx`): componente por defecto que carga/abre la base, provee el contexto y enruta a `Inicio`, `PantallaLista({ listaId })`, `PantallaProducto({ listaId, productoId })`.
- Convención de CSS (clases usadas por tareas posteriores): `.app .encabezado .tarjeta .fila-entre .boton(.primario .peligro .chico .fantasma) .campo .grid2 .progreso .progreso-barra(.ok .cerca .excedido) .texto-excedido .fila-producto(.comprado) .fila-producto-enlace .fila-producto-texto .miniatura(.vacia) .precio .chip(.alta .media .baja) .filtros .aviso(.error) .menu .menu-panel .vacio .muted .migas .resumen .fila-opcion(.mas-barata) .grupo-titulo .acciones`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`tests/ui/formato.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatearPrecio, mensajeError, parsearNumero } from '../../src/ui/formato';

describe('formato', () => {
  it('formatea precios con prefijo $ y coma decimal', () => {
    expect(formatearPrecio(1234.5)).toMatch(/^\$1\.?234,5$/);
    expect(formatearPrecio(0)).toBe('$0');
  });

  it('parsea números con coma o punto', () => {
    expect(parsearNumero('12,5')).toBe(12.5);
    expect(parsearNumero(' 7 ')).toBe(7);
    expect(parsearNumero('')).toBeNull();
    expect(parsearNumero('abc')).toBeNaN();
  });

  it('extrae el mensaje de un Error o usa el valor por defecto', () => {
    expect(mensajeError(new Error('boom'), 'x')).toBe('boom');
    expect(mensajeError('texto', 'por defecto')).toBe('por defecto');
  });
});
```

`tests/ui/ruta.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { hrefInicio, hrefLista, hrefProducto, parsearRuta } from '../../src/ui/ruta';

describe('parsearRuta', () => {
  it('vacío o desconocido va al inicio', () => {
    expect(parsearRuta('')).toEqual({ vista: 'inicio' });
    expect(parsearRuta('#/')).toEqual({ vista: 'inicio' });
    expect(parsearRuta('#/otra/cosa')).toEqual({ vista: 'inicio' });
    expect(parsearRuta('#/lista/abc')).toEqual({ vista: 'inicio' });
  });

  it('reconoce una lista', () => {
    expect(parsearRuta('#/lista/3')).toEqual({ vista: 'lista', listaId: 3 });
  });

  it('reconoce un producto nuevo y uno existente', () => {
    expect(parsearRuta('#/lista/3/producto/nuevo')).toEqual({ vista: 'producto', listaId: 3, productoId: null });
    expect(parsearRuta('#/lista/3/producto/7')).toEqual({ vista: 'producto', listaId: 3, productoId: 7 });
  });

  it('los href generados se parsean de vuelta', () => {
    expect(parsearRuta(hrefInicio())).toEqual({ vista: 'inicio' });
    expect(parsearRuta(hrefLista(5))).toEqual({ vista: 'lista', listaId: 5 });
    expect(parsearRuta(hrefProducto(5, null))).toEqual({ vista: 'producto', listaId: 5, productoId: null });
    expect(parsearRuta(hrefProducto(5, 9))).toEqual({ vista: 'producto', listaId: 5, productoId: 9 });
  });
});
```

- [ ] **Paso 2: Verificar que fallan**

Run: `npx vitest run tests/ui`
Expected: FAIL — módulos `formato` y `ruta` no existen.

- [ ] **Paso 3: Implementar utilidades y contexto**

`src/ui/formato.ts`:
```ts
import type { Prioridad } from '../db/tipos';

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export function formatearPrecio(n: number): string {
  return '$' + n.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** '' → null; número válido → número; texto inválido → NaN. Acepta coma decimal. */
export function parsearNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function mensajeError(e: unknown, defecto: string): string {
  return e instanceof Error ? e.message : defecto;
}
```

`src/ui/ruta.ts`:
```ts
import { useEffect, useState } from 'preact/hooks';

export type Ruta =
  | { vista: 'inicio' }
  | { vista: 'lista'; listaId: number }
  | { vista: 'producto'; listaId: number; productoId: number | null };

export const hrefInicio = () => '#/';
export const hrefLista = (id: number) => `#/lista/${id}`;
export const hrefProducto = (listaId: number, productoId: number | null) =>
  `#/lista/${listaId}/producto/${productoId === null ? 'nuevo' : productoId}`;

const esNumero = (t: string | undefined): t is string => t !== undefined && /^\d+$/.test(t);

export function parsearRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (partes[0] === 'lista' && esNumero(partes[1])) {
    const listaId = Number(partes[1]);
    if (partes.length === 2) return { vista: 'lista', listaId };
    if (partes[2] === 'producto' && partes.length === 4) {
      if (partes[3] === 'nuevo') return { vista: 'producto', listaId, productoId: null };
      if (esNumero(partes[3])) return { vista: 'producto', listaId, productoId: Number(partes[3]) };
    }
  }
  return { vista: 'inicio' };
}

export function irA(href: string): void {
  location.hash = href.replace(/^#/, '');
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => parsearRuta(location.hash));
  useEffect(() => {
    const alCambiar = () => {
      setRuta(parsearRuta(location.hash));
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', alCambiar);
    return () => removeEventListener('hashchange', alCambiar);
  }, []);
  return ruta;
}
```

`src/ui/contexto.tsx`:
```tsx
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Database } from 'sql.js';

export interface Contexto {
  db: Database;
  /** Aumenta con cada cambio; úsalo como dependencia de useMemo para releer datos. */
  version: number;
  /** Ejecuta una mutación, refresca la UI y programa el guardado. Propaga los errores de `fn`. */
  cambiar(fn: (db: Database) => void): void;
  reemplazarDb(nueva: Database): void;
  avisar(mensaje: string): void;
}

export const ContextoApp = createContext<Contexto | null>(null);

export function useApp(): Contexto {
  const contexto = useContext(ContextoApp);
  if (!contexto) throw new Error('Falta el proveedor de contexto');
  return contexto;
}
```

`src/ui/useUrlFoto.ts`:
```ts
import { useEffect, useState } from 'preact/hooks';

/** Convierte bytes JPEG en una URL de objeto y la libera al cambiar o desmontar. */
export function useUrlFoto(bytes: Uint8Array | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!bytes) {
      setUrl(null);
      return;
    }
    const nueva = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
    setUrl(nueva);
    return () => URL.revokeObjectURL(nueva);
  }, [bytes]);
  return url;
}
```

- [ ] **Paso 4: Verificar las pruebas de utilidades**

Run: `npx vitest run tests/ui`
Expected: PASS.

- [ ] **Paso 5: Estilos**

`src/ui/estilos.css`:
```css
:root {
  color-scheme: light dark;
  --fondo: #f6f7f9;
  --superficie: #ffffff;
  --texto: #1c2330;
  --muted: #6a7383;
  --borde: #dde1e8;
  --primario: #2f6fed;
  --primario-texto: #ffffff;
  --ok: #2e9e5b;
  --cerca: #e0a100;
  --excedido: #d64545;
  --radio: 12px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fondo: #12151b;
    --superficie: #1b2029;
    --texto: #e8ebf1;
    --muted: #9aa3b2;
    --borde: #2b3240;
    --primario: #6c9bff;
    --primario-texto: #0b1220;
    --ok: #4cc27d;
    --cerca: #f0be3a;
    --excedido: #ff6b6b;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--fondo);
  color: var(--texto);
  font: 16px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
h1 { font-size: 1.4rem; margin: 0; }
a { color: var(--primario); text-decoration: none; }
.app { max-width: 720px; margin: 0 auto; padding: 16px; }
.encabezado { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.fila-entre { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.muted { color: var(--muted); }
.vacio { color: var(--muted); text-align: center; padding: 24px 0; }
.migas { display: inline-block; margin-bottom: 8px; }

.tarjeta {
  display: block;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  padding: 12px 14px;
  margin-bottom: 12px;
  color: inherit;
}
a.tarjeta:hover { border-color: var(--primario); }
.tarjeta > * + * { margin-top: 8px; }
summary { cursor: pointer; font-weight: 600; }

.boton {
  display: inline-block;
  border: 1px solid var(--borde);
  background: var(--superficie);
  color: var(--texto);
  border-radius: 10px;
  padding: 10px 14px;
  font: inherit;
  cursor: pointer;
  text-align: center;
}
.boton.primario { background: var(--primario); border-color: var(--primario); color: var(--primario-texto); }
.boton.peligro { color: var(--excedido); border-color: var(--excedido); }
.boton.chico { padding: 6px 10px; font-size: 0.9rem; }
.boton.fantasma { background: transparent; border-color: transparent; }
.acciones { display: flex; flex-wrap: wrap; gap: 8px; }

.campo { display: grid; gap: 4px; }
.campo > span { font-size: 0.85rem; color: var(--muted); }
input, select, textarea {
  width: 100%;
  font: inherit;
  color: var(--texto);
  background: var(--fondo);
  border: 1px solid var(--borde);
  border-radius: 10px;
  padding: 10px 12px;
}
input[type='checkbox'], input[type='radio'] { width: auto; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.progreso { height: 8px; background: var(--borde); border-radius: 999px; overflow: hidden; }
.progreso-barra { height: 100%; border-radius: 999px; }
.progreso-barra.ok { background: var(--ok); }
.progreso-barra.cerca { background: var(--cerca); }
.progreso-barra.excedido { background: var(--excedido); }
.texto-excedido { color: var(--excedido); }
.resumen { display: flex; flex-wrap: wrap; gap: 6px 16px; }
.resumen strong { font-size: 1.2rem; }

.filtros { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px; }
.filtros select { width: auto; }
.grupo-titulo { margin: 16px 0 6px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }

.fila-producto {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  padding: 8px 10px;
  margin-bottom: 8px;
}
.fila-producto.comprado { opacity: 0.55; }
.fila-producto.comprado strong { text-decoration: line-through; }
.fila-producto-enlace { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; color: inherit; }
.fila-producto-texto { flex: 1; min-width: 0; display: grid; }
.fila-producto-texto strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.miniatura { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; background: var(--borde); flex: none; }
.miniatura.vacia { display: grid; place-items: center; font-size: 1.3rem; }
.precio { font-weight: 600; white-space: nowrap; }
.chip { font-size: 0.75rem; border-radius: 999px; padding: 2px 8px; border: 1px solid var(--borde); color: var(--muted); }
.chip.alta { color: var(--excedido); border-color: var(--excedido); }
.chip.baja { color: var(--ok); border-color: var(--ok); }

.fila-opcion { display: grid; gap: 8px; padding: 10px; border: 1px solid var(--borde); border-radius: 10px; }
.fila-opcion.mas-barata { border-color: var(--ok); }

.aviso { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-radius: 10px; margin-bottom: 12px; background: var(--superficie); border: 1px solid var(--borde); }
.aviso.error { border-color: var(--excedido); color: var(--excedido); }

.menu { position: relative; }
.menu summary { list-style: none; }
.menu summary::-webkit-details-marker { display: none; }
.menu-panel {
  position: absolute;
  right: 0;
  z-index: 5;
  margin-top: 6px;
  min-width: 200px;
  display: grid;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 10px;
  overflow: hidden;
}
.menu-panel button { text-align: left; padding: 10px 14px; border: 0; background: transparent; color: var(--texto); font: inherit; cursor: pointer; }
.menu-panel button:hover { background: var(--fondo); }
```

- [ ] **Paso 6: Componentes de arranque y stubs**

`src/ui/Raiz.tsx`:
```tsx
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { abrirDb } from '../db/sqlite';
import { cargarBytes, guardarBytes } from '../storage/idb';
import { exportarBytes } from '../storage/archivo';
import { crearGuardador, type Guardador } from '../storage/guardador';
import { ContextoApp, type Contexto } from './contexto';
import { useRuta } from './ruta';
import Inicio from './Inicio';
import PantallaLista from './PantallaLista';
import PantallaProducto from './PantallaProducto';
import { mensajeError } from './formato';

const localizar = () => wasmUrl;

export default function Raiz() {
  const [db, setDb] = useState<Database | null>(null);
  const [version, setVersion] = useState(0);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const dbRef = useRef<Database | null>(null);
  const guardador = useRef<Guardador | null>(null);
  const ruta = useRuta();

  const avisar = useCallback((mensaje: string) => {
    setAvisos((actuales) => (actuales.includes(mensaje) ? actuales : [...actuales, mensaje]));
  }, []);

  useEffect(() => {
    guardador.current = crearGuardador(
      () => exportarBytes(dbRef.current!),
      guardarBytes,
      () =>
        avisar(
          'No se pudo guardar en este navegador (¿modo privado o sin espacio?). Exporta un respaldo para no perder los datos.',
        ),
    );
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void guardador.current?.ahora();
    };
    document.addEventListener('visibilitychange', alOcultar);
    return () => document.removeEventListener('visibilitychange', alOcultar);
  }, [avisar]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      let bytes: Uint8Array | null = null;
      try {
        bytes = await cargarBytes();
      } catch {
        avisar('No se pudo leer el almacenamiento local de este navegador. Los cambios podrían no guardarse.');
      }
      try {
        const abierta = await abrirDb(bytes ?? undefined, localizar);
        if (cancelado) return;
        dbRef.current = abierta;
        setDb(abierta);
        void navigator.storage?.persist?.();
      } catch (e) {
        if (!cancelado) setErrorCarga(mensajeError(e, 'No se pudo abrir la base de datos guardada.'));
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [avisar]);

  const empezarDeCero = async () => {
    const vacia = await abrirDb(undefined, localizar);
    dbRef.current = vacia;
    setErrorCarga(null);
    setDb(vacia);
    guardador.current?.programar();
  };

  if (errorCarga) {
    return (
      <div class="app">
        <div class="aviso error" role="alert">{errorCarga}</div>
        <p>La base guardada no se pudo abrir. Puedes empezar con una base vacía; la guardada se sobrescribirá al hacer el primer cambio.</p>
        <button class="boton primario" onClick={() => void empezarDeCero()}>Empezar con una base vacía</button>
      </div>
    );
  }
  if (!db) {
    return (
      <div class="app">
        <p class="vacio">Cargando…</p>
      </div>
    );
  }

  const contexto: Contexto = {
    db,
    version,
    cambiar(fn) {
      fn(dbRef.current!);
      setVersion((v) => v + 1);
      guardador.current?.programar();
    },
    reemplazarDb(nueva) {
      dbRef.current?.close();
      dbRef.current = nueva;
      setDb(nueva);
      setVersion((v) => v + 1);
      guardador.current?.programar();
      void guardador.current?.ahora();
    },
    avisar,
  };

  return (
    <ContextoApp.Provider value={contexto}>
      <div class="app">
        {avisos.map((aviso) => (
          <div class="aviso error" role="alert" key={aviso}>
            <span>{aviso}</span>
            <button class="boton chico fantasma" onClick={() => setAvisos((a) => a.filter((x) => x !== aviso))}>
              Cerrar
            </button>
          </div>
        ))}
        {ruta.vista === 'inicio' && <Inicio />}
        {ruta.vista === 'lista' && <PantallaLista listaId={ruta.listaId} />}
        {ruta.vista === 'producto' && (
          <PantallaProducto key={`${ruta.listaId}/${ruta.productoId}`} listaId={ruta.listaId} productoId={ruta.productoId} />
        )}
      </div>
    </ContextoApp.Provider>
  );
}
```

Stubs provisionales (se reescriben por completo en las Tareas 8, 9 y 10):

`src/ui/Inicio.tsx`:
```tsx
export default function Inicio() {
  return <p>Inicio</p>;
}
```

`src/ui/PantallaLista.tsx`:
```tsx
export default function PantallaLista({ listaId }: { listaId: number }) {
  return <p>Lista {listaId}</p>;
}
```

`src/ui/PantallaProducto.tsx`:
```tsx
export default function PantallaProducto({ listaId, productoId }: { listaId: number; productoId: number | null }) {
  return <p>Producto {productoId ?? 'nuevo'} de la lista {listaId}</p>;
}
```

`src/pages/index.astro` (reemplazo completo):
```astro
---
import Raiz from '../ui/Raiz';
import '../ui/estilos.css';
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>Presupuesto Brígido</title>
  </head>
  <body>
    <Raiz client:only="preact" />
  </body>
</html>
```

- [ ] **Paso 7: Verificar build y arranque**

Run: `npm run build`
Expected: éxito; existe un archivo `.wasm` bajo `dist/_astro/`.

Run: `npm run dev` y abre la URL que imprime (p. ej. `http://localhost:4321`).
Expected: se ve "Inicio" (tras un instante de "Cargando…"); la consola del navegador no muestra errores. Detén el servidor.

- [ ] **Paso 8: Commit**

```bash
git add -A
git commit -m "feat(ui): arranque, contexto, rutas por hash y estilos base" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 8: Pantalla de inicio (listas, exportar/importar)

**Archivos:**
- Modificar (reescritura completa): `src/ui/Inicio.tsx`
- Crear: `src/ui/BarraPresupuesto.tsx`, `src/ui/MenuDatos.tsx`

**Interfaces:**
- Consume: `useApp`, `hrefLista`, `formatearPrecio`, `parsearNumero`, `mensajeError` (Tarea 7); `listarListas`, `crearLista` (3); `resumenPresupuesto` (4); `exportarBytes`/`importarBytes` (5); `descargar`/`leerArchivo` (5).
- Produce: `BarraPresupuesto({ total: number; tope: number | null })` (no renderiza nada si no hay tope; muestra "Superas el tope por $X" si se excede); `MenuDatos()`; `Inicio()`.

- [ ] **Paso 1: Implementar `BarraPresupuesto`**

`src/ui/BarraPresupuesto.tsx`:
```tsx
import { resumenPresupuesto } from '../db/presupuesto';
import { formatearPrecio } from './formato';

export default function BarraPresupuesto({ total, tope }: { total: number; tope: number | null }) {
  const r = resumenPresupuesto(total, tope);
  if (r.estado === 'sin-tope') return null;
  return (
    <div>
      <div class="progreso" role="progressbar" aria-valuenow={r.porcentaje} aria-valuemin={0} aria-valuemax={100}>
        <div class={`progreso-barra ${r.estado}`} style={{ width: `${r.porcentaje}%` }} />
      </div>
      {r.estado === 'excedido' && (
        <small class="texto-excedido">Superas el tope por {formatearPrecio(-(r.disponible ?? 0))}</small>
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Implementar `MenuDatos`**

`src/ui/MenuDatos.tsx`:
```tsx
import { useRef } from 'preact/hooks';
import { useApp } from './contexto';
import { exportarBytes, importarBytes } from '../storage/archivo';
import { descargar, leerArchivo } from '../storage/descarga';
import { mensajeError } from './formato';

export default function MenuDatos() {
  const { db, reemplazarDb, avisar } = useApp();
  const entrada = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    descargar(exportarBytes(db), `presupuesto_brigido-${fecha}.db`);
  };

  const importar = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (!confirm('Importar reemplaza TODOS los datos actuales por los del archivo. ¿Continuar?')) return;
    try {
      reemplazarDb(await importarBytes(await leerArchivo(archivo)));
    } catch (error) {
      avisar(mensajeError(error, 'No se pudo importar el archivo'));
    }
  };

  return (
    <>
      <details class="menu">
        <summary class="boton chico">Datos</summary>
        <div class="menu-panel">
          <button onClick={exportar}>Exportar respaldo (.db)</button>
          <button onClick={() => entrada.current?.click()}>Importar respaldo</button>
        </div>
      </details>
      <input ref={entrada} type="file" accept=".db,.sqlite,application/x-sqlite3" hidden onChange={(e) => void importar(e)} />
    </>
  );
}
```

- [ ] **Paso 3: Reescribir `Inicio`**

`src/ui/Inicio.tsx`:
```tsx
import { useMemo, useState } from 'preact/hooks';
import { useApp } from './contexto';
import { crearLista, listarListas } from '../db/listas';
import { hrefLista } from './ruta';
import { formatearPrecio, mensajeError, parsearNumero } from './formato';
import BarraPresupuesto from './BarraPresupuesto';
import MenuDatos from './MenuDatos';

export default function Inicio() {
  const { db, version, cambiar } = useApp();
  const listas = useMemo(() => listarListas(db), [db, version]);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [tope, setTope] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cancelar = () => {
    setCreando(false);
    setNombre('');
    setTope('');
    setError(null);
  };

  const enviar = (e: Event) => {
    e.preventDefault();
    try {
      cambiar((d) => crearLista(d, nombre, parsearNumero(tope)));
      cancelar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo crear la lista'));
    }
  };

  return (
    <>
      <header class="encabezado">
        <h1>Presupuesto Brígido</h1>
        <MenuDatos />
      </header>

      {listas.length === 0 && !creando && <p class="vacio">Aún no hay listas. Crea la primera para empezar.</p>}

      {listas.map((l) => (
        <a class="tarjeta" href={hrefLista(l.id)} key={l.id}>
          <div class="fila-entre">
            <strong>{l.nombre}</strong>
            <span>
              {formatearPrecio(l.total)}
              {l.tope !== null && ` / ${formatearPrecio(l.tope)}`}
            </span>
          </div>
          <BarraPresupuesto total={l.total} tope={l.tope} />
          <small class="muted">
            {l.productos} {l.productos === 1 ? 'producto' : 'productos'}
          </small>
        </a>
      ))}

      {creando ? (
        <form class="tarjeta" onSubmit={enviar}>
          <label class="campo">
            <span>Nombre de la lista</span>
            <input value={nombre} onInput={(e) => setNombre(e.currentTarget.value)} autofocus required />
          </label>
          <label class="campo">
            <span>Tope de presupuesto (opcional)</span>
            <input value={tope} onInput={(e) => setTope(e.currentTarget.value)} inputMode="decimal" placeholder="Ej.: 1500" />
          </label>
          {error && <div class="aviso error" role="alert">{error}</div>}
          <div class="acciones">
            <button class="boton primario" type="submit">Crear lista</button>
            <button class="boton" type="button" onClick={cancelar}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button class="boton primario" onClick={() => setCreando(true)}>Nueva lista</button>
      )}
    </>
  );
}
```

- [ ] **Paso 4: Verificación manual**

Run: `npm run dev` y abre la URL.
Comprueba:
1. Se muestra "Aún no hay listas…" y el botón "Nueva lista".
2. Crear una lista con nombre y tope aparece como tarjeta; sin nombre no deja crear; con tope `0` muestra "El tope debe ser mayor que 0".
3. Recargar la página: la lista sigue ahí (persistencia en IndexedDB).
4. Menú "Datos" → "Exportar respaldo" descarga un `.db`; "Importar respaldo" con ese mismo archivo pide confirmación y conserva la lista; un archivo cualquiera (p. ej. un `.txt` renombrado a `.db`) muestra el aviso "El archivo no es una base SQLite válida".
Detén el servidor.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat(ui): pantalla de inicio con listas y menú de exportar/importar" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 9: Detalle de lista

**Archivos:**
- Modificar (reescritura completa): `src/ui/PantallaLista.tsx`
- Crear: `src/ui/EditarLista.tsx`, `src/ui/FilaProducto.tsx`, `src/ui/Miniatura.tsx`

**Interfaces:**
- Consume: `useApp`, `irA`, `hrefInicio`, `hrefProducto`, `formatearPrecio`, `parsearNumero`, `mensajeError`, `ETIQUETA_PRIORIDAD`, `useUrlFoto` (Tarea 7); `obtenerLista`, `actualizarLista`, `eliminarLista` (3); `listarProductos`, `marcarComprado`, `obtenerFoto` (3); `resumenPresupuesto` (4); `BarraPresupuesto` (8); tipos `ListaResumen`, `Producto`, `Prioridad`.
- Produce: `Miniatura({ productoId: number; tieneFoto: boolean })`, `FilaProducto({ producto: Producto })`, `EditarLista({ lista: ListaResumen })`, `PantallaLista({ listaId: number })`.

- [ ] **Paso 1: `Miniatura`**

`src/ui/Miniatura.tsx`:
```tsx
import { useMemo } from 'preact/hooks';
import { useApp } from './contexto';
import { obtenerFoto } from '../db/productos';
import { useUrlFoto } from './useUrlFoto';

export default function Miniatura({ productoId, tieneFoto }: { productoId: number; tieneFoto: boolean }) {
  const { db } = useApp();
  const bytes = useMemo(() => (tieneFoto ? obtenerFoto(db, productoId) : null), [db, productoId, tieneFoto]);
  const url = useUrlFoto(bytes);
  return url ? <img class="miniatura" src={url} alt="" /> : <div class="miniatura vacia" aria-hidden="true">🛍️</div>;
}
```

- [ ] **Paso 2: `FilaProducto`**

`src/ui/FilaProducto.tsx`:
```tsx
import type { Producto } from '../db/tipos';
import { marcarComprado } from '../db/productos';
import { useApp } from './contexto';
import { hrefProducto } from './ruta';
import { ETIQUETA_PRIORIDAD, formatearPrecio } from './formato';
import Miniatura from './Miniatura';

export default function FilaProducto({ producto: p }: { producto: Producto }) {
  const { cambiar } = useApp();
  return (
    <div class={`fila-producto${p.comprado ? ' comprado' : ''}`}>
      <input
        type="checkbox"
        checked={p.comprado}
        aria-label={`Comprado: ${p.nombre}`}
        onChange={(e) => cambiar((db) => marcarComprado(db, p.id, e.currentTarget.checked))}
      />
      <a class="fila-producto-enlace" href={hrefProducto(p.listaId, p.id)}>
        <Miniatura productoId={p.id} tieneFoto={p.tieneFoto} />
        <div class="fila-producto-texto">
          <strong>{p.nombre}</strong>
          <small class="muted">
            {p.cantidad} × {formatearPrecio(p.precioUnitario)}
          </small>
        </div>
        <span class={`chip ${p.prioridad}`}>{ETIQUETA_PRIORIDAD[p.prioridad]}</span>
        <span class="precio">{formatearPrecio(p.cantidad * p.precioUnitario)}</span>
      </a>
    </div>
  );
}
```

- [ ] **Paso 3: `EditarLista`**

`src/ui/EditarLista.tsx`:
```tsx
import { useState } from 'preact/hooks';
import type { ListaResumen } from '../db/tipos';
import { actualizarLista, eliminarLista } from '../db/listas';
import { useApp } from './contexto';
import { hrefInicio, irA } from './ruta';
import { mensajeError, parsearNumero } from './formato';

export default function EditarLista({ lista }: { lista: ListaResumen }) {
  const { cambiar } = useApp();
  const [nombre, setNombre] = useState(lista.nombre);
  const [tope, setTope] = useState(lista.tope === null ? '' : String(lista.tope));
  const [error, setError] = useState<string | null>(null);

  const guardar = (e: Event) => {
    e.preventDefault();
    try {
      cambiar((db) => actualizarLista(db, lista.id, nombre, parsearNumero(tope)));
      setError(null);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la lista'));
    }
  };

  const eliminar = () => {
    if (!confirm(`¿Eliminar la lista "${lista.nombre}" y todos sus productos?`)) return;
    cambiar((db) => eliminarLista(db, lista.id));
    irA(hrefInicio());
  };

  return (
    <details class="tarjeta">
      <summary>Editar lista</summary>
      <form onSubmit={guardar}>
        <label class="campo">
          <span>Nombre</span>
          <input value={nombre} onInput={(e) => setNombre(e.currentTarget.value)} required />
        </label>
        <label class="campo">
          <span>Tope de presupuesto (vacío = sin tope)</span>
          <input value={tope} onInput={(e) => setTope(e.currentTarget.value)} inputMode="decimal" />
        </label>
        {error && <div class="aviso error" role="alert">{error}</div>}
        <div class="acciones">
          <button class="boton primario" type="submit">Guardar</button>
          <button class="boton peligro" type="button" onClick={eliminar}>Eliminar lista</button>
        </div>
      </form>
    </details>
  );
}
```

- [ ] **Paso 4: Reescribir `PantallaLista`**

`src/ui/PantallaLista.tsx`:
```tsx
import { useMemo, useState } from 'preact/hooks';
import type { Prioridad, Producto } from '../db/tipos';
import { obtenerLista } from '../db/listas';
import { listarProductos } from '../db/productos';
import { resumenPresupuesto } from '../db/presupuesto';
import { useApp } from './contexto';
import { hrefInicio, hrefProducto } from './ruta';
import { ETIQUETA_PRIORIDAD, formatearPrecio } from './formato';
import BarraPresupuesto from './BarraPresupuesto';
import EditarLista from './EditarLista';
import FilaProducto from './FilaProducto';

type FiltroEstado = 'todos' | 'pendientes' | 'comprados';

export default function PantallaLista({ listaId }: { listaId: number }) {
  const { db, version } = useApp();
  const lista = useMemo(() => obtenerLista(db, listaId), [db, version, listaId]);
  const productos = useMemo(() => listarProductos(db, listaId), [db, version, listaId]);
  const [prioridad, setPrioridad] = useState<'todas' | Prioridad>('todas');
  const [estado, setEstado] = useState<FiltroEstado>('todos');

  if (!lista) {
    return (
      <>
        <a class="migas" href={hrefInicio()}>← Listas</a>
        <p class="vacio">La lista no existe.</p>
      </>
    );
  }

  const resumen = resumenPresupuesto(lista.total, lista.tope);
  const visibles = productos.filter(
    (p) =>
      (prioridad === 'todas' || p.prioridad === prioridad) &&
      (estado === 'todos' || (estado === 'comprados') === p.comprado),
  );

  const grupos: [string, Producto[]][] = [];
  for (const p of visibles) {
    const nombre = p.categoria || 'Sin categoría';
    const grupo = grupos.find(([n]) => n === nombre);
    if (grupo) grupo[1].push(p);
    else grupos.push([nombre, [p]]);
  }

  return (
    <>
      <a class="migas" href={hrefInicio()}>← Listas</a>
      <header class="encabezado">
        <h1>{lista.nombre}</h1>
        <a class="boton primario" href={hrefProducto(listaId, null)}>Agregar producto</a>
      </header>

      <div class="tarjeta">
        <div class="resumen">
          <span>Total <strong>{formatearPrecio(lista.total)}</strong></span>
          {lista.tope !== null && <span>Tope <strong>{formatearPrecio(lista.tope)}</strong></span>}
          {resumen.disponible !== null && resumen.disponible >= 0 && (
            <span>Disponible <strong>{formatearPrecio(resumen.disponible)}</strong></span>
          )}
        </div>
        <BarraPresupuesto total={lista.total} tope={lista.tope} />
      </div>

      <EditarLista key={`${lista.id}-${lista.nombre}-${lista.tope}`} lista={lista} />

      <div class="filtros">
        <select aria-label="Filtrar por prioridad" value={prioridad} onChange={(e) => setPrioridad(e.currentTarget.value as 'todas' | Prioridad)}>
          <option value="todas">Todas las prioridades</option>
          {(Object.keys(ETIQUETA_PRIORIDAD) as Prioridad[]).map((p) => (
            <option value={p} key={p}>{ETIQUETA_PRIORIDAD[p]}</option>
          ))}
        </select>
        <select aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.currentTarget.value as FiltroEstado)}>
          <option value="todos">Todos</option>
          <option value="pendientes">Pendientes</option>
          <option value="comprados">Comprados</option>
        </select>
      </div>

      {productos.length === 0 && <p class="vacio">Esta lista aún no tiene productos.</p>}
      {productos.length > 0 && visibles.length === 0 && <p class="vacio">Ningún producto coincide con los filtros.</p>}

      {grupos.map(([nombre, items]) => (
        <section key={nombre}>
          <h2 class="grupo-titulo">{nombre}</h2>
          {items.map((p) => (
            <FilaProducto producto={p} key={p.id} />
          ))}
        </section>
      ))}
    </>
  );
}
```

- [ ] **Paso 5: Verificación manual**

Run: `npm run dev`. Con una lista creada, ábrela y comprueba: cabecera con total/tope; "Editar lista" cambia nombre y tope (la barra se actualiza); "Eliminar lista" pide confirmación y vuelve al inicio; "Agregar producto" navega a `#/lista/ID/producto/nuevo` (aún muestra el stub); una lista inexistente (`#/lista/999`) muestra "La lista no existe.". Detén el servidor.

- [ ] **Paso 6: Commit**

```bash
git add -A
git commit -m "feat(ui): detalle de lista con filtros, agrupación por categoría y edición" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 10: Formulario de producto (foto y opciones)

**Archivos:**
- Modificar (reescritura completa): `src/ui/PantallaProducto.tsx`

**Interfaces:**
- Consume: `useApp`, `irA`, `hrefLista`, `parsearNumero`, `mensajeError`, `ETIQUETA_PRIORIDAD`, `formatearPrecio`, `useUrlFoto` (Tarea 7); `obtenerProducto`, `obtenerFoto`, `eliminarProducto`, `listarCategorias` (3); `listarOpciones` (4); `guardarProducto`, `BorradorProducto` (4); `reducirImagen`, `normalizarUrl` (6); tipos `Prioridad`, `DatosOpcion`.
- Produce: `PantallaProducto({ listaId: number; productoId: number | null })`. Estado interno de opciones: `{ clave: number; tienda: string; precio: string; link: string }` con `clave` = id de la opción existente o un negativo decreciente para las nuevas; `elegida: number | null` (clave; `null` = automática).

- [ ] **Paso 1: Reescribir `PantallaProducto`**

`src/ui/PantallaProducto.tsx`:
```tsx
import { useMemo, useState } from 'preact/hooks';
import type { DatosOpcion, Prioridad } from '../db/tipos';
import { eliminarProducto, listarCategorias, obtenerFoto, obtenerProducto } from '../db/productos';
import { listarOpciones } from '../db/opciones';
import { guardarProducto } from '../db/guardar';
import { reducirImagen } from '../util/imagen';
import { normalizarUrl } from '../util/url';
import { useApp } from './contexto';
import { hrefLista, irA } from './ruta';
import { ETIQUETA_PRIORIDAD, formatearPrecio, mensajeError, parsearNumero } from './formato';
import { useUrlFoto } from './useUrlFoto';

interface OpcionBorrador {
  clave: number;
  tienda: string;
  precio: string;
  link: string;
}

let contadorClaves = 0;
const nuevaClave = () => --contadorClaves;

export default function PantallaProducto({ listaId, productoId }: { listaId: number; productoId: number | null }) {
  const { db, cambiar } = useApp();

  // Se lee una sola vez: null = producto nuevo, undefined = no existe.
  const inicial = useMemo(() => {
    if (productoId === null) return null;
    const p = obtenerProducto(db, productoId);
    if (!p || p.listaId !== listaId) return undefined;
    return { p, opciones: listarOpciones(db, productoId), foto: obtenerFoto(db, productoId) };
  }, [db, productoId, listaId]);

  const categorias = useMemo(() => listarCategorias(db, listaId), [db, listaId]);

  const [nombre, setNombre] = useState(inicial?.p.nombre ?? '');
  const [cantidad, setCantidad] = useState(String(inicial?.p.cantidad ?? 1));
  const [categoria, setCategoria] = useState(inicial?.p.categoria ?? '');
  const [prioridad, setPrioridad] = useState<Prioridad>(inicial?.p.prioridad ?? 'media');
  const [notas, setNotas] = useState(inicial?.p.notas ?? '');
  const [foto, setFoto] = useState<Uint8Array | null>(inicial?.foto ?? null);
  const [opciones, setOpciones] = useState<OpcionBorrador[]>(() =>
    (inicial?.opciones ?? []).map((o) => ({ clave: o.id, tienda: o.tienda, precio: String(o.precio), link: o.link })),
  );
  const [elegida, setElegida] = useState<number | null>(inicial?.p.opcionElegidaId ?? null);
  const [error, setError] = useState<string | null>(null);
  const urlFoto = useUrlFoto(foto);

  if (inicial === undefined) {
    return (
      <>
        <a class="migas" href={hrefLista(listaId)}>← Volver a la lista</a>
        <p class="vacio">El producto no existe.</p>
      </>
    );
  }

  const precios = opciones.map((o) => parsearNumero(o.precio));
  const validos = precios.filter((n): n is number => n !== null && Number.isFinite(n) && n >= 0);
  const minimo = validos.length > 0 ? Math.min(...validos) : null;

  const actualizarOpcion = (clave: number, cambios: Partial<OpcionBorrador>) =>
    setOpciones((lista) => lista.map((o) => (o.clave === clave ? { ...o, ...cambios } : o)));

  const quitarOpcion = (clave: number) => {
    setOpciones((lista) => lista.filter((o) => o.clave !== clave));
    if (elegida === clave) setElegida(null);
  };

  const alElegirFoto = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    try {
      setFoto(await reducirImagen(archivo));
    } catch {
      setError('No se pudo procesar la imagen.');
    }
  };

  const guardar = (e: Event) => {
    e.preventDefault();
    setError(null);

    const datosOpciones: DatosOpcion[] = [];
    let indiceElegida: number | null = null;
    for (const o of opciones) {
      const precio = parsearNumero(o.precio);
      if (precio === null && !o.tienda.trim() && !o.link.trim()) continue; // fila vacía
      if (precio === null || !Number.isFinite(precio) || precio < 0) {
        setError('Cada opción necesita un precio válido (0 o más).');
        return;
      }
      if (o.clave === elegida) indiceElegida = datosOpciones.length;
      datosOpciones.push({ tienda: o.tienda, precio, link: o.link });
    }

    try {
      cambiar((d) =>
        guardarProducto(d, {
          productoId,
          listaId,
          datos: { nombre, cantidad: Number(cantidad), categoria, prioridad, notas },
          foto,
          opciones: datosOpciones,
          indiceElegida,
        }),
      );
      irA(hrefLista(listaId));
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el producto'));
    }
  };

  const eliminar = () => {
    if (productoId === null || !confirm(`¿Eliminar "${nombre}"?`)) return;
    cambiar((d) => eliminarProducto(d, productoId));
    irA(hrefLista(listaId));
  };

  return (
    <>
      <a class="migas" href={hrefLista(listaId)}>← Volver a la lista</a>
      <h1>{productoId === null ? 'Nuevo producto' : 'Editar producto'}</h1>

      <form onSubmit={guardar}>
        <div class="tarjeta">
          <label class="campo">
            <span>Nombre</span>
            <input value={nombre} onInput={(e) => setNombre(e.currentTarget.value)} required autofocus />
          </label>
          <div class="grid2">
            <label class="campo">
              <span>Cantidad</span>
              <input type="number" min="1" step="1" value={cantidad} onInput={(e) => setCantidad(e.currentTarget.value)} required />
            </label>
            <label class="campo">
              <span>Prioridad</span>
              <select value={prioridad} onChange={(e) => setPrioridad(e.currentTarget.value as Prioridad)}>
                {(Object.keys(ETIQUETA_PRIORIDAD) as Prioridad[]).map((p) => (
                  <option value={p} key={p}>{ETIQUETA_PRIORIDAD[p]}</option>
                ))}
              </select>
            </label>
          </div>
          <label class="campo">
            <span>Categoría</span>
            <input list="categorias" value={categoria} onInput={(e) => setCategoria(e.currentTarget.value)} />
            <datalist id="categorias">
              {categorias.map((c) => (
                <option value={c} key={c} />
              ))}
            </datalist>
          </label>
          <label class="campo">
            <span>Notas</span>
            <textarea rows={3} value={notas} onInput={(e) => setNotas(e.currentTarget.value)} />
          </label>
        </div>

        <div class="tarjeta">
          <strong>Foto</strong>
          {urlFoto && <img src={urlFoto} alt="Foto del producto" style={{ maxWidth: '100%', borderRadius: '10px' }} />}
          <div class="acciones">
            <label class="boton">
              {foto ? 'Cambiar foto' : 'Tomar o elegir foto'}
              <input type="file" accept="image/*" hidden onChange={(e) => void alElegirFoto(e)} />
            </label>
            {foto && (
              <button class="boton" type="button" onClick={() => setFoto(null)}>
                Quitar foto
              </button>
            )}
          </div>
        </div>

        <div class="tarjeta">
          <strong>Opciones de tienda y precio</strong>
          <small class="muted">
            Si no eliges una, se usa la más barata{minimo !== null ? ` (${formatearPrecio(minimo)})` : ''}.
          </small>
          <label>
            <input type="radio" name="elegida" checked={elegida === null} onChange={() => setElegida(null)} /> Automática (la más barata)
          </label>
          {opciones.map((o, i) => {
            const enlace = normalizarUrl(o.link);
            const masBarata = minimo !== null && precios[i] === minimo;
            return (
              <div class={`fila-opcion${masBarata ? ' mas-barata' : ''}`} key={o.clave}>
                <div class="grid2">
                  <label class="campo">
                    <span>Tienda</span>
                    <input value={o.tienda} onInput={(e) => actualizarOpcion(o.clave, { tienda: e.currentTarget.value })} />
                  </label>
                  <label class="campo">
                    <span>Precio</span>
                    <input value={o.precio} inputMode="decimal" onInput={(e) => actualizarOpcion(o.clave, { precio: e.currentTarget.value })} />
                  </label>
                </div>
                <label class="campo">
                  <span>Link</span>
                  <input value={o.link} inputMode="url" onInput={(e) => actualizarOpcion(o.clave, { link: e.currentTarget.value })} />
                </label>
                <div class="fila-entre">
                  <label>
                    <input type="radio" name="elegida" checked={elegida === o.clave} onChange={() => setElegida(o.clave)} /> Elegir esta
                    {masBarata && <span class="chip baja"> Más barata</span>}
                  </label>
                  <span class="acciones">
                    {enlace && (
                      <a class="boton chico" href={enlace} target="_blank" rel="noopener noreferrer">
                        Abrir link
                      </a>
                    )}
                    <button class="boton chico peligro" type="button" onClick={() => quitarOpcion(o.clave)}>
                      Quitar
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
          <button class="boton" type="button" onClick={() => setOpciones((l) => [...l, { clave: nuevaClave(), tienda: '', precio: '', link: '' }])}>
            Agregar opción
          </button>
        </div>

        {error && <div class="aviso error" role="alert">{error}</div>}
        <div class="acciones">
          <button class="boton primario" type="submit">Guardar</button>
          <a class="boton" href={hrefLista(listaId)}>Cancelar</a>
          {productoId !== null && (
            <button class="boton peligro" type="button" onClick={eliminar}>Eliminar</button>
          )}
        </div>
      </form>
    </>
  );
}
```

- [ ] **Paso 2: Verificación manual (flujo completo)**

Run: `npm run dev`. Con una lista que tenga tope (p. ej. 500):
1. "Agregar producto": nombre "TV", cantidad 2, categoría "Electro", prioridad Alta; añade dos opciones (Tienda A `300`, Tienda B `250`): B aparece resaltada como "Más barata". Guarda → en la lista aparece "2 × $250" y el total es `$500`; la barra queda en estado "cerca" (amarillo).
2. Edita el producto, elige la opción A → el precio pasa a `$300`, total `$600`, aparece "Superas el tope por $100" en rojo.
3. Escribe un precio inválido (`abc`) → aviso "Cada opción necesita un precio válido (0 o más)." y no guarda.
4. Un link `javascript:alert(1)` no muestra el botón "Abrir link"; `example.com` sí y abre en pestaña nueva.
5. Foto: elige una imagen grande desde la galería → se ve la vista previa; guarda; la miniatura aparece en la lista. Comprueba en las DevTools (Application → Blobs no aplica; usa Console: `createImageBitmap` ya la redujo) que la imagen guardada no supera ~800 px (abre la imagen de la vista previa en una pestaña y revisa dimensiones). "Quitar foto" + guardar elimina la miniatura.
6. Marca el producto como comprado en la lista: se atenúa y sigue contando en el total.
7. Eliminar producto pide confirmación y vuelve a la lista.
8. Recarga: todo persiste. Prueba también en ancho móvil (≈ 375 px) y con el tema oscuro del sistema.
Detén el servidor.

- [ ] **Paso 3: Commit**

```bash
git add -A
git commit -m "feat(ui): formulario de producto con foto y opciones de tienda" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tarea 11: Despliegue en GitHub Pages, README y verificación final

**Archivos:**
- Crear: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consume: `astro.config.mjs` (Tarea 1; calcula `base` y `site` desde `GITHUB_REPOSITORY`).

- [ ] **Paso 1: Workflow de despliegue**

`.github/workflows/deploy.yml`:
```yaml
name: Desplegar en GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  pruebas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test

  build:
    needs: pruebas
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v3

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Paso 2: README**

`README.md`:
````markdown
# Presupuesto Brígido

App personal para planificar presupuestos de compras. Funciona solo en el navegador: los datos viven en una base SQLite local (sql.js) guardada en IndexedDB. No hay backend ni cuentas.

## Uso

- Crea listas (con tope de presupuesto opcional) y agrega productos con foto, categoría, prioridad, notas y varias opciones de tienda/precio/link.
- El precio de cada producto es el de la opción elegida o, si no hay, el de la más barata.
- **Respaldo:** menú "Datos" → "Exportar respaldo" descarga un `.db`; "Importar respaldo" lo restaura (reemplaza los datos actuales). Es también la forma de pasar los datos a otro dispositivo.
- Los datos quedan solo en el navegador donde se usa la app; borrar los datos del sitio los elimina. Exporta respaldos con frecuencia.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # pruebas (Vitest)
npm run build    # sitio estático en dist/
```

## Despliegue en GitHub Pages

1. Crea un repositorio en GitHub y sube el código a la rama `main`.
2. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
3. Cada push a `main` ejecuta las pruebas, compila y publica en `https://<usuario>.github.io/<repo>/`.

`astro.config.mjs` calcula `base` y `site` a partir de `GITHUB_REPOSITORY`; no hay que editarlo.
````

- [ ] **Paso 3: Verificación final**

Run: `npm test`
Expected: todas las suites pasan.

Run: `npm run build`
Expected: éxito.

Run: `GITHUB_ACTIONS=true GITHUB_REPOSITORY=usuario/presupuesto_brigido npm run build && npm run preview`
Expected: el sitio se sirve bajo `/presupuesto_brigido/` (abre `http://localhost:4321/presupuesto_brigido/`); la app carga, crea una lista y persiste tras recargar (confirma que el `.wasm` se resuelve con el `base`). Detén el servidor.

- [ ] **Paso 4: Commit**

```bash
git add -A
git commit -m "ci: despliegue en GitHub Pages y README" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Paso 5: Publicar (lo hace el usuario)**

Crear el repositorio remoto y empujar es una acción externa: se deja al usuario.

```bash
git branch -M main
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
```

Luego activar Pages con fuente "GitHub Actions" (ver README).
