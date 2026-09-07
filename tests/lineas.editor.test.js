// tests/lineas.editor.test.js — Pruebas del editor de líneas reutilizable
// `src/lineas.editor.js` (window.LP.lineasEditor.crearEditorDeLineas).
//
// Cubre las Tareas 4.2, 4.3 y 4.4 del spec `product-detail-edit-delete`:
//   - 4.2 -> Property 7: setLineas precarga exactamente las líneas del Producto.
//   - 4.3 -> Property 8: editar la copia no muta el Producto original.
//   - 4.4 -> Pruebas de ejemplo (jsdom): agregar/eliminar re-renderiza, estado
//            vacío, selector refleja Parametros vigentes y muestra la Unidad, y
//            ausencia de contenedor no lanza.
//
// El editor produce efectos DOM: se ejercita bajo el entorno jsdom de Vitest.
// Los Scripts_Clasicos se cargan con el helper `cargarModulos`, que evalúa los
// IIFE de src/ contra el `window` de jsdom y puebla `window.LP`.

import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";
import { cargarModulos } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

beforeAll(() => {
  // El editor depende de models.crearLinea; se cargan también currency/calculo/
  // validation por coherencia con el orden de dependencias del proyecto.
  LP = cargarModulos([
    "currency.js",
    "calculo.js",
    "validation.js",
    "models.js",
    "lineas.editor.js",
  ]);
});

// ---------------------------------------------------------------------------
// Utilidades comunes
// ---------------------------------------------------------------------------

/** Crea un contenedor `div` de jsdom (aislado por prueba). */
function crearContenedor() {
  return document.createElement("div");
}

/** Fabrica un accesor a Parametros que devuelve siempre la lista dada. */
function accesorParametros(parametros) {
  return () => parametros;
}

// ---------------------------------------------------------------------------
// Generadores reutilizables (arbitraries)
// ---------------------------------------------------------------------------

// Cantidad válida 0,01 .. 999.999.999,99 con <= 2 decimales.
const arbCantidad = fc
  .integer({ min: 1, max: 99999999999 })
  .map((centesimas) => centesimas / 100);

// Línea de un Producto: parametroId (id string o null) + cantidad + subtotal.
const arbLineaProducto = fc.record({
  parametroId: fc.oneof(
    fc.constant(null),
    fc.string({ minLength: 1, maxLength: 12 })
  ),
  cantidad: arbCantidad,
  subtotal: fc.integer({ min: 0, max: 99999999999 }).map((c) => c / 100),
});

// Producto arbitrario con id y nombre y una lista de líneas.
const arbProducto = fc.record({
  id: fc.uuid(),
  nombre: fc.string({ minLength: 1, maxLength: 100 }),
  lineas: fc.array(arbLineaProducto, { minLength: 0, maxLength: 8 }),
  precioTotal: fc.integer({ min: 0, max: 99999999999 }).map((c) => c / 100),
});

// ---------------------------------------------------------------------------
// Property 7 (Tarea 4.2): setLineas precarga exactamente las líneas del
// Producto — getLineas devuelve, en el mismo orden, líneas con el mismo
// parametroId y la misma cantidad que cada línea del Producto.
// Validates: Requisitos 3.2
// ---------------------------------------------------------------------------
describe("lineasEditor — precarga con setLineas/getLineas", () => {
  // Feature: product-detail-edit-delete, Property 7: Abrir la edición precarga
  // exactamente las líneas del Producto (mismo orden, parametroId y cantidad).
  it("Property 7", () => {
    fc.assert(
      fc.property(arbProducto, (producto) => {
        const contenedor = crearContenedor();
        const editor = LP.lineasEditor.crearEditorDeLineas({
          contenedor,
          getParametros: accesorParametros([]),
        });

        editor.setLineas(producto.lineas);
        const enEdicion = editor.getLineas();

        expect(enEdicion).toHaveLength(producto.lineas.length);
        producto.lineas.forEach((origen, i) => {
          expect(enEdicion[i].parametroId).toBe(origen.parametroId);
          expect(enEdicion[i].cantidad).toBe(origen.cantidad);
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8 (Tarea 4.3): editar la copia no muta el Producto original — tras
// setLineas (deep-copy) y cualquier secuencia de modificaciones sobre las
// líneas en edición sin guardar, las líneas del Producto original permanecen
// sin cambios.
// Validates: Requisitos 3.9
// ---------------------------------------------------------------------------

// Una operación de modificación sobre las líneas en edición.
const arbOperacion = fc.oneof(
  // Agregar una línea vacía.
  fc.record({ tipo: fc.constant("agregar") }),
  // Eliminar la línea de un índice (acotado; el editor ignora índices inválidos).
  fc.record({
    tipo: fc.constant("eliminar"),
    indice: fc.integer({ min: 0, max: 10 }),
  }),
  // Mutar en sitio el parametroId de una línea en edición.
  fc.record({
    tipo: fc.constant("mutarParametro"),
    indice: fc.integer({ min: 0, max: 10 }),
    valor: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 8 })),
  }),
  // Mutar en sitio la cantidad de una línea en edición (string crudo como el input).
  fc.record({
    tipo: fc.constant("mutarCantidad"),
    indice: fc.integer({ min: 0, max: 10 }),
    valor: fc.string({ maxLength: 12 }),
  })
);

describe("lineasEditor — aislamiento del Producto original (deep-copy)", () => {
  // Feature: product-detail-edit-delete, Property 8: Editar la copia no muta el
  // Producto original (aislamiento al cancelar).
  it("Property 8", () => {
    fc.assert(
      fc.property(
        arbProducto,
        fc.array(arbOperacion, { minLength: 0, maxLength: 12 }),
        (producto, operaciones) => {
          const contenedor = crearContenedor();
          const editor = LP.lineasEditor.crearEditorDeLineas({
            contenedor,
            getParametros: accesorParametros([]),
          });

          // Copia de referencia del original ANTES de cargar/editar.
          const snapshot = JSON.parse(JSON.stringify(producto.lineas));

          editor.setLineas(producto.lineas);

          // Aplicar una secuencia arbitraria de modificaciones sin guardar.
          operaciones.forEach((op) => {
            const enEdicion = editor.getLineas();
            if (op.tipo === "agregar") {
              editor.agregarLinea();
            } else if (op.tipo === "eliminar") {
              editor.eliminarLinea(op.indice);
            } else if (op.tipo === "mutarParametro") {
              if (op.indice < enEdicion.length) {
                enEdicion[op.indice].parametroId = op.valor;
              }
            } else if (op.tipo === "mutarCantidad") {
              if (op.indice < enEdicion.length) {
                enEdicion[op.indice].cantidad = op.valor;
              }
            }
          });

          // El Producto original permanece sin cambios.
          expect(producto.lineas).toEqual(snapshot);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Tarea 4.4: pruebas de ejemplo (jsdom) del editor de líneas.
// Validates: Requisitos 3.3
// ---------------------------------------------------------------------------
describe("lineasEditor — ejemplos jsdom (Req 3.3)", () => {
  const PARAMETROS = [
    { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
    { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
  ];

  it("estado sin líneas muestra la indicación de vacío", () => {
    const contenedor = crearContenedor();
    const editor = LP.lineasEditor.crearEditorDeLineas({
      contenedor,
      getParametros: accesorParametros(PARAMETROS),
    });

    editor.render();

    const vacio = contenedor.querySelector(".lp-lineas-vacias");
    expect(vacio).not.toBeNull();
    expect(contenedor.querySelectorAll(".lp-linea")).toHaveLength(0);
  });

  it("agregarLinea re-renderiza una fila y quita el estado vacío", () => {
    const contenedor = crearContenedor();
    const editor = LP.lineasEditor.crearEditorDeLineas({
      contenedor,
      getParametros: accesorParametros(PARAMETROS),
    });

    editor.render();
    expect(contenedor.querySelector(".lp-lineas-vacias")).not.toBeNull();

    editor.agregarLinea();

    expect(contenedor.querySelector(".lp-lineas-vacias")).toBeNull();
    expect(contenedor.querySelectorAll(".lp-linea")).toHaveLength(1);
  });

  it("eliminarLinea re-renderiza quitando la fila correspondiente", () => {
    const contenedor = crearContenedor();
    const editor = LP.lineasEditor.crearEditorDeLineas({
      contenedor,
      getParametros: accesorParametros(PARAMETROS),
    });

    editor.agregarLinea();
    editor.agregarLinea();
    expect(contenedor.querySelectorAll(".lp-linea")).toHaveLength(2);

    editor.eliminarLinea(0);

    expect(contenedor.querySelectorAll(".lp-linea")).toHaveLength(1);
    expect(editor.getLineas()).toHaveLength(1);
  });

  it("el botón Agregar cableado agrega una línea al hacer click", () => {
    const contenedor = crearContenedor();
    const botonAgregar = document.createElement("button");
    const editor = LP.lineasEditor.crearEditorDeLineas({
      contenedor,
      getParametros: accesorParametros(PARAMETROS),
      botonAgregar,
    });

    editor.render();
    botonAgregar.dispatchEvent(new window.Event("click"));

    expect(contenedor.querySelectorAll(".lp-linea")).toHaveLength(1);
  });

  it("el selector refleja los Parametros vigentes y muestra la Unidad", () => {
    const contenedor = crearContenedor();
    const editor = LP.lineasEditor.crearEditorDeLineas({
      contenedor,
      getParametros: accesorParametros(PARAMETROS),
    });

    // Precargar una línea que referencia el segundo parámetro.
    editor.setLineas([{ parametroId: "p2", cantidad: 3, subtotal: 15 }]);

    const select = contenedor.querySelector(".lp-linea-parametro");
    expect(select).not.toBeNull();

    // Una opción vacía + una por cada Parametro vigente.
    const opciones = Array.from(select.querySelectorAll("option"));
    expect(opciones).toHaveLength(PARAMETROS.length + 1);
    const valores = opciones.map((o) => o.value);
    expect(valores).toContain("p1");
    expect(valores).toContain("p2");

    // El select refleja el Parametro referenciado por la línea.
    expect(select.value).toBe("p2");

    // La Unidad mostrada corresponde al Parametro seleccionado.
    const unidad = contenedor.querySelector(".lp-linea-unidad");
    expect(unidad).not.toBeNull();
    expect(unidad.textContent).toBe("UND");
  });

  it("al cambiar el selector actualiza la Unidad mostrada", () => {
    const contenedor = crearContenedor();
    const editor = LP.lineasEditor.crearEditorDeLineas({
      contenedor,
      getParametros: accesorParametros(PARAMETROS),
    });

    editor.agregarLinea();
    const select = contenedor.querySelector(".lp-linea-parametro");
    const unidad = contenedor.querySelector(".lp-linea-unidad");

    // Sin parámetro seleccionado, la unidad está vacía.
    expect(unidad.textContent).toBe("");

    select.value = "p1";
    select.dispatchEvent(new window.Event("change"));

    expect(unidad.textContent).toBe("HORA");
    expect(editor.getLineas()[0].parametroId).toBe("p1");
  });

  it("un parámetro referenciado inexistente cae en la opción vacía", () => {
    const contenedor = crearContenedor();
    const editor = LP.lineasEditor.crearEditorDeLineas({
      contenedor,
      getParametros: accesorParametros(PARAMETROS),
    });

    editor.setLineas([{ parametroId: "no-existe", cantidad: 2, subtotal: 0 }]);

    const select = contenedor.querySelector(".lp-linea-parametro");
    expect(select.value).toBe("");
    const unidad = contenedor.querySelector(".lp-linea-unidad");
    expect(unidad.textContent).toBe("");
  });

  it("ausencia de contenedor no lanza al operar el editor", () => {
    const editor = LP.lineasEditor.crearEditorDeLineas({
      contenedor: null,
      getParametros: accesorParametros(PARAMETROS),
    });

    expect(() => {
      editor.render();
      editor.agregarLinea();
      editor.setLineas([{ parametroId: "p1", cantidad: 1, subtotal: 10 }]);
      editor.eliminarLinea(0);
      editor.desreferenciarParametro("p1");
    }).not.toThrow();

    // El estado en edición sigue siendo consultable pese a la ausencia de DOM.
    expect(Array.isArray(editor.getLineas())).toBe(true);
  });
});
