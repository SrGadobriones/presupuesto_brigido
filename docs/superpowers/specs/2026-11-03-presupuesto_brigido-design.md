# Presupuesto Brígido — Diseño

App personal para planificar presupuestos de compras. Solo frontend, sin backend, desplegada gratis en GitHub Pages.

## Decisiones

| Tema | Decisión |
|---|---|
| Almacenamiento | SQLite en el navegador con sql.js; el archivo `.db` completo se guarda en IndexedDB |
| Respaldo | Exportar e importar el archivo `.db` |
| Framework | Astro + Preact, una sola isla `client:only` |
| Pruebas | Vitest |
| Despliegue | GitHub Actions (acción oficial de Astro) → GitHub Pages |
| Alcance de datos | Listas con tope de presupuesto, productos con categoría, prioridad, foto, notas y varias opciones de tienda/precio/link |

## Arquitectura

Capas, cada una con un solo propósito:

- `src/db/`: abre sql.js, ejecuta migraciones y expone funciones (`crearLista`, `agregarProducto`, `totalLista`, etc.). Todo el SQL vive aquí.
- `src/storage/`: carga y guarda el `.db` en IndexedDB (guardado con retardo para agrupar escrituras), exportar e importar.
- `src/ui/`: componentes Preact que solo llaman a `db/`.
- `src/util/imagen.ts`: reduce fotos a ~800 px y las comprime a JPEG antes de guardarlas.

sql.js se sirve localmente: el `.wasm` se importa con `?url` desde `node_modules/sql.js/dist` y Vite lo copia al build, sin CDN. La isla usa `client:only="preact"` porque sql.js requiere el navegador.

## Modelo de datos

- `listas`: id, nombre, tope (opcional), creada_en.
- `productos`: id, lista_id, nombre, cantidad, categoria, prioridad (alta | media | baja), notas, comprado, foto (BLOB), opcion_elegida_id.
- `opciones`: id, producto_id, tienda, precio, link.

Borrar una lista elimina sus productos; borrar un producto elimina sus opciones (cascada).

### Regla del total

- Precio de un producto = precio de su opción elegida; si no hay elegida, el de la opción más barata; si no tiene opciones, 0.
- Total de la lista = suma de (precio × cantidad) de todos los productos, comprados o no.
- Si el total supera el tope, se muestra un aviso.

## Pantallas

Una sola página con navegación interna, primero para celular.

1. **Inicio:** tarjetas por lista (nombre, total, tope, barra de progreso verde/amarillo/rojo), botón "Nueva lista", menú Exportar/Importar.
2. **Detalle de lista:** cabecera con total, tope y disponible; productos agrupados por categoría; filtros por prioridad y comprado/pendiente; fila con miniatura, nombre, cantidad, precio vigente y check de comprado; botón "Agregar producto".
3. **Producto:** nombre, cantidad, categoría, prioridad, notas, foto (cámara o galería); lista de opciones (tienda, precio, link) con opción elegida y la más barata resaltada.

Comportamiento:

- Borrar lista o producto pide confirmación.
- Los comprados se atenúan y siguen contando en el total.
- Si falla el guardado en IndexedDB (p. ej. modo privado), se muestra un aviso para exportar un respaldo.
- Tema claro/oscuro según el sistema.

## Pruebas

- `db/`: sql.js en memoria; regla del total (elegida, más barata, sin opciones), tope, borrado en cascada.
- `util/imagen`: el cálculo de dimensiones se prueba en Node; el redimensionado a JPEG (usa canvas) se verifica a mano en el navegador. `util/url`: solo se aceptan enlaces http(s).
- `storage/`: exportar e importar conserva los datos.
- La interfaz se verifica a mano en el navegador.

## Estructura

```
presupuesto_brigido/
├─ astro.config.mjs        (base para GitHub Pages)
├─ src/
│  ├─ pages/index.astro
│  ├─ db/
│  ├─ storage/
│  ├─ util/imagen.ts
│  └─ ui/
├─ tests/
└─ .github/workflows/deploy.yml
```

## Despliegue

Push a `main` → la acción oficial de Astro compila y publica en GitHub Pages. Requiere activar Pages con fuente "GitHub Actions" y fijar `base` según el nombre del repo.

## Fuera de alcance

Cuentas de usuario, sincronización entre dispositivos (se cubre con exportar/importar), PWA offline, múltiples monedas.
