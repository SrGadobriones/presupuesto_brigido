# Presupuesto Brígido

App personal para planificar presupuestos de compras. Los datos se sincronizan con Firestore por cuenta de Google; sigue siendo un sitio estático, sin servidor propio.

## Uso

- Crea listas (con tope de presupuesto opcional) y agrega productos con foto, categoría, prioridad, notas y varias opciones de tienda/precio/link.
- El precio de cada producto es el de la opción elegida o, si no hay, el de la más barata.
- Si `src/firebase/config.ts` no tiene configuración, la aplicación se inicia de forma segura en **modo demostración** y no persiste datos.
- El menú de la cuenta permite exportar las listas a Excel. Las escuchas de Firestore actualizan los cambios en otros dispositivos automáticamente.

## Configurar Firebase

1. Crea un proyecto de Firebase y registra una app web.
2. Copia su configuración pública en `src/firebase/config.ts`.
3. Habilita **Authentication → Google** y añade el dominio de GitHub Pages a los dominios autorizados.
4. Crea Firestore en modo producción y publica [firestore.rules](firestore.rules).

La configuración web no es secreta: las reglas y Authentication protegen cada ruta bajo `usuarios/{uid}`.

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
