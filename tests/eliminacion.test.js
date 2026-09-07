// tests/eliminacion.test.js — Pruebas (jsdom) de la eliminación con confirmación
// implementada en `src/productos.controller.js`
// (window.LP.productosController.crearProductosController -> confirmarYEliminar).
//
// Cubre la Tarea 10.2 del spec `product-detail-edit-delete`:
//   - Se solicita confirmación explícita (notifier.confirmar) antes de quitar el
//     Producto (Req 4.1).
//   - Confirmar quita la fila de la Lista_De_Productos y persiste la lista
//     resultante vía repository.saveProductos + setProductos (Req 4.2, 4.4).
//   - Cancelar la confirmación no cambia nada: no persiste ni muta la lista
//     (Req 4.3).
//   - Un fallo de escritura (status "failed") conserva el cambio en memoria y
//     muestra MENSAJE_NO_PERSISTENTE (Req 4.5, 5.3).
//
// El controlador produce efectos DOM: se ejercita bajo el entorno jsdom de
// Vitest. Los Scripts_Clasicos se cargan con el helper `cargarLP`, que evalúa los
// IIFE de src/ contra el `window` de jsdom y puebla `window.LP`. Se recarga en
// cada prueba para aislar el estado del controlador activo. La confirmación
// (notifier.confirmar) se sustituye por un stub para simular aceptar/cancelar sin
// depender de window.confirm.

import { describe, it, expect, beforeEach } from "vitest";
import { cargarLP } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

// Parametros vigentes (no intervienen en la eliminación, pero el controlador los
// consulta al renderizar; se proveen por coherencia con el resto de suites).
const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

// Productos iniciales: dos Productos con ids estables.
function productosIniciales() {
  return [
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
}

/**
 * Monta en el `document` de jsdom el marcado mínimo que el controlador cablea en
 * `init()`: el contenedor de la Lista_De_Productos (#lista-productos), el
 * contenedor de notificaciones y los controles de la Calculadora que `init()`
 * consulta (para que el editor y los listeners se instancien sin lanzar).
 */
function montarDOM() {
  document.body.innerHTML = `
    <div id="notificaciones" aria-live="polite" aria-atomic="true"></div>
    <section id="pagina-productos">
      <input type="text" id="producto-nombre" maxlength="100" />
      <div id="lineas-container"></div>
      <button type="button" id="btn-agregar-linea">Agregar línea</button>
      <button type="button" id="btn-calcular">Calcular</button>
      <button type="button" id="btn-guardar-producto">Guardar</button>
      <div id="resultado-calculo" aria-live="polite"></div>
      <div id="lista-productos"></div>
    </section>
  `;
}

/**
 * Crea e inicializa un controlador de Productos cableado a un estado en memoria.
 *
 * @param {Array} [productos] Lista inicial de Productos.
 * @param {Array} [parametros] Parametros vigentes.
 * @returns {{ controlador: any, estado: { productos: Array } }}
 */
function crearControlador(productos = productosIniciales(), parametros = PARAMETROS) {
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

/** Devuelve el <li> de la Lista_De_Productos con el id dado (o null). */
function itemPorId(id) {
  return contenedorLista().querySelector(`li.lp-producto[data-id="${id}"]`);
}

/** Clic en el botón Eliminar del Producto con ese id. */
function clicEliminar(id) {
  itemPorId(id)
    .querySelector(".lp-producto-eliminar")
    .dispatchEvent(new window.Event("click"));
}

/**
 * Sustituye notifier.confirmar por un stub que devuelve `respuesta` y registra
 * los mensajes con los que fue invocado.
 *
 * @param {boolean} respuesta Valor devuelto por confirmar (aceptar/cancelar).
 * @returns {string[]} Lista de mensajes con los que se llamó a confirmar.
 */
function stubConfirmar(respuesta) {
  const llamadas = [];
  LP.notifier.confirmar = (mensaje) => {
    llamadas.push(mensaje);
    return respuesta;
  };
  return llamadas;
}

/** Instala un espía sobre repository.saveProductos que registra las llamadas. */
function espiarSave(resultado = { status: "ok" }) {
  const llamadas = [];
  LP.repository.saveProductos = (productos) => {
    llamadas.push(productos);
    return resultado;
  };
  return llamadas;
}

/** Captura los mensajes de error mostrados por notifier.error. */
function capturarErrores() {
  const errores = [];
  LP.notifier.error = (mensaje) => {
    errores.push(mensaje);
  };
  return errores;
}

beforeEach(() => {
  // Recargar los Scripts_Clasicos sobre un window/document limpio en cada prueba
  // para aislar el controlador activo de módulo entre casos.
  montarDOM();
  LP = cargarLP();
});

// ---------------------------------------------------------------------------
// Req 4.1: se solicita confirmación antes de quitar el Producto
// ---------------------------------------------------------------------------
describe("Eliminación — confirmación previa (Req 4.1)", () => {
  it("solicita notifier.confirmar antes de eliminar", () => {
    crearControlador();
    const confirmaciones = stubConfirmar(false);
    espiarSave();

    clicEliminar("prod-1");

    // Se pidió confirmación exactamente una vez, con el mensaje de confirmación.
    expect(confirmaciones).toHaveLength(1);
    expect(confirmaciones[0]).toContain("eliminar este producto");
  });

  it("no persiste antes de recibir la confirmación (pide primero, actúa después)", () => {
    crearControlador();
    const guardados = espiarSave();
    // confirmar registra el orden: al invocarse, aún no debe haberse persistido.
    LP.notifier.confirmar = () => {
      expect(guardados).toHaveLength(0);
      return true;
    };

    clicEliminar("prod-1");

    // Tras confirmar (true), sí persiste.
    expect(guardados).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Req 4.2, 4.4: confirmar quita la fila y persiste
// ---------------------------------------------------------------------------
describe("Eliminación — confirmar quita y persiste (Req 4.2, 4.4)", () => {
  it("confirmar quita el Producto de la lista en memoria y conserva el resto en orden (Req 4.2)", () => {
    const { estado } = crearControlador();
    stubConfirmar(true);
    espiarSave();

    clicEliminar("prod-1");

    // El Producto eliminado ya no está; el resto se conserva en orden.
    expect(estado.productos.map((p) => p.id)).toEqual(["prod-2"]);
    const restante = estado.productos.find((p) => p.id === "prod-2");
    expect(restante.nombre).toBe("Servicio completo");
    expect(restante.precioTotal).toBe(50);
  });

  it("confirmar actualiza la vista para dejar de mostrar el Producto (Req 4.4)", () => {
    crearControlador();
    stubConfirmar(true);
    espiarSave();

    clicEliminar("prod-1");

    // La fila del Producto eliminado desaparece; la del otro permanece.
    expect(itemPorId("prod-1")).toBeNull();
    expect(itemPorId("prod-2")).not.toBeNull();
    expect(contenedorLista().querySelectorAll("li.lp-producto")).toHaveLength(1);
  });

  it("confirmar persiste la lista resultante vía repository.saveProductos (Req 4.2)", () => {
    crearControlador();
    stubConfirmar(true);
    const guardados = espiarSave();

    clicEliminar("prod-2");

    // Se persistió una vez con la lista completa resultante (sin el eliminado).
    expect(guardados).toHaveLength(1);
    expect(guardados[0].map((p) => p.id)).toEqual(["prod-1"]);
  });

  it("eliminar el último Producto deja la lista vacía con su indicación", () => {
    const { estado } = crearControlador();
    stubConfirmar(true);
    espiarSave();

    clicEliminar("prod-1");
    clicEliminar("prod-2");

    expect(estado.productos).toHaveLength(0);
    expect(contenedorLista().querySelectorAll("li.lp-producto")).toHaveLength(0);
    expect(contenedorLista().querySelector(".lp-productos-vacios")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Req 4.3: cancelar no cambia nada
// ---------------------------------------------------------------------------
describe("Eliminación — cancelar no cambia nada (Req 4.3)", () => {
  it("cancelar la confirmación no persiste ni muta la lista de Productos", () => {
    const { estado } = crearControlador();
    const guardados = espiarSave();
    stubConfirmar(false);
    const antes = JSON.parse(JSON.stringify(estado.productos));

    clicEliminar("prod-1");

    // No se persistió y la lista permanece intacta (Req 4.3).
    expect(guardados).toHaveLength(0);
    expect(estado.productos).toEqual(antes);
  });

  it("cancelar conserva la fila del Producto en la vista", () => {
    crearControlador();
    espiarSave();
    stubConfirmar(false);

    clicEliminar("prod-1");

    // La fila del Producto sigue mostrándose; no cambia el número de Productos.
    expect(itemPorId("prod-1")).not.toBeNull();
    expect(contenedorLista().querySelectorAll("li.lp-producto")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Req 4.5, 5.3: fallo de escritura conserva en memoria y muestra MENSAJE_NO_PERSISTENTE
// ---------------------------------------------------------------------------
describe("Eliminación — fallo de persistencia (Req 4.5, 5.3)", () => {
  it("aplica la eliminación en memoria y muestra MENSAJE_NO_PERSISTENTE cuando saveProductos falla", () => {
    const { estado } = crearControlador();
    stubConfirmar(true);
    espiarSave({ status: "failed", reason: "quota" });
    const errores = capturarErrores();

    clicEliminar("prod-1");

    // El Producto se elimina de la sesión pese al fallo de escritura (Req 4.5).
    expect(estado.productos.map((p) => p.id)).toEqual(["prod-2"]);
    // La vista deja de mostrar el Producto eliminado.
    expect(itemPorId("prod-1")).toBeNull();

    // Se mostró el mensaje exacto de no persistencia (Req 5.3).
    expect(errores).toContain(
      "Los cambios se aplicaron en esta sesión, pero no se pudieron guardar de forma persistente."
    );
  });
});
