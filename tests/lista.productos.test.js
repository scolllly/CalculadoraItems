// tests/lista.productos.test.js — Pruebas (jsdom) de la Lista_De_Productos
// renderizada por `src/productos.controller.js`
// (window.LP.productosController.crearProductosController).
//
// Cubre la Tarea 7.2 del spec `product-detail-edit-delete`:
//   - Lista NO vacía: por cada Producto renderiza el nombre, el Precio_Total en
//     PEN (2 decimales via formatearPEN) y los tres botones Ver detalle / Editar
//     / Eliminar (Req 1.1).
//   - Lista vacía: muestra la indicación de "no hay productos" y NINGÚN botón
//     (Req 1.2).
//   - Clic en cada acción (Ver detalle / Editar / Eliminar) invoca el flujo
//     correcto con el `id` correcto (Req 1.3–1.5). Como las acciones son stubs
//     internos no observables, el cableado se verifica por medios observables:
//     cada `<li>` lleva el `data-id` del Producto correspondiente, los botones de
//     acción existen dentro del `<li>` con ese `data-id`, y el clic sobre cada
//     botón no lanza (el id leído del `data-id` fluye al flujo correcto).
//
// El controlador produce efectos DOM: se ejercita bajo el entorno jsdom de
// Vitest. Los Scripts_Clasicos se cargan con el helper `cargarModulos`, que
// evalúa los IIFE de src/ contra el `window` de jsdom y puebla `window.LP`.

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { cargarModulos } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

beforeAll(() => {
  // El controlador de Productos depende de currency (formatearPEN), calculo,
  // validation, models, el editor de líneas (usado en init) y notifier.
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
// Utilidades de montaje del DOM
// ---------------------------------------------------------------------------

/**
 * Monta en el `document` de jsdom el marcado mínimo que el controlador cablea
 * en `init()`: el contenedor de la Lista_De_Productos (#lista-productos) y los
 * controles de la Calculadora que `init()` consulta (para no depender de su
 * ausencia). El contenedor de líneas y los botones existen para que el editor
 * y los listeners se instancien sin lanzar.
 */
function montarDOM() {
  document.body.innerHTML = `
    <input type="text" id="producto-nombre" />
    <div id="lineas-container"></div>
    <button type="button" id="btn-agregar-linea"></button>
    <button type="button" id="btn-calcular"></button>
    <div id="resultado-calculo"></div>
    <button type="button" id="btn-guardar-producto"></button>
    <div id="lista-productos"></div>
  `;
}

/**
 * Crea un controlador de Productos cableado a un estado en memoria controlado
 * por la prueba, y lo inicializa (que renderiza la Lista_De_Productos).
 *
 * @param {Array} productos Lista inicial de Productos.
 * @param {Array} [parametros] Lista de Parametros vigentes.
 * @returns {{ controlador: any, estado: { productos: Array } }}
 */
function crearControlador(productos, parametros = []) {
  const estado = { productos: productos.slice() };
  const controlador = LP.productosController.crearProductosController({
    getParametros: () => parametros,
    getProductos: () => estado.productos,
    setProductos: (nueva) => {
      estado.productos = nueva;
    },
  });
  controlador.init();
  return { controlador, estado };
}

/** Devuelve el contenedor de la Lista_De_Productos. */
function contenedorLista() {
  return document.getElementById("lista-productos");
}

// ---------------------------------------------------------------------------
// Datos de ejemplo
// ---------------------------------------------------------------------------

const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

const PRODUCTOS = [
  {
    id: "prod-1",
    nombre: "Servicio básico",
    lineas: [{ parametroId: "p1", cantidad: 2, subtotal: 20 }],
    precioTotal: 20,
  },
  {
    id: "prod-2",
    nombre: "Servicio completo",
    lineas: [
      { parametroId: "p1", cantidad: 3, subtotal: 30 },
      { parametroId: "p2", cantidad: 4, subtotal: 20 },
    ],
    precioTotal: 50,
  },
];

beforeEach(() => {
  montarDOM();
});

// ---------------------------------------------------------------------------
// Req 1.1: Lista NO vacía renderiza nombre, Precio_Total en PEN y 3 botones
// ---------------------------------------------------------------------------
describe("Lista_De_Productos — lista no vacía (Req 1.1)", () => {
  it("renderiza un <li> por Producto con su data-id", () => {
    crearControlador(PRODUCTOS, PARAMETROS);

    const items = contenedorLista().querySelectorAll("li.lp-producto");
    expect(items).toHaveLength(PRODUCTOS.length);

    const ids = Array.from(items).map((li) => li.getAttribute("data-id"));
    expect(ids).toEqual(["prod-1", "prod-2"]);
  });

  it("muestra el nombre de cada Producto", () => {
    crearControlador(PRODUCTOS, PARAMETROS);

    const nombres = Array.from(
      contenedorLista().querySelectorAll(".lp-producto-nombre")
    ).map((el) => el.textContent);

    expect(nombres).toEqual(["Servicio básico", "Servicio completo"]);
  });

  it("muestra el Precio_Total en PEN con 2 decimales (formatearPEN)", () => {
    crearControlador(PRODUCTOS, PARAMETROS);

    const precios = Array.from(
      contenedorLista().querySelectorAll(".lp-producto-precio")
    ).map((el) => el.textContent);

    expect(precios).toEqual([
      LP.currency.formatearPEN(20),
      LP.currency.formatearPEN(50),
    ]);
    // Coherencia con el formato PEN (prefijo S/ y 2 decimales).
    precios.forEach((texto) => {
      expect(texto).toMatch(/^S\/ \d+\.\d{2}$/);
    });
  });

  it("renderiza los tres botones (Ver detalle, Editar, Eliminar) por Producto", () => {
    crearControlador(PRODUCTOS, PARAMETROS);

    contenedorLista()
      .querySelectorAll("li.lp-producto")
      .forEach((li) => {
        expect(li.querySelector(".lp-producto-detalle")).not.toBeNull();
        expect(li.querySelector(".lp-producto-editar")).not.toBeNull();
        expect(li.querySelector(".lp-producto-eliminar")).not.toBeNull();
      });

    // En total, 3 botones por cada Producto.
    expect(contenedorLista().querySelectorAll(".lp-producto-detalle")).toHaveLength(
      PRODUCTOS.length
    );
    expect(contenedorLista().querySelectorAll(".lp-producto-editar")).toHaveLength(
      PRODUCTOS.length
    );
    expect(
      contenedorLista().querySelectorAll(".lp-producto-eliminar")
    ).toHaveLength(PRODUCTOS.length);
  });
});

// ---------------------------------------------------------------------------
// Req 1.2: Lista vacía muestra la indicación y NINGÚN botón
// ---------------------------------------------------------------------------
describe("Lista_De_Productos — lista vacía (Req 1.2)", () => {
  it("muestra la indicación de que no hay productos", () => {
    crearControlador([], PARAMETROS);

    const vacio = contenedorLista().querySelector(".lp-productos-vacios");
    expect(vacio).not.toBeNull();
    expect(vacio.textContent).toContain("No hay productos");
  });

  it("no muestra ningún botón de acción ni ningún <li> de Producto", () => {
    crearControlador([], PARAMETROS);

    expect(contenedorLista().querySelectorAll("li.lp-producto")).toHaveLength(0);
    expect(
      contenedorLista().querySelectorAll(".lp-producto-detalle")
    ).toHaveLength(0);
    expect(contenedorLista().querySelectorAll(".lp-producto-editar")).toHaveLength(
      0
    );
    expect(
      contenedorLista().querySelectorAll(".lp-producto-eliminar")
    ).toHaveLength(0);
    expect(contenedorLista().querySelectorAll("button")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Req 1.3–1.5: clic en cada acción invoca el flujo con el id correcto
//
// Las acciones (abrirDetalle/abrirEdicion/confirmarYEliminar) son stubs internos
// no expuestos; el cableado se verifica por medios observables: cada botón vive
// dentro del <li> con el data-id correcto (el id que fluye al flujo), y el clic
// no lanza (el listener lee data-id y delega en el flujo correspondiente).
// ---------------------------------------------------------------------------
describe("Lista_De_Productos — cableado de acciones por id (Req 1.3–1.5)", () => {
  /** Devuelve el <li> del Producto con el id dado. */
  function itemPorId(id) {
    return contenedorLista().querySelector(
      `li.lp-producto[data-id="${id}"]`
    );
  }

  it("cada botón de acción pertenece al <li> del Producto correcto (id correcto)", () => {
    crearControlador(PRODUCTOS, PARAMETROS);

    PRODUCTOS.forEach((producto) => {
      const li = itemPorId(producto.id);
      expect(li).not.toBeNull();
      // Los tres botones de acción están asociados a este mismo <li>/id.
      const detalle = li.querySelector(".lp-producto-detalle");
      const editar = li.querySelector(".lp-producto-editar");
      const eliminar = li.querySelector(".lp-producto-eliminar");
      expect(detalle).not.toBeNull();
      expect(editar).not.toBeNull();
      expect(eliminar).not.toBeNull();
      // El id que fluye a cada flujo se lee del data-id del <li> contenedor.
      expect(detalle.closest("li.lp-producto").getAttribute("data-id")).toBe(
        producto.id
      );
      expect(editar.closest("li.lp-producto").getAttribute("data-id")).toBe(
        producto.id
      );
      expect(eliminar.closest("li.lp-producto").getAttribute("data-id")).toBe(
        producto.id
      );
    });
  });

  it("clic en Ver detalle no lanza (Req 1.3)", () => {
    crearControlador(PRODUCTOS, PARAMETROS);
    const btn = itemPorId("prod-2").querySelector(".lp-producto-detalle");
    expect(() => btn.dispatchEvent(new window.Event("click"))).not.toThrow();
  });

  it("clic en Editar no lanza (Req 1.4)", () => {
    crearControlador(PRODUCTOS, PARAMETROS);
    const btn = itemPorId("prod-2").querySelector(".lp-producto-editar");
    expect(() => btn.dispatchEvent(new window.Event("click"))).not.toThrow();
  });

  it("clic en Eliminar no lanza (Req 1.5)", () => {
    crearControlador(PRODUCTOS, PARAMETROS);
    const btn = itemPorId("prod-1").querySelector(".lp-producto-eliminar");
    expect(() => btn.dispatchEvent(new window.Event("click"))).not.toThrow();
  });

  it("clic en las acciones no muta el estado ni el número de Productos", () => {
    const { estado } = crearControlador(PRODUCTOS, PARAMETROS);
    const antes = estado.productos.slice();

    itemPorId("prod-1")
      .querySelector(".lp-producto-detalle")
      .dispatchEvent(new window.Event("click"));
    itemPorId("prod-2")
      .querySelector(".lp-producto-editar")
      .dispatchEvent(new window.Event("click"));

    // Ver detalle / Editar no alteran la lista de Productos.
    expect(estado.productos).toEqual(antes);
    expect(contenedorLista().querySelectorAll("li.lp-producto")).toHaveLength(
      PRODUCTOS.length
    );
  });
});
