import { Capacitor } from '@capacitor/core';
import { buscarActualizacion } from './actualizar';
import { hayModalAbierto } from './modales';

/** Mínimo entre dos comprobaciones, para no consultar al servidor cada vez que se cambia de app. */
const ENTRE_COMPROBACIONES_MS = 30_000;
/** Espera tras abrir la app, para no competir con la carga inicial. */
const RETRASO_INICIAL_MS = 3_000;

/**
 * App Android: comprueba si hay una versión nueva de la web al abrirse y cada vez que se vuelve a ella
 * desde segundo plano, y recarga sola. No recarga con un modal abierto (podría perderse lo escrito);
 * en ese caso se reintenta en la próxima comprobación. En la web no hace nada: el navegador ya recarga.
 * Devuelve la función que quita los listeners.
 */
export async function instalarActualizacionAutomatica(): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  let ultima = 0;
  let enCurso = false;
  const comprobar = async () => {
    if (enCurso || Date.now() - ultima < ENTRE_COMPROBACIONES_MS) return;
    enCurso = true;
    ultima = Date.now();
    try {
      if ((await buscarActualizacion()) === 'nueva' && !hayModalAbierto()) location.reload();
    } catch {
      // Sin conexión o error del servidor: se vuelve a intentar la próxima vez.
    } finally {
      enCurso = false;
    }
  };
  const temporizador = window.setTimeout(() => void comprobar(), RETRASO_INICIAL_MS);
  try {
    const { App } = await import('@capacitor/app');
    const escucha = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void comprobar();
    });
    return () => {
      window.clearTimeout(temporizador);
      void escucha.remove();
    };
  } catch {
    // APK anterior sin el plugin: solo se comprueba al abrir.
    return () => window.clearTimeout(temporizador);
  }
}
