import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  abierto: boolean;
  titulo: string;
  /** Se llama al pulsar Esc o al hacer clic en el fondo oscurecido. */
  onCerrar(): void;
  /** Acción secundaria junto al título (p. ej. un botón de eliminar). */
  accionTitulo?: ComponentChildren;
  /** Más ancho, para formularios largos (el contenido hace scroll dentro del modal). */
  ancho?: boolean;
  /** Acciones fijas al pie, fuera del área con scroll. Un botón de envío debe usar `form="id"`. */
  pie?: ComponentChildren;
  children: ComponentChildren;
}

let contador = 0;

/** Ventana modal sobre el elemento nativo <dialog>: Esc la cierra y el foco queda dentro. */
export default function Modal({ abierto, titulo, onCerrar, accionTitulo, ancho = false, pie, children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useRef(`modal-titulo-${++contador}`);
  /** true si el último pulsado empezó en el fondo y no dentro del contenido. */
  const pulsoEnFondo = useRef(false);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={dialogo}
      class={ancho ? 'modal ancho' : 'modal'}
      aria-labelledby={idTitulo.current}
      onCancel={(e) => {
        e.preventDefault(); // el estado `abierto` manda; evitamos que el navegador la cierre por su cuenta
        onCerrar();
      }}
      onPointerDown={(e) => {
        pulsoEnFondo.current = e.target === e.currentTarget;
      }}
      onPointerUp={(e) => {
        if (e.target !== e.currentTarget) pulsoEnFondo.current = false; // soltó dentro del contenido
      }}
      onClick={(e) => {
        // Cierra solo si el clic empezó Y terminó en el fondo oscurecido. Si se arrastra desde dentro
        // y se suelta fuera, el navegador dispara el clic sobre el <dialog>: eso no debe cerrar.
        const cerrar = pulsoEnFondo.current && e.target === e.currentTarget;
        pulsoEnFondo.current = false;
        if (cerrar) onCerrar();
      }}
    >
      <div class="modal-contenido">
        {accionTitulo ? (
          <div class="modal-cabecera">
            <h2 id={idTitulo.current}>{titulo}</h2>
            {accionTitulo}
          </div>
        ) : (
          <h2 id={idTitulo.current}>{titulo}</h2>
        )}
        {children}
      </div>
      {pie && <div class="modal-pie">{pie}</div>}
    </dialog>
  );
}
