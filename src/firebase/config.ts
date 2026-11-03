/** Copia aquí la configuración pública de tu app web de Firebase. No contiene secretos. */
export const firebaseConfig = {
  apiKey: "AIzaSyCv_vompLLL6m-GRP9eJXFfiR7i6lUJmcc",
  authDomain: "presupuesto-brigido.firebaseapp.com",
  projectId: "presupuesto-brigido",
  storageBucket: "presupuesto-brigido.firebasestorage.app",
  messagingSenderId: "384154596",
  appId: "1:384154596:web:c046946b9a0477e7dfe5f1"
};
export const firebaseConfigurado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
