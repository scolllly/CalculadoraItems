// tests/currency.test.js — Pruebas unitarias y de propiedad para lib/currency.js
//
// Migración al nuevo entorno ES modules de los tests de formatearPEN.
// Requisitos: 11.1, 11.4

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { formatearPEN, redondearHalfUp2 } from "../lib/currency.js";

// ---------------------------------------------------------------------------
// redondearHalfUp2
// ---------------------------------------------------------------------------
describe("redondearHalfUp2", () => {
  it("devuelve valores exactos sin cambio", () => {
    expect(redondearHalfUp2(0)).toBe(0);
    expect(redondearHalfUp2(1)).toBe(1);
    expect(redondearHalfUp2(1.5)).toBe(1.5);
    expect(redondearHalfUp2(-3.1)).toBe(-3.1);
  });

  it("aplica redondeo half-up a 2 decimales (casos .005)", () => {
    expect(redondearHalfUp2(1.005)).toBe(1.01);
    expect(redondearHalfUp2(0.005)).toBe(0.01);
    expect(redondearHalfUp2(0.004)).toBe(0);
    expect(redondearHalfUp2(1.234)).toBe(1.23);
    expect(redondearHalfUp2(1.235)).toBe(1.24);
  });

  it("corrige errores de punto flotante (0.1 * 3)", () => {
    // IEEE 754: 0.1 * 3 === 0.30000000000000004
    expect(redondearHalfUp2(0.1 * 3)).toBe(0.3);
  });
});

// ---------------------------------------------------------------------------
// formatearPEN — formato
// ---------------------------------------------------------------------------
describe("formatearPEN — formato", () => {
  it('comienza con "S/ "', () => {
    expect(formatearPEN(0)).toMatch(/^S\/ /);
    expect(formatearPEN(100)).toMatch(/^S\/ /);
    expect(formatearPEN(-5)).toMatch(/^S\/ /);
  });

  it("incluye exactamente 2 dígitos decimales", () => {
    // El separador decimal es siempre "."
    expect(formatearPEN(0)).toBe("S/ 0.00");
    expect(formatearPEN(1)).toBe("S/ 1.00");
    expect(formatearPEN(1234.5)).toBe("S/ 1234.50");
    expect(formatearPEN(1234.56)).toBe("S/ 1234.56");
  });
});

// ---------------------------------------------------------------------------
// formatearPEN — casos cero
// ---------------------------------------------------------------------------
describe("formatearPEN — casos cero", () => {
  it("formatea 0 como S/ 0.00", () => {
    expect(formatearPEN(0)).toBe("S/ 0.00");
  });

  it("normaliza -0 a S/ 0.00 (no S/ -0.00)", () => {
    expect(formatearPEN(-0)).toBe("S/ 0.00");
  });
});

// ---------------------------------------------------------------------------
// formatearPEN — números positivos
// ---------------------------------------------------------------------------
describe("formatearPEN — números positivos", () => {
  it("formatea enteros con dos ceros decimales", () => {
    expect(formatearPEN(1)).toBe("S/ 1.00");
    expect(formatearPEN(100)).toBe("S/ 100.00");
    expect(formatearPEN(9999)).toBe("S/ 9999.00");
  });

  it("formatea decimales con 1 dígito completando el segundo", () => {
    expect(formatearPEN(1.5)).toBe("S/ 1.50");
    expect(formatearPEN(0.1)).toBe("S/ 0.10");
  });

  it("formatea decimales con 2 dígitos exactos", () => {
    expect(formatearPEN(1.23)).toBe("S/ 1.23");
    expect(formatearPEN(99.99)).toBe("S/ 99.99");
  });

  it("formatea valores grandes con 2 decimales", () => {
    expect(formatearPEN(1000000)).toBe("S/ 1000000.00");
    expect(formatearPEN(1000000.1)).toBe("S/ 1000000.10");
  });
});

// ---------------------------------------------------------------------------
// formatearPEN — números negativos
// ---------------------------------------------------------------------------
describe("formatearPEN — números negativos", () => {
  it("formatea negativos con signo dentro del valor numérico", () => {
    expect(formatearPEN(-3.1)).toBe("S/ -3.10");
    expect(formatearPEN(-100)).toBe("S/ -100.00");
    expect(formatearPEN(-0.5)).toBe("S/ -0.50");
  });

  it("aplica redondeo correcto a valores negativos", () => {
    expect(formatearPEN(-1.005)).toBe("S/ -1.01");
    expect(formatearPEN(-1.004)).toBe("S/ -1.00");
  });
});

// ---------------------------------------------------------------------------
// formatearPEN — redondeo
// ---------------------------------------------------------------------------
describe("formatearPEN — redondeo a 2 decimales", () => {
  it("redondea correctamente el tercer decimal (half-up)", () => {
    expect(formatearPEN(1.005)).toBe("S/ 1.01");
    expect(formatearPEN(1.004)).toBe("S/ 1.00");
    expect(formatearPEN(2.345)).toBe("S/ 2.35");
    expect(formatearPEN(2.344)).toBe("S/ 2.34");
  });

  it("corrige el error de punto flotante 0.1 * 3", () => {
    // Sin corrección: (0.1 * 3).toFixed(2) podría rendir "0.30" pero el valor
    // intermedio es 0.30000000000000004; redondearHalfUp2 lo corrige.
    expect(formatearPEN(0.1 * 3)).toBe("S/ 0.30");
  });

  it("formatea 0.005 redondeando a 0.01", () => {
    expect(formatearPEN(0.005)).toBe("S/ 0.01");
  });
});

// ---------------------------------------------------------------------------
// Propiedad: formatearPEN siempre produce exactamente 2 decimales (Property 4)
//
// Nota: `Number.prototype.toFixed` emite notación científica para valores
// con |n| >= 1e21, lo cual es un comportamiento del runtime, no un bug de
// formatearPEN. El dominio relevante de la aplicación es de montos monetarios,
// así que el generador acota el rango a [-1e15, 1e15], suficiente para
// cualquier precio real y coherente con el uso esperado de formatearPEN.
// ---------------------------------------------------------------------------
describe("formatearPEN — propiedad: exactamente 2 decimales para montos en el dominio monetario", () => {
  it('para todo número en el dominio monetario, formatearPEN(n) comienza con "S/ " y tiene exactamente 2 dígitos decimales', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e15, max: 1e15, noNaN: true }),
        (n) => {
          const salida = formatearPEN(n);
          // Empieza con "S/ "
          expect(salida.startsWith("S/ ")).toBe(true);
          // La parte numérica tiene exactamente 2 dígitos después del punto
          expect(salida).toMatch(/^S\/ -?\d+\.\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
