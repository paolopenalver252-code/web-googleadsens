# Privacidad, consentimiento y páginas legales

> Este documento **no** es asesoramiento jurídico ni afirma que el sitio cumpla ninguna norma. Enumera lo que falta y cómo está preparada la arquitectura. Los textos legales los redacta y revisa una persona cualificada.

## Estado actual (2026-10-01)

| Elemento                         | Estado                                                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Cookies, analítica, publicidad   | **Ninguna.** El sitio no usa cookies ni almacenamiento del navegador y no hace peticiones a terceros (tests E2E de privacidad y `check:dist`) |
| Aviso legal                      | **No existe.** PENDIENTE: requiere titular identificado (marca y dominio sin definir)                                                         |
| Política de privacidad           | **No existe.** PENDIENTE                                                                                                                      |
| Política de cookies              | **No existe.** Hoy no hay cookies que describir; será necesaria antes de activar AdSense o analítica                                          |
| CMP (gestión del consentimiento) | **No existe.** `consentConfig.cmp = null` (`src/config/features.ts`)                                                                          |

Requisitos legales españoles concretos (LSSI-CE, RGPD/LOPDGDD, guía de cookies de la AEPD): **NO VERIFICADO — NECESITA FUENTE** y revisión jurídica. No se cita aquí ningún artículo sin haberlo comprobado.

## Requisito de Google verificado

«Requisitos de gestión del consentimiento de Google para publicar anuncios en el EEE, el Reino Unido y Suiza (para editores)», https://support.google.com/adsense/answer/13554116, consultado el 01/10/2026:

- Desde el 16/01/2024 (EEE y Reino Unido) y el 31/07/2024 (Suiza), los anuncios personalizados exigen una **CMP certificada por Google e integrada con el IAB TCF**.
- Sin CMP certificada, el tráfico de esas regiones solo puede recibir anuncios no personalizados o limitados.

Esta información puede cambiar: se vuelve a comprobar en el momento de activar los anuncios.

## Cómo está preparada la arquitectura

- **Páginas legales:** `src/config/legal.ts`. Cada página se declara solo cuando existe con texto revisado; el pie (`Footer.astro`) enlaza únicamente las declaradas.
- **CMP:** `CmpIntegration` solo admite una CMP con `googleCertified: true` e `iabTcf: true`. Su integración (script, señales de consentimiento) será una pieza propia, desacoplada de las calculadoras.
- **Anuncios:** `AdSlot` no renderiza nada mientras `adsConfig.enabled = false`. Si se activan sin CMP, sin id de editor, sin id de bloque o sin altura reservada, **el build falla** (`src/lib/ads/readiness.ts`). Ningún script de AdSense se carga hoy y `check:dist` falla si aparece `adsbygoogle`.
- **CSP:** activar AdSense y una CMP exigirá ampliar la CSP a sus dominios (docs/security.md). **NO VERIFICADO — NECESITA FUENTE** para la lista exacta.

## Orden previsto antes de activar AdSense

1. Definir titular, marca y dominio.
2. Redactar y revisar jurídicamente el aviso legal, la política de privacidad y la de cookies, y declararlas en `src/config/legal.ts`.
3. Elegir una CMP de la lista vigente de CMP certificadas por Google e integrarla (con su propia CSP y sus tests).
4. Obtener la aprobación de AdSense y los ids reales (editor y bloques), y definir la altura reservada de cada posición.
5. Volver a comprobar la documentación vigente de Google (consentimiento y políticas de emplazamiento) y actualizar ADR 0009.
