/**
 * Interruptores de funcionalidades. Todo lo que afecta a privacidad o a
 * terceros está DESACTIVADO por defecto.
 *
 * Publicidad y consentimiento: ADR 0009. Activar anuncios exige completar
 * TODO lo marcado como PENDIENTE aquí; si falta algo, el build falla
 * (src/lib/ads/readiness.ts) en lugar de publicar una configuración a medias.
 */

/**
 * Posiciones de anuncio permitidas. Son las ÚNICAS que existen: no hay forma
 * de colocar un anuncio entre los campos y el resultado, dentro del
 * formulario o fijo sobre la calculadora (docs/adr/0002-arquitectura.md).
 */
export type AdPosition = 'after-result' | 'sidebar' | 'end-of-content';

export interface AdSlotConfig {
  /**
   * Clases de Tailwind LITERALES que reservan la altura del anuncio antes de
   * que cargue, para evitar CLS (p. ej. 'min-h-[…px] lg:min-h-[…px]'). Se usan
   * clases y no `style` inline para no romper la CSP.
   * PLACEHOLDER — PENDIENTE DE DEFINIR: depende de los formatos de anuncio que
   * se elijan. Con `null`, el espacio no puede activarse (el build falla) en
   * lugar de reservar un tamaño inventado.
   */
  readonly reservedHeightClass: string | null;
  /**
   * Id del bloque de anuncios (`data-ad-slot`) que asigna AdSense al crearlo.
   * PENDIENTE DE DEFINIR. Nunca se inventa: con `null` el espacio no se activa.
   */
  readonly adUnitId: string | null;
  /**
   * Si el espacio se muestra en pantallas estrechas. `false` por defecto: en
   * móvil la publicidad se introduce con más prudencia (ADR 0009).
   */
  readonly mobile: boolean;
}

export interface AdsConfig {
  readonly enabled: boolean;
  /** Id de editor de AdSense. PENDIENTE DE DEFINIR (cuenta aprobada). Nunca se inventa. */
  readonly publisherId: string | null;
  readonly slots: Readonly<Record<AdPosition, AdSlotConfig>>;
}

export const adsConfig: AdsConfig = {
  // NO activar sin: cuenta de AdSense, CMP certificada con IAB TCF (exigida
  // por Google para anuncios personalizados en EEE/Reino Unido desde el
  // 16/01/2024 y en Suiza desde el 31/07/2024,
  // https://support.google.com/adsense/answer/13554116, consultado el
  // 01/10/2026), páginas legales revisadas y ampliación de la CSP. Ningún
  // script de Google se carga hoy.
  enabled: false,
  publisherId: null,
  slots: {
    'after-result': { reservedHeightClass: null, adUnitId: null, mobile: false },
    sidebar: { reservedHeightClass: null, adUnitId: null, mobile: false },
    'end-of-content': { reservedHeightClass: null, adUnitId: null, mobile: false },
  },
};

/**
 * Plataforma de gestión del consentimiento (CMP). Solo se admite una CMP
 * certificada por Google e integrada con el IAB TCF: los tipos literales
 * `true` impiden declarar otra cosa. El nombre se elige de la lista de CMP
 * certificadas vigente en el momento de integrarla.
 */
export interface CmpIntegration {
  readonly name: string;
  readonly googleCertified: true;
  readonly iabTcf: true;
}

export interface ConsentConfig {
  /** PLACEHOLDER — PENDIENTE DE DEFINIR. */
  readonly cmp: CmpIntegration | null;
}

/**
 * Mientras `cmp` sea null no puede cargarse ningún script de analítica,
 * publicidad o seguimiento, y el sitio no usa cookies.
 */
export const consentConfig: ConsentConfig = {
  cmp: null,
};
