import { describe, it, expect } from 'vitest';
import type { ListaExportacion } from '../../src/db/exportar';
import { generarExcel, hojasDeExcel, nombreArchivoExcel, nombreHoja } from '../../src/storage/excel';

const valor = (c: unknown) => (c && typeof c === 'object' ? (c as { value: unknown }).value : c);
const fila = (celdas: unknown[]) => celdas.map(valor);

function lista(parcial: Partial<ListaExportacion> = {}): ListaExportacion {
  return {
    nombre: 'Casa',
    tope: 1000,
    total: 500,
    disponible: 500,
    comprados: 1,
    productos: [
      {
        categoria: 'Electro',
        producto: 'TV',
        cantidad: 2,
        prioridad: 'alta',
        comprado: false,
        tienda: 'B',
        precioUnitario: 250,
        subtotal: 500,
        link: 'https://b.com/tv',
        otrasOpciones: [{ tienda: 'A', precio: 300, link: 'https://a.com/tv' }],
        notas: 'de 43"',
      },
      {
        categoria: '',
        producto: 'Mesa',
        cantidad: 1,
        prioridad: 'media',
        comprado: true,
        tienda: '',
        precioUnitario: 0,
        subtotal: 0,
        link: '',
        otrasOpciones: [],
        notas: '',
      },
    ],
    ...parcial,
  };
}

describe('nombreHoja', () => {
  it('quita los caracteres que Excel no admite y recorta a 31', () => {
    expect(nombreHoja('Compras: [casa]/2024?', new Set())).toBe('Compras- -casa--2024-');
    expect(nombreHoja('x'.repeat(50), new Set())).toHaveLength(31);
  });

  it('usa un nombre de respaldo si queda vacío', () => {
    expect(nombreHoja('   ', new Set())).toBe('Lista');
    expect(nombreHoja("'", new Set())).toBe('Lista');
  });

  it('evita repetidos sin distinguir mayúsculas y respeta el largo máximo', () => {
    const usados = new Set<string>();
    expect(nombreHoja('Casa', usados)).toBe('Casa');
    expect(nombreHoja('casa', usados)).toBe('casa (2)');
    expect(nombreHoja('CASA', usados)).toBe('CASA (3)');
    const largo = 'a'.repeat(31);
    const a = nombreHoja(largo, usados);
    const b = nombreHoja(largo, usados);
    expect(a).toHaveLength(31);
    expect(b).toHaveLength(31);
    expect(b).not.toBe(a);
  });
});

describe('nombreArchivoExcel', () => {
  it('para una sola lista incluye su nombre sin acentos ni símbolos', () => {
    expect(nombreArchivoExcel([lista({ nombre: 'Armado de Cása / 2024!' })], '2026-11-03')).toBe(
      'presupuesto_brigido_armado_de_casa_2024_2026-11-03.xlsx',
    );
  });

  it('para varias listas solo lleva la fecha', () => {
    expect(nombreArchivoExcel([lista(), lista()], '2026-11-03')).toBe('presupuesto_brigido_2026-11-03.xlsx');
  });
});

describe('hojasDeExcel', () => {
  it('una lista genera una sola hoja con su nombre, sin resumen', () => {
    const hojas = hojasDeExcel([lista()]);
    expect(hojas).toHaveLength(1);
    expect(hojas[0].sheet).toBe('Casa');
    expect(hojas[0].stickyRowsCount).toBe(1);
  });

  it('tiene encabezados, una fila por producto y los valores esperados', () => {
    const [h] = hojasDeExcel([lista()]);
    expect(fila(h.data[0])).toEqual([
      'Categoría', 'Producto', 'Cantidad', 'Precio unitario', 'Subtotal', 'Tienda', 'Comprado', 'Prioridad', 'Otras opciones', 'Enlace', 'Notas',
    ]);
    expect(fila(h.data[1])).toEqual(['Electro', 'TV', 2, 250, 500, 'B', 'No', 'Alta', 'A $300', 'https://b.com/tv', 'de 43"']);
    // Vacíos como celdas nulas y no como cadenas vacías; "Sin categoría" no se inventa.
    expect(fila(h.data[2])).toEqual([null, 'Mesa', 1, 0, 0, null, 'Sí', 'Media', null, null, null]);
  });

  it('los importes llevan formato de moneda y las cantidades no', () => {
    const [h] = hojasDeExcel([lista()]);
    const precio = h.data[1][3] as { format?: string };
    expect(precio.format).toBe('"$"#,##0');
    expect(h.data[1][2]).toBe(2);
  });

  it('usa dos decimales solo si el importe los tiene', () => {
    const l = lista();
    l.productos[0].precioUnitario = 10.5;
    l.productos[0].subtotal = 21;
    const [h] = hojasDeExcel([l]);
    expect((h.data[1][3] as { format?: string }).format).toBe('"$"#,##0.00');
    expect((h.data[1][4] as { format?: string }).format).toBe('"$"#,##0');
  });

  it('cierra con total, tope y disponible', () => {
    const [h] = hojasDeExcel([lista()]);
    const textos = h.data.map((f) => fila(f));
    const total = textos.find((f) => f.includes('Total'))!;
    expect(total[total.indexOf('Total') + 1]).toBe(500);
    expect(textos.find((f) => f.includes('Tope'))).toBeTruthy();
    expect(textos.find((f) => f.includes('Disponible'))).toBeTruthy();
  });

  it('sin tope no muestra tope ni disponible', () => {
    const [h] = hojasDeExcel([lista({ tope: null, disponible: null })]);
    const textos = h.data.flatMap((f) => fila(f));
    expect(textos).not.toContain('Tope');
    expect(textos).not.toContain('Disponible');
  });

  it('un disponible negativo se marca en rojo', () => {
    const [h] = hojasDeExcel([lista({ total: 1200, disponible: -200 })]);
    const celda = h.data.flat().find((c) => c && typeof c === 'object' && (c as { value: unknown }).value === -200) as { textColor?: string };
    expect(celda.textColor).toBe('#C93C3C');
  });

  it('varias listas añaden primero una hoja Resumen con un total general', () => {
    const hojas = hojasDeExcel([lista({ nombre: 'Casa', total: 500 }), lista({ nombre: 'Viaje', total: 250.5, tope: null, disponible: null })]);
    expect(hojas.map((h) => h.sheet)).toEqual(['Resumen', 'Casa', 'Viaje']);
    const resumen = hojas[0].data.map((f) => fila(f));
    expect(resumen[0]).toEqual(['Lista', 'Productos', 'Comprados', 'Total', 'Tope', 'Disponible']);
    expect(resumen[1]).toEqual(['Casa', 2, 1, 500, 1000, 500]);
    expect(resumen[2]).toEqual(['Viaje', 2, 1, 250.5, null, null]);
    expect(resumen.at(-1)).toContain('Total general');
    expect(resumen.at(-1)).toContain(750.5);
  });

  it('una lista llamada Resumen no choca con la hoja Resumen', () => {
    const hojas = hojasDeExcel([lista({ nombre: 'Resumen' }), lista({ nombre: 'Otra' })]);
    expect(new Set(hojas.map((h) => h.sheet.toLowerCase())).size).toBe(3);
  });

  it('las hojas con nombres repetidos se distinguen', () => {
    const hojas = hojasDeExcel([lista({ nombre: 'Casa' }), lista({ nombre: 'Casa' })]);
    expect(hojas.slice(1).map((h) => h.sheet)).toEqual(['Casa', 'Casa (2)']);
  });
});

describe('generarExcel', () => {
  it('produce un .xlsx válido (un zip) con el tipo MIME correcto', async () => {
    const blob = await generarExcel([lista(), lista({ nombre: 'Viaje' })]);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(blob.size).toBeGreaterThan(1000);
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
  });
});
