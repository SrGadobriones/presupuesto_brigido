import { Capacitor } from '@capacitor/core';
import { GoogleAuthProvider, onIdTokenChanged, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';
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
  /** En la web se usa el popup de siempre; dentro de la app Android/iOS Google bloquea los popups en el WebView, así que se pide la credencial al plugin nativo. */
  async entrarConGoogle(){
    const { auth } = firebase();
    if (!Capacitor.isNativePlatform()) { await signInWithPopup(auth,new GoogleAuthProvider()); return; }
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const { credential } = await FirebaseAuthentication.signInWithGoogle();
    await signInWithCredential(auth,GoogleAuthProvider.credential(credential?.idToken ?? null,credential?.accessToken ?? null));
  }
  async salir(){
    await signOut(firebase().auth);
    if (Capacitor.isNativePlatform()) { const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication'); await FirebaseAuthentication.signOut().catch(()=>{}); }
  }
}
