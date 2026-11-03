import type { Sesion, Usuario } from './sesion';
export class SesionFalsa implements Sesion { private u:Usuario|null={uid:'demostracion',nombre:'Modo demostración',correo:'',foto:null}; private oyentes=new Set<(u:Usuario|null)=>void>(); escuchar(cb:(u:Usuario|null)=>void){this.oyentes.add(cb);cb(this.u);return()=>this.oyentes.delete(cb)} async entrarConGoogle(){} async salir(){} }
