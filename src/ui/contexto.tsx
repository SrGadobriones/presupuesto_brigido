import { createContext } from 'preact'; import { useContext } from 'preact/hooks';
import type { Repositorio } from '../datos/repositorio'; import type { Sesion, Usuario } from '../sesion/sesion';
export interface Contexto { repo:Repositorio; sesion:Sesion; usuario:Usuario|null; demostracion:boolean; avisar(mensaje:string):void }

export const ContextoApp = createContext<Contexto | null>(null);

export function useApp(): Contexto {
  const contexto = useContext(ContextoApp);
  if (!contexto) throw new Error('Falta el proveedor de contexto');
  return contexto;
}
