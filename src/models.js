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
   * Crea un Producto con un id único estable.
   * @param {string} nombre - 1..100 caracteres.
   * @param {Array<{ parametroId: string|null, cantidad: number|null, subtotal: number }>} lineas
   * @param {number} precioTotal - suma de subtotales, redondeada a 2 decimales.
   * @param {string} [unidad="UND"] - Unidad_De_Producto; al crear un Producto nuevo vale "UND" (Req 9.1).
   * @returns {{ id: string, nombre: string, lineas: Array, precioTotal: number, unidad: string }}
   */
  function crearProducto(nombre, lineas, precioTotal, unidad = "UND") {
    return {
      id: generarId(),
      nombre,
      lineas,
      precioTotal,
      unidad,
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

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.models = {
      generarId,
      crearParametro,
      crearProducto,
      crearLinea,
      normalizarLinea,
      FUENTE_COMPONENTE,
    };
})(window);
