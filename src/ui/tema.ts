export type Tema = 'sistema' | 'claro' | 'oscuro';

/** Clave de localStorage. Debe coincidir con la del script en línea de `src/pages/index.astro`. */
export const CLAVE_TEMA = 'tema';

export const SIGUIENTE_TEMA: Record<Tema, Tema> = {
  sistema: 'claro',
  claro: 'oscuro',
  oscuro: 'sistema',
};

export const ETIQUETA_TEMA: Record<Tema, string> = {
  sistema: 'Sistema',
  claro: 'Claro',
  oscuro: 'Oscuro',
};

export const ICONO_TEMA: Record<Tema, string> = {
  sistema: '🖥️',
  claro: '☀️',
  oscuro: '🌙',
};

type AlmacenLectura = Pick<Storage, 'getItem'>;
type AlmacenEscritura = Pick<Storage, 'setItem'>;
type Raiz = Pick<Element, 'setAttribute' | 'removeAttribute'>;

export function esTema(valor: unknown): valor is Tema {
  return valor === 'sistema' || valor === 'claro' || valor === 'oscuro';
}

/** El almacenamiento puede no existir o lanzar (modo privado, datos bloqueados). */
function almacenPorDefecto(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function leerTema(almacen: AlmacenLectura | undefined = almacenPorDefecto()): Tema {
  try {
    const valor = almacen?.getItem(CLAVE_TEMA);
    return esTema(valor) ? valor : 'sistema';
  } catch {
    return 'sistema';
  }
}

export function guardarTema(tema: Tema, almacen: AlmacenEscritura | undefined = almacenPorDefecto()): void {
  try {
    almacen?.setItem(CLAVE_TEMA, tema);
  } catch {
    // Sin almacenamiento el tema vale solo para esta visita.
  }
}

/** `sistema` quita el atributo para que mande `prefers-color-scheme`. */
export function aplicarTema(tema: Tema, raiz: Raiz = document.documentElement): void {
  if (tema === 'sistema') raiz.removeAttribute('data-tema');
  else raiz.setAttribute('data-tema', tema);
}
