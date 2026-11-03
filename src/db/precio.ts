/** Precio vigente de un producto (alias `p`): opción elegida, o la más barata, o 0. */
export const PRECIO_UNITARIO_SQL = `COALESCE(
  (SELECT o.precio FROM opciones o WHERE o.id = p.opcion_elegida_id AND o.producto_id = p.id),
  (SELECT MIN(o.precio) FROM opciones o WHERE o.producto_id = p.id),
  0
)`;

/**
 * Enlace vigente de un producto (alias `p`): el de la tienda elegida o, si no hay elegida, el de la más barata
 * (la misma opción que fija el precio); si esa no tiene enlace, el del propio producto; si no, ''.
 */
export const ENLACE_VIGENTE_SQL = `COALESCE(
  NULLIF(
    CASE WHEN p.opcion_elegida_id IS NOT NULL
      THEN (SELECT o.link FROM opciones o WHERE o.id = p.opcion_elegida_id AND o.producto_id = p.id)
      ELSE (SELECT o.link FROM opciones o WHERE o.producto_id = p.id ORDER BY o.precio, o.id LIMIT 1)
    END,
    ''
  ),
  NULLIF(p.link, ''),
  ''
)`;

/** Subconsulta escalar: total de la lista cuyo id es `listaExpr` (columna o `?`). */
export function totalSql(listaExpr: string): string {
  return `(SELECT ROUND(COALESCE(SUM(p.cantidad * ${PRECIO_UNITARIO_SQL}), 0), 2) FROM productos p WHERE p.lista_id = ${listaExpr})`;
}
