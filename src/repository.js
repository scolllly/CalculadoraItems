// repository.js — Repositorio de dominio.
//
// Media entre el dominio (Parametros y Productos) y la capa de almacenamiento
// (`storage.js`). Mantiene las claves versionadas estables y traduce los
// `ReadResult`/`WriteResult` de `storage.js` en resultados de dominio.
//
// Este módulo nunca propaga excepciones hacia la UI: `load` siempre devuelve
// listas utilizables (vacías ante ausencia o corrupción de datos) más una lista
// de advertencias, y las funciones de guardado devuelven el `WriteResult` para
// que el controlador muestre un mensaje si la escritura falla.
//
// Tipos (notación TypeScript por claridad; la implementación es JS vanilla):
//   interface LoadResult {
//     parametros: Parametro[];
//     productos: Producto[];
//     warnings: string[]; // p. ej. "parametros corruptos", "productos corruptos"
//   }
//
//   type WriteResult =
//     | { status: "ok" }
//     | { status: "failed"; reason: "unavailable" | "quota" | "unknown" };
//
// Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.5

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  /**
   * Clave versionada del Almacenamiento_Local para la lista de Parametros.
   *
   * El sufijo `.v1` permite futuras migraciones sin romper los datos existentes.
   *
   * @type {string}
   */
  const KEY_PARAMETROS = "limpiapipas.parametros.v1";

  /**
   * Clave versionada del Almacenamiento_Local para la lista de Productos.
   *
   * @type {string}
   */
  const KEY_PRODUCTOS = "limpiapipas.productos.v1";

  /**
   * Carga una colección versionada desde el Almacenamiento_Local.
   *
   * Traduce el `ReadResult` de `storage.js` en una lista de dominio utilizable:
   * - `empty`   → lista vacía, sin advertencia (Requisito 6.4).
   * - `corrupt` → lista vacía, más una advertencia; el contenido original se
   *   conserva sin sobrescribir (lo hace `storage.js`) (Requisito 6.5).
   * - `ok` con un arreglo → el arreglo tal cual.
   * - `ok` con un valor que no es un arreglo → lista vacía más una advertencia
   *   (guarda de robustez frente a datos con forma inesperada).
   *
   * @param {string} key Clave versionada a leer.
   * @param {string} advertencia Mensaje de advertencia a registrar ante datos
   *   corruptos o con forma inválida.
   * @param {string[]} warnings Lista de advertencias acumuladas (se muta).
   * @returns {unknown[]} La lista cargada, o una lista vacía ante ausencia/error.
   */
  function cargarColeccion(key, advertencia, warnings) {
    const resultado = window.LP.storage.readJSON(key);

    if (resultado.status === "empty") {
      return [];
    }

    if (resultado.status === "corrupt") {
      warnings.push(advertencia);
      return [];
    }

    // status === "ok": nos aseguramos de que el valor sea un arreglo.
    if (!Array.isArray(resultado.value)) {
      warnings.push(advertencia);
      return [];
    }

    return resultado.value;
  }

  /**
   * Carga los Parametros y Productos guardados en el Almacenamiento_Local.
   *
   * Combina las dos lecturas y devuelve siempre listas utilizables: ante ausencia
   * de datos inicia con listas vacías (Requisito 6.4) y ante JSON corrupto (o un
   * valor con forma inesperada) inicia esa colección como lista vacía y agrega la
   * advertencia correspondiente (Requisito 6.5). Nunca lanza hacia la UI.
   *
   * @returns {{ parametros: unknown[], productos: unknown[], warnings: string[] }}
   */
  function load() {
    /** @type {string[]} */
    const warnings = [];

    const parametros = cargarColeccion(
      KEY_PARAMETROS,
      "parametros corruptos",
      warnings,
    );
    const productos = cargarColeccion(
      KEY_PRODUCTOS,
      "productos corruptos",
      warnings,
    );

    return { parametros, productos, warnings };
  }

  /**
   * Guarda la lista completa de Parametros en el Almacenamiento_Local.
   *
   * Devuelve el `WriteResult` de `storage.js` para que el controlador muestre un
   * mensaje si la escritura falla (Requisitos 6.1, 6.6).
   *
   * @param {unknown[]} parametros Lista completa de Parametros a persistir.
   * @returns {{ status: "ok" } | { status: "failed", reason: "unavailable" | "quota" | "unknown" }}
   */
  function saveParametros(parametros) {
    return window.LP.storage.writeJSON(KEY_PARAMETROS, parametros);
  }

  /**
   * Guarda la lista completa de Productos en el Almacenamiento_Local.
   *
   * Devuelve el `WriteResult` de `storage.js` para que el controlador muestre un
   * mensaje si la escritura falla (Requisitos 6.2, 6.6).
   *
   * @param {unknown[]} productos Lista completa de Productos a persistir.
   * @returns {{ status: "ok" } | { status: "failed", reason: "unavailable" | "quota" | "unknown" }}
   */
  function saveProductos(productos) {
    return window.LP.storage.writeJSON(KEY_PRODUCTOS, productos);
  }

  /**
   * Reemplaza ambas colecciones (Parametros y Productos) del Almacenamiento_Local.
   *
   * Empleado por la importación de respaldo para reemplazar todos los datos
   * actuales por los importados (Requisito 9.5). Internamente reutiliza
   * `saveParametros` y `saveProductos`, y devuelve un `WriteResult` combinado:
   * `failed` si alguna de las dos escrituras falla (conservando la razón del
   * primer fallo detectado), `ok` si ambas tienen éxito.
   *
   * @param {unknown[]} parametros Lista completa de Parametros a persistir.
   * @param {unknown[]} productos Lista completa de Productos a persistir.
   * @returns {{ status: "ok" } | { status: "failed", reason: "unavailable" | "quota" | "unknown" }}
   */
  function replaceAll(parametros, productos) {
    const resultadoParametros = saveParametros(parametros);
    const resultadoProductos = saveProductos(productos);

    if (resultadoParametros.status === "failed") {
      return resultadoParametros;
    }
    if (resultadoProductos.status === "failed") {
      return resultadoProductos;
    }

    return { status: "ok" };
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.repository = {
      KEY_PARAMETROS,
      KEY_PRODUCTOS,
      load,
      saveParametros,
      saveProductos,
      replaceAll,
    };
})(window);
