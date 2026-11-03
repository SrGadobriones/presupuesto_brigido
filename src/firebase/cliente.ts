import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, browserPopupRedirectResolver, initializeAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { firebaseConfig, firebaseConfigurado } from './config';
let app:FirebaseApp|undefined, db:Firestore|undefined, auth:Auth|undefined;
/** Inicializa Auth con persistencia local: la sesión sobrevive recargas y cierres del navegador. */
export function firebase(){ if(!firebaseConfigurado) throw new Error('Firebase no está configurado'); app ??= getApps()[0] ?? initializeApp(firebaseConfig); db ??= initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})}); auth ??= initializeAuth(app,{persistence:browserLocalPersistence,popupRedirectResolver:browserPopupRedirectResolver}); return {app,db,auth}; }
