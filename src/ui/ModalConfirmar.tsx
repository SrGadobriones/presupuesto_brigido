import Modal from './Modal';

interface Props {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  /** Texto del botón que confirma; nombra la acción ("Eliminar lista"), no "Aceptar". */
  confirmar: string;
  onConfirmar(): void;
  onCancelar(): void;
}

export default function ModalConfirmar({ abierto, titulo, mensaje, confirmar, onConfirmar, onCancelar }: Props) {
  return (
    <Modal abierto={abierto} titulo={titulo} onCerrar={onCancelar}>
      <p>{mensaje}</p>
      <div class="acciones modal-acciones">
        <button class="boton" type="button" onClick={onCancelar} autofocus>
          Cancelar
        </button>
        <button class="boton peligro" type="button" onClick={() => { onCancelar(); onConfirmar(); }}>
          {confirmar}
        </button>
      </div>
    </Modal>
  );
}
