interface Props {
  cantidad: number;
  onMarcarComprados?(): void;
  onDuplicar?(): void;
  onEliminar(): void;
  onQuitar(): void;
  /** Nombre de los elementos seleccionados; por defecto, productos. */
  elemento?: string;
}

/** Acciones sobre los productos seleccionados; flota sobre la pantalla, fija al borde inferior. */
export default function BarraSeleccion({ cantidad, onMarcarComprados, onDuplicar, onEliminar, onQuitar, elemento = 'producto' }: Props) {
  return (
    <div class="barra-seleccion-capa">
      <div class="barra-seleccion" role="region" aria-label="Acciones sobre la selección">
        <strong>
          {cantidad} seleccionad{elemento === 'lista' ? 'a' : 'o'}{cantidad === 1 ? '' : 's'}
        </strong>
        <span class="barra-seleccion-espacio" />
        {onMarcarComprados && <button class="boton chico barra-seleccion-marcar" type="button" onClick={onMarcarComprados}>Comprar</button>}
        {onDuplicar && <button class="boton chico barra-seleccion-duplicar" type="button" onClick={onDuplicar}>Duplicar</button>}
        <button class="boton chico peligro barra-seleccion-eliminar" type="button" onClick={onEliminar}>
          Eliminar
        </button>
        <button class="boton chico fantasma barra-seleccion-quitar" type="button" onClick={onQuitar}>
          Quitar selección
        </button>
      </div>
    </div>
  );
}
