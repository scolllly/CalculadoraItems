// tests/normalizador.producto.property.test.js — Prueba de propiedad
// (fast-check) del Normalizador_De_Producto (`normalizarProducto`).
//
// Migrada al entorno Next.js (ES modules). El único cambio respecto a la
// versión en `old/tests/` es reemplazar `cargarModulos([...])` + `window.LP.*`
// por imports ES directos de `../lib/models.js`. La propiedad de idempotencia
// y conservación se mantiene con `numRuns: 100`.
//
// Requisitos: 11.1, 11.2, 11.4, 12.1, 12.2, 12.3

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { normalizarProducto, esCompuesto } from "../lib/models.js";

// ---------------------------------------------------------------------------
// Generadores reutilizables (arbitraries)
// ---------------------------------------------------------------------------

const FUENTE_PARAMETRO = "Parámetro";
const FUENTE_PRODUCTO = "Producto";

// Marca simbólica para "campo ausente" en el generador.
const AUSENTE = Symbol("ausente");

const arbLinea = fc
  .record({
    fuente: fc.constantFrom(FUENTE_PARAMETRO, FUENTE_PRODUCTO, AUSENTE),
    parametroId: fc.oneof(
      fc.constant(null),
      fc.string({ minLength: 1, maxLength: 12 })
    ),
    cantidad: fc.integer({ min: 1, max: 1000000 }).map((c) => c / 100),
    subtotal: fc.integer({ min: 0, max: 99999999999 }).map((c) => c / 100),
  })
  .map(({ fuente, parametroId, cantidad, subtotal }) => {
    const linea = { parametroId, cantidad, subtotal };
    if (fuente !== AUSENTE) {
      linea.fuenteDeComponente = fuente;
    }
    return linea;
  });

const arbLineas = fc.array(arbLinea, { minLength: 0, maxLength: 8 });

const arbCompuestoEntrada = fc.constantFrom(true, false, AUSENTE, null);

const arbNombre = fc.string({ minLength: 1, maxLength: 100 });
const arbPrecioTotal = fc
  .integer({ min: 0, max: 99999999999 })
  .map((c) => c / 100);
const arbUnidad = fc.string({ minLength: 1, maxLength: 12 });
const arbId = fc.string({ minLength: 1, maxLength: 24 });

const arbProducto = fc
  .record({
    id: arbId,
    nombre: arbNombre,
    lineas: arbLineas,
    precioTotal: arbPrecioTotal,
    unidad: arbUnidad,
    compuesto: arbCompuestoEntrada,
  })
  .map(({ id, nombre, lineas, precioTotal, unidad, compuesto }) => {
    const producto = { id, nombre, lineas, precioTotal, unidad };
    if (compuesto !== AUSENTE) {
      producto.compuesto = compuesto;
    }
    return producto;
  });

// ---------------------------------------------------------------------------
// Property 6: El Normalizador deriva el flag ausente y es idempotente.
// Validates: Requirements 4.1, 4.2, 4.3
// ---------------------------------------------------------------------------
describe("normalizarProducto — Deriva el flag ausente y es idempotente", () => {
  // Feature: producto-simple-vs-compuesto-tabs, Property 6: El Normalizador
  // deriva el flag ausente y es idempotente.
  it("Property 6", () => {
    fc.assert(
      fc.property(arbProducto, (producto) => {
        const eraBooleano = typeof producto.compuesto === "boolean";
        const valorEntrada = producto.compuesto;

        const resultado = normalizarProducto(producto);

        if (eraBooleano) {
          expect(resultado.compuesto).toBe(valorEntrada);
        } else {
          expect(resultado.compuesto).toBe(esCompuesto(producto.lineas));
        }

        expect(typeof resultado.compuesto).toBe("boolean");

        expect(resultado.id).toBe(producto.id);
        expect(resultado.nombre).toBe(producto.nombre);
        expect(resultado.lineas).toBe(producto.lineas);
        expect(resultado.precioTotal).toBe(producto.precioTotal);
        expect(resultado.unidad).toBe(producto.unidad);

        const doble = normalizarProducto(resultado);
        expect(doble).toEqual(resultado);
      }),
      { numRuns: 100 }
    );
  });
});
