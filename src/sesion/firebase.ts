import { GoogleAuthProvider, onIdTokenChanged, signInWithPopup, signOut } from 'firebase/auth';
import { firebase } from '../firebase/cliente'; import type { Sesion, Usuario } from './sesion';
const usuario=(u: import('firebase/auth').User|null):Usuario|null=>u?{uid:u.uid,nombre:u.displayName||u.email||'Cuenta Google',correo:u.email||'',foto:u.photoURL}:null;
export class SesionFirebase implements Sesion {
  escuchar(cb:(u:Usuario|null)=>void) {
    const { auth } = firebase();
    // El SDK renueva por sí mismo los tokens próximos a expirar. Esta renovación
    // silenciosa adicional mantiene activa una pestaña abierta durante muchas horas.
    const refrescar = () => { if (document.visibilityState !== 'hidden') void auth.currentUser?.getIdToken(); };
    const intervalo = window.setInterval(refrescar, 45 * 60 * 1000);
    document.addEventListener('visibilitychange', refrescar);
    const cancelar = onIdTokenChanged(auth, (u) => { cb(usuario(u)); refrescar(); });
    return () => { window.clearInterval(intervalo); document.removeEventListener('visibilitychange', refrescar); cancelar(); };
  }
  async entrarConGoogle(){await signInWithPopup(firebase().auth,new GoogleAuthProvider())}
  async salir(){await signOut(firebase().auth)}
}
