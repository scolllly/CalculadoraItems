// tests/partition.property.test.js — Property 3: partición total y exclusiva.
//
// Requisitos: 11.2

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { particionarYOrdenar } from "../components/productos/ListaProductos.js";

const AUSENTE = Symbol("ausente");

const arbProducto = fc
  .record({
    id: fc.uuid(),
    nombre: fc.string({ minLength: 1, maxLength: 20 }),
    compuesto: fc.constantFrom(true, false, AUSENTE),
  })
  .map(({ id, nombre, compuesto }) => {
    const p = { id, nombre };
    if (compuesto !== AUSENTE) p.compuesto = compuesto;
    return p;
  });

describe("partition — Property 3: partición total y exclusiva", () => {
  // Feature: nextjs-migration, Property 3: Producto partition is total and exclusive
  it("Property 3", () => {
    fc.assert(
      fc.property(
        fc.array(arbProducto, { maxLength: 12 }),
        fc.constantFrom("asc", "desc"),
        (productos, direccion) => {
          const { compuestos, simples } = particionarYOrdenar(
            productos,
            direccion
          );

          // Total: la unión contiene exactamente los mismos elementos.
          expect(compuestos.length + simples.length).toBe(productos.length);
          const idsUnion = [...compuestos, ...simples].map((p) => p.id).sort();
          const idsEntrada = productos.map((p) => p.id).sort();
          expect(idsUnion).toEqual(idsEntrada);

          // Exclusiva: cada compuesto tiene compuesto === true; cada simple !== true.
          compuestos.forEach((p) => expect(p.compuesto).toBe(true));
          simples.forEach((p) => expect(p.compuesto !== true).toBe(true));
        }
      ),
      { numRuns: 100 }
    );
  });
});
