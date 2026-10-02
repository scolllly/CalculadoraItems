// tests/cantidad.linea.producto.unit.test.js
//
// Migrada al entorno Next.js (ES modules). El único cambio respecto a la
// versión en `old/tests/` es reemplazar `cargarModulos([...])` + `window.LP.*`
// por imports ES directos de `../lib/productos.ops.js`, `../lib/validation.js`
// y `../lib/models.js`. Todos los casos de conversión de cantidad cruda se
// conservan idénticos.
//
// Requisitos: 11.1, 11.4

import { describe, it, expect } from "vitest";
import { validarLineasProducto } from "../lib/productos.ops.js";
import { validarCantidad, MENSAJES } from "../lib/validation.js";
import { FUENTE_COMPONENTE } from "../lib/models.js";

// Producto_Componente existente al que apuntan las Lineas_De_Producto de prueba.
const PRODUCTO_COMPONENTE = {
  id: "comp-1",
  nombre: "Componente base",
  lineas: [{ parametroId: "p1", cantidad: 1, subtotal: 10 }],
  precioTotal: 10,
};

const PRODUCTOS = [PRODUCTO_COMPONENTE];
const ID_EN_EDICION = null;

function lineaDeProducto(cantidad) {
  return {
    parametroId: null,
    fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
    productoComponenteId: PRODUCTO_COMPONENTE.id,
    cantidad,
  };
}

function tieneCantidadInvalida(resultado, indice) {
  if (!resultado || resultado.valido) return false;
  const errores = resultado.errores || [];
  return errores.some((e) => e.indice === indice && e.tipo === "cantidad-invalida");
}

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
      const resultado = validarLineasProducto(
        [lineaDeProducto(cantidad)],
        PRODUCTOS,
        ID_EN_EDICION
      );
      expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
    }
  );

  it("una única Linea_De_Producto válida da { valido: true }", () => {
    const resultado = validarLineasProducto(
      [lineaDeProducto("5")],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(resultado).toEqual({ valido: true });
  });

  it("acepta cadenas con espacios alrededor (trim), p. ej. '  5  '", () => {
    const resultado = validarLineasProducto(
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
    ["0"],
    ["-3"],
    ["1000000000"],
    ["1.005"],
    ["1,5"],
  ])("cantidad fuera de rango / con >2 decimales / no numérica %s produce cantidad-invalida", (cantidad) => {
    const resultado = validarLineasProducto(
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
    const resultado = validarLineasProducto(
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
  it("una Linea_De_Parametro explícita se ignora aunque su cantidad sea inválida", () => {
    const lineaParam = {
      parametroId: "p1",
      fuenteDeComponente: FUENTE_COMPONENTE.PARAMETRO,
      cantidad: "abc",
    };
    const resultado = validarLineasProducto([lineaParam], PRODUCTOS, ID_EN_EDICION);
    expect(resultado).toEqual({ valido: true });
  });

  it("una línea SIN fuenteDeComponente se interpreta como Parámetro y se ignora", () => {
    const lineaSinFuente = { parametroId: "p1", cantidad: "abc" };
    const resultado = validarLineasProducto(
      [lineaSinFuente],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(resultado).toEqual({ valido: true });
  });

  it("mezcla: una Linea_De_Parametro inválida (ignorada) y una Linea_De_Producto válida da { valido: true }", () => {
    const lineas = [
      { parametroId: "p1", fuenteDeComponente: FUENTE_COMPONENTE.PARAMETRO, cantidad: "-99" },
      lineaDeProducto("5"),
    ];
    const resultado = validarLineasProducto(lineas, PRODUCTOS, ID_EN_EDICION);
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
    const resultado = validarLineasProducto([lineaDeProducto(5)], PRODUCTOS, ID_EN_EDICION);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
  });

  it("number passthrough: número inválido (0) sigue rechazándose", () => {
    const resultado = validarLineasProducto([lineaDeProducto(0)], PRODUCTOS, ID_EN_EDICION);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it("trim: '  5  ' se convierte a 5 (aceptado)", () => {
    const resultado = validarLineasProducto([lineaDeProducto("  5  ")], PRODUCTOS, ID_EN_EDICION);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
  });

  it("cadena vacía → NaN (rechazado)", () => {
    const resultado = validarLineasProducto([lineaDeProducto("")], PRODUCTOS, ID_EN_EDICION);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it.each([
    [null, "null"],
    [undefined, "undefined"],
    [{ valor: 5 }, "objeto"],
    [[5], "array"],
    [true, "boolean"],
  ])("no-string → NaN (rechazado): %s (%s)", (cantidad) => {
    const resultado = validarLineasProducto([lineaDeProducto(cantidad)], PRODUCTOS, ID_EN_EDICION);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it.each([
    ["Infinity"],
    ["-Infinity"],
    ["NaN"],
  ])("cadena no finita → NaN (rechazado): %s", (cantidad) => {
    const resultado = validarLineasProducto([lineaDeProducto(cantidad)], PRODUCTOS, ID_EN_EDICION);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it("no-finito numérico directo (Infinity) → rechazado", () => {
    const resultado = validarLineasProducto([lineaDeProducto(Infinity)], PRODUCTOS, ID_EN_EDICION);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  it("prioriza el problema de producto: sin productoComponenteId reporta sin-producto (aunque la cantidad sea válida)", () => {
    const linea = {
      parametroId: null,
      fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
      productoComponenteId: null,
      cantidad: "5",
    };
    const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
    expect(tieneError(resultado, 0, "sin-producto")).toBe(true);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validarCantidad — contrato para entradas numéricas inalterado
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------
describe("validarCantidad — contrato para entradas numéricas", () => {
  it("acepta el borde inferior 0.01", () => {
    expect(validarCantidad(0.01).valido).toBe(true);
  });

  it("acepta el borde superior 999999999.99", () => {
    expect(validarCantidad(999999999.99).valido).toBe(true);
  });

  it("rechaza por debajo del mínimo (0.009)", () => {
    const r = validarCantidad(0.009);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza por encima del máximo (1000000000)", () => {
    expect(validarCantidad(1000000000).valido).toBe(false);
  });

  it("acepta exactamente 2 decimales (10.5, 10.55)", () => {
    expect(validarCantidad(10.5).valido).toBe(true);
    expect(validarCantidad(10.55).valido).toBe(true);
  });

  it("rechaza 3 decimales (1.005)", () => {
    expect(validarCantidad(1.005).valido).toBe(false);
  });

  it("mantiene el contrato de tipo: rechaza cadenas aunque representen números", () => {
    expect(validarCantidad("5").valido).toBe(false);
  });

  it("rechaza valores no finitos (NaN, Infinity)", () => {
    expect(validarCantidad(NaN).valido).toBe(false);
    expect(validarCantidad(Infinity).valido).toBe(false);
  });
});
