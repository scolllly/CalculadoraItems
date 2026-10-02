// tests/backup.property.test.js — Property 1: round-trip del respaldo completo.
//
// Requisitos: 11.2, 11.7

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { serializarRespaldo, parsearRespaldo } from "../lib/backup.js";

// Número finito serializable por JSON. Se normaliza -0 a 0 porque JSON no
// distingue -0 de 0 (JSON.stringify(-0) === "0"); -0 no es un monto válido en
// el dominio y su exclusión mantiene la propiedad de round-trip bien definida.
const arbNumeroSerializable = fc
  .float({ noNaN: true, noDefaultInfinity: true })
  .map((n) => (n === 0 ? 0 : n));

const arbParametro = fc.record({
  id: fc.uuid(),
  nombre: fc.string(),
  precioUnitario: arbNumeroSerializable,
  unidad: fc.string(),
});

const arbLinea = fc.record({
  parametroId: fc.oneof(fc.constant(null), fc.uuid()),
  cantidad: fc.oneof(fc.constant(null), arbNumeroSerializable),
  subtotal: arbNumeroSerializable,
  fuenteDeComponente: fc.constantFrom("Parámetro", "Producto"),
  productoComponenteId: fc.oneof(fc.constant(null), fc.uuid()),
});

const arbProducto = fc
  .record({
    id: fc.uuid(),
    nombre: fc.string(),
    lineas: fc.array(arbLinea, { maxLength: 6 }),
    precioTotal: arbNumeroSerializable,
    unidad: fc.string(),
    compuesto: fc.option(fc.boolean(), { nil: undefined }),
  })
  .map((p) => {
    if (p.compuesto === undefined) {
      const { compuesto, ...resto } = p;
      return resto;
    }
    return p;
  });

describe("backup — Property 1: round-trip preserva todos los datos", () => {
  // Feature: nextjs-migration, Property 1: Backup serialization round-trip preserves all data
  it("Property 1", () => {
    fc.assert(
      fc.property(
        fc.array(arbParametro, { maxLength: 6 }),
        fc.array(arbProducto, { maxLength: 6 }),
        (parametros, productos) => {
          const resultado = parsearRespaldo(
            serializarRespaldo(parametros, productos)
          );
          expect(resultado.status).toBe("ok");
          expect(resultado.parametros).toEqual(parametros);
          expect(resultado.productos).toEqual(productos);
        }
      ),
      { numRuns: 100 }
    );
  });
});
