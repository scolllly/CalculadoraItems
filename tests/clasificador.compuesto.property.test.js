// tests/clasificador.compuesto.property.test.js — Pruebas de propiedad
// (fast-check) del Clasificador_De_Producto (`models.esCompuesto`) y de la
// derivación del Flag_Compuesto en la creación de Productos.
//
// Feature: producto-simple-vs-compuesto-tabs
//
// Cada propiedad de diseño se implementa con EXACTAMENTE un test de propiedad,
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

// Fuente de una Linea_De_Calculo: "Parámetro", "Producto" o ausente (campo
// omitido). Cubre el tratamiento retrocompatible del Req 3.4, donde una línea
// sin `fuenteDeComponente` se interpreta como Linea_De_Parametro.
const FUENTE_PARAMETRO = "Parámetro";
const FUENTE_PRODUCTO = "Producto";

// Marca simbólica para "fuente ausente" en el generador (el campo se omite del
// objeto de línea resultante).
const AUSENTE = Symbol("ausente");

// Genera una Linea_De_Calculo con `fuenteDeComponente` en
// { "Parámetro", "Producto", ausente }. Cuando la fuente es ausente, el objeto
// de línea NO incluye la propiedad `fuenteDeComponente`.
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

// ---------------------------------------------------------------------------
// Property 1: Regla del Clasificador_De_Producto
//
// Para toda lista de Lineas_De_Calculo (incluyendo listas vacías, líneas de
// Parámetro, líneas de Producto y líneas sin `fuenteDeComponente`),
// `esCompuesto(lineas)` devuelve `true` si y solo si existe al menos una línea
// con `fuenteDeComponente === "Producto"`, y `false` en caso contrario (una
// lista vacía o sin Lineas_De_Producto devuelve `false`; una línea sin fuente
// no cuenta).
//
// Validates: Requirements 3.1, 3.2, 3.4
// ---------------------------------------------------------------------------
describe("esCompuesto — Regla del Clasificador_De_Producto", () => {
  // Feature: producto-simple-vs-compuesto-tabs, Property 1: Regla del
  // Clasificador_De_Producto — esCompuesto(lineas) es true si y solo si existe
  // al menos una Linea_De_Producto (fuenteDeComponente === "Producto"); una
  // lista vacía o una línea sin fuente no cuenta como Producto.
  it("Property 1", () => {
    fc.assert(
      fc.property(arbLineas, (lineas) => {
        const esperado = lineas.some(
          (linea) => linea.fuenteDeComponente === FUENTE_PRODUCTO
        );
        expect(LP.models.esCompuesto(lineas)).toBe(esperado);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: El Clasificador es determinista y no muta sus entradas
//
// Para toda lista de Lineas_De_Calculo, dos evaluaciones consecutivas de
// `esCompuesto` sobre la misma entrada devuelven el mismo resultado, y la lista
// de líneas (y sus objetos) permanece profundamente igual antes y después de la
// evaluación (sin mutación).
//
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------
describe("esCompuesto — Determinismo e inmutabilidad", () => {
  // Feature: producto-simple-vs-compuesto-tabs, Property 2: El Clasificador es
  // determinista y no muta sus entradas — dos evaluaciones consecutivas sobre la
  // misma lista devuelven el mismo resultado, y la lista (con sus objetos)
  // permanece profundamente igual antes y después (snapshot antes/después).
  it("Property 2", () => {
    fc.assert(
      fc.property(arbLineas, (lineas) => {
        // Snapshot profundo de la entrada ANTES de evaluar, para detectar
        // cualquier mutación de la lista o de sus objetos de línea (Req 3.5).
        const snapshotAntes = structuredClone(lineas);

        // Determinismo: dos evaluaciones consecutivas sobre la misma entrada
        // deben devolver el mismo resultado.
        const primera = LP.models.esCompuesto(lineas);
        const segunda = LP.models.esCompuesto(lineas);
        expect(segunda).toBe(primera);

        // Inmutabilidad: la lista (y sus objetos) permanece profundamente igual
        // tras las evaluaciones (comparación snapshot antes/después).
        expect(lineas).toEqual(snapshotAntes);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Crear deriva el flag y preserva los demás campos
//
// Para todo nombre, lista de líneas, precioTotal y unidad válidos, el Producto
// devuelto por `crearProducto` cumple `compuesto === esCompuesto(lineas)` y
// conserva `nombre`, `lineas`, `precioTotal` y `unidad` iguales a los provistos
// (y `id` es un string no vacío).
//
// Validates: Requirements 1.1, 1.2, 1.3, 1.4
// ---------------------------------------------------------------------------

// Generadores de los campos restantes del Producto. Se reutiliza `arbLineas`
// (definido arriba) para las Lineas_De_Calculo.
const arbNombre = fc.string({ minLength: 1, maxLength: 100 });
const arbPrecioTotal = fc.integer({ min: 0, max: 99999999999 }).map((c) => c / 100);
const arbUnidad = fc.string({ minLength: 1, maxLength: 12 });

describe("crearProducto — Deriva el flag y preserva los demás campos", () => {
  // Feature: producto-simple-vs-compuesto-tabs, Property 3: Crear deriva el flag
  // y preserva los demás campos — el Producto creado cumple
  // `compuesto === esCompuesto(lineas)`, conserva `nombre`/`lineas`/
  // `precioTotal`/`unidad` iguales a los provistos, y tiene un `id` string no
  // vacío.
  it("Property 3", () => {
    fc.assert(
      fc.property(
        arbNombre,
        arbLineas,
        arbPrecioTotal,
        arbUnidad,
        (nombre, lineas, precioTotal, unidad) => {
          const producto = LP.models.crearProducto(
            nombre,
            lineas,
            precioTotal,
            unidad
          );

          // El Flag_Compuesto se deriva con la misma regla del Clasificador
          // (Req 1.1, 1.2, 1.3).
          expect(producto.compuesto).toBe(LP.models.esCompuesto(lineas));

          // Conservación de los demás campos con los valores provistos
          // (Req 1.4).
          expect(producto.nombre).toBe(nombre);
          expect(producto.lineas).toBe(lineas);
          expect(producto.precioTotal).toBe(precioTotal);
          expect(producto.unidad).toBe(unidad);

          // `id` es un string no vacío.
          expect(typeof producto.id).toBe("string");
          expect(producto.id.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
