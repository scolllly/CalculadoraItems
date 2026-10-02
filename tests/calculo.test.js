// tests/calculo.test.js — Pruebas unitarias y de propiedad para lib/calculo.js
//
// Migración de los tests del módulo calculo.js al nuevo entorno ES modules.
// Requisitos: 2.1, 2.2, 2.5, 2.6

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  redondear2,
  subtotalLinea,
  precioTotal,
  calcularProducto,
} from "../lib/calculo.js";

// ---------------------------------------------------------------------------
// redondear2
// ---------------------------------------------------------------------------
describe("redondear2", () => {
  it("redondea valores exactos sin cambio", () => {
    expect(redondear2(1.5)).toBe(1.5);
    expect(redondear2(0)).toBe(0);
    expect(redondear2(-1.5)).toBe(-1.5);
  });

  it("aplica redondeo half-up a 2 decimales", () => {
    expect(redondear2(0.005)).toBe(0.01);
    expect(redondear2(0.004)).toBe(0);
    expect(redondear2(1.235)).toBe(1.24);
  });

  it("corrige errores de punto flotante comunes", () => {
    // 0.1 * 3 = 0.30000000000000004 en IEEE 754
    expect(redondear2(0.1 * 3)).toBe(0.3);
  });

  it("devuelve NaN para valores no finitos", () => {
    expect(redondear2(Infinity)).toBeNaN();
    expect(redondear2(-Infinity)).toBeNaN();
    expect(redondear2(NaN)).toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// subtotalLinea
// ---------------------------------------------------------------------------
describe("subtotalLinea", () => {
  it("multiplica cantidad por precioUnitario y redondea a 2 decimales", () => {
    expect(subtotalLinea(3, 10)).toBe(30);
    expect(subtotalLinea(2, 5.5)).toBe(11);
    expect(subtotalLinea(1, 0.005)).toBe(0.01);
  });

  it("devuelve 0 cuando cantidad o precio son 0", () => {
    expect(subtotalLinea(0, 10)).toBe(0);
    expect(subtotalLinea(5, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// precioTotal
// ---------------------------------------------------------------------------
describe("precioTotal", () => {
  it("suma los subtotales y redondea a 2 decimales", () => {
    expect(precioTotal([10, 20, 5])).toBe(35);
    expect(precioTotal([0.1, 0.2])).toBe(0.3);
  });

  it("devuelve 0 para un array vacío", () => {
    expect(precioTotal([])).toBe(0);
  });

  it("maneja un único subtotal", () => {
    expect(precioTotal([7.55])).toBe(7.55);
  });
});

// ---------------------------------------------------------------------------
// calcularProducto
// ---------------------------------------------------------------------------
describe("calcularProducto", () => {
  it("devuelve subtotales por línea y total correcto", () => {
    const lineas = [
      { cantidad: 2, precioUnitario: 10 },
      { cantidad: 4, precioUnitario: 5 },
    ];
    const resultado = calcularProducto(lineas);
    expect(resultado.subtotales).toEqual([20, 20]);
    expect(resultado.total).toBe(40);
  });

  it("devuelve arrays vacíos y total 0 para lineas vacías", () => {
    const resultado = calcularProducto([]);
    expect(resultado.subtotales).toEqual([]);
    expect(resultado.total).toBe(0);
  });

  it("la estructura del resultado contiene subtotales y total", () => {
    const resultado = calcularProducto([{ cantidad: 1, precioUnitario: 1 }]);
    expect(resultado).toHaveProperty("subtotales");
    expect(resultado).toHaveProperty("total");
  });
});

// ---------------------------------------------------------------------------
// Propiedad: el total siempre es la suma redondeada de los subtotales
// ---------------------------------------------------------------------------
describe("calcularProducto — propiedad", () => {
  it("total === redondear2(suma de subtotales) para cualquier entrada válida", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            cantidad: fc.float({ min: Math.fround(0.01), max: Math.fround(9999), noNaN: true }),
            precioUnitario: fc.float({ min: Math.fround(0), max: Math.fround(9999), noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (lineas) => {
          const { subtotales, total } = calcularProducto(lineas);
          expect(subtotales).toHaveLength(lineas.length);
          const sumaManual = subtotales.reduce((a, b) => a + b, 0);
          expect(total).toBe(redondear2(sumaManual));
        }
      ),
      { numRuns: 100 }
    );
  });
});
