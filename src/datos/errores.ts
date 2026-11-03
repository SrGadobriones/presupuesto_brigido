function codigoDe(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string'
    ? (e as { code: string }).code
    : undefined;
}

/** Mensaje para el usuario cuando Firestore no puede leer o escribir los datos, con la acción a tomar. */
export function mensajeErrorDatos(e: unknown): string {
  const codigo = codigoDe(e);
  switch (codigo) {
    case 'permission-denied':
      return 'Firestore rechazó el acceso a tus datos. En la consola de Firebase, comprueba que creaste la base de datos (Firestore Database) y que publicaste las reglas (pestaña Reglas → Publicar).';
    case 'not-found':
      return 'No se encontró la base de datos de Firestore. Créala en la consola de Firebase: Compilación → Firestore Database → Crear base de datos (modo producción).';
    case 'unauthenticated':
      return 'Tu sesión venció. Inicia sesión de nuevo con Google.';
    case 'unavailable':
      return 'No hay conexión con Firebase. Los cambios se enviarán al volver la conexión; si es la primera vez que abres la app, necesitas internet.';
    case 'resource-exhausted':
      return 'Se alcanzó el límite gratuito de Firebase por hoy. Vuelve a intentarlo mañana.';
    default:
      return codigo
        ? `No se pudieron cargar tus datos (${codigo}).`
        : 'No se pudieron cargar tus datos.';
  }
}
