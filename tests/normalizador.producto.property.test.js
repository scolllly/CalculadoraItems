// tests/normalizador.producto.property.test.js — Prueba de propiedad
// (fast-check) del Normalizador_De_Producto (`models.normalizarProducto`).
//
// Feature: producto-simple-vs-compuesto-tabs
//
// La propiedad de diseño se implementa con EXACTAMENTE un test de propiedad,
// con `numRuns` mínimo 100. Los Scripts_Clasicos se cargan con el helper
// `cargarModulos`, que evalúa los IIFE de src/ contra el `window` de jsdom y
// puebla `window.LP`.

import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";
import { cargarModulos } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

beforeAll(() => {
  LP = cargarModulos([
    "currency.js",
    "calculo.js",
    "validation.js",
    "models.js",
    "productos.ops.js",
  ]);
});

// ---------------------------------------------------------------------------
// Generadores reutilizables (arbitraries)
// ---------------------------------------------------------------------------

const FUENTE_PARAMETRO = "Parámetro";
const FUENTE_PRODUCTO = "Producto";

// Marca simbólica para "campo ausente" en el generador: el campo se omite del
// objeto resultante.
const AUSENTE = Symbol("ausente");

// Genera una Linea_De_Calculo con `fuenteDeComponente` en
// { "Parámetro", "Producto", ausente }. Cuando la fuente es ausente, el objeto
// de línea NO incluye la propiedad `fuenteDeComponente` (Req 3.4).
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

// Lista de Lineas_De_Calculo (incluye listas vacías).
const arbLineas = fc.array(arbLinea, { minLength: 0, maxLength: 8 });

// Valor del Flag_Compuesto de entrada: booleano (true/false), ausente o null,
// para cubrir tanto la conservación (Req 4.2) como la derivación (Req 4.1).
const arbCompuestoEntrada = fc.constantFrom(true, false, AUSENTE, null);

const arbNombre = fc.string({ minLength: 1, maxLength: 100 });
const arbPrecioTotal = fc
  .integer({ min: 0, max: 99999999999 })
  .map((c) => c / 100);
const arbUnidad = fc.string({ minLength: 1, maxLength: 12 });
const arbId = fc.string({ minLength: 1, maxLength: 24 });

// Genera un Producto cuyo `compuesto` puede ser booleano, estar ausente o ser
// null (independiente de las líneas), para ejercitar ambos caminos del
// Normalizador_De_Producto.
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
// Property 6: El Normalizador deriva el flag ausente y es idempotente
//
// Para todo Producto, `normalizarProducto` devuelve un Producto que:
//  (a) si el `compuesto` de entrada no es booleano, cumple
//      `compuesto === esCompuesto(lineas)`;
//  (b) si el `compuesto` de entrada ya es booleano, conserva ese mismo valor; y
//  en ambos casos conserva `id`, `nombre`, `lineas`, `precioTotal` y `unidad`.
//  Además es idempotente: `normalizarProducto(normalizarProducto(p))` es
//  equivalente a `normalizarProducto(p)`.
//
// Validates: Requirements 4.1, 4.2, 4.3
// ---------------------------------------------------------------------------
describe("normalizarProducto — Deriva el flag ausente y es idempotente", () => {
  // Feature: producto-simple-vs-compuesto-tabs, Property 6: El Normalizador
  // deriva el flag ausente y es idempotente — cuando el `compuesto` de entrada
  // no es booleano el resultado se deriva con `esCompuesto(lineas)`; cuando ya
  // es booleano se conserva; se preservan `id`/`nombre`/`lineas`/`precioTotal`/
  // `unidad`; y `normalizar(normalizar(p))` equivale a `normalizar(p)`.
  it("Property 6", () => {
    fc.assert(
      fc.property(arbProducto, (producto) => {
        const eraBooleano = typeof producto.compuesto === "boolean";
        const valorEntrada = producto.compuesto;

        const resultado = LP.models.normalizarProducto(producto);

        if (eraBooleano) {
          // (b) Un flag booleano ya registrado se conserva sin recalcular
          // (Req 4.2).
          expect(resultado.compuesto).toBe(valorEntrada);
        } else {
          // (a) Un flag ausente/no booleano se deriva de las líneas mediante el
          // Clasificador_De_Producto (Req 4.1).
          expect(resultado.compuesto).toBe(
            LP.models.esCompuesto(producto.lineas)
          );
        }

        // El flag resultante siempre es booleano.
        expect(typeof resultado.compuesto).toBe("boolean");

        // Conservación de los demás campos del Producto procesado (Req 4.3).
        expect(resultado.id).toBe(producto.id);
        expect(resultado.nombre).toBe(producto.nombre);
        expect(resultado.lineas).toBe(producto.lineas);
        expect(resultado.precioTotal).toBe(producto.precioTotal);
        expect(resultado.unidad).toBe(producto.unidad);

        // Idempotencia: normalizar de nuevo el resultado produce un Producto
        // profundamente igual (Req 4.2, estabilidad de la operación).
        const doble = LP.models.normalizarProducto(resultado);
        expect(doble).toEqual(resultado);
      }),
      { numRuns: 100 }
    );
  });
});
