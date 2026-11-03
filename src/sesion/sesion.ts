export interface Usuario { uid:string; nombre:string; correo:string; foto:string|null }
export interface Sesion { escuchar(cb:(usuario:Usuario|null)=>void):()=>void; entrarConGoogle():Promise<void>; salir():Promise<void> }
