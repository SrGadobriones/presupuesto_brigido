import { useEffect, useRef, useState } from 'preact/hooks';
import type { Opcion, Prioridad } from '../dominio/tipos';
import { useApp } from './contexto'; import { programarEliminacion } from './eliminaciones'; import { useProductos } from './useDatos';
import { hrefLista, irA } from './ruta'; import { ETIQUETA_PRIORIDAD, mensajeError, parsearNumero } from './formato';
import Modal from './Modal'; import ModalConfirmar from './ModalConfirmar';

const oid = () => crypto.randomUUID();

export default function PantallaProducto({ listaId, productoId }: { listaId: string; productoId: string | null }) {
  const { repo, avisar } = useApp();
  const { productos } = useProductos(listaId);
  const previo = productoId ? productos.find((p) => p.id === productoId) : undefined;
  const hidratado = useRef(false);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [categoria, setCategoria] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  const [notas, setNotas] = useState('');
  const [link, setLink] = useState('');
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [elegida, setElegida] = useState<string | null>(null);
  const [textoPrecio, setTextoPrecio] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  // La escucha llega después de montar el modal. Copiamos los datos una sola vez
  // para no pisar cambios que el usuario esté escribiendo.
  useEffect(() => {
    if (!previo || hidratado.current) return;
    setNombre(previo.nombre); setCantidad(String(previo.cantidad)); setCategoria(previo.categoria);
    setPrioridad(previo.prioridad); setNotas(previo.notas); setLink(previo.link);
    setOpciones(previo.opciones); setElegida(previo.opcionElegidaId);
    hidratado.current = true;
  }, [previo]);

  const volver = () => irA(hrefLista(listaId));
  const guardar = async (e: Event) => {
    e.preventDefault();
    const borrador = { id: productoId ?? undefined, listaId, nombre, cantidad: Number(cantidad), categoria, prioridad, notas, link, opcionElegidaId: elegida, opciones };
    if (!nombre.trim() || !Number.isInteger(borrador.cantidad) || borrador.cantidad < 1) {
      setError(!nombre.trim() ? 'El nombre es obligatorio' : 'La cantidad debe ser un entero mayor o igual a 1'); return;
    }
    volver();
    try { await repo.guardarProducto(borrador); } catch (x) { avisar(mensajeError(x, 'No se pudo guardar el producto')); }
  };
  const eliminar = () => { setConfirmando(false); volver(); if (productoId) programarEliminacion({ ids: [productoId], mensaje: 'Producto eliminado', ejecutar: () => repo.eliminarProductos(listaId, [productoId]), alFallar: (x) => avisar(mensajeError(x, 'No se pudo eliminar el producto')) }); };

  return <><Modal abierto titulo={productoId ? 'Editar producto' : 'Nuevo producto'} onCerrar={volver} ancho pie={<><span class="modal-pie-espacio" />{productoId && <button class="boton peligro" type="button" onClick={() => setConfirmando(true)}>Eliminar</button>}<button class="boton" type="button" onClick={volver}>Cancelar</button><button class="boton primario" type="submit" form="formulario-producto">Guardar</button></>}>
    <form id="formulario-producto" class="formulario-producto" onSubmit={(e) => void guardar(e)}>
      <div class="tarjeta"><label class="campo"><span>Nombre</span><input value={nombre} onInput={(e) => setNombre(e.currentTarget.value)} required /></label><div class="grid2"><label class="campo"><span>Cantidad</span><input type="number" min="1" value={cantidad} onInput={(e) => setCantidad(e.currentTarget.value)} /></label><label class="campo"><span>Prioridad</span><select value={prioridad} onChange={(e) => setPrioridad(e.currentTarget.value as Prioridad)}>{(Object.keys(ETIQUETA_PRIORIDAD) as Prioridad[]).map((p) => <option value={p}>{ETIQUETA_PRIORIDAD[p]}</option>)}</select></label></div><label class="campo"><span>Categoría</span><input value={categoria} onInput={(e) => setCategoria(e.currentTarget.value)} /></label><label class="campo"><span>Enlace del producto</span><input value={link} onInput={(e) => setLink(e.currentTarget.value)} inputMode="url" /></label><label class="campo"><span>Notas</span><textarea value={notas} onInput={(e) => setNotas(e.currentTarget.value)} /></label></div>
      <div class="tarjeta"><strong>Opciones de tienda y precio</strong><label><input type="radio" checked={elegida === null} onChange={() => setElegida(null)} /> Automática (la más barata)</label>{opciones.map((o) => <div class="fila-opcion" key={o.id}><div class="grid2"><label class="campo"><span>Tienda</span><input value={o.tienda} onInput={(e) => setOpciones((x) => x.map((a) => a.id === o.id ? { ...a, tienda: e.currentTarget.value } : a))} /></label><label class="campo"><span>Precio</span><input value={textoPrecio[o.id] ?? String(o.precio)} inputMode="decimal" onInput={(e) => { const texto = e.currentTarget.value; setTextoPrecio((t) => ({ ...t, [o.id]: texto })); setOpciones((x) => x.map((a) => a.id === o.id ? { ...a, precio: parsearNumero(texto) ?? NaN } : a)); }} /></label></div><label><input type="radio" name="elegida" checked={elegida === o.id} onChange={() => setElegida(o.id)} /> Elegir esta</label><button class="boton chico peligro" type="button" onClick={() => setOpciones((x) => x.filter((a) => a.id !== o.id))}>Quitar</button></div>)}<button class="boton" type="button" onClick={() => setOpciones((x) => [...x, { id: oid(), tienda: '', precio: 0, link: '' }])}>Agregar opción</button></div>
      {error && <div class="aviso error">{error}</div>}
    </form>
  </Modal><ModalConfirmar abierto={confirmando} titulo="¿Eliminar este producto?" mensaje="Se eliminará este producto de la lista." confirmar="Eliminar producto" onConfirmar={eliminar} onCancelar={() => setConfirmando(false)} /></>;
}
