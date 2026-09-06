// calculo.js — Lógica pura de cálculo (sin dependencias del DOM ni de localStorage)
//
// Implementa el redondeo half-up a 2 decimales de forma robusta frente a errores
// de punto flotante, así como el cálculo de subtotales por línea y el precio total
// de un producto a partir de líneas ya resueltas (con cantidad y precio unitario).
//
// Requisitos: 5.1, 5.2
//
// Se carga como Script_Clasico bajo file:// y publica su API en el espacio de
// nombres global `window.LP` (en `LP.calculo`), sin sintaxis de Módulos ES.

(function (global) {
  // Espacio de nombres global de la aplicación.
  const LP = (global.LP = global.LP || {});

  /**
   * Redondea un número a 2 decimales usando redondeo estándar half-up.
   *
   * No usa `toFixed` ingenuo: escala el valor y corrige el error de representación
   * de punto flotante con un pequeño épsilon antes de aplicar `Math.round`. Esto
   * garantiza que casos como `0.005` se redondeen a `0.01` y que el arrastre de
   * punto flotante (p. ej. `0.1 * 3 = 0.30000000000000004`) no altere el resultado.
   *
   * @param {number} n Valor numérico a redondear.
   * @returns {number} El valor redondeado a 2 decimales (a lo sumo 2 decimales).
   */
  function redondear2(n) {
    if (!Number.isFinite(n)) {
      return NaN;
    }

    // Trabajamos con el valor absoluto para que el redondeo half-up sea simétrico
    // respecto al signo (half-away-from-zero para negativos).
    const signo = n < 0 ? -1 : 1;
    const abs = Math.abs(n);

    // Escalamos a centésimas. El épsilon relativo corrige el error de coma flotante
    // que, de otro modo, dejaría valores como 0.005 * 100 = 0.4999999999999999
    // justo por debajo del punto de corte del redondeo.
    const escalado = abs * 100;
    const corregido = escalado + Number.EPSILON * Math.abs(escalado);
    const redondeado = Math.round(corregido);

    return (signo * redondeado) / 100;
  }

  /**
   * Calcula el subtotal de una línea como cantidad * precioUnitario, redondeado a
   * 2 decimales mediante redondeo half-up.
   *
   * @param {number} cantidad Cantidad de la línea.
   * @param {number} precioUnitario Precio unitario del parámetro seleccionado.
   * @returns {number} El subtotal redondeado a 2 decimales.
   */
  function subtotalLinea(cantidad, precioUnitario) {
    return redondear2(cantidad * precioUnitario);
  }

  /**
   * Calcula el precio total como la suma de los subtotales, redondeada a 2 decimales.
   *
   * @param {number[]} subtotales Lista de subtotales por línea.
   * @returns {number} La suma redondeada a 2 decimales.
   */
  function precioTotal(subtotales) {
    const suma = subtotales.reduce((acc, s) => acc + s, 0);
    return redondear2(suma);
  }

  /**
   * @typedef {Object} LineaResuelta
   * @property {number} cantidad Cantidad de la línea (ya resuelta).
   * @property {number} precioUnitario Precio unitario del parámetro referenciado (ya resuelto).
   */

  /**
   * Calcula los subtotales por línea y el precio total de un producto a partir de
   * líneas ya resueltas (con cantidad y precioUnitario resueltos desde el Parametro).
   *
   * @param {LineaResuelta[]} lineas Líneas resueltas del producto.
   * @returns {{ subtotales: number[], total: number }} Subtotales por línea y total.
   */
  function calcularProducto(lineas) {
    const subtotales = lineas.map((linea) =>
      subtotalLinea(linea.cantidad, linea.precioUnitario)
    );
    const total = precioTotal(subtotales);
    return { subtotales, total };
  }

  // Publicación de la API en el espacio de nombres global.
  LP.calculo = {
    redondear2,
    subtotalLinea,
    precioTotal,
    calcularProducto,
  };
})(window);
