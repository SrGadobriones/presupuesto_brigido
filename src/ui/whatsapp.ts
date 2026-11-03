import type { Repositorio } from '../datos/repositorio';
import type { Lista, Prioridad, Producto } from '../dominio/tipos';
import { enlaceVigente, precioVigente, totalProductos } from '../dominio/precio';
import { ETIQUETA_PRIORIDAD, formatearPrecio } from './formato';

/** Producto leído desde un texto de WhatsApp; el precio es unitario. */
export interface ProductoTexto {
  nombre: string; cantidad: number; categoria: string; prioridad: Prioridad;
  precio: number; link: string; notas: string; comprado: boolean;
}
export interface ListaTexto { nombre: string; tope: number | null; productos: ProductoTexto[] }

const SIN_CATEGORIA = 'Sin categoría';
const limpiar = (t: string) => t.replace(/\*/g, '').replace(/\s+/g, ' ').trim();

/**
 * Formato pensado para leerse bien en WhatsApp (negritas con *…*) y poder volver a importarse:
 *
 *   *Nombre de la lista*
 *   Tope: $2.000.000
 *
 *   *Categoría*
 *   ⬜ producto x2 — $500 c/u · Media
 *   🔗 https://…
 *   📝 nota
 */
export function textoWhatsapp(lista: Pick<Lista, 'nombre' | 'tope'>, productos: Producto[]): string {
  const salida: string[] = [`*${limpiar(lista.nombre)}*`];
  if (lista.tope !== null) salida.push(`Tope: ${formatearPrecio(lista.tope)}`);
  const grupos = new Map<string, Producto[]>();
  for (const p of productos) {
    const cat = limpiar(p.categoria) || SIN_CATEGORIA;
    grupos.set(cat, [...(grupos.get(cat) ?? []), p]);
  }
  for (const [categoria, ps] of grupos) {
    salida.push('', `*${categoria}*`);
    for (const p of ps) {
      const precio = formatearPrecio(precioVigente(p)) + (p.cantidad > 1 ? ' c/u' : '');
      salida.push(`${p.comprado ? '✅' : '⬜'} ${limpiar(p.nombre)} x${p.cantidad} — ${precio} · ${ETIQUETA_PRIORIDAD[p.prioridad]}`);
      const enlace = enlaceVigente(p);
      if (enlace) salida.push(`🔗 ${enlace}`);
      if (p.notas.trim()) salida.push(`📝 ${p.notas.replace(/\s+/g, ' ').trim()}`);
    }
  }
  salida.push('', `Total: ${formatearPrecio(totalProductos(productos))}`);
  return salida.join('\n');
}

export const enlaceWhatsapp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

/** "$1.234,5" → 1234.5 (punto = miles, coma = decimales, como en `formatearPrecio`). */
const precioDeTexto = (t: string) => Number(t.replace(/[.\s]/g, '').replace(',', '.'));

const LINEA_PRODUCTO = /^(?:(⬜|✅|☑️?|✔️?)|[-•])\s*(.+?)\s+x(\d+)\s*[—–-]\s*\$?\s*([\d.,]+)(?:\s*c\/u)?(?:\s*[·|(]\s*(alta|media|baja)\)?)?\s*$/i;

/** Lee un texto en el formato de `textoWhatsapp`; lanza un error con mensaje legible si no hay productos. */
export function leerTextoWhatsapp(texto: string): ListaTexto {
  const lineas = texto.replace(/\r/g, '').split('\n').map((l) => l.trim());
  let nombre = '';
  let tope: number | null = null;
  let categoria = '';
  const productos: ProductoTexto[] = [];
  for (const linea of lineas) {
    if (!linea) continue;
    const prod = LINEA_PRODUCTO.exec(linea);
    if (prod) {
      const [, marca, n, cant, precio, prio] = prod;
      productos.push({
        nombre: n.trim(), cantidad: Math.max(1, Number(cant)), categoria, prioridad: (prio?.toLowerCase() as Prioridad) ?? 'media',
        precio: precioDeTexto(precio) || 0, link: '', notas: '', comprado: !!marca && marca !== '⬜',
      });
      continue;
    }
    const ultimo = productos[productos.length - 1];
    if (linea.startsWith('🔗') && ultimo) { ultimo.link = linea.slice(2).trim(); continue; }
    if (linea.startsWith('📝') && ultimo) { ultimo.notas = linea.slice(2).trim(); continue; }
    const t = /^tope\s*:\s*\$?\s*([\d.,]+)/i.exec(linea);
    if (t) { const v = precioDeTexto(t[1]); tope = v > 0 ? v : null; continue; }
    if (/^total\s*:/i.test(linea)) continue;
    const titulo = /^\*(.+)\*$/.exec(linea)?.[1].trim();
    if (!nombre) { nombre = titulo ?? limpiar(linea); continue; }
    if (titulo) categoria = titulo === SIN_CATEGORIA ? '' : titulo;
  }
  if (!productos.length) throw new Error('No se encontraron productos en el texto. Pega una lista compartida desde la app.');
  return { nombre: nombre || 'Lista importada', tope, productos };
}

/** Crea una lista nueva con lo que haya en el texto y devuelve su id. */
export async function importarTextoWhatsapp(repo: Repositorio, texto: string): Promise<string> {
  const lista = leerTextoWhatsapp(texto);
  const listaId = await repo.crearLista({ nombre: lista.nombre, tope: lista.tope });
  for (const p of lista.productos) {
    await repo.guardarProducto({
      listaId, nombre: p.nombre, cantidad: p.cantidad, categoria: p.categoria, prioridad: p.prioridad, notas: p.notas,
      link: p.link, comprado: p.comprado, opcionElegidaId: null,
      opciones: [{ id: crypto.randomUUID(), tienda: '', precio: p.precio, link: '' }],
    });
  }
  return listaId;
}
