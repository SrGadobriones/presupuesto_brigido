/** Modales abiertos, del más antiguo al más reciente: el botón «atrás» del celular cierra el último. */
const abiertos: Array<{ cerrar(): void }> = [];

/** Registra un modal abierto; devuelve la función que lo da de baja (al cerrarse o desmontarse). */
export function registrarModal(cerrar: () => void): () => void {
  const entrada = { cerrar };
  abiertos.push(entrada);
  return () => {
    const i = abiertos.indexOf(entrada);
    if (i >= 0) abiertos.splice(i, 1);
  };
}

export const hayModalAbierto = (): boolean => abiertos.length > 0;

/** Cierra el modal superior; devuelve false si no había ninguno abierto. */
export function cerrarModalSuperior(): boolean {
  const ultimo = abiertos[abiertos.length - 1];
  if (!ultimo) return false;
  ultimo.cerrar();
  return true;
}
