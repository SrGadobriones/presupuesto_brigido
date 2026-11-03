import type { Producto } from '../dominio/tipos';
/** Conservado como componente pequeño para usos futuros de miniaturas Firestore. */
export default function Miniatura({producto}:{producto:Producto}){return producto.miniatura?<img class="miniatura" src={URL.createObjectURL(new Blob([producto.miniatura as BlobPart],{type:'image/jpeg'}))} alt=""/>:null}
