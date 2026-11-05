import { hrefInicio } from './ruta';
import BotonTema from './BotonTema';
import IndicadorConexion from './IndicadorConexion';
import MenuDatos from './MenuDatos';

/** Fila superior común a todas las pantallas: volver a las listas (si aplica) y los controles de la app. */
export default function BarraSuperior({ conVolver, listaId, titulo }: { conVolver: boolean; listaId?: string; titulo?: string }) {
  return (
    <nav class="barra-superior" aria-label="Navegación y ajustes">
      {conVolver && (
        <a class="migas" href={hrefInicio()}>
          Listas
        </a>
      )}
      {titulo && <h1 class="barra-superior-titulo"><span class="marca-icono" aria-hidden="true">✦</span><span class="barra-superior-texto">{titulo}</span></h1>}
      <div class="acciones barra-superior-acciones">
        <IndicadorConexion />
        <BotonTema />
        <MenuDatos listaId={listaId} />
      </div>
    </nav>
  );
}
