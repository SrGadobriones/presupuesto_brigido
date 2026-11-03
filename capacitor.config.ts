import type { CapacitorConfig } from '@capacitor/cli';

/** Dirección publicada por GitHub Actions en cada push a main (ver .github/workflows/deploy.yml). */
const URL_WEB = 'https://srgadobriones.github.io/presupuesto_brigido/';

/**
 * La app Android es un contenedor que abre la web publicada: cada despliegue de GitHub Actions
 * actualiza la app sin reinstalar el APK. Solo hay que generar otro APK si cambia algo nativo
 * (plugins, permisos, icono, configuración de Capacitor). La web en Astro no cambia.
 */
const config: CapacitorConfig = {
  appId: 'com.srgadobriones.presupuesto',
  appName: 'Presupuesto Brígido',
  webDir: 'dist',
  server: {
    url: URL_WEB,
    androidScheme: 'https',
  },
  plugins: {
    FirebaseAuthentication: {
      // El inicio de sesión se hace con el SDK web de Firebase; el plugin solo obtiene la credencial de Google.
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
