import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

type Evento = { request: Request; respondWith?: (p: Promise<Response>) => void; respuesta?: Promise<Response> };

/** Ejecuta public/sw.js con un `self`, `caches` y `fetch` simulados; devuelve el manejador de `fetch`. */
function cargarSW(red: (req: Request) => Promise<Response>) {
  const almacenes = new Map<string, Map<string, Response>>();
  const clave = (r: Request | string, ignorarBusqueda = false) => {
    const u = new URL(typeof r === 'string' ? r : r.url);
    if (ignorarBusqueda) u.search = '';
    return u.href;
  };
  const abrir = (nombre: string) => {
    if (!almacenes.has(nombre)) almacenes.set(nombre, new Map());
    const m = almacenes.get(nombre)!;
    return {
      match: async (r: Request | string, o?: { ignoreSearch?: boolean }) => {
        const k = clave(r, o?.ignoreSearch);
        for (const [guardada, resp] of m) if (clave(guardada, o?.ignoreSearch) === k) return resp.clone();
        return undefined;
      },
      put: async (r: Request, resp: Response) => void m.set(clave(r), resp),
      keys: async () => [...m.keys()].map((url) => ({ url })),
      delete: async (r: { url: string }) => m.delete(r.url),
    };
  };
  const escuchas: Record<string, (e: Evento) => void> = {};
  const self = {
    location: { origin: 'https://sitio.test' },
    registration: { scope: 'https://sitio.test/app/' },
    clients: { claim: async () => {} },
    skipWaiting: () => {},
    addEventListener: (tipo: string, f: (e: Evento) => void) => void (escuchas[tipo] = f),
  };
  const caches = { open: async (n: string) => abrir(n), keys: async () => [...almacenes.keys()], delete: async (n: string) => almacenes.delete(n) };
  new Function('self', 'caches', 'fetch', readFileSync('public/sw.js', 'utf-8'))(self, caches, (r: Request) => red(r));
  return async (peticion: Request): Promise<Response | null> => {
    const e: Evento = { request: peticion };
    let respuesta: Promise<Response> | null = null;
    e.respondWith = (p) => void (respuesta = p);
    escuchas.fetch(e);
    return respuesta ? await respuesta : null;
  };
}

const pagina = (ruta = '/app/') => new Request(`https://sitio.test${ruta}`, { headers: { accept: 'text/html' } });

describe('service worker', () => {
  it('páginas: con red usa la red y guarda copia; sin red devuelve la última copia', async () => {
    let enLinea = true;
    const fetchear = cargarSW(async () => {
      if (!enLinea) throw new TypeError('sin red');
      return new Response('<html>v1</html>');
    });
    expect(await (await fetchear(pagina()))!.text()).toBe('<html>v1</html>');
    enLinea = false;
    expect(await (await fetchear(pagina()))!.text()).toBe('<html>v1</html>');
  });

  it('sin red y sin copia de esa página, abre la página principal guardada', async () => {
    let enLinea = true;
    const fetchear = cargarSW(async () => {
      if (!enLinea) throw new TypeError('sin red');
      return new Response('<html>inicio</html>');
    });
    await fetchear(pagina('/app/'));
    enLinea = false;
    expect(await (await fetchear(pagina('/app/otra')))!.text()).toBe('<html>inicio</html>');
  });

  it('la comprobación de actualizaciones (fetch sin cabecera html) siempre consulta la red', async () => {
    let version = 'v1';
    const fetchear = cargarSW(async () => new Response(`<html>${version}</html>`));
    const comprobacion = () => new Request('https://sitio.test/app/', { cache: 'reload' }); // Accept: */*
    expect(await (await fetchear(comprobacion()))!.text()).toBe('<html>v1</html>');
    version = 'v2';
    expect(await (await fetchear(comprobacion()))!.text()).toBe('<html>v2</html>');
  });

  it('archivos con hash: caché primero, sin volver a pedirlos', async () => {
    const red = vi.fn(async () => new Response('console.log(1)'));
    const fetchear = cargarSW(red);
    const js = new Request('https://sitio.test/app/_astro/Raiz.ABC123.js');
    await fetchear(js);
    await fetchear(js);
    expect(red).toHaveBeenCalledTimes(1);
  });

  it('no toca lo que va a otros sitios ni las peticiones que no son GET', async () => {
    const fetchear = cargarSW(async () => new Response('x'));
    expect(await fetchear(new Request('https://firestore.googleapis.com/v1/x'))).toBeNull();
    expect(await fetchear(new Request('https://sitio.test/app/x', { method: 'POST', body: 'a' }))).toBeNull();
  });
});
