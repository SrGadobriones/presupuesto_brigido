/** Devuelve una URL http(s) válida o null. Evita esquemas como `javascript:`. */
export function normalizarUrl(texto: string): string | null {
  const t = texto.trim();
  if (!t || /\s/.test(t)) return null; // un enlace no lleva espacios; el navegador los acepta y abre algo absurdo
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try {
    const url = new URL(conEsquema);
    const esWeb = url.protocol === 'http:' || url.protocol === 'https:';
    // Una página de tienda tiene dominio con punto ("abc.cl"); "tienda" o "hola" no lo son.
    return esWeb && url.hostname.includes('.') ? url.href : null;
  } catch {
    return null;
  }
}
