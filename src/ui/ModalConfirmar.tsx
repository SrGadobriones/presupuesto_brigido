import Modal from './Modal';

interface Props {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  /** Texto del botón que confirma; nombra la acción ("Eliminar lista"), no "Aceptar". */
  confirmar: string;
  onConfirmar(): void;
  onCancelar(): void;
  /** Estilo rojo de acción destructiva; desactívalo para acciones inocuas como duplicar. */
  peligro?: boolean;
}

export default function ModalConfirmar({ abierto, titulo, mensaje, confirmar, onConfirmar, onCancelar, peligro = true }: Props) {
  return (
    <Modal abierto={abierto} titulo={titulo} onCerrar={onCancelar}>
      <p>{mensaje}</p>
      <div class="acciones modal-acciones">
        <button class="boton" type="button" onClick={onCancelar} autofocus>
          Cancelar
        </button>
        <button class={peligro ? 'boton peligro' : 'boton primario'} type="button" onClick={() => { onCancelar(); onConfirmar(); }}>
          {confirmar}
        </button>
      </div>
    </Modal>
  );
}
