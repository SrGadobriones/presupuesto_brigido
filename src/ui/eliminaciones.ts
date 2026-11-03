import { useEffect, useState } from 'preact/hooks';

/** Tiempo que se espera, mostrando «Deshacer», antes de borrar de verdad. */
export const ESPERA_DESHACER_MS = 7000;

export interface Eliminacion {
  /** Ids que se ocultan de las pantallas mientras se puede deshacer. */
  ids: string[];
  /** Texto del aviso, p. ej. «Lista eliminada». */
  mensaje: string;
  /** El borrado real; solo se llama si no se deshace a tiempo. */
  ejecutar(): Promise<unknown>;
  /** Se llama si el borrado real falla (los elementos vuelven a mostrarse). */
  alFallar(error: unknown): void;
}

interface Pendiente extends Eliminacion {
  temporizador: ReturnType<typeof setTimeout>;
}

let pendiente: Pendiente | null = null;
/** Ids cuyo borrado ya se lanzó pero aún no termina: siguen ocultos para que no parpadeen. */
const enCurso = new Map<string, number>();
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

/** Borrado diferido: oculta los elementos y los borra tras `ESPERA_DESHACER_MS`, salvo que se deshaga. */
export function programarEliminacion(e: Eliminacion): void {
  if (pendiente) void confirmarPendiente(); // un aviso a la vez: lo anterior se borra ya
  pendiente = { ...e, temporizador: setTimeout(() => void confirmarPendiente(), ESPERA_DESHACER_MS) };
  avisar();
}

export function deshacerEliminacion(): void {
  if (!pendiente) return;
  clearTimeout(pendiente.temporizador);
  pendiente = null;
  avisar();
}

/** Borra ya lo pendiente (también al pasar la app a segundo plano, para no dejarlo a medias). */
export async function confirmarPendiente(): Promise<void> {
  const p = pendiente;
  if (!p) return;
  clearTimeout(p.temporizador);
  pendiente = null;
  p.ids.forEach((id) => enCurso.set(id, (enCurso.get(id) ?? 0) + 1));
  avisar();
  try {
    await p.ejecutar();
  } catch (error) {
    p.alFallar(error);
  } finally {
    p.ids.forEach((id) => {
      const n = (enCurso.get(id) ?? 1) - 1;
      if (n <= 0) enCurso.delete(id);
      else enCurso.set(id, n);
    });
    avisar();
  }
}

export function idsOcultos(): Set<string> {
  return new Set([...(pendiente?.ids ?? []), ...enCurso.keys()]);
}

export const mensajePendiente = (): string | null => pendiente?.mensaje ?? null;

export function suscribirEliminaciones(f: () => void): () => void {
  oyentes.add(f);
  return () => void oyentes.delete(f);
}

/** Estado para las pantallas: ids ocultos y el aviso vigente. Se vuelve a renderizar al cambiar. */
export function useEliminaciones(): { ocultos: Set<string>; mensaje: string | null } {
  const [, setVersion] = useState(0);
  useEffect(() => suscribirEliminaciones(() => setVersion((v) => v + 1)), []);
  return { ocultos: idsOcultos(), mensaje: mensajePendiente() };
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void confirmarPendiente();
  });
}
