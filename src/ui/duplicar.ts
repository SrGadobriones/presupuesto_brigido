import type { Repositorio } from '../datos/repositorio';

/** Crea una copia de la lista con sus productos (sin marcar como comprados) y devuelve el id de la nueva. */
export async function duplicarLista(repo: Repositorio, listaId: string): Promise<string> {
  const todo = await repo.obtenerTodo();
  const lista = todo.listas.find((l) => l.id === listaId);
  if (!lista) throw new Error('La lista ya no existe');
  const nuevaId = await repo.crearLista({ nombre: `${lista.nombre} (copia)`, tope: lista.tope });
  for (const p of todo.productos.filter((x) => x.listaId === listaId)) {
    const foto = p.tieneFoto ? await repo.obtenerFoto(listaId, p.id) : null;
    await repo.guardarProducto({ ...p, id: undefined, listaId: nuevaId, comprado: false, foto });
  }
  return nuevaId;
}
