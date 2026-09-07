// tests/ventana.detalle.test.js — Pruebas (jsdom) de la Ventana_Detalle
// renderizada por `src/productos.controller.js` (abrirDetalle vía el botón
// "Ver detalle" de la Lista_De_Productos).
//
// Cubre la Tarea 8.2 del spec `product-detail-edit-delete`:
//   - Producto con líneas: muestra nombre (título), las líneas en orden con
//     nombre del Parametro, Cantidad, Unidad y subtotal en PEN, y el
//     Precio_Total en PEN (Req 2.1–2.3).
//   - Línea con Parametro ausente: muestra el texto NOMBRE_PARAMETRO_AUSENTE y
//     Unidad vacía, conservando el subtotal almacenado (Req 2.4).
//   - Solo lectura: la Ventana_Detalle no contiene controles de edición
//     (inputs, selects, botones de agregar/eliminar/guardar líneas) (Req 2.5).
//   - Abrir/cerrar no persiste ni muta el estado de Productos (Req 2.6).
//   - Producto sin líneas: muestra el nombre, el mensaje "Este producto no tiene
//     líneas de cálculo." y el Precio_Total (Req 2.7).
//   - Ausencia de la API de Bootstrap: se usa el fallback manual (alternar
//     d-none/show) sin lanzar, y el modal se vuelve visible.
//
// El controlador produce efectos DOM: se ejercita bajo el entorno jsdom de
// Vitest. Los Scripts_Clasicos se cargan con `cargarModulos`, que evalúa los
// IIFE de src/ contra el `window` de jsdom y puebla `window.LP`.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { cargarModulos } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

beforeAll(() => {
  // La Ventana_Detalle depende de currency (formatearPEN), productosOps
  // (resolverDetalle), notifier, y el editor de líneas + calculo/validation/
  // models que init() y el controlador consultan.
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
 * Monta en el `document` de jsdom el marcado que el controlador cablea en
 * `init()` (Lista_De_Productos + controles de la Calculadora) más el marcado
 * estático del modal de la Ventana_Detalle (#modal-detalle) copiado de
 * index.html, con el que trabaja `abrirDetalle`.
 */
function montarDOM() {
  document.body.innerHTML = `
    <div id="notificaciones" aria-live="polite"></div>

    <!-- Controles de la Calculadora que init() consulta -->
    <input type="text" id="producto-nombre" />
    <div id="lineas-container"></div>
    <button type="button" id="btn-agregar-linea"></button>
    <button type="button" id="btn-calcular"></button>
    <div id="resultado-calculo"></div>
    <button type="button" id="btn-guardar-producto"></button>

    <!-- Lista_De_Productos -->
    <div id="lista-productos"></div>

    <!-- ===== Modal Ver detalle (solo lectura) — copiado de index.html ===== -->
    <div class="modal fade" id="modal-detalle" tabindex="-1" aria-labelledby="modal-detalle-titulo" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title h5" id="modal-detalle-titulo">Detalle del producto</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <div id="modal-detalle-lineas"></div>
          </div>
          <div class="modal-footer justify-content-between">
            <span class="fw-bold">Precio total:</span>
            <span id="modal-detalle-total" class="badge bg-success"></span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Crea un controlador de Productos cableado a un estado en memoria controlado
 * por la prueba, y lo inicializa (que renderiza la Lista_De_Productos con los
 * botones "Ver detalle").
 *
 * @param {Array} productos Lista inicial de Productos.
 * @param {Array} [parametros] Lista de Parametros vigentes.
 * @returns {{ controlador: any, estado: { productos: Array, escrituras: number } }}
 */
function crearControlador(productos, parametros = []) {
  const estado = { productos: productos.slice(), escrituras: 0 };
  const controlador = LP.productosController.crearProductosController({
    getParametros: () => parametros,
    getProductos: () => estado.productos,
    setProductos: (nueva) => {
      estado.escrituras += 1;
      estado.productos = nueva;
    },
  });
  controlador.init();
  return { controlador, estado };
}

function contenedorLista() {
  return document.getElementById("lista-productos");
}

/** Devuelve el <li> del Producto con el id dado dentro de la lista. */
function itemPorId(id) {
  return contenedorLista().querySelector(`li.lp-producto[data-id="${id}"]`);
}

/** Dispara el botón "Ver detalle" del Producto con el id dado. */
function abrirDetallePorId(id) {
  const btn = itemPorId(id).querySelector(".lp-producto-detalle");
  btn.dispatchEvent(new window.Event("click"));
}

const modalDetalle = () => document.getElementById("modal-detalle");
const tituloDetalle = () => document.getElementById("modal-detalle-titulo");
const lineasDetalle = () => document.getElementById("modal-detalle-lineas");
const totalDetalle = () => document.getElementById("modal-detalle-total");

// ---------------------------------------------------------------------------
// Datos de ejemplo
// ---------------------------------------------------------------------------

const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

// Producto con dos líneas cuyos Parametros existen.
const PRODUCTO_CON_LINEAS = {
  id: "prod-1",
  nombre: "Servicio completo",
  lineas: [
    { parametroId: "p1", cantidad: 3, subtotal: 30 },
    { parametroId: "p2", cantidad: 4, subtotal: 20 },
  ],
  precioTotal: 50,
};

// Producto con una línea cuyo Parametro ya no existe (ausente).
const PRODUCTO_PARAMETRO_AUSENTE = {
  id: "prod-2",
  nombre: "Servicio heredado",
  lineas: [
    { parametroId: "p1", cantidad: 2, subtotal: 20 },
    { parametroId: "borrado", cantidad: 7, subtotal: 99.5 },
  ],
  precioTotal: 119.5,
};

// Producto sin ninguna línea.
const PRODUCTO_SIN_LINEAS = {
  id: "prod-3",
  nombre: "Producto vacío",
  lineas: [],
  precioTotal: 0,
};

beforeEach(() => {
  montarDOM();
  // Por defecto, aseguramos que la API de Bootstrap NO esté presente para que
  // el helper de modales use el fallback manual (verificable vía d-none/show).
  delete window.bootstrap;
});

afterEach(() => {
  delete window.bootstrap;
});

// ---------------------------------------------------------------------------
// Req 2.1–2.3: Producto con líneas muestra nombre, líneas en orden y total
// ---------------------------------------------------------------------------
describe("Ventana_Detalle — Producto con líneas (Req 2.1–2.3)", () => {
  it("muestra el nombre del Producto en el título (Req 2.1)", () => {
    crearControlador([PRODUCTO_CON_LINEAS], PARAMETROS);
    abrirDetallePorId("prod-1");

    expect(tituloDetalle().textContent).toBe("Servicio completo");
  });

  it("muestra las líneas en orden con nombre, cantidad, unidad y subtotal en PEN (Req 2.2)", () => {
    crearControlador([PRODUCTO_CON_LINEAS], PARAMETROS);
    abrirDetallePorId("prod-1");

    const detalle = LP.productosOps.resolverDetalle(
      PRODUCTO_CON_LINEAS,
      PARAMETROS
    );

    const items = lineasDetalle().querySelectorAll("li.lp-detalle-linea");
    expect(items).toHaveLength(PRODUCTO_CON_LINEAS.lineas.length);

    // Verificar orden y contenido línea por línea contra resolverDetalle.
    items.forEach((li, i) => {
      const resuelta = detalle.lineas[i];
      const info = li.querySelector(".lp-detalle-linea-info").textContent;
      // El nombre del Parametro aparece.
      expect(info).toContain(resuelta.nombreParametro);
      // La Cantidad aparece.
      expect(info).toContain(String(resuelta.cantidad));
      // La Unidad del Parametro aparece.
      expect(info).toContain(resuelta.unidad);
      // El subtotal se muestra en PEN (formatearPEN) en el badge.
      const subtotal = li.querySelector(".lp-detalle-linea-subtotal").textContent;
      expect(subtotal).toBe(LP.currency.formatearPEN(resuelta.subtotal));
    });
  });

  it("respeta el orden de creación de las líneas (Req 2.2)", () => {
    crearControlador([PRODUCTO_CON_LINEAS], PARAMETROS);
    abrirDetallePorId("prod-1");

    const infos = Array.from(
      lineasDetalle().querySelectorAll(".lp-detalle-linea-info")
    ).map((el) => el.textContent);

    // Línea 1 -> Mano de obra; Línea 2 -> Material (orden de PRODUCTO_CON_LINEAS).
    expect(infos[0]).toContain("Mano de obra");
    expect(infos[0]).toContain("HORA");
    expect(infos[1]).toContain("Material");
    expect(infos[1]).toContain("UND");
  });

  it("muestra el Precio_Total en PEN con 2 decimales (Req 2.3)", () => {
    crearControlador([PRODUCTO_CON_LINEAS], PARAMETROS);
    abrirDetallePorId("prod-1");

    expect(totalDetalle().textContent).toBe(LP.currency.formatearPEN(50));
    expect(totalDetalle().textContent).toMatch(/^S\/ \d+\.\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// Req 2.4: Parametro ausente muestra NOMBRE_PARAMETRO_AUSENTE y Unidad vacía
// ---------------------------------------------------------------------------
describe("Ventana_Detalle — Parametro ausente (Req 2.4)", () => {
  it("muestra el texto NOMBRE_PARAMETRO_AUSENTE para la línea con Parametro inexistente", () => {
    crearControlador([PRODUCTO_PARAMETRO_AUSENTE], PARAMETROS);
    abrirDetallePorId("prod-2");

    const infos = Array.from(
      lineasDetalle().querySelectorAll(".lp-detalle-linea-info")
    ).map((el) => el.textContent);

    // La segunda línea referencia "borrado" (inexistente) -> ausente.
    expect(infos[1]).toContain(LP.productosOps.NOMBRE_PARAMETRO_AUSENTE);
  });

  it("deja la Unidad vacía para la línea ausente y conserva el subtotal almacenado", () => {
    crearControlador([PRODUCTO_PARAMETRO_AUSENTE], PARAMETROS);
    abrirDetallePorId("prod-2");

    const items = lineasDetalle().querySelectorAll("li.lp-detalle-linea");
    const ausente = items[1];

    // Marca de clase de línea ausente.
    expect(ausente.classList.contains("lp-detalle-linea-ausente")).toBe(true);

    // La Unidad está vacía: el texto es "NOMBRE_PARAMETRO_AUSENTE · 7" sin unidad.
    const info = ausente.querySelector(".lp-detalle-linea-info").textContent;
    expect(info).toBe(`${LP.productosOps.NOMBRE_PARAMETRO_AUSENTE} · 7`);

    // El subtotal almacenado (99.5) se muestra tal cual en PEN.
    const subtotal = ausente.querySelector(".lp-detalle-linea-subtotal").textContent;
    expect(subtotal).toBe(LP.currency.formatearPEN(99.5));
  });
});

// ---------------------------------------------------------------------------
// Req 2.5: solo lectura, sin controles de edición
// ---------------------------------------------------------------------------
describe("Ventana_Detalle — solo lectura (Req 2.5)", () => {
  it("no contiene controles de edición de líneas (inputs, selects ni botones de acción)", () => {
    crearControlador([PRODUCTO_CON_LINEAS], PARAMETROS);
    abrirDetallePorId("prod-1");

    const cuerpo = lineasDetalle();
    // Ningún control de entrada de datos dentro del cuerpo del detalle.
    expect(cuerpo.querySelectorAll("input")).toHaveLength(0);
    expect(cuerpo.querySelectorAll("select")).toHaveLength(0);
    expect(cuerpo.querySelectorAll("textarea")).toHaveLength(0);
    // Ningún botón de edición de líneas (agregar/eliminar/guardar) en el cuerpo.
    expect(cuerpo.querySelectorAll("button")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Req 2.6: abrir/cerrar no persiste ni muta el estado
// ---------------------------------------------------------------------------
describe("Ventana_Detalle — abrir/cerrar no persiste ni muta (Req 2.6)", () => {
  it("abrir el detalle no llama a setProductos ni cambia la lista", () => {
    const { estado } = crearControlador([PRODUCTO_CON_LINEAS], PARAMETROS);
    const antes = JSON.parse(JSON.stringify(estado.productos));

    abrirDetallePorId("prod-1");

    expect(estado.escrituras).toBe(0);
    expect(estado.productos).toEqual(antes);
    // El Producto original no se muta (líneas y total intactos).
    expect(estado.productos[0]).toBe(PRODUCTO_CON_LINEAS);
    expect(PRODUCTO_CON_LINEAS.precioTotal).toBe(50);
    expect(PRODUCTO_CON_LINEAS.lineas).toHaveLength(2);
  });

  it("cerrar el detalle (fallback manual) oculta el modal sin mutar el estado", () => {
    const { estado } = crearControlador([PRODUCTO_CON_LINEAS], PARAMETROS);
    const antes = JSON.parse(JSON.stringify(estado.productos));

    abrirDetallePorId("prod-1");
    expect(modalDetalle().classList.contains("show")).toBe(true);

    // Cerrar mediante el botón data-bs-dismiss (fallback manual, sin Bootstrap).
    const cerrar = modalDetalle().querySelector("[data-bs-dismiss='modal']");
    cerrar.dispatchEvent(new window.Event("click"));

    expect(modalDetalle().classList.contains("show")).toBe(false);
    expect(modalDetalle().classList.contains("d-none")).toBe(true);
    expect(estado.escrituras).toBe(0);
    expect(estado.productos).toEqual(antes);
  });
});

// ---------------------------------------------------------------------------
// Req 2.7: Producto sin líneas muestra el mensaje y el Precio_Total
// ---------------------------------------------------------------------------
describe("Ventana_Detalle — Producto sin líneas (Req 2.7)", () => {
  it("muestra el nombre, el mensaje de 'sin líneas' y el Precio_Total", () => {
    crearControlador([PRODUCTO_SIN_LINEAS], PARAMETROS);
    abrirDetallePorId("prod-3");

    // Nombre en el título.
    expect(tituloDetalle().textContent).toBe("Producto vacío");

    // Mensaje exacto de "sin líneas".
    const vacio = lineasDetalle().querySelector(".lp-detalle-vacio");
    expect(vacio).not.toBeNull();
    expect(vacio.textContent).toBe("Este producto no tiene líneas de cálculo.");

    // No se renderiza ninguna línea.
    expect(lineasDetalle().querySelectorAll("li.lp-detalle-linea")).toHaveLength(
      0
    );

    // Precio_Total en PEN.
    expect(totalDetalle().textContent).toBe(LP.currency.formatearPEN(0));
  });
});

// ---------------------------------------------------------------------------
// Fallback: ausencia de la API de Bootstrap usa el mecanismo manual sin lanzar
// ---------------------------------------------------------------------------
describe("Ventana_Detalle — fallback sin la API de Bootstrap", () => {
  it("no lanza y hace visible el modal alternando d-none/show", () => {
    // window.bootstrap ya está eliminado por beforeEach.
    crearControlador([PRODUCTO_CON_LINEAS], PARAMETROS);

    expect(() => abrirDetallePorId("prod-1")).not.toThrow();

    const el = modalDetalle();
    // El fallback manual muestra el modal.
    expect(el.classList.contains("d-none")).toBe(false);
    expect(el.classList.contains("show")).toBe(true);
    expect(el.style.display).toBe("block");
    expect(el.getAttribute("aria-hidden")).toBe("false");

    // Se añadió un backdrop propio.
    expect(document.getElementById("lp-modal-backdrop-manual")).not.toBeNull();
  });
});
