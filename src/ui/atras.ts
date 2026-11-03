import { Capacitor } from '@capacitor/core';
import { cerrarModalSuperior } from './modales';
import { hrefInicio, hrefLista, irA, parsearRuta } from './ruta';

const VENTANA_SALIR_MS = 2000;

/** Aviso breve fijo al pie; no es un modal para no interferir con el botón «atrás». */
function mostrarAviso(texto: string): void {
  document.querySelector('.aviso-flotante')?.remove();
  const aviso = document.createElement('div');
  aviso.className = 'aviso-flotante';
  aviso.setAttribute('role', 'status');
  aviso.textContent = texto;
  document.body.appendChild(aviso);
  window.setTimeout(() => aviso.remove(), VENTANA_SALIR_MS);
}

/**
 * Botón «atrás» de Android (solo en la app instalada; en la web no hace nada):
 * 1) cierra el modal abierto, 2) sube un nivel (producto → lista → inicio) y
 * 3) en el inicio, al pulsarlo dos veces seguidas minimiza la app.
 * Devuelve la función que quita el listener.
 */
export async function instalarBotonAtras(): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  try {
    const { App } = await import('@capacitor/app');
    let ultimoAtras = 0;
    const escucha = await App.addListener('backButton', () => {
      if (cerrarModalSuperior()) return;
      const ruta = parsearRuta(location.hash);
      if (ruta.vista !== 'inicio') {
        irA(ruta.vista === 'producto' ? hrefLista(ruta.listaId) : hrefInicio());
        return;
      }
      const ahora = Date.now();
      if (ahora - ultimoAtras < VENTANA_SALIR_MS) {
        void App.minimizeApp();
        return;
      }
      ultimoAtras = ahora;
      mostrarAviso('Pulsa atrás otra vez para salir');
    });
    return () => void escucha.remove();
  } catch {
    // APK anterior sin el plugin nativo: se conserva el comportamiento por defecto.
    return () => {};
  }
}
