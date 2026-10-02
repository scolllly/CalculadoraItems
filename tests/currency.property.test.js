// tests/currency.property.test.js — Property 4: formatearPEN siempre 2 decimales.
//
// Requisitos: 11.2

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatearPEN } from "../lib/currency.js";

describe("currency — Property 4: formatearPEN siempre produce 2 decimales", () => {
  // Feature: nextjs-migration, Property 4: formatearPEN always produces exactly two decimal places
  it("Property 4", () => {
    fc.assert(
      fc.property(
        // Dominio monetario acotado: toFixed usa notación científica para |n| >= 1e21.
        fc.double({ min: -1e15, max: 1e15, noNaN: true, noDefaultInfinity: true }),
        (n) => {
          const salida = formatearPEN(n);
          expect(salida.startsWith("S/ ")).toBe(true);
          expect(salida).toMatch(/^S\/ -?\d+\.\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
