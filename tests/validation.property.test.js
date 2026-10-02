// tests/validation.property.test.js — Property 5: rango válido de validarCantidad.
//
// Requisitos: 11.2

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validarCantidad } from "../lib/validation.js";

describe("validation — Property 5: validarCantidad acepta exactamente el dominio válido", () => {
  // Feature: nextjs-migration, Property 5: validarCantidad accepts exactly the valid domain range
  it("Property 5 — dentro de rango es válido", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99999999999 }).map((c) => c / 100),
        (n) => {
          expect(validarCantidad(n).valido).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 5 — fuera de rango es inválido con mensaje", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(0),
          fc.integer({ min: 100000000000, max: 999999999999 }).map((c) => c / 100)
        ),
        (n) => {
          const r = validarCantidad(n);
          expect(r.valido).toBe(false);
          expect(typeof r.mensaje).toBe("string");
          expect(r.mensaje.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
