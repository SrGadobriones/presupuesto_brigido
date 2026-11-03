# Presupuesto Brígido — conexión directa a Firebase

Sustituye a SQLite como almacén de datos principal por **Firestore**, con acceso mediante **Google**. La app sigue siendo un sitio estático en GitHub Pages: no hay servidor propio; Firebase es el servicio de datos y de cuentas.

**Reemplaza** de `2026-11-03-presupuesto_brigido-design.md` las secciones de almacenamiento (SQLite, IndexedDB, respaldo `.db`). Todo lo demás (pantallas, modales, tema, Excel, filtros, selección, prioridad, enlaces) se conserva.

## Decisiones

| Tema | Decisión |
|---|---|
| Almacén de datos | Firestore (plan gratuito Spark, sin tarjeta) |
| Acceso | Google (`signInWithPopup`); obligatorio, sin modo sin cuenta |
| Tiempo real | Escuchas (`onSnapshot`): los cambios aparecen solos en todos los dispositivos |
| Sin conexión | Caché persistente de Firestore (varias pestañas); la primera carga necesita conexión |
| Fotos | Sin Cloud Storage (exige plan de pago desde el 3-feb-2026): miniatura en el documento del producto y foto completa en un documento aparte |
| Reglas de negocio | JavaScript puro, portadas desde SQL con las mismas pruebas |
| Acceso a datos | Interfaz `Repositorio` con dos implementaciones: Firestore y memoria (pruebas y modo demostración) |
| Datos antiguos | "Importar respaldo antiguo (.db)" sube un `.db` de la versión SQLite a la nube; `sql.js` solo se carga en ese flujo |
| Rama | `feature/firebase`, a partir de `feature/presupuesto_brigido` |

## Fuera de alcance

Compartir listas entre cuentas, edición colaborativa, notificaciones, Cloud Storage, fotos de más de ~900 KB, importar Excel, mezcla fila a fila entre dispositivos (Firestore resuelve por documento: gana la última escritura), exportar un `.db`.

## Arquitectura

Capas, de adentro hacia afuera; cada una depende solo de las anteriores:

- `src/dominio/`: tipos y reglas puras, sin E/S. `tipos.ts`, `precio.ts` (precio vigente, enlace vigente, total de una lista), `presupuesto.ts` (estado respecto del tope, ya existe), `validar.ts` (nombre, cantidad, precio, tope, enlace).
- `src/datos/`: `repositorio.ts` define la interfaz; `memoria.ts` y `firestore.ts` la implementan.
- `src/sesion/`: `sesion.ts` define la interfaz (`escuchar`, `entrarConGoogle`, `salir`); implementaciones real (Firebase Auth) y falsa.
- `src/firebase/`: `config.ts` (configuración pública del proyecto) e inicialización perezosa. Si `config.ts` no tiene valores, la app arranca en **modo demostración** (memoria + sesión falsa) con un aviso visible: "Modo demostración: los datos no se guardan".
- `src/ui/`: componentes. Un contexto entrega `repo` y `sesion`; los *hooks* `useListas()`, `useResumenListas()` y `useProductos(listaId)` se suscriben a las escuchas y devuelven datos y estado de carga.
- `src/storage/excel.ts`: conserva la construcción de hojas; cambia la fuente de datos (ver "Excel").
- `src/legado/`: lectura de un respaldo `.db` antiguo (`sql.js` cargado con `import()` dinámico).

### Interfaz `Repositorio`

Todas las operaciones son asíncronas; las escuchas devuelven una función para cancelarlas.

- Escuchas: `escucharListas(cb)`, `escucharProductos(listaId, cb)`.
- Listas: `crearLista(datos)`, `actualizarLista(id, datos)`, `eliminarLista(id)` (borra productos y fotos: Firestore no borra en cascada).
- Productos: `guardarProducto(borrador)` (crea o edita; incluye opciones, opción elegida y foto), `eliminarProductos(listaId, ids)`, `marcarComprado(listaId, ids, comprado)`.
- Fotos: `obtenerFoto(listaId, productoId)` (bajo demanda; la lista usa la miniatura).
- Lectura única: `obtenerTodo()` (para Excel y exportaciones).
- Importación: `importarListas(listas)`.

Los errores del repositorio son de tipo conocido: `SinPermiso`, `SinConexion`, `CuotaAgotada`, `NoEncontrado`, `Invalido(mensaje)`. La interfaz los traduce a mensajes en español.

## Modelo de datos (Firestore)

```
usuarios/{uid}/listas/{listaId}
    nombre, tope (número o null), creadaEn (servidor)
usuarios/{uid}/listas/{listaId}/productos/{productoId}
    nombre, cantidad, categoria, prioridad ('alta'|'media'|'baja'), notas, link,
    comprado, opcionElegidaId (o null), creadoEn,
    opciones: [{ id, tienda, precio, link }],
    tieneFoto, miniatura (Bytes ≈ 128 px, ≤ 20 KB)
usuarios/{uid}/listas/{listaId}/productos/{productoId}/fotos/principal
    bytes (Bytes, ≤ 900 KB)
```

- Los identificadores son los automáticos de Firestore (texto). Las rutas pasan de `#/lista/3/producto/5` a identificadores de texto; `parsearRuta` se adapta y conserva `nuevo`.
- Las opciones viven dentro del documento del producto (son pocas). Guardar un producto es una sola escritura; la foto, una segunda en la misma operación por lotes.
- **Totales por lista:** no se guardan agregados. La pantalla de inicio se suscribe a los productos de cada lista (`useResumenListas`); con pocas listas el costo es bajo, y evita agregados que puedan quedar inconsistentes.
- El precio vigente, el enlace vigente, el total y los subtotales se calculan en el navegador con las funciones puras de `dominio/` (misma regla de siempre: opción elegida, si no la más barata, si no 0; total redondeado a 2 decimales).
- Orden: se hace en el cliente (categoría, prioridad alta→baja, nombre), como hoy.
- **Fotos nuevas:** se reducen en el navegador a 800 px (foto completa) y a 128 px (miniatura), ambas JPEG. Si la foto completa supera 900 KB se vuelve a comprimir con menos calidad antes de guardarla.

## Seguridad (`firestore.rules`, en el repositorio)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function esDueno(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /usuarios/{uid}/listas/{lista} {
      allow read, write: if esDueno(uid);

      match /productos/{producto} {
        allow read, write: if esDueno(uid);

        match /fotos/{foto} {
          allow read, delete: if esDueno(uid);
          allow create, update: if esDueno(uid)
                                && request.resource.data.bytes is bytes
                                && request.resource.data.bytes.size() <= 900000;
        }
      }
    }
  }
}
```

Las reglas son **por nivel y sin comodín** (`{ruta=**}`): en Firestore basta con que *una* regla coincidente permita el acceso, así que un comodín general anularía el tope de tamaño de las fotos. Todo lo que no coincide queda denegado. Cada cuenta solo accede a lo suyo. La configuración del proyecto en el código es pública por diseño; la protección son estas reglas y los dominios autorizados de Authentication (GitHub Pages y `localhost`).

## Acceso con Google

- Pantalla de entrada: botón **"Continuar con Google"**. Sin sesión no se ven datos.
- `signInWithPopup`. Si el navegador bloquea la ventana, un mensaje lo explica y ofrece reintentar.
- La sesión se mantiene en el dispositivo. "Cerrar sesión" está en el menú de la cuenta (junto al tema), que muestra el nombre o correo.

## Sin conexión y estado visible

- Caché local persistente con soporte de varias pestañas.
- Indicador discreto en la barra superior: **Guardado**, **Guardando…** (hay escrituras pendientes) o **Sin conexión: los cambios se enviarán al volver**.
- Sin conexión, las escrituras se aplican en la caché al instante y se envían al reconectar.

## Excel

`datosParaExportar` pasa a ser una función pura sobre los datos ya cargados (`obtenerTodo()` para "todas las listas", o los de la lista abierta). `hojasDeExcel`, `generarExcel` y el menú no cambian.

## Importar un respaldo antiguo

1. El usuario elige un `.db` en el menú de la cuenta.
2. Se carga `sql.js` bajo demanda, se valida que sea un respaldo de la app (como hoy: cabecera, tablas, migración a la versión actual) y se lee a estructuras puras `ListaImportada[]`, con sus fotos. La miniatura se genera en el navegador a partir de cada foto; las fotos de más de 900 KB se recomprimen.
3. Un modal muestra qué se añadirá ("3 listas, 42 productos, 17 fotos") y pide confirmación. **Se añade; no reemplaza ni deduplica.**
4. `importarListas` escribe por lotes (máximo 500 operaciones por lote) y muestra el progreso. Si un lote falla se informa cuántas listas quedaron importadas.

## Errores

`SinPermiso` (reglas o sesión vencida: pedir entrar de nuevo), `SinConexion` (no bloquea: se encola), `CuotaAgotada` ("Se alcanzó el límite gratuito de Firebase por hoy; vuelve mañana"), `NoEncontrado` (el producto o lista ya no existe; volver), `Invalido` (mensaje de validación, dentro del formulario). Todo error inesperado se muestra en el modal de avisos.

## Pruebas

- **Dominio:** las pruebas actuales de precio, total, enlace vigente, tope y validaciones se portan como pruebas de funciones puras.
- **Repositorio:** un conjunto de pruebas de contrato que se ejecuta contra `memoria`: crear, editar, borrar en cascada, marcar varios, fotos, importación, y que las escuchas reciben cada cambio y se cancelan.
- **Interfaz:** se verifica a mano en el navegador usando el modo demostración (datos de ejemplo cargados).
- **Firestore real:** no se puede automatizar sin el proyecto del usuario. Se entrega una **lista de comprobación** (entrar, crear, editar, borrar, foto, sin conexión, segundo dispositivo, importar respaldo, reglas rechazan otra cuenta). El adaptador `firestore.ts` se mantiene delgado: traduce y delega en funciones puras para que lo no probado sea lo mínimo.

## Etapas

1. **Dominio, repositorio en memoria e interfaz migrada.** La app completa funciona en modo demostración. Todo verificable sin Firebase.
2. **Firestore real, acceso con Google y reglas.** Requiere los pasos del usuario en la consola de Firebase.
3. **Importar respaldo antiguo, lista de comprobación, README y despliegue.**

## Pasos del usuario en la consola de Firebase (una vez, sin tarjeta)

1. Crear el proyecto y registrar una app web; copiar la configuración a `src/firebase/config.ts`.
2. *Authentication → Sign-in method → Google*: activar.
3. *Authentication → Settings → Authorized domains*: añadir el dominio de GitHub Pages (`localhost` ya viene).
4. *Firestore Database*: crear en modo producción y publicar `firestore.rules`.

## Migración de la rama y despliegue

- La rama `feature/presupuesto_brigido` no se toca.
- Antes de actualizar la versión publicada, el usuario exporta su respaldo `.db` con la versión actual.
- Se mantiene `README` con los pasos de Firebase y la lista de comprobación.

## Riesgos

- Los límites gratuitos pasan a ser límites de uso reales (50.000 lecturas y 20.000 escrituras al día); si se superan, Firebase apaga ese servicio hasta el mes siguiente.
- Un documento de producto con foto grande puede rechazarse por superar 1 MiB; la reducción a 800 px y el tope de 900 KB lo evitan.
- No hay SQL: filtros, totales y orden se hacen en el navegador. Es adecuado para listas de decenas o pocos cientos de productos.
- La conexión real, el inicio de sesión y las reglas solo las verifica el usuario con su proyecto.
