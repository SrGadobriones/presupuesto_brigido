export function calcularDimensiones(ancho: number, alto: number, max = 800): { ancho: number; alto: number } {
  const escala = Math.min(1, max / Math.max(ancho, alto));
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  };
}

/** Reduce la imagen a `max` px por lado y la comprime a JPEG. Requiere navegador (canvas). */
export async function reducirImagen(archivo: Blob, max = 800, calidad = 0.8): Promise<Uint8Array> {
  const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  const { ancho, alto } = calcularDimensiones(mapa.width, mapa.height, max);
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(mapa, 0, 0, ancho, alto);
  mapa.close();
  const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', calidad));
  if (!blob) throw new Error('No se pudo procesar la imagen');
  return new Uint8Array(await blob.arrayBuffer());
}
