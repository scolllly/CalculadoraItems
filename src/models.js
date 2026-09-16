// models.js — Fábricas de entidades e identificadores (funciones puras)
//
// Define las fábricas de las entidades del dominio (Parametro, Producto,
// LineaDeCalculo) y la generación de identificadores únicos estables.
//
// Requisitos: 1.1 (crear Parametro), 3.1 (crear Producto), 4.1 (crear Linea vacía).

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  /**
   * Genera un identificador único estable.
   * Usa `crypto.randomUUID` cuando está disponible; en caso contrario recurre a
   * un fallback basado en tiempo + aleatoriedad para entornos sin esa API.
   * @returns {string}
   */
  function generarId() {
    const cryptoObj =
      typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

    if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
      return cryptoObj.randomUUID();
    }

    // Fallback: UUID v4 basado en getRandomValues si está disponible.
    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      // Ajustar versión (4) y variante (10xx) según RFC 4122.
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [];
      for (let i = 0; i < 16; i++) {
        hex.push(bytes[i].toString(16).padStart(2, "0"));
      }
      return (
        hex.slice(0, 4).join("") +
        "-" +
        hex.slice(4, 6).join("") +
        "-" +
        hex.slice(6, 8).join("") +
        "-" +
        hex.slice(8, 10).join("") +
        "-" +
        hex.slice(10, 16).join("")
      );
    }

    // Último recurso: tiempo + aleatoriedad. No es criptográficamente seguro,
    // pero produce ids únicos y estables suficientes para el dominio.
    return (
      "id-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  /**
   * Crea un Parametro con un id único estable.
   * @param {string} nombre - 1..100 caracteres.
   * @param {number} precioUnitario - 0.00..999999999.99, máx 2 decimales (PEN).
   * @param {string} unidad - 1..20 caracteres (p. ej. "UND", "MIN").
   * @returns {{ id: string, nombre: string, precioUnitario: number, unidad: string }}
   */
  function crearParametro(nombre, precioUnitario, unidad) {
    return {
      id: generarId(),
      nombre,
      precioUnitario,
      unidad,
    };
  }

  /**
   * Valores admitidos de Fuente_De_Componente (Req 1.1).
   * @type {{ PARAMETRO: "Parámetro", PRODUCTO: "Producto" }}
   */
  const FUENTE_COMPONENTE = { PARAMETRO: "Parámetro", PRODUCTO: "Producto" };

  /**
   * Clasificador_De_Producto: determina el Flag_Compuesto a partir de las
   * Lineas_De_Calculo (Req 3.1–3.5). Es la única regla de clasificación,
   * reutilizada por crear/editar/normalizar un Producto.
   *
   * Devuelve `true` si existe al menos una Linea_De_Producto
   * (`fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO`) (Req 3.1); `false` si el
   * conjunto no contiene ninguna Linea_De_Producto (Req 3.2) o si está vacío o es
   * `null`/`undefined`/no-array (Req 3.3). Una línea sin `fuenteDeComponente`
   * registrada se interpreta como Linea_De_Parametro y NO cuenta como
   * Linea_De_Producto (Req 3.4). Determina el resultado únicamente a partir del
   * `fuenteDeComponente` de cada línea y no muta las líneas evaluadas (Req 3.5).
   * @param {Array<{ fuenteDeComponente?: string }>|null|undefined} lineas
   * @returns {boolean}
   */
  function esCompuesto(lineas) {
    // null/undefined/no-array se tratan como conjunto vacío => false (Req 3.3).
    if (!Array.isArray(lineas)) {
      return false;
    }
    // Existe al menos una Linea_De_Producto (Req 3.1); sin mutar las líneas (Req 3.5).
    // Una línea sin `fuenteDeComponente` no coincide con "Producto" y por tanto
    // se interpreta como Linea_De_Parametro (Req 3.4).
    return lineas.some(function (linea) {
      return (
        linea != null &&
        linea.fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO
      );
    });
  }

  /**
   * Crea un Producto con un id único estable.
   * @param {string} nombre - 1..100 caracteres.
   * @param {Array<{ parametroId: string|null, cantidad: number|null, subtotal: number }>} lineas
   * @param {number} precioTotal - suma de subtotales, redondeada a 2 decimales.
   * @param {string} [unidad="UND"] - Unidad_De_Producto; al crear un Producto nuevo vale "UND" (Req 9.1).
   * @returns {{ id: string, nombre: string, lineas: Array, precioTotal: number, unidad: string, compuesto: boolean }}
   */
  function crearProducto(nombre, lineas, precioTotal, unidad = "UND") {
    return {
      id: generarId(),
      nombre,
      lineas,
      precioTotal,
      unidad,
      // Flag_Compuesto derivado de las Lineas_De_Calculo mediante el
      // Clasificador_De_Producto: true si hay al menos una Linea_De_Producto,
      // false en caso contrario (Req 1.1, 1.2, 1.3). El resto de campos se
      // conserva con los mismos valores que hoy (Req 1.4).
      compuesto: esCompuesto(lineas),
    };
  }

  /**
   * Crea una LineaDeCalculo. Retrocompatible: por defecto es una Linea_De_Parametro
   * (fuenteDeComponente = "Parámetro", productoComponenteId = null) (Req 1.2, 7.2).
   * @param {string|null} [parametroId=null] - referencia a Parametro.id; null => "sin parámetro".
   * @param {number|null} [cantidad=null] - 0.01..999999999.99, máx 2 decimales.
   * @param {"Parámetro"|"Producto"} [fuenteDeComponente="Parámetro"] - Fuente_De_Componente.
   * @param {string|null} [productoComponenteId=null] - referencia a Producto.id cuando la fuente es "Producto".
   * @returns {{ parametroId: string|null, cantidad: number|null, subtotal: number, fuenteDeComponente: string, productoComponenteId: string|null }}
   */
  function crearLinea(
    parametroId = null,
    cantidad = null,
    fuenteDeComponente = FUENTE_COMPONENTE.PARAMETRO,
    productoComponenteId = null
  ) {
    return {
      parametroId,
      cantidad,
      subtotal: 0,
      fuenteDeComponente,
      productoComponenteId,
    };
  }

  /**
   * Normaliza una Linea_De_Calculo cargada desde almacenamiento/respaldo,
   * completando campos ausentes de datos antiguos (Req 7.2, 7.3).
   * - Si `fuenteDeComponente` está ausente => "Parámetro".
   * - `productoComponenteId` ausente => null.
   * Conserva `parametroId`, `cantidad` y `subtotal`. No muta la entrada.
   * @param {object} linea
   * @returns {{ parametroId: string|null, cantidad: number|null, subtotal: number, fuenteDeComponente: string, productoComponenteId: string|null }}
   */
  function normalizarLinea(linea) {
    const origen = linea || {};
    return {
      parametroId:
        origen.parametroId === undefined ? null : origen.parametroId,
      cantidad: origen.cantidad === undefined ? null : origen.cantidad,
      subtotal: origen.subtotal === undefined ? 0 : origen.subtotal,
      fuenteDeComponente:
        origen.fuenteDeComponente === undefined ||
        origen.fuenteDeComponente === null
          ? FUENTE_COMPONENTE.PARAMETRO
          : origen.fuenteDeComponente,
      productoComponenteId:
        origen.productoComponenteId === undefined
          ? null
          : origen.productoComponenteId,
    };
  }

  /**
   * Normalizador_De_Producto: devuelve una copia del Producto con el
   * Flag_Compuesto garantizado (Req 4.1–4.3).
   * - Si `compuesto` ya es booleano, se conserva SIN recalcular; esto respeta
   *   los datos deliberados y hace la operación idempotente (Req 4.2).
   * - En otro caso (ausente, null u otro tipo) se deriva de las líneas con el
   *   Clasificador_De_Producto `esCompuesto` (Req 4.1).
   * Conserva `id`, `nombre`, `lineas`, `precioTotal` y `unidad` del Producto
   * procesado (Req 4.3). No muta la entrada; si recibe `null`/`undefined` opera
   * sobre un objeto vacío defensivo (mismo estilo que `normalizarLinea`).
   * @param {object} producto
   * @returns {{ id: any, nombre: any, lineas: any, precioTotal: any, unidad: any, compuesto: boolean }}
   */
  function normalizarProducto(producto) {
    const origen = producto || {};
    // Se conserva el flag solo si ya es booleano (Req 4.2); en otro caso se
    // deriva de las líneas (Req 4.1). No se recalcula un valor booleano existente.
    const compuesto =
      typeof origen.compuesto === "boolean"
        ? origen.compuesto
        : esCompuesto(origen.lineas);
    // Copia superficial que conserva los demás campos sin mutar la entrada
    // (Req 4.3). No se normalizan aquí las líneas en sí: `esCompuesto` interpreta
    // la ausencia de `fuenteDeComponente` como Parámetro, por lo que la
    // clasificación es correcta sobre líneas no normalizadas.
    return {
      id: origen.id,
      nombre: origen.nombre,
      lineas: origen.lineas,
      precioTotal: origen.precioTotal,
      unidad: origen.unidad,
      compuesto,
    };
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.models = {
      generarId,
      crearParametro,
      crearProducto,
      crearLinea,
      normalizarLinea,
      esCompuesto,
      normalizarProducto,
      FUENTE_COMPONENTE,
    };
})(window);
