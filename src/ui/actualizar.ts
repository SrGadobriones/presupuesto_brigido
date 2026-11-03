/** Lee el identificador de compilación (`<meta name="build-id">`) de un HTML. */
export function idDesdeHtml(html: string): string | null {
  return /<meta\s+name="build-id"\s+content="([^"]*)"/i.exec(html)?.[1] ?? null;
}

export type ResultadoBusqueda = 'al-dia' | 'nueva';

/** Hay versión nueva cuando la publicada tiene un id distinto del que se está ejecutando. */
export function compararVersiones(actual: string | null, publicada: string | null): ResultadoBusqueda {
  return publicada !== null && publicada !== actual ? 'nueva' : 'al-dia';
}

/**
 * Pide al servidor la página publicada (saltándose la caché, y dejando la copia nueva guardada)
 * y la compara con la versión en ejecución. Lanza un error si no hay conexión o la respuesta no sirve.
 * En desarrollo cada petición genera un id distinto, así que no se compara.
 */
export async function buscarActualizacion(): Promise<ResultadoBusqueda> {
  if (import.meta.env.DEV) return 'al-dia';
  const respuesta = await fetch(location.origin + location.pathname, { cache: 'reload' });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  const publicada = idDesdeHtml(await respuesta.text());
  const actual = document.querySelector<HTMLMetaElement>('meta[name="build-id"]')?.content ?? null;
  return compararVersiones(actual, publicada);
}
