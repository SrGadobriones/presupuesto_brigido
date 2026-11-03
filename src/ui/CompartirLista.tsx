import type { Lista, Producto } from '../dominio/tipos';
import IconoWhatsapp from './IconoWhatsapp';
import { enlaceWhatsapp, textoWhatsapp } from './whatsapp';

/** Abre WhatsApp con la lista como texto; se abre en el mismo clic para que el navegador no bloquee la ventana. */
export default function CompartirLista({ lista, productos }: { lista: Lista; productos: Producto[] }) {
  const compartir = () => { window.open(enlaceWhatsapp(textoWhatsapp(lista, productos)), '_blank', 'noopener'); };
  return <button class="boton" type="button" onClick={compartir} disabled={productos.length === 0}><IconoWhatsapp />Compartir</button>;
}
