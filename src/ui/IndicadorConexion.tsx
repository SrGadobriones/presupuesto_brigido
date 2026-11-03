import { useEffect, useState } from 'preact/hooks';

/** Icono de wifi tachado junto al botón de tema; solo se ve cuando no hay internet. */
export default function IndicadorConexion() {
  const [enLinea, setEnLinea] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);

  useEffect(() => {
    const cambiar = () => setEnLinea(navigator.onLine !== false);
    window.addEventListener('online', cambiar);
    window.addEventListener('offline', cambiar);
    cambiar();
    return () => {
      window.removeEventListener('online', cambiar);
      window.removeEventListener('offline', cambiar);
    };
  }, []);

  if (enLinea) return null;
  const texto = 'Sin conexión: los cambios se guardan en el dispositivo y se envían al volver internet';
  return (
    <span class="indicador-conexion" role="status" title={texto} aria-label={texto}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12.55a11 11 0 0 1 5.17-2.39" />
        <path d="M13.83 10.16A11 11 0 0 1 19 12.55" />
        <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
        <path d="M22 8.82a15 15 0 0 0-11.28-3.76" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <path d="M12 20h.01" />
        <path d="M2 2l20 20" />
      </svg>
    </span>
  );
}
