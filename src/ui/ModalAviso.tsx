import Modal from './Modal';

interface Props {
  /** Mensaje a mostrar; null = cerrado. */
  mensaje: string | null;
  /** Título del aviso; por defecto el de un error. */
  titulo?: string;
  onCerrar(): void;
}

/** Avisos de la app (p. ej. un archivo que no se pudo importar). Sustituye a alert(). */
export default function ModalAviso({ mensaje, titulo = 'No se pudo completar', onCerrar }: Props) {
  return (
    <Modal abierto={mensaje !== null} titulo={titulo} onCerrar={onCerrar}>
      <p>{mensaje ?? ''}</p>
      <div class="acciones modal-acciones">
        <button class="boton primario" type="button" onClick={onCerrar} autofocus>
          Entendido
        </button>
      </div>
    </Modal>
  );
}
