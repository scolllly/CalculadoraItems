// backup.js — Serialización y parseo del Archivo_De_Respaldo (funciones puras)
//
// Implementa la lógica pura del respaldo, sin dependencia del DOM ni de
// `localStorage`. La descarga del archivo (Blob/URL) y la lectura del archivo
// importado (FileReader) quedan aisladas en `basedatos.controller.js`.
//
// El Archivo_De_Respaldo reúne en un único objeto JSON todos los datos del
// Almacenamiento_Local (Parametros + Productos) más un campo `version` alineado
// con las claves versionadas `limpiapipas.parametros.v1` y
// `limpiapipas.productos.v1`.
//
// Compatibilidad de forma de datos: como las Lineas_De_Calculo y los Productos
// son objetos planos, `JSON.stringify` conserva íntegros todos sus campos en el
// round-trip, incluidos los nuevos `fuenteDeComponente` y `productoComponenteId`
// de cada línea, la `unidad` del Producto y los `parametroId`, `cantidad` y
// `subtotal` existentes (Req 7.1, 8.3, 8.7, 9.2, 9.3, 9.4). La firma de
// `serializarRespaldo`/`parsearRespaldo` y la versión "1" del formato no cambian.
//
// `parsearRespaldo` devuelve la lista de Productos TAL CUAL, sin normalizar. La
// normalización de compatibilidad de datos antiguos (fuente ausente =>
// "Parámetro", `unidad` no inventada) la aplica el importador
// (`basedatos.controller.js`) reutilizando `models.normalizarLinea` sobre las
// líneas (Req 7.4, 7.7).
//
// Tipos (notación TypeScript por claridad; la implementación es JS vanilla):
//   type ParseResult =
//     | { status: "ok"; parametros: Parametro[]; productos: Producto[] }
//     | { status: "invalid"; reason: string };
//
// Requisitos: 7.1, 7.4, 8.3, 8.7, 9.1, 9.2, 9.3, 9.4, 9.6

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  /**
   * Versión del formato del Archivo_De_Respaldo.
   *
   * Alineada con el sufijo `.v1` de las claves de almacenamiento, para permitir
   * futuras migraciones sin romper los respaldos existentes.
   *
   * @type {string}
   */
  const BACKUP_VERSION = "1";

  /**
   * Serializa un respaldo con las colecciones de Parametros y Productos.
   *
   * Produce la cadena JSON del Archivo_De_Respaldo con la forma
   * `{ version, parametros, productos }` (Requisitos 9.1, 9.2). Al ser objetos
   * planos, `JSON.stringify` preserva todos los campos de cada Producto y línea
   * (incluidos `unidad`, `fuenteDeComponente`, `productoComponenteId`, `cantidad`
   * y `subtotal`), garantizando el round-trip sin pérdidas (Req 7.1, 8.3, 8.7,
   * 9.3, 9.4).
   *
   * @param {unknown[]} parametros Lista de Parametros a respaldar.
   * @param {unknown[]} productos Lista de Productos a respaldar.
   * @returns {string} La cadena JSON del Archivo_De_Respaldo.
   */
  function serializarRespaldo(parametros, productos) {
    return JSON.stringify({
      version: BACKUP_VERSION,
      parametros,
      productos,
    });
  }

  /**
   * Parsea y valida el texto de un Archivo_De_Respaldo.
   *
   * Intenta `JSON.parse(texto)` y valida la estructura esperada: un objeto con un
   * arreglo `parametros`, un arreglo `productos` y un campo `version`. Ante JSON
   * inválido o estructura incorrecta devuelve `{ status: "invalid", reason }` sin
   * lanzar excepciones (Requisito 9.6). En caso correcto devuelve
   * `{ status: "ok", parametros, productos }` con la lista de Productos TAL CUAL:
   * la normalización de compatibilidad (fuente ausente => "Parámetro", `unidad`
   * no inventada) la aplica el importador con `models.normalizarLinea`, no esta
   * función (Req 7.4, 7.7).
   *
   * @param {string} texto Contenido textual del archivo a importar.
   * @returns {{ status: "ok", parametros: unknown[], productos: unknown[] } | { status: "invalid", reason: string }}
   */
  function parsearRespaldo(texto) {
    if (typeof texto !== "string") {
      return { status: "invalid", reason: "El archivo no contiene texto válido." };
    }

    let datos;
    try {
      datos = JSON.parse(texto);
    } catch {
      return { status: "invalid", reason: "El archivo no es un JSON válido." };
    }

    if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
      return {
        status: "invalid",
        reason: "El respaldo debe ser un objeto con las colecciones esperadas.",
      };
    }

    if (!("version" in datos)) {
      return {
        status: "invalid",
        reason: "El respaldo no incluye el campo de versión.",
      };
    }

    if (!Array.isArray(datos.parametros)) {
      return {
        status: "invalid",
        reason: "El respaldo no incluye una lista de parámetros válida.",
      };
    }

    if (!Array.isArray(datos.productos)) {
      return {
        status: "invalid",
        reason: "El respaldo no incluye una lista de productos válida.",
      };
    }

    return {
      status: "ok",
      parametros: datos.parametros,
      productos: datos.productos,
    };
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.backup = { BACKUP_VERSION, serializarRespaldo, parsearRespaldo };
})(window);
