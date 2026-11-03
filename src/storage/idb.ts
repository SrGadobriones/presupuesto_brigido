const NOMBRE_DB = 'presupuesto_brigido';
const ALMACEN = 'archivos';
const CLAVE = 'principal';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(NOMBRE_DB, 1);
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(ALMACEN);
    };
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, op: (almacen: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const idb = await abrir();
  return new Promise<T>((resolve, reject) => {
    const tx = idb.transaction(ALMACEN, modo);
    const peticion = op(tx.objectStore(ALMACEN));
    tx.oncomplete = () => {
      idb.close();
      resolve(peticion.result);
    };
    tx.onerror = tx.onabort = () => {
      idb.close();
      reject(tx.error);
    };
  });
}

export async function guardarBytes(bytes: Uint8Array): Promise<void> {
  await operar('readwrite', (a) => a.put(bytes, CLAVE));
}

export async function cargarBytes(): Promise<Uint8Array | null> {
  const valor = await operar<unknown>('readonly', (a) => a.get(CLAVE));
  return valor ? new Uint8Array(valor as ArrayBuffer | Uint8Array) : null;
}
