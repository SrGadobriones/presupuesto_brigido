import type { DatosLista, DatosProducto, Lista, Producto, Todo } from '../dominio/tipos';
import { validarLista, validarProducto } from '../dominio/validar';
import type { Repositorio } from './repositorio';
const id = () => crypto.randomUUID();
const copiar = <T,>(v:T):T => structuredClone(v);
export class RepositorioMemoria implements Repositorio {
  private listas: Lista[]=[]; private productos: Producto[]=[]; private fotos=new Map<string, Uint8Array>();
  private oyentesListas=new Set<(x:Lista[])=>void>(); private oyentesProductos=new Map<string,Set<(x:Producto[])=>void>>();
  private emitirListas=()=>this.oyentesListas.forEach(f=>f(copiar(this.listas)));
  private emitirProductos=(listaId:string)=>this.oyentesProductos.get(listaId)?.forEach(f=>f(copiar(this.productos.filter(p=>p.listaId===listaId))));
  escucharListas(cb:(x:Lista[])=>void) { this.oyentesListas.add(cb); cb(copiar(this.listas)); return ()=>this.oyentesListas.delete(cb); }
  escucharProductos(listaId:string, cb:(x:Producto[])=>void) { const s=this.oyentesProductos.get(listaId)??new Set(); this.oyentesProductos.set(listaId,s); s.add(cb); cb(copiar(this.productos.filter(p=>p.listaId===listaId))); return ()=>s.delete(cb); }
  async crearLista(datos:DatosLista) { const d=validarLista(datos), nueva:Lista={id:id(),...d,creadaEn:new Date().toISOString()}; this.listas.unshift(nueva); this.emitirListas(); return nueva.id; }
  async actualizarLista(i:string,d:DatosLista) { const x=this.listas.find(l=>l.id===i); if(!x) throw new Error('La lista ya no existe'); Object.assign(x,validarLista(d)); this.emitirListas(); }
  async eliminarLista(i:string) { this.listas=this.listas.filter(l=>l.id!==i); for(const p of this.productos.filter(p=>p.listaId===i)) this.fotos.delete(p.id); this.productos=this.productos.filter(p=>p.listaId!==i); this.emitirListas(); this.emitirProductos(i); }
  async guardarProducto(b:DatosProducto) { const d=validarProducto(b), existente=d.id?this.productos.find(p=>p.id===d.id):undefined; if(d.id && !existente) throw new Error('El producto ya no existe'); const p:Producto={id:d.id??id(),listaId:d.listaId,nombre:d.nombre,cantidad:d.cantidad,categoria:d.categoria,prioridad:d.prioridad,notas:d.notas,link:d.link,comprado:d.comprado??existente?.comprado??false,opcionElegidaId:d.opcionElegidaId,opciones:d.opciones,tieneFoto:d.foto!==undefined ? d.foto!==null : existente?.tieneFoto??false,miniatura:d.foto!==undefined&&d.foto!==null?d.foto:existente?.miniatura??null}; if(existente) Object.assign(existente,p); else this.productos.push(p); if(d.foto!==undefined) d.foto?this.fotos.set(p.id,d.foto):this.fotos.delete(p.id); this.emitirProductos(p.listaId); this.emitirListas(); return p.id; }
  async eliminarProductos(l:string, ids:string[]) { this.productos=this.productos.filter(p=>{if(p.listaId===l&&ids.includes(p.id)){this.fotos.delete(p.id);return false}return true}); this.emitirProductos(l);this.emitirListas(); }
  async marcarComprado(l:string, ids:string[], comprado:boolean) { this.productos.filter(p=>p.listaId===l&&ids.includes(p.id)).forEach(p=>p.comprado=comprado);this.emitirProductos(l);this.emitirListas(); }
  async obtenerFoto(_l:string,p:string){return copiar(this.fotos.get(p)??null)}
  async obtenerTodo(){return {listas:copiar(this.listas),productos:copiar(this.productos)}}
  async importarListas(todo:Todo){const mapping=new Map<string,string>(); for(const l of todo.listas){const nuevo=await this.crearLista({nombre:l.nombre,tope:l.tope});mapping.set(l.id,nuevo)} for(const p of todo.productos){const l=mapping.get(p.listaId);if(l) await this.guardarProducto({...p,id:undefined,listaId:l,foto:await this.obtenerFoto(p.listaId,p.id)})}}
}
