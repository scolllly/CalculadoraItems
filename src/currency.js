// currency.js — Formato de moneda (función pura)
//
// Componente de la capa de dominio del Aplicacion (Calculadora de precios
// Limpiapipas). Convierte un número en su representación de texto en soles (PEN)
// con exactamente 2 dígitos decimales, p. ej. "S/ 1234.50".
//
// Requisito 5.3: mostrar valores en soles (PEN) con 2 decimales.
// Property 4: para todo número finito, la salida tiene exactamente 2 dígitos
// decimales.

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  /**
   * Redondea un número a 2 decimales usando redondeo half-up, de forma robusta
   * frente a errores de representación de punto flotante (evita el sesgo del
   * `toFixed` ingenuo, p. ej. 1.005.toFixed(2) === "1.00").
   *
   * @param {number} n valor a redondear
   * @returns {number} valor redondeado a 2 decimales
   */
  function redondearHalfUp2(n) {
    // Escala con corrección de épsilon para compensar el error de coma flotante
    // (p. ej. 1.005 * 100 === 100.49999999999999).
    const escalado = n * 100;
    const corregido = escalado + (escalado >= 0 ? 1 : -1) * 1e-9;
    return Math.round(corregido) / 100;
  }

  /**
   * Formatea un número finito como monto en soles (PEN) con exactamente 2
   * decimales, con el prefijo "S/ ".
   *
   * Ejemplos:
   *   formatearPEN(1234.5)   // "S/ 1234.50"
   *   formatearPEN(0)        // "S/ 0.00"
   *   formatearPEN(-3.1)     // "S/ -3.10"
   *
   * @param {number} n número finito a formatear
   * @returns {string} cadena con formato "S/ <valor con 2 decimales>"
   */
  function formatearPEN(n) {
    // Normalizamos el -0 a 0 para evitar salidas como "S/ -0.00".
    const redondeado = redondearHalfUp2(n) + 0;
    const valor = Object.is(redondeado, -0) ? 0 : redondeado;
    return `S/ ${valor.toFixed(2)}`;
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.currency = { formatearPEN };
})(window);
