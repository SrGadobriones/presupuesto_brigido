import { useEffect, useState } from 'preact/hooks';

/** Convierte bytes JPEG en una URL de objeto y la libera al cambiar o desmontar. */
export function useUrlFoto(bytes: Uint8Array | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!bytes) {
      setUrl(null);
      return;
    }
    const nueva = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
    setUrl(nueva);
    return () => URL.revokeObjectURL(nueva);
  }, [bytes]);
  return url;
}
