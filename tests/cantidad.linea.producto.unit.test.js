// tests/cantidad.linea.producto.unit.test.js
//
// Spec: product-line-quantity-validation-fix — Tarea 4.1 (Pruebas unitarias
// adicionales). El arreglo ya está implementado en src/productos.ops.js
// (conversión de la cantidad cruda a número con la semántica de
// `aNumeroCantidad` antes de invocar `validation.validarCantidad`).
//
// Estas pruebas unitarias cubren, con casos concretos y bordes:
//  - `validarLineasProducto` ACEPTA cadenas numéricas válidas en
//    Lineas_De_Producto (sin `cantidad-invalida`). (Req 2.3 lado válido)
//  - `validarLineasProducto` RECHAZA cadenas fuera de rango / con más de 2
//    decimales / no numéricas (`cantidad-invalida`). (Req 2.3, 2.4)
//  - `validarLineasProducto` IGNORA las Lineas_De_Parametro (con o sin
//    `fuenteDeComponente`). (Req 3.1)
//  - El helper de conversión local replica `aNumeroCantidad` (observado a
//    través de `validarLineasProducto`, ya que el helper es privado): number
//    passthrough, trim, cadena vacía → NaN, no-string → NaN, no finito → NaN.
//    (Req 2.4, 3.2)
//  - `validation.validarCantidad` mantiene su contrato para entradas numéricas
//    (bordes 0,01 y 999.999.999,99; 2 vs. 3 decimales). (Req 3.5)
//
// Los Scripts_Clasicos se cargan con `cargarModulos`, que evalúa los IIFE de
// src/ contra el `window` de jsdom y puebla `window.LP`. Se invocan las
// funciones puras directamente sobre `window.LP`.

import { describe, it, expect, beforeAll } from "vitest";
import { cargarModulos } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

// Producto_Componente existente al que apuntan las Lineas_De_Producto de prueba.
const PRODUCTO_COMPONENTE = {
  id: "comp-1",
  nombre: "Componente base",
  lineas: [{ parametroId: "p1", cantidad: 1, subtotal: 10 }],
  precioTotal: 10,
};

// Lista de Productos vigentes (contexto para resolver `productoComponenteId`).
const PRODUCTOS = [PRODUCTO_COMPONENTE];

// Id del Producto_Contenedor en edición (nuevo => null).
const ID_EN_EDICION = null;

beforeAll(() => {
  LP = cargarModulos([
    "currency.js",
    "calculo.js",
    "validation.js",
    "models.js",
    "productos.ops.js",
  ]);
});

/**
 * Construye una Linea_De_Producto en edición con un `productoComponenteId`
 * existente y la cantidad cruda indicada.
 * @param {unknown} cantidad
 * @returns {object}
 */
function lineaDeProducto(cantidad) {
  const F = (LP.models && LP.models.FUENTE_COMPONENTE) || { PRODUCTO: "Producto" };
  return {
    parametroId: null,
    fuenteDeComponente: F.PRODUCTO,
    productoComponenteId: PRODUCTO_COMPONENTE.id,
    cantidad,
  };
}

/**
 * ¿El resultado de `validarLineasProducto` contiene un error `cantidad-invalida`
 * para el índice dado?
 * @param {{ valido: boolean, errores?: Array<{indice:number,tipo:string}> }} resultado
 * @param {number} indice
 * @returns {boolean}
 */
function tieneCantidadInvalida(resultado, indice) {
  if (!resultado || resultado.valido) return false;
  const errores = resultado.errores || [];
  return errores.some((e) => e.indice === indice && e.tipo === "cantidad-invalida");
}

/**
 * ¿El resultado contiene un error del tipo dado para el índice dado?
 * @param {{ valido: boolean, errores?: Array<{indice:number,tipo:string}> }} resultado
 * @param {number} indice
 * @param {string} tipo
 * @returns {boolean}
 */
function tieneError(resultado, indice, tipo) {
  if (!resultado || resultado.valido) return false;
  const errores = resultado.errores || [];
  return errores.some((e) => e.indice === indice && e.tipo === tipo);
}

// ---------------------------------------------------------------------------
// validarLineasProducto — cadenas numéricas válidas se ACEPTAN
// Validates: Requirements 2.3
// ---------------------------------------------------------------------------
describe("validarLineasProducto — acepta cadenas numéricas válidas en Linea_De_Producto", () => {
  it.each([["5"], ["0.01"], ["10.5"]])(
    "cantidad %s no produce cantidad-invalida",
    (cantidad) => {
      const resultado = LP.productosOps.validarLineasProducto(
        [lineaDeProducto(cantidad)],
        PRODUCTOS,
        ID_EN_EDICION
      );
      expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
    }
  );

  it("una única Linea_De_Producto válida da { valido: true }", () => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto("5")],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(resultado).toEqual({ valido: true });
  });

  it("acepta cadenas con espacios alrededor (trim), p. ej. '  5  '", () => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto("  5  ")],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validarLineasProducto — cadenas realmente inválidas se RECHAZAN
// Validates: Requirements 2.3, 2.4
// ---------------------------------------------------------------------------
describe("validarLineasProducto — rechaza cadenas inválidas en Linea_De_Producto", () => {
  it.each([
    ["0"], // por debajo del mínimo 0,01
    ["-3"], // negativo, fuera de rango
    ["1000000000"], // por encima del máximo 999.999.999,99
    ["1.005"], // más de 2 decimales
    ["1,5"], // separador de coma no aceptado por Number()
  ])("cantidad fuera de rango / con >2 decimales / no numérica %s produce cantidad-invalida", (cantidad) => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto(cantidad)],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it.each([
    ["", "cadena vacía"],
    ["abc", "no numérica"],
    ["  ", "solo espacios"],
  ])("cantidad %s (%s) produce cantidad-invalida", (cantidad) => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto(cantidad)],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validarLineasProducto — ignora las Lineas_De_Parametro
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------
describe("validarLineasProducto — ignora las Lineas_De_Parametro", () => {
  it("una Linea_De_Parametro explícita (fuenteDeComponente: 'Parámetro') se ignora aunque su cantidad sea inválida", () => {
    const F = (LP.models && LP.models.FUENTE_COMPONENTE) || { PARAMETRO: "Parámetro" };
    const lineaParam = {
      parametroId: "p1",
      fuenteDeComponente: F.PARAMETRO,
      cantidad: "abc", // inválida, pero debe ser ignorada por validarLineasProducto
    };
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaParam],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(resultado).toEqual({ valido: true });
  });

  it("una línea SIN fuenteDeComponente se interpreta como Parámetro y se ignora (retrocompatibilidad)", () => {
    const lineaSinFuente = {
      parametroId: "p1",
      cantidad: "abc", // inválida, pero debe ignorarse
    };
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaSinFuente],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(resultado).toEqual({ valido: true });
  });

  it("mezcla: una Linea_De_Parametro inválida (ignorada) y una Linea_De_Producto válida da { valido: true }", () => {
    const F = (LP.models && LP.models.FUENTE_COMPONENTE) || {
      PARAMETRO: "Parámetro",
      PRODUCTO: "Producto",
    };
    const lineas = [
      { parametroId: "p1", fuenteDeComponente: F.PARAMETRO, cantidad: "-99" },
      lineaDeProducto("5"),
    ];
    const resultado = LP.productosOps.validarLineasProducto(
      lineas,
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(resultado).toEqual({ valido: true });
  });
});

// ---------------------------------------------------------------------------
// Helper local de conversión (replica aNumeroCantidad) — observado a través de
// validarLineasProducto, ya que el helper es privado al módulo.
// Validates: Requirements 2.4, 3.2
// ---------------------------------------------------------------------------
describe("conversión de cantidad (semántica de aNumeroCantidad) observada vía validarLineasProducto", () => {
  it("number passthrough: cantidad numérica válida (5) se acepta sin conversión de cadena", () => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto(5)],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
  });

  it("number passthrough: número inválido (0) sigue rechazándose", () => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto(0)],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it("trim: '  5  ' se convierte a 5 (aceptado)", () => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto("  5  ")],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
  });

  it("cadena vacía → NaN (rechazado)", () => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto("")],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it.each([
    [null, "null"],
    [undefined, "undefined"],
    [{ valor: 5 }, "objeto"],
    [[5], "array"],
    [true, "boolean"],
  ])("no-string → NaN (rechazado): %s (%s)", (cantidad) => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto(cantidad)],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it.each([
    ["Infinity"],
    ["-Infinity"],
    ["NaN"],
  ])("cadena no finita → NaN (rechazado): %s", (cantidad) => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto(cantidad)],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it("no-finito numérico directo (Infinity) → rechazado", () => {
    const resultado = LP.productosOps.validarLineasProducto(
      [lineaDeProducto(Infinity)],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it("prioriza el problema de producto: sin productoComponenteId reporta sin-producto (aunque la cantidad sea válida)", () => {
    const F = (LP.models && LP.models.FUENTE_COMPONENTE) || { PRODUCTO: "Producto" };
    const linea = {
      parametroId: null,
      fuenteDeComponente: F.PRODUCTO,
      productoComponenteId: null,
      cantidad: "5",
    };
    const resultado = LP.productosOps.validarLineasProducto(
      [linea],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneError(resultado, 0, "sin-producto")).toBe(true);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validation.validarCantidad — contrato para entradas numéricas inalterado
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------
describe("validation.validarCantidad — contrato para entradas numéricas", () => {
  it("acepta el borde inferior 0.01", () => {
    expect(LP.validation.validarCantidad(0.01).valido).toBe(true);
  });

  it("acepta el borde superior 999999999.99", () => {
    expect(LP.validation.validarCantidad(999999999.99).valido).toBe(true);
  });

  it("rechaza por debajo del mínimo (0.009)", () => {
    const r = LP.validation.validarCantidad(0.009);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(LP.validation.MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza por encima del máximo (1000000000)", () => {
    expect(LP.validation.validarCantidad(1000000000).valido).toBe(false);
  });

  it("acepta exactamente 2 decimales (10.5, 10.55)", () => {
    expect(LP.validation.validarCantidad(10.5).valido).toBe(true);
    expect(LP.validation.validarCantidad(10.55).valido).toBe(true);
  });

  it("rechaza 3 decimales (1.005)", () => {
    expect(LP.validation.validarCantidad(1.005).valido).toBe(false);
  });

  it("mantiene el contrato de tipo: rechaza cadenas aunque representen números", () => {
    expect(LP.validation.validarCantidad("5").valido).toBe(false);
  });

  it("rechaza valores no finitos (NaN, Infinity)", () => {
    expect(LP.validation.validarCantidad(NaN).valido).toBe(false);
    expect(LP.validation.validarCantidad(Infinity).valido).toBe(false);
  });
});
