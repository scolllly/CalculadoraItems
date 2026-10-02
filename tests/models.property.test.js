// tests/models.property.test.js — Property 2: idempotencia de normalizadores.
//
// Requisitos: 11.2, 12.1, 12.2, 12.3

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { normalizarProducto, normalizarLinea } from "../lib/models.js";

const AUSENTE = Symbol("ausente");

const arbLinea = fc
  .record({
    parametroId: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 12 })),
    cantidad: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 100000 }).map((c) => c / 100)),
    subtotal: fc.oneof(fc.constant(AUSENTE), fc.integer({ min: 0, max: 100000 }).map((c) => c / 100)),
    fuente: fc.constantFrom("Parámetro", "Producto", AUSENTE, null),
    productoComponenteId: fc.oneof(fc.constant(AUSENTE), fc.constant(null), fc.string({ minLength: 1, maxLength: 12 })),
  })
  .map(({ parametroId, cantidad, subtotal, fuente, productoComponenteId }) => {
    const l = { parametroId, cantidad };
    if (subtotal !== AUSENTE) l.subtotal = subtotal;
    if (fuente !== AUSENTE) l.fuenteDeComponente = fuente;
    if (productoComponenteId !== AUSENTE) l.productoComponenteId = productoComponenteId;
    return l;
  });

const arbProducto = fc
  .record({
    id: fc.string({ minLength: 1, maxLength: 24 }),
    nombre: fc.string({ minLength: 1, maxLength: 100 }),
    lineas: fc.array(arbLinea, { maxLength: 8 }),
    precioTotal: fc.integer({ min: 0, max: 999999999 }).map((n) => n / 100),
    unidad: fc.string({ minLength: 1, maxLength: 12 }),
    compuesto: fc.constantFrom(true, false, AUSENTE, null),
  })
  .map(({ id, nombre, lineas, precioTotal, unidad, compuesto }) => {
    const p = { id, nombre, lineas, precioTotal, unidad };
    if (compuesto !== AUSENTE) p.compuesto = compuesto;
    return p;
  });

describe("models — Property 2: normalizadores idempotentes", () => {
  // Feature: nextjs-migration, Property 2: Normalization functions are idempotent
  it("Property 2 — normalizarProducto idempotente", () => {
    fc.assert(
      fc.property(arbProducto, (producto) => {
        const una = normalizarProducto(producto);
        const dos = normalizarProducto(una);
        expect(dos).toEqual(una);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 2 — normalizarLinea idempotente y con campos garantizados", () => {
    fc.assert(
      fc.property(arbLinea, (linea) => {
        const una = normalizarLinea(linea);
        const dos = normalizarLinea(una);
        expect(dos).toEqual(una);
        expect(una.fuenteDeComponente).not.toBeNull();
        expect(una.fuenteDeComponente).not.toBeUndefined();
        expect(
          una.productoComponenteId === null ||
            typeof una.productoComponenteId === "string"
        ).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
