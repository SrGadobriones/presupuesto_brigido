/** Código de un error de Firebase Auth (p. ej. 'auth/popup-blocked'), si el valor lo trae. */
function codigoDe(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string'
    ? (e as { code: string }).code
    : undefined;
}

/**
 * Mensaje para el usuario cuando falla "Continuar con Google". Devuelve `null` si no hay nada que avisar
 * (el usuario cerró la ventana a propósito). `dominio` es el sitio desde el que se abre la app.
 */
export function mensajeErrorAcceso(e: unknown, dominio: string = location.hostname): string | null {
  const codigo = codigoDe(e);
  switch (codigo) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio (suele haber un icono en la barra de direcciones) e inténtalo otra vez.';
    case 'auth/unauthorized-domain':
      return `Firebase no autoriza este dominio («${dominio}»). Añádelo en la consola de Firebase: Authentication → Settings → Authorized domains.`;
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'El acceso con Google no está activado en Firebase. Actívalo en la consola: Authentication → Sign-in method → Google (si ves un botón «Comenzar», púlsalo primero).';
    case 'auth/network-request-failed':
      return 'No hay conexión con Firebase. Revisa tu conexión a internet e inténtalo otra vez.';
    case 'auth/invalid-api-key':
      return 'La clave de Firebase no es válida. Cópiala de nuevo desde la consola de Firebase a src/firebase/config.ts.';
    default:
      return `No se pudo iniciar sesión con Google (${codigo ?? 'error desconocido'}).`;
  }
}
