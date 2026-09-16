// storage.js — Wrapper de localStorage.
//
// Encapsula el acceso a `localStorage` y traduce los fallos en resultados
// explícitos y tipados. Este módulo NUNCA propaga excepciones hacia la UI:
// toda operación devuelve un `ReadResult` o un `WriteResult`.
//
// Serialización agnóstica del contenido (Requisito 5.1): `writeJSON` y `readJSON`
// operan sobre valores JSON genéricos mediante `JSON.stringify` / `JSON.parse`,
// sin conocer la forma del Producto. Por ello, el campo `compuesto` del Producto
// —al ser un campo plano booleano— se serializa y se recupera sin cambios en el
// recorrido de ida y vuelta, sin necesidad de tratamiento especial en esta capa.
//
// Tipos (notación TypeScript por claridad; la implementación es JS vanilla):
//   type ReadResult<T> =
//     | { status: "ok"; value: T }
//     | { status: "empty" }
//     | { status: "corrupt"; raw: string };
//
//   type WriteResult =
//     | { status: "ok" }
//     | { status: "failed"; reason: "unavailable" | "quota" | "unknown" };

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  /**
   * Obtiene una referencia segura a `localStorage`.
   *
   * Acceder a `localStorage` puede lanzar en algunos entornos (por ejemplo,
   * navegación privada o cuando el almacenamiento está deshabilitado por
   * política). Devuelve `null` en lugar de propagar la excepción.
   *
   * @returns {Storage | null}
   */
  function obtenerAlmacenamiento() {
    try {
      if (typeof localStorage === "undefined" || localStorage === null) {
        return null;
      }
      return localStorage;
    } catch {
      return null;
    }
  }

  /**
   * Lee y parsea un valor JSON desde `localStorage`.
   *
   * - Devuelve `{ status: "empty" }` si la clave no existe o el almacenamiento
   *   no está disponible.
   * - Devuelve `{ status: "corrupt", raw }` si `JSON.parse` falla, preservando
   *   el contenido original sin sobrescribirlo (Requisito 6.5).
   * - Devuelve `{ status: "ok", value }` con el valor parseado en caso contrario.
   *
   * Nunca lanza hacia la UI.
   *
   * @template T
   * @param {string} key
   * @returns {{ status: "ok", value: T } | { status: "empty" } | { status: "corrupt", raw: string }}
   */
  function readJSON(key) {
    const almacenamiento = obtenerAlmacenamiento();
    if (almacenamiento === null) {
      // Sin almacenamiento no hay datos previos que cargar.
      return { status: "empty" };
    }

    let raw;
    try {
      raw = almacenamiento.getItem(key);
    } catch {
      // Un fallo al leer se trata como ausencia de datos.
      return { status: "empty" };
    }

    if (raw === null || raw === undefined) {
      return { status: "empty" };
    }

    try {
      // `JSON.parse` restaura el valor completo tal cual se guardó, incluidos los
      // campos planos del Producto como `compuesto` (Requisito 5.1). No hay
      // pérdida ni transformación de campos en esta lectura.
      const value = JSON.parse(raw);
      return { status: "ok", value };
    } catch {
      // JSON corrupto: preservamos el contenido original sin sobrescribirlo.
      return { status: "corrupt", raw };
    }
  }

  /**
   * Serializa y escribe un valor como JSON en `localStorage`.
   *
   * Captura cualquier excepción y devuelve un resultado tipado sin propagarla
   * (Requisito 6.6):
   * - `QuotaExceededError` (capacidad superada)  → `{ failed, reason: "quota" }`.
   * - Almacenamiento no disponible               → `{ failed, reason: "unavailable" }`.
   * - Cualquier otro error                        → `{ failed, reason: "unknown" }`.
   *
   * @param {string} key
   * @param {unknown} value
   * @returns {{ status: "ok" } | { status: "failed", reason: "unavailable" | "quota" | "unknown" }}
   */
  function writeJSON(key, value) {
    const almacenamiento = obtenerAlmacenamiento();
    if (almacenamiento === null) {
      return { status: "failed", reason: "unavailable" };
    }

    let serializado;
    try {
      serializado = JSON.stringify(value);
    } catch {
      // No se pudo serializar el valor (por ejemplo, referencias circulares).
      return { status: "failed", reason: "unknown" };
    }

    try {
      almacenamiento.setItem(key, serializado);
      return { status: "ok" };
    } catch (error) {
      return { status: "failed", reason: clasificarErrorEscritura(error) };
    }
  }

  /**
   * Clasifica la razón de un fallo de escritura en `localStorage`.
   *
   * Detecta la cuota superada de forma robusta entre navegadores (el nombre y/o
   * el código del error varían) y trata las excepciones de disponibilidad como
   * `"unavailable"`.
   *
   * @param {unknown} error
   * @returns {"unavailable" | "quota" | "unknown"}
   */
  function clasificarErrorEscritura(error) {
    if (esErrorDeCuota(error)) {
      return "quota";
    }
    if (esErrorDeDisponibilidad(error)) {
      return "unavailable";
    }
    return "unknown";
  }

  /**
   * Determina si un error corresponde a la cuota de almacenamiento superada.
   *
   * @param {unknown} error
   * @returns {boolean}
   */
  function esErrorDeCuota(error) {
    if (!(error instanceof Error) && (error === null || typeof error !== "object")) {
      return false;
    }

    const nombre = /** @type {{ name?: unknown }} */ (error).name;
    const codigo = /** @type {{ code?: unknown }} */ (error).code;

    // Nombres usados por los distintos navegadores para la cuota superada.
    if (
      nombre === "QuotaExceededError" ||
      nombre === "NS_ERROR_DOM_QUOTA_REACHED"
    ) {
      return true;
    }

    // Códigos legados: 22 (estándar) y 1014 (Firefox).
    if (codigo === 22 || codigo === 1014) {
      return true;
    }

    return false;
  }

  /**
   * Determina si un error corresponde a la indisponibilidad del almacenamiento.
   *
   * @param {unknown} error
   * @returns {boolean}
   */
  function esErrorDeDisponibilidad(error) {
    if (error === null || typeof error !== "object") {
      return false;
    }

    const nombre = /** @type {{ name?: unknown }} */ (error).name;

    // `SecurityError` se lanza cuando el acceso al almacenamiento está bloqueado
    // por política del navegador.
    return nombre === "SecurityError";
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.storage = { readJSON, writeJSON };
})(window);
