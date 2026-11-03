import { useEffect, useState } from 'preact/hooks';

interface Props {
  href: string;
  /** Id del botón «Agregar producto» fijo del encabezado; el flotante aparece cuando ese sale de la pantalla. */
  objetivoId: string;
  /** Lo oculta mientras hay otra barra flotante (p. ej. la de selección). */
  oculto?: boolean;
}

/** Botón «+» fijo en la esquina inferior; solo se muestra cuando el botón de agregar del encabezado ya no se ve. */
export default function BotonAgregarFlotante({ href, objetivoId, oculto = false }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const objetivo = document.getElementById(objetivoId);
    if (!objetivo || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(([entrada]) => setVisible(!entrada.isIntersecting));
    observador.observe(objetivo);
    return () => observador.disconnect();
  }, [objetivoId]);

  const mostrar = visible && !oculto;
  return (
    <a
      class={`fab-agregar${mostrar ? ' visible' : ''}`}
      href={href}
      aria-label="Agregar producto"
      title="Agregar producto"
      tabIndex={mostrar ? 0 : -1}
      aria-hidden={!mostrar}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </a>
  );
}
