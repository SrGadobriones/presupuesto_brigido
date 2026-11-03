// Genera los PNG base (assets/) del icono de la app a partir del «sello» de la pantalla de acceso
// (.acceso-sello en src/ui/estilos.css). Uso: node scripts/generar-iconos.mjs
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const AMARILLO = '#ffd23f';
const TINTA = '#16211d';
const FONDO = '#f1f3ee'; // --fondo del tema claro
const ESTRELLA = 'm30 20 3.1 7.9L41 31l-7.9 3.1L30 42l-3.1-7.9L19 31l7.9-3.1L30 20Z'; // centrada en (30,31), mide 22 unidades

/** Rectángulo con radios por esquina (sup-izq, sup-der, inf-der, inf-izq). */
const rectRedondeado = (x, y, w, h, [a, b, c, d], relleno) =>
  `<path fill="${relleno}" d="M${x + a} ${y}H${x + w - b}A${b} ${b} 0 0 1 ${x + w} ${y + b}V${y + h - c}A${c} ${c} 0 0 1 ${x + w - c} ${y + h}H${x + d}A${d} ${d} 0 0 1 ${x} ${y + h - d}V${y + a}A${a} ${a} 0 0 1 ${x + a} ${y}Z"/>`;

/**
 * Sello de 54 px con sombra de 5 px, como en el login, escalado a `lado` px y centrado en el lienzo de 1024
 * (el conjunto sello + sombra queda centrado).
 */
const sello = (lado, lienzo = 1024) => {
  const k = lado / 54;
  const sombra = 5 * k;
  const x = lienzo / 2 - (lado + sombra) / 2;
  const y = x;
  const radios = [18 * k, 18 * k, 18 * k, 4 * k];
  const tamEstrella = lado * 0.3;
  const ke = tamEstrella / 22;
  const cx = x + lado / 2;
  const cy = y + lado / 2;
  return (
    rectRedondeado(x + sombra, y + sombra, lado, lado, radios, 'rgba(255,210,63,0.38)') +
    rectRedondeado(x, y, lado, lado, radios, AMARILLO) +
    `<path fill="${TINTA}" transform="translate(${cx - 30 * ke} ${cy - 31 * ke}) scale(${ke})" d="${ESTRELLA}"/>`
  );
};

const svg = (cuerpo, lienzo = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${lienzo}" height="${lienzo}" viewBox="0 0 ${lienzo} ${lienzo}">${cuerpo}</svg>`;
const fondo = `<rect width="1024" height="1024" fill="${FONDO}"/>`;

mkdirSync('assets', { recursive: true });
const guardar = (nombre, cuerpo, lienzo = 1024) => sharp(Buffer.from(svg(cuerpo, lienzo))).png().toFile(`assets/${nombre}`);
/** Pantalla de carga: 2732 px, con el sello dentro del cuadrado central de 1200 px que nunca se recorta. */
const carga = (colorFondo) => `<rect width="2732" height="2732" fill="${colorFondo}"/>${sello(520, 2732)}`;

await Promise.all([
  // Icono clásico (sin capas): fondo claro con el sello; Android le aplica su máscara.
  guardar('icon-only.png', fondo + sello(820)),
  // Icono adaptable: capacitor-assets reduce las capas al 67 % para la zona segura, así que el sello debe llenar casi todo el lienzo.
  guardar('icon-background.png', fondo),
  guardar('icon-foreground.png', sello(820)),
  guardar('splash.png', carga(FONDO), 2732),
  guardar('splash-dark.png', carga('#0e1714'), 2732),
]);
console.log('Listo: icon-only, icon-background, icon-foreground, splash y splash-dark en assets/');
