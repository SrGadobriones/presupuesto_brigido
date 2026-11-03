import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc, writeBatch, type DocumentData } from 'firebase/firestore';
import { firebase } from '../firebase/cliente'; import type { DatosLista, DatosProducto, Lista, Producto, Todo } from '../dominio/tipos'; import { validarLista, validarProducto } from '../dominio/validar'; import type { Repositorio } from './repositorio';
const bytes=(x:unknown)=>x && typeof x==='object'&&'toUint8Array' in x?(x as {toUint8Array():Uint8Array}).toUint8Array():null;
const lista=(id:string,d:DocumentData):Lista=>({id,nombre:d.nombre,tope:d.tope??null,creadaEn:d.creadaEn?.toDate?.().toISOString?.()??''});
const producto=(listaId:string,id:string,d:DocumentData):Producto=>({id,listaId,nombre:d.nombre,cantidad:d.cantidad,categoria:d.categoria??'',prioridad:d.prioridad,notas:d.notas??'',link:d.link??'',comprado:!!d.comprado,opcionElegidaId:d.opcionElegidaId??null,opciones:d.opciones??[],tieneFoto:!!d.tieneFoto,miniatura:bytes(d.miniatura)});
export class RepositorioFirestore implements Repositorio {
  constructor(private uid:string){} private listas=()=>collection(firebase().db,'usuarios',this.uid,'listas'); private productos=(l:string)=>collection(firebase().db,'usuarios',this.uid,'listas',l,'productos');
  escucharListas(cb:(x:Lista[])=>void,alError?:(e:unknown)=>void){return onSnapshot(this.listas(),s=>cb(s.docs.map(x=>lista(x.id,x.data()))),e=>alError?.(e))}
  escucharProductos(l:string,cb:(x:Producto[])=>void,alError?:(e:unknown)=>void){return onSnapshot(this.productos(l),s=>cb(s.docs.map(x=>producto(l,x.id,x.data()))),e=>alError?.(e))}
  async crearLista(datos:DatosLista){const d=validarLista(datos);return (await addDoc(this.listas(),{...d,creadaEn:serverTimestamp()})).id}
  async actualizarLista(id:string,datos:DatosLista){await setDoc(doc(this.listas(),id),validarLista(datos),{merge:true})}
  async eliminarLista(id:string){const productos=await getDocs(this.productos(id));const batch=writeBatch(firebase().db);for(const p of productos.docs){const foto=doc(this.productos(id),p.id,'fotos','principal');batch.delete(foto);batch.delete(p.ref)}batch.delete(doc(this.listas(),id));await batch.commit()}
  async guardarProducto(b:DatosProducto){
    const d=validarProducto(b);
    const esNuevo=!d.id;
    const ref=d.id?doc(this.productos(d.listaId),d.id):doc(this.productos(d.listaId));
    // Firestore rechaza valores `undefined`. Los campos de foto solo se incluyen
    // cuando el formulario pidió expresamente crearla, reemplazarla o quitarla.
    const data:DocumentData={nombre:d.nombre,cantidad:d.cantidad,categoria:d.categoria,prioridad:d.prioridad,notas:d.notas,link:d.link,comprado:d.comprado??false,opcionElegidaId:d.opcionElegidaId,opciones:d.opciones};
    if(esNuevo)data.creadoEn=serverTimestamp();
    if(d.foto!==undefined){data.tieneFoto=d.foto!==null;data.miniatura=d.foto;}
    const batch=writeBatch(firebase().db);
    batch.set(ref,data,{merge:true});
    if(d.foto!==undefined){const f=doc(ref,'fotos','principal');d.foto?batch.set(f,{bytes:d.foto}):batch.delete(f)}
    await batch.commit();
    return ref.id;
  }
  async eliminarProductos(l:string,ids:string[]){const b=writeBatch(firebase().db);ids.forEach(i=>{const r=doc(this.productos(l),i);b.delete(doc(r,'fotos','principal'));b.delete(r)});await b.commit()}
  async marcarComprado(l:string,ids:string[],comprado:boolean){const b=writeBatch(firebase().db);ids.forEach(i=>b.set(doc(this.productos(l),i),{comprado},{merge:true}));await b.commit()}
  async obtenerFoto(l:string,p:string){const s=await getDoc(doc(this.productos(l),p,'fotos','principal'));return s.exists()?bytes(s.data().bytes):null}
  async obtenerTodo(){const ls=await getDocs(this.listas());const listas=ls.docs.map(x=>lista(x.id,x.data()));const productos=(await Promise.all(listas.map(async l=>(await getDocs(this.productos(l.id))).docs.map(x=>producto(l.id,x.id,x.data()))))).flat();return{listas,productos}}
  async importarListas(todo:Todo){for(const l of todo.listas){const nuevo=await this.crearLista({nombre:l.nombre,tope:l.tope});for(const p of todo.productos.filter(x=>x.listaId===l.id))await this.guardarProducto({...p,id:undefined,listaId:nuevo})}}
}
