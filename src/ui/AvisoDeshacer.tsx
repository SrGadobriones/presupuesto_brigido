import { deshacerEliminacion, useEliminaciones } from './eliminaciones';

/** Aviso fijo al pie tras eliminar algo, con «Deshacer». No es un modal: no bloquea la pantalla. */
export default function AvisoDeshacer() {
  const { mensaje } = useEliminaciones();
  if (!mensaje) return null;
  return (
    <div class="aviso-deshacer" role="status" aria-live="polite">
      <span>{mensaje}</span>
      <button type="button" onClick={deshacerEliminacion}>Deshacer</button>
    </div>
  );
}
