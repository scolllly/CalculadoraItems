// tests/particion.tabs.property.test.js — Prueba de propiedad (fast-check) del
// helper puro de partición por Flag_Compuesto usado por el render de las
// pestañas (Contenedor_De_Tabs).
//
// Cubre la Tarea 7.2 del spec `producto-simple-vs-compuesto-tabs`:
//   Feature: producto-simple-vs-compuesto-tabs, Property 9: La partición separa
//   por flag preservando la pertenencia y el orden.
//
// El helper puro es `LP.productosController.particionarPorCompuesto(productos)`,
// que devuelve `{ compuestos, simples }`. Aunque es una función pura, vive en el
// controlador de Productos (efectos de DOM), por lo que se carga el módulo
// completo bajo el entorno jsdom de Vitest con sus dependencias, como en
// `tests/lista.productos.test.js`. Los Scripts_Clasicos se cargan con el helper
// `cargarModulos`, que evalúa los IIFE de src/ contra el `window` de jsdom y
// puebla `window.LP`.

import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";
import { cargarModulos } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

beforeAll(() => {
  // El controlador de Productos depende de currency, calculo, validation,
  // models, el dominio puro de operaciones, notifier y el editor de líneas
  // (usados al inicializar el módulo).
  LP = cargarModulos([
    "currency.js",
    "calculo.js",
    "validation.js",
    "models.js",
    "productos.ops.js",
    "notifier.js",
    "lineas.editor.js",
    "productos.controller.js",
  ]);
});

// ---------------------------------------------------------------------------
// Generadores reutilizables (arbitraries)
// ---------------------------------------------------------------------------

// Flag_Compuesto en { true, false, ausente } para cubrir el criterio del render
// (compuesto solo si `compuesto === true`; el resto —incluido el flag ausente—
// se clasifica como simple).
const arbCompuesto = fc.oneof(
  fc.constant(true),
  fc.constant(false),
  fc.constant(undefined) // ausente
);

// Producto mínimo con un `id` único (asignado al construir la lista) y un
// Flag_Compuesto arbitrario. El resto de campos no influyen en la partición.
const arbProductoBase = fc.record({
  nombre: fc.string(),
  compuesto: arbCompuesto,
});

// Lista de Productos con `id` únicos por posición, para poder afirmar identidad,
// pertenencia y orden sin ambigüedad.
const arbProductos = fc
  .array(arbProductoBase, { minLength: 0, maxLength: 30 })
  .map((items) =>
    items.map((p, i) => {
      const producto = { id: "prod-" + i, nombre: p.nombre };
      // Solo fijar `compuesto` cuando no sea ausente, para ejercitar el caso del
      // flag ausente (undefined) sin materializar la clave.
      if (p.compuesto !== undefined) producto.compuesto = p.compuesto;
      return producto;
    })
  );

// ---------------------------------------------------------------------------
// Property 9: La partición separa por flag preservando la pertenencia y el orden
// ---------------------------------------------------------------------------
describe("particionarPorCompuesto — partición por Flag_Compuesto (Property 9)", () => {
  // Feature: producto-simple-vs-compuesto-tabs, Property 9: La partición separa
  // por flag preservando la pertenencia y el orden
  // Validates: Requirements 6.2, 6.3, 6.6
  it("separa exactamente por flag, sin pérdidas ni duplicados, preservando el orden relativo", () => {
    fc.assert(
      fc.property(arbProductos, (productos) => {
        const { compuestos, simples } =
          LP.productosController.particionarPorCompuesto(productos);

        // Grupos esperados calculados de forma independiente, preservando el
        // orden relativo de entrada (Req 6.6).
        const esperadoCompuestos = productos.filter(
          (p) => p && p.compuesto === true
        );
        const esperadoSimples = productos.filter(
          (p) => !(p && p.compuesto === true)
        );

        // Exactitud de cada grupo (Req 6.2: compuestos = `compuesto === true`;
        // Req 6.3: simples = resto) Y preservación del orden relativo (Req 6.6).
        // Se comparan por identidad de referencia para descartar duplicación o
        // sustitución de objetos.
        expect(compuestos).toEqual(esperadoCompuestos);
        expect(simples).toEqual(esperadoSimples);
        expect(compuestos.length).toBe(esperadoCompuestos.length);
        expect(simples.length).toBe(esperadoSimples.length);
        compuestos.forEach((p, i) => {
          expect(p).toBe(esperadoCompuestos[i]);
          expect(p.compuesto).toBe(true);
        });
        simples.forEach((p, i) => {
          expect(p).toBe(esperadoSimples[i]);
          expect(p.compuesto === true).toBe(false);
        });

        // Sin pérdidas ni duplicados: la unión de ambos grupos cubre exactamente
        // la entrada (misma cardinalidad y mismo conjunto de `id`).
        expect(compuestos.length + simples.length).toBe(productos.length);
        const idsEntrada = productos.map((p) => p.id).sort();
        const idsSalida = [...compuestos, ...simples]
          .map((p) => p.id)
          .sort();
        expect(idsSalida).toEqual(idsEntrada);
        // No hay duplicados en la salida.
        expect(new Set(idsSalida).size).toBe(idsSalida.length);
      }),
      { numRuns: 100 }
    );
  });
});
