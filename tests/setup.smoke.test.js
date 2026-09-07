// tests/setup.smoke.test.js — Prueba de humo del entorno de pruebas.
//
// Verifica que Vitest + jsdom están operativos y que el helper de carga evalúa
// los Scripts_Clasicos de src/ contra el `window` de jsdom, poblando `window.LP`.
// Esta prueba se elimina/ignora una vez que existan las suites reales; sirve como
// validación de la Tarea 1 (configuración del entorno de pruebas).

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { cargarLP } from "./helpers/cargarLP.js";

describe("entorno de pruebas (Tarea 1)", () => {
  it("carga los Scripts_Clasicos de src/ y puebla window.LP", () => {
    const LP = cargarLP();
    expect(LP).toBeTypeOf("object");
    // Módulos de dominio puro existentes deben estar disponibles.
    expect(LP.currency && typeof LP.currency.formatearPEN).toBe("function");
    expect(LP.calculo && typeof LP.calculo.redondear2).toBe("function");
    expect(LP.validation && typeof LP.validation.validarCantidad).toBe(
      "function"
    );
    expect(LP.models && typeof LP.models.crearProducto).toBe("function");
  });

  it("dispone del entorno jsdom (window y document)", () => {
    expect(typeof window).not.toBe("undefined");
    expect(typeof document).not.toBe("undefined");
    const el = document.createElement("div");
    expect(el).toBeTruthy();
  });

  it("fast-check está disponible para pruebas de propiedad", () => {
    const LP = cargarLP();
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1000, noNaN: true }), (n) => {
        const salida = LP.currency.formatearPEN(n);
        return /^S\/ -?\d+\.\d{2}$/.test(salida);
      }),
      { numRuns: 50 }
    );
  });
});
