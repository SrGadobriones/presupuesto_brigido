import { useState } from 'preact/hooks';
import { validarLista } from '../dominio/validar';
import { useApp } from './contexto';
import { useResumenListas } from './useDatos';
import { programarEliminacion, useEliminaciones } from './eliminaciones';
import { hrefLista, irA } from './ruta';
import { importarTextoWhatsapp } from './whatsapp';
import IconoWhatsapp from './IconoWhatsapp';
import { duplicarLista } from './duplicar';
import { formatearNumero, formatearPrecio, parsearNumero, mensajeError } from './formato';
import BarraPresupuesto from './BarraPresupuesto';
import Modal from './Modal';
import Loader from './Loader';
import BarraSeleccion from './BarraSeleccion';
import ModalConfirmar from './ModalConfirmar';

export default function Inicio() {
  const { repo, avisar } = useApp();
  const { listas: todasLasListas, cargando, error: errorDatos } = useResumenListas();
  const { ocultos } = useEliminaciones();
  const listas = todasLasListas.filter((l) => !ocultos.has(l.id));
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [tope, setTope] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [confirmandoDuplicar, setConfirmandoDuplicar] = useState(false);
  const [importando, setImportando] = useState(false);
  const [textoImportado, setTextoImportado] = useState('');
  const [errorImportar, setErrorImportar] = useState<string | null>(null);
  const [procesandoImportar, setProcesandoImportar] = useState(false);
  const cerrarImportar = () => {
    setImportando(false);
    setTextoImportado('');
    setErrorImportar(null);
  };
  const importar = async (e: Event) => {
    e.preventDefault();
    setProcesandoImportar(true);
    try {
      const id = await importarTextoWhatsapp(repo, textoImportado);
      cerrarImportar();
      irA(hrefLista(id));
    } catch (x) {
      setErrorImportar(mensajeError(x, 'No se pudo importar la lista'));
    } finally {
      setProcesandoImportar(false);
    }
  };

  const cancelar = () => {
    setCreando(false);
    setNombre('');
    setTope('');
    setError(null);
  };

  const enviar = async (e: Event) => {
    e.preventDefault();
    let datos;
    try {
      datos = validarLista({ nombre, tope: parsearNumero(tope) });
    } catch (x) {
      setError(mensajeError(x, 'No se pudo crear la lista'));
      return;
    }

    // Firestore puede esperar a reconectar. Cerramos al aceptar los datos para que el
    // formulario no quede sobre la lista que ya apareció en la escucha en tiempo real.
    cancelar();
    try {
      await repo.crearLista(datos);
    } catch (x) {
      setNombre(datos.nombre);
      setTope(datos.tope === null ? '' : formatearNumero(datos.tope));
      setError(mensajeError(x, 'No se pudo crear la lista'));
      setCreando(true);
    }
  };

  const seleccionados = seleccion.filter((id) => listas.some((lista) => lista.id === id));
  const todosSeleccionados = listas.length > 0 && seleccionados.length === listas.length;
  const alternarLista = (id: string, marcada: boolean) =>
    setSeleccion((actual) => marcada ? [...new Set([...actual, id])] : actual.filter((x) => x !== id));
  const duplicarSeleccionadas = async () => {
    try {
      for (const id of seleccionados) await duplicarLista(repo, id);
      setSeleccion([]);
    } catch (e) {
      avisar(mensajeError(e, 'No se pudo duplicar la lista'));
    }
  };
  const eliminarSeleccionadas = () => {
    const ids = [...seleccionados];
    programarEliminacion({
      ids,
      mensaje: ids.length === 1 ? 'Lista eliminada' : `${ids.length} listas eliminadas`,
      ejecutar: () => Promise.all(ids.map((id) => repo.eliminarLista(id))),
      alFallar: (e) => avisar(mensajeError(e, 'No se pudo eliminar la lista')),
    });
    setSeleccion([]);
    setConfirmandoEliminar(false);
  };

  return (
    <>
      <header class="encabezado">
        <div class="acciones"><button class="boton chico" onClick={() => setImportando(true)}><IconoWhatsapp />Importar</button><button class="boton primario chico" onClick={() => setCreando(true)}>Nueva lista</button></div>
      </header>
      <Modal abierto={importando} titulo="Importar lista" onCerrar={cerrarImportar}>
        <form class="formulario-modal" onSubmit={(e) => void importar(e)} noValidate>
          <label class="campo"><span>Pega aquí la lista compartida por WhatsApp</span><textarea rows={10} value={textoImportado} onInput={(e) => setTextoImportado(e.currentTarget.value)} autofocus /></label>
          {errorImportar && <div class="aviso error">{errorImportar}</div>}
          <div class="acciones modal-acciones"><button class="boton" type="button" onClick={cerrarImportar}>Cancelar</button><button class="boton primario" disabled={procesandoImportar || !textoImportado.trim()}>{procesandoImportar ? 'Importando…' : 'Importar lista'}</button></div>
        </form>
      </Modal>
      <Modal abierto={creando} titulo="Nueva lista" onCerrar={cancelar}>
        <form class="formulario-modal" onSubmit={(e) => void enviar(e)} noValidate>
          <label class="campo"><span>Nombre de la lista</span><input value={nombre} onInput={(e) => setNombre(e.currentTarget.value)} autofocus required /></label>
          <label class="campo"><span>Tope de presupuesto (opcional)</span><input value={tope} onInput={(e) => setTope(e.currentTarget.value)} inputMode="decimal" /></label>
          {error && <div class="aviso error">{error}</div>}
          <div class="acciones modal-acciones"><button class="boton" type="button" onClick={cancelar}>Cancelar</button><button class="boton primario">Crear lista</button></div>
        </form>
      </Modal>
      {errorDatos && <div class="aviso error" role="alert">{errorDatos}</div>}
      {cargando && !errorDatos && <Loader mensaje="Cargando tus listas…" />}
      {!cargando && !errorDatos && listas.length === 0 && <p class="vacio">Aún no hay listas. Crea la primera para empezar.</p>}
      {listas.length > 0 && <div class="resumen-compras-fila"><button class="boton chico fantasma" type="button" style={{ marginLeft: 'auto' }} onClick={() => setSeleccion(todosSeleccionados ? [] : listas.map((lista) => lista.id))}>{todosSeleccionados ? 'Quitar selección' : 'Seleccionar todo'}</button></div>}
      {listas.map((l) => <div class={`lista-fila${seleccionados.includes(l.id) ? ' seleccionada' : ''}`} key={l.id}><input class="casilla-seleccion" type="checkbox" checked={seleccionados.includes(l.id)} aria-label={`Seleccionar: ${l.nombre}`} onChange={(e) => alternarLista(l.id, e.currentTarget.checked)} /><a class="lista" href={hrefLista(l.id)}><div class="lista-cabecera"><span class="lista-nombre">{l.nombre}</span><small class="muted">{l.productos} {l.productos === 1 ? 'producto' : 'productos'}</small></div><div class="lista-total"><span class="cifra">{formatearPrecio(l.total)}</span>{l.tope !== null && <span class="muted">de {formatearPrecio(l.tope)}</span>}</div><BarraPresupuesto total={l.total} comprado={l.comprado} tope={l.tope} leyenda /></a></div>)}
      {seleccionados.length > 0 && <><div class="relleno-barra-seleccion" /><BarraSeleccion cantidad={seleccionados.length} elemento="lista" onDuplicar={() => setConfirmandoDuplicar(true)} onEliminar={() => setConfirmandoEliminar(true)} onQuitar={() => setSeleccion([])} /></>}
      <ModalConfirmar abierto={confirmandoDuplicar} peligro={false} titulo={seleccionados.length === 1 ? '¿Duplicar esta lista?' : `¿Duplicar ${seleccionados.length} listas?`} mensaje={seleccionados.length === 1 ? 'Se creará una copia de la lista seleccionada con todos sus productos.' : 'Se creará una copia de cada lista seleccionada con todos sus productos.'} confirmar={seleccionados.length === 1 ? 'Duplicar lista' : 'Duplicar listas'} onConfirmar={() => void duplicarSeleccionadas()} onCancelar={() => setConfirmandoDuplicar(false)} />
      <ModalConfirmar abierto={confirmandoEliminar} titulo={seleccionados.length === 1 ? '¿Eliminar esta lista?' : `¿Eliminar ${seleccionados.length} listas?`} mensaje={seleccionados.length === 1 ? 'Se eliminará la lista seleccionada con todos sus productos.' : 'Se eliminarán las listas seleccionadas con todos sus productos.'} confirmar={seleccionados.length === 1 ? 'Eliminar lista' : 'Eliminar listas'} onConfirmar={() => void eliminarSeleccionadas()} onCancelar={() => setConfirmandoEliminar(false)} />
    </>
  );
}
