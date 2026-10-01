/**
 * Serialización segura de JSON-LD para insertarlo en
 * <script type="application/ld+json">.
 *
 * JSON.stringify NO basta: un valor como "</script><script>…" cerraría la
 * etiqueta y permitiría inyectar HTML/JS. Se escapan `<`, `>` y `&` como
 * secuencias \uXXXX (JSON válido, mismo valor al parsear) y también U+2028 y
 * U+2029, que rompen algunos analizadores de JavaScript.
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonLdObject = Readonly<Record<string, JsonValue>>;

const UNSAFE = /[<>&\u2028\u2029]/g;

export function serializeJsonLd(data: JsonLdObject): string {
  const json = JSON.stringify(data, (_key, value: unknown) => {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('JSON-LD: número no finito');
    }
    return value;
  });
  return json.replace(UNSAFE, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
