interface Props {
  mensaje?: string;
  compacto?: boolean;
}

/** Indicador de carga reutilizable, con texto accesible y animación respetuosa. */
export default function Loader({ mensaje = 'Cargando…', compacto = false }: Props) {
  return (
    <div class={`loader${compacto ? ' loader-compacto' : ''}`} role="status" aria-live="polite">
      <span class="loader-spin" aria-hidden="true" />
      <span>{mensaje}</span>
    </div>
  );
}
