import { useState } from 'preact/hooks';
import { aplicarTema, ETIQUETA_TEMA, guardarTema, ICONO_TEMA, leerTema, SIGUIENTE_TEMA } from './tema';

export default function BotonTema() {
  const [tema, setTema] = useState(() => leerTema());
  const siguiente = SIGUIENTE_TEMA[tema];

  const cambiar = () => {
    guardarTema(siguiente);
    aplicarTema(siguiente);
    setTema(siguiente);
  };

  return (
    <button
      class="boton chico icono"
      type="button"
      onClick={cambiar}
      title={`Tema: ${ETIQUETA_TEMA[tema]}. Cambiar a ${ETIQUETA_TEMA[siguiente]}`}
      aria-label={`Tema: ${ETIQUETA_TEMA[tema]}. Cambiar a ${ETIQUETA_TEMA[siguiente]}`}
    >
      {ICONO_TEMA[tema]}
    </button>
  );
}
