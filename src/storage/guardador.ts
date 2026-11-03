export interface Guardador {
  /** Pide guardar; varias llamadas seguidas se agrupan en una sola escritura. */
  programar(): void;
  /** Guarda de inmediato si hay cambios pendientes. */
  ahora(): Promise<void>;
}

export function crearGuardador(
  obtenerBytes: () => Uint8Array,
  escribir: (bytes: Uint8Array) => Promise<void>,
  alError: (error: unknown) => void,
  ms = 500,
): Guardador {
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let pendiente = false;

  async function ejecutar(): Promise<void> {
    temporizador = null;
    pendiente = false;
    try {
      await escribir(obtenerBytes());
    } catch (error) {
      alError(error);
    }
  }

  return {
    programar() {
      pendiente = true;
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(() => void ejecutar(), ms);
    },
    async ahora() {
      if (temporizador) clearTimeout(temporizador);
      temporizador = null;
      if (pendiente) await ejecutar();
    },
  };
}
