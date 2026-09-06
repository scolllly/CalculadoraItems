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
   * Crea un Producto con un id único estable.
   * @param {string} nombre - 1..100 caracteres.
   * @param {Array<{ parametroId: string|null, cantidad: number|null, subtotal: number }>} lineas
   * @param {number} precioTotal - suma de subtotales, redondeada a 2 decimales.
   * @returns {{ id: string, nombre: string, lineas: Array, precioTotal: number }}
   */
  function crearProducto(nombre, lineas, precioTotal) {
    return {
      id: generarId(),
      nombre,
      lineas,
      precioTotal,
    };
  }

  /**
   * Crea una LineaDeCalculo. Por defecto queda "sin parámetro" (parametroId null),
   * con la cantidad vacía (null) y subtotal 0.
   * @param {string|null} [parametroId=null] - referencia a Parametro.id; null => "sin parámetro".
   * @param {number|null} [cantidad=null] - 0.01..999999999.99, máx 2 decimales.
   * @returns {{ parametroId: string|null, cantidad: number|null, subtotal: number }}
   */
  function crearLinea(parametroId = null, cantidad = null) {
    return {
      parametroId,
      cantidad,
      subtotal: 0,
    };
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.models = { generarId, crearParametro, crearProducto, crearLinea };
})(window);
