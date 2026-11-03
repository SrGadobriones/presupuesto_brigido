import { useEffect, useRef, useState } from 'preact/hooks';

export type Ruta =
  | { vista: 'inicio' }
  | { vista: 'lista'; listaId: string }
  | { vista: 'producto'; listaId: string; productoId: string | null };

export const hrefInicio = () => '#/';
export const hrefLista = (id: string | number) => `#/lista/${id}`;
export const hrefProducto = (listaId: string | number, productoId: string | number | null) =>
  `#/lista/${listaId}/producto/${productoId === null ? 'nuevo' : productoId}`;

const esId = (t: string | undefined): t is string => t !== undefined && /^[A-Za-z0-9_-]+$/.test(t);

export function parsearRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (partes[0] === 'lista' && esId(partes[1])) {
    const listaId = partes[1];
    if (partes.length === 2) return { vista: 'lista', listaId };
    if (partes[2] === 'producto' && partes.length === 4) {
      if (partes[3] === 'nuevo') return { vista: 'producto', listaId, productoId: null };
      if (esId(partes[3])) return { vista: 'producto', listaId, productoId: partes[3] };
    }
  }
  return { vista: 'inicio' };
}

/** Abrir o cerrar un producto sobre su lista es un modal: la lista de fondo no debe moverse. */
export function debeVolverArriba(anterior: Ruta, siguiente: Ruta): boolean {
  const enLista = (r: Ruta): r is Exclude<Ruta, { vista: 'inicio' }> => r.vista !== 'inicio';
  return !(enLista(anterior) && enLista(siguiente) && anterior.listaId === siguiente.listaId);
}

export function irA(href: string): void {
  location.hash = href.replace(/^#/, '');
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => parsearRuta(location.hash));
  const anterior = useRef(ruta);
  useEffect(() => {
    const alCambiar = () => {
      const siguiente = parsearRuta(location.hash);
      if (debeVolverArriba(anterior.current, siguiente)) window.scrollTo(0, 0);
      anterior.current = siguiente;
      setRuta(siguiente);
    };
    addEventListener('hashchange', alCambiar);
    return () => removeEventListener('hashchange', alCambiar);
  }, []);
  return ruta;
}
