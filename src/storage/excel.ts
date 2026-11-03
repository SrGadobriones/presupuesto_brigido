import type { ListaExportacion } from '../db/exportar';
import { ETIQUETA_PRIORIDAD, formatearPrecio } from '../ui/formato';

export type Celda =
  | null
  | string
  | number
  | {
      value: string | number;
      format?: string;
      fontWeight?: 'bold';
      backgroundColor?: string;
      textColor?: string;
      align?: 'left' | 'center' | 'right';
    };

export interface HojaExcel {
  sheet: string;
  data: Celda[][];
  columns: { width: number }[];
  stickyRowsCount: number;
}

const MAX_NOMBRE_HOJA = 31; // límite de Excel
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const COLOR_ENCABEZADO = '#FFD23F'; // el amarillo de la etiqueta de la app
const COLOR_TEXTO = '#16211D';
const COLOR_NEGATIVO = '#C93C3C';

/** Nombre de hoja válido para Excel y distinto de los ya usados (sin distinguir mayúsculas). Registra el elegido. */
export function nombreHoja(nombre: string, usados: Set<string>): string {
  let limpio = nombre.replace(/[\\/?*[\]:]/g, '-').trim().replace(/^'+|'+$/g, '').trim();
  if (!limpio) limpio = 'Lista';
  const base = limpio.slice(0, MAX_NOMBRE_HOJA);
  let candidato = base;
  for (let n = 2; usados.has(candidato.toLowerCase()); n++) {
    const sufijo = ` (${n})`;
    candidato = base.slice(0, MAX_NOMBRE_HOJA - sufijo.length) + sufijo;
  }
  usados.add(candidato.toLowerCase());
  return candidato;
}

function limpiarParaArchivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/** `fecha` en formato AAAA-MM-DD. Con una sola lista el nombre del archivo incluye la lista. */
export function nombreArchivoExcel(listas: ListaExportacion[], fecha: string): string {
  const parte = listas.length === 1 ? `${limpiarParaArchivo(listas[0].nombre) || 'lista'}_` : '';
  return `presupuesto_brigido_${parte}${fecha}.xlsx`;
}

const dinero = (n: number): Celda => ({
  value: n,
  format: Number.isInteger(n) ? '"$"#,##0' : '"$"#,##0.00',
  align: 'right',
});
const encabezado = (texto: string): Celda => ({ value: texto, fontWeight: 'bold', backgroundColor: COLOR_ENCABEZADO, textColor: COLOR_TEXTO });
const negrita = (texto: string): Celda => ({ value: texto, fontWeight: 'bold', align: 'right' });
const dineroNegrita = (n: number, textColor?: string): Celda => {
  const base = dinero(n) as Exclude<Celda, null | string | number>;
  return { ...base, fontWeight: 'bold', ...(textColor ? { textColor } : {}) };
};
const vacio = (texto: string): string | null => (texto === '' ? null : texto);
const filaVacia = (columnas: number): Celda[] => Array<Celda>(columnas).fill(null);

const ENCABEZADOS_LISTA = [
  'Categoría', 'Producto', 'Cantidad', 'Precio unitario', 'Subtotal', 'Tienda', 'Comprado', 'Prioridad', 'Otras opciones', 'Enlace', 'Notas',
];
const ANCHOS_LISTA = [16, 34, 10, 16, 16, 18, 11, 11, 40, 42, 30];
const COL_ETIQUETA_TOTAL = 3; // bajo "Precio unitario"; el importe va en "Subtotal"

function hojaDeLista(lista: ListaExportacion, nombre: string): HojaExcel {
  const columnas = ENCABEZADOS_LISTA.length;
  const filas: Celda[][] = [ENCABEZADOS_LISTA.map(encabezado)];

  for (const p of lista.productos) {
    filas.push([
      vacio(p.categoria),
      p.producto,
      p.cantidad,
      dinero(p.precioUnitario),
      dinero(p.subtotal),
      vacio(p.tienda),
      p.comprado ? 'Sí' : 'No',
      ETIQUETA_PRIORIDAD[p.prioridad],
      vacio(p.otrasOpciones.map((o) => `${o.tienda || 'Sin tienda'} ${formatearPrecio(o.precio)}`).join('; ')),
      vacio(p.link),
      vacio(p.notas),
    ]);
  }

  const resumen = (etiqueta: string, importe: Celda): Celda[] => {
    const f = filaVacia(columnas);
    f[COL_ETIQUETA_TOTAL] = negrita(etiqueta);
    f[COL_ETIQUETA_TOTAL + 1] = importe;
    return f;
  };
  filas.push(filaVacia(columnas));
  filas.push(resumen('Total', dineroNegrita(lista.total)));
  if (lista.tope !== null) filas.push(resumen('Tope', dineroNegrita(lista.tope)));
  if (lista.disponible !== null) {
    filas.push(resumen('Disponible', dineroNegrita(lista.disponible, lista.disponible < 0 ? COLOR_NEGATIVO : undefined)));
  }

  return { sheet: nombre, data: filas, columns: ANCHOS_LISTA.map((width) => ({ width })), stickyRowsCount: 1 };
}

function hojaResumen(listas: ListaExportacion[]): HojaExcel {
  const filas: Celda[][] = [['Lista', 'Productos', 'Comprados', 'Total', 'Tope', 'Disponible'].map(encabezado)];
  let totalGeneral = 0;
  for (const l of listas) {
    totalGeneral += l.total;
    filas.push([
      l.nombre,
      l.productos.length,
      l.comprados,
      dinero(l.total),
      l.tope === null ? null : dinero(l.tope),
      l.disponible === null ? null : { ...(dinero(l.disponible) as object), ...(l.disponible < 0 ? { textColor: COLOR_NEGATIVO } : {}) } as Celda,
    ]);
  }
  filas.push(filaVacia(6));
  filas.push([negrita('Total general'), null, null, dineroNegrita(Math.round(totalGeneral * 100) / 100), null, null]);
  return {
    sheet: 'Resumen',
    data: filas,
    columns: [30, 12, 12, 16, 16, 16].map((width) => ({ width })),
    stickyRowsCount: 1,
  };
}

/** Estructura de las hojas (sin depender de la librería, para poder probarla). Con varias listas añade un "Resumen". */
export function hojasDeExcel(listas: ListaExportacion[]): HojaExcel[] {
  const usados = new Set<string>();
  const hojas: HojaExcel[] = [];
  if (listas.length > 1) {
    usados.add('resumen');
    hojas.push(hojaResumen(listas));
  }
  for (const l of listas) hojas.push(hojaDeLista(l, nombreHoja(l.nombre, usados)));
  return hojas;
}

/** Genera el .xlsx en memoria. La librería se carga solo al exportar, para no pesar en el arranque. */
export async function generarExcel(listas: ListaExportacion[]): Promise<Blob> {
  const { default: escribirExcel } = await import('write-excel-file/universal');
  const blob = await escribirExcel(hojasDeExcel(listas) as Parameters<typeof escribirExcel>[0]).toBlob();
  return blob.type === MIME_XLSX ? blob : new Blob([blob], { type: MIME_XLSX });
}
