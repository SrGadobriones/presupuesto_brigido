export function descargar(bytes: Uint8Array, nombre: string): void {
  descargarBlob(new Blob([bytes as BlobPart], { type: 'application/x-sqlite3' }), nombre);
}

export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function leerArchivo(archivo: File): Promise<Uint8Array> {
  return new Uint8Array(await archivo.arrayBuffer());
}
