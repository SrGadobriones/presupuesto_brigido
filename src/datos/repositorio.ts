import type { DatosLista, DatosProducto, Lista, Producto, Todo } from '../dominio/tipos';
export type ErrorRepositorio = 'SinPermiso'|'SinConexion'|'CuotaAgotada'|'NoEncontrado'|'Invalido';
export class ErrorDatos extends Error { constructor(public tipo: ErrorRepositorio, mensaje: string) { super(mensaje); } }
export interface Repositorio {
 /** `alError` recibe el error si la lectura falla (permisos, base inexistente, cuota…); sin él, la pantalla quedaría cargando para siempre. */
 escucharListas(cb:(listas: Lista[])=>void, alError?:(e:unknown)=>void): ()=>void;
 escucharProductos(listaId:string, cb:(productos: Producto[])=>void, alError?:(e:unknown)=>void): ()=>void;
 crearLista(datos: DatosLista): Promise<string>; actualizarLista(id:string, datos:DatosLista): Promise<void>; eliminarLista(id:string):Promise<void>;
 guardarProducto(borrador:DatosProducto):Promise<string>; eliminarProductos(listaId:string, ids:string[]):Promise<void>; marcarComprado(listaId:string, ids:string[], comprado:boolean):Promise<void>;
 obtenerFoto(listaId:string, productoId:string):Promise<Uint8Array|null>; obtenerTodo():Promise<Todo>; importarListas(todo:Todo):Promise<void>;
}
