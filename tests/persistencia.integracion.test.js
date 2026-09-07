// tests/persistencia.integracion.test.js — Pruebas de integración de persistencia
// y round-trip de sesión para la funcionalidad `product-detail-edit-delete`.
//
// Cubre la Tarea 12.2 del spec:
//   - Guardar una edición en la Ventana_Edicion invoca `repository.saveProductos`
//     con la lista COMPLETA de Productos (Req 5.1).
//   - Confirmar la eliminación de un Producto invoca `repository.saveProductos`
//     con la lista COMPLETA de Productos (Req 5.2).
//   - Round-trip de sesión: tras guardar ediciones/eliminaciones, una nueva carga
//     con `repository.load()` restaura la lista con las ediciones aplicadas y las
//     eliminaciones quitadas (Req 5.4).
//
// A diferencia de las pruebas de la Ventana_Edicion (que espían/stubbean
// `repository.saveProductos`), estas pruebas ejercitan el repositorio REAL:
//   controlador -> repository.saveProductos -> storage.writeJSON -> localStorage
// y luego `repository.load() -> storage.readJSON -> localStorage`.
//
// El controlador produce efectos DOM: se ejercita bajo el entorno jsdom de
// Vitest. Los Scripts_Clasicos se cargan con el helper `cargarLP`, que evalúa los
// IIFE de src/ contra el `window` de jsdom y puebla `window.LP`. Se recarga en
// cada prueba para aislar el estado del controlador y del almacenamiento.

import { describe, it, expect, beforeEach } from "vitest";
import { cargarLP } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

// Parametros vigentes usados por la Ventana_Edicion y la resolución de subtotales.
const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

// Productos iniciales. `prod-1` tiene dos líneas; `prod-2` una; `prod-3` una.
function productosIniciales() {
  return [
    {
      id: "prod-1",
      nombre: "Servicio básico",
      lineas: [
        { parametroId: "p1", cantidad: 2, subtotal: 20 },
        { parametroId: "p2", cantidad: 4, subtotal: 20 },
      ],
      precioTotal: 40,
    },
    {
      id: "prod-2",
      nombre: "Servicio simple",
      lineas: [{ parametroId: "p1", cantidad: 1, subtotal: 10 }],
      precioTotal: 10,
    },
    {
      id: "prod-3",
      nombre: "Servicio extra",
      lineas: [{ parametroId: "p2", cantidad: 2, subtotal: 10 }],
      precioTotal: 10,
    },
  ];
}

/**
 * Asegura que exista un `window.localStorage` utilizable. jsdom lo provee por
 * defecto; si por alguna razón no está disponible en el entorno, se instala un
 * polyfill mínimo en memoria que cumple la API usada por `storage.js`.
 */
function asegurarLocalStorage() {
  let disponible = false;
  try {
    disponible =
      typeof window !== "undefined" &&
      window.localStorage != null &&
      typeof window.localStorage.getItem === "function" &&
      typeof window.localStorage.setItem === "function";
    if (disponible) {
      // Verificar que setItem/getItem funcionan (no bloqueados por política).
      window.localStorage.setItem("__lp_probe__", "1");
      window.localStorage.removeItem("__lp_probe__");
    }
  } catch {
    disponible = false;
  }

  if (!disponible) {
    const almacen = new Map();
    const polyfill = {
      getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
      setItem: (k, v) => {
        almacen.set(String(k), String(v));
      },
      removeItem: (k) => {
        almacen.delete(k);
      },
      clear: () => {
        almacen.clear();
      },
      key: (i) => Array.from(almacen.keys())[i] ?? null,
      get length() {
        return almacen.size;
      },
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: polyfill,
    });
    if (typeof globalThis !== "undefined") {
      globalThis.localStorage = polyfill;
    }
  }
}

/**
 * Monta el marcado mínimo que el controlador cablea en `init()`, incluyendo los
 * controles de la Calculadora, la Lista_De_Productos y el modal de edición
 * (#modal-edicion, copiado de index.html).
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

    <!-- #modal-edicion (copiado de index.html) -->
    <div class="modal fade" id="modal-edicion" tabindex="-1" aria-labelledby="modal-edicion-titulo" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title h5" id="modal-edicion-titulo">Editar producto</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="modal-edicion-nombre" class="form-label">Nombre del producto</label>
              <input type="text" id="modal-edicion-nombre" class="form-control" readonly>
            </div>
            <fieldset class="mb-3">
              <legend class="h6">Líneas de cálculo</legend>
              <div id="modal-edicion-lineas"></div>
              <button type="button" id="btn-agregar-linea-edicion" class="btn btn-secondary mt-2">Agregar línea</button>
            </fieldset>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-cancelar-edicion" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" id="btn-guardar-edicion" class="btn btn-success">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Crea e inicializa un controlador de Productos cableado a un estado en memoria.
 * El `setProductos` actualiza el estado en memoria; la persistencia real la hace
 * el propio controlador vía `repository.saveProductos`.
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

/** Devuelve el <li> de la Lista_De_Productos con el id dado. */
function itemPorId(id) {
  return document
    .getElementById("lista-productos")
    .querySelector(`li.lp-producto[data-id="${id}"]`);
}

/** Abre la Ventana_Edicion clicando el botón Editar del Producto con ese id. */
function abrirEdicionDe(id) {
  itemPorId(id)
    .querySelector(".lp-producto-editar")
    .dispatchEvent(new window.Event("click"));
}

/** Filas de línea renderizadas dentro del modal de edición. */
function filasEdicion() {
  return document
    .getElementById("modal-edicion-lineas")
    .querySelectorAll(".lp-linea");
}

/** Fija el Parametro de una fila de edición (por índice) disparando 'change'. */
function setParametroFila(indice, parametroId) {
  const select = filasEdicion()[indice].querySelector(".lp-linea-parametro");
  select.value = parametroId;
  select.dispatchEvent(new window.Event("change"));
}

/** Fija la Cantidad de una fila de edición (por índice) disparando 'input'. */
function setCantidadFila(indice, cantidad) {
  const input = filasEdicion()[indice].querySelector(".lp-linea-cantidad");
  input.value = String(cantidad);
  input.dispatchEvent(new window.Event("input"));
}

/** Clic en Guardar del modal de edición. */
function clicGuardarEdicion() {
  document
    .getElementById("btn-guardar-edicion")
    .dispatchEvent(new window.Event("click"));
}

/** Clic en Eliminar del Producto con ese id. */
function clicEliminar(id) {
  itemPorId(id)
    .querySelector(".lp-producto-eliminar")
    .dispatchEvent(new window.Event("click"));
}

/**
 * Envuelve el `repository.saveProductos` REAL con un espía que captura la lista
 * pasada en cada llamada, delegando después en la implementación real (que
 * escribe en localStorage). Devuelve el arreglo de listas capturadas.
 */
function espiarSaveReal() {
  const llamadas = [];
  const original = LP.repository.saveProductos;
  LP.repository.saveProductos = (productos) => {
    llamadas.push(productos);
    return original(productos);
  };
  return llamadas;
}

/** Stub de `notifier.confirmar` que devuelve el booleano indicado. */
function stubConfirmar(valor) {
  LP.notifier.confirmar = () => valor;
}

beforeEach(() => {
  montarDOM();
  LP = cargarLP();
  asegurarLocalStorage();
  // Limpiar el Almacenamiento_Local entre pruebas para aislar el round-trip.
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

// ---------------------------------------------------------------------------
// Req 5.1: guardar edición invoca repository.saveProductos con la lista completa
// ---------------------------------------------------------------------------
describe("Persistencia — guardar edición (Req 5.1)", () => {
  it("invoca repository.saveProductos con la lista COMPLETA de Productos", () => {
    crearControlador();
    const guardados = espiarSaveReal();

    abrirEdicionDe("prod-2");
    setParametroFila(0, "p1"); // precioUnitario 10
    setCantidadFila(0, 3); // 10 * 3 = 30
    clicGuardarEdicion();

    // Se llamó exactamente una vez con la lista completa (3 Productos), no solo
    // el editado.
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toHaveLength(3);
    expect(guardados[0].map((p) => p.id)).toEqual(["prod-1", "prod-2", "prod-3"]);

    // El Producto editado dentro de la lista persistida refleja el cambio.
    const editado = guardados[0].find((p) => p.id === "prod-2");
    expect(editado.precioTotal).toBe(30);
    expect(editado.lineas).toHaveLength(1);
    expect(editado.lineas[0]).toMatchObject({
      parametroId: "p1",
      cantidad: 3,
      subtotal: 30,
    });
  });
});

// ---------------------------------------------------------------------------
// Req 5.2: confirmar eliminación invoca repository.saveProductos con lista completa
// ---------------------------------------------------------------------------
describe("Persistencia — confirmar eliminación (Req 5.2)", () => {
  it("invoca repository.saveProductos con la lista COMPLETA sin el eliminado", () => {
    crearControlador();
    const guardados = espiarSaveReal();
    stubConfirmar(true);

    clicEliminar("prod-1");

    expect(guardados).toHaveLength(1);
    // La lista persistida ya no contiene el eliminado y conserva el resto en orden.
    expect(guardados[0].map((p) => p.id)).toEqual(["prod-2", "prod-3"]);
    expect(guardados[0].some((p) => p.id === "prod-1")).toBe(false);
  });

  it("no invoca repository.saveProductos si el usuario cancela la confirmación", () => {
    crearControlador();
    const guardados = espiarSaveReal();
    stubConfirmar(false);

    clicEliminar("prod-1");

    expect(guardados).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Req 5.4: round-trip de sesión — repository.load() restaura ediciones/eliminaciones
// ---------------------------------------------------------------------------
describe("Round-trip de sesión con repository.load() (Req 5.4)", () => {
  it("restaura una edición previamente guardada", () => {
    crearControlador();
    stubConfirmar(true);

    // Editar prod-2: p1 x 4 => subtotal/total 40.
    abrirEdicionDe("prod-2");
    setParametroFila(0, "p1");
    setCantidadFila(0, 4);
    clicGuardarEdicion();

    // Nueva sesión: leer del Almacenamiento_Local mediante el repositorio real.
    const cargada = LP.repository.load();
    expect(cargada.warnings).toEqual([]);

    const restaurado = cargada.productos.find((p) => p.id === "prod-2");
    expect(restaurado).toBeDefined();
    // id y nombre conservados; líneas/total reflejan la edición (Req 5.4).
    expect(restaurado.nombre).toBe("Servicio simple");
    expect(restaurado.precioTotal).toBe(40);
    expect(restaurado.lineas).toHaveLength(1);
    expect(restaurado.lineas[0]).toMatchObject({
      parametroId: "p1",
      cantidad: 4,
      subtotal: 40,
    });
  });

  it("restaura una lista sin el Producto eliminado", () => {
    crearControlador();
    stubConfirmar(true);

    clicEliminar("prod-3");

    const cargada = LP.repository.load();
    expect(cargada.warnings).toEqual([]);
    expect(cargada.productos.map((p) => p.id)).toEqual(["prod-1", "prod-2"]);
    expect(cargada.productos.some((p) => p.id === "prod-3")).toBe(false);
  });

  it("restaura el resultado combinado de una edición y una eliminación", () => {
    crearControlador();
    stubConfirmar(true);

    // 1) Editar prod-1: dejar una sola línea p2 x 6 => subtotal/total 30.
    abrirEdicionDe("prod-1");
    // Eliminar la segunda línea; reindexar tras cada eliminación.
    filasEdicion()[1]
      .querySelector(".lp-linea-eliminar")
      .dispatchEvent(new window.Event("click"));
    expect(filasEdicion()).toHaveLength(1);
    setParametroFila(0, "p2"); // precioUnitario 5
    setCantidadFila(0, 6); // 5 * 6 = 30
    clicGuardarEdicion();

    // 2) Eliminar prod-2.
    clicEliminar("prod-2");

    // Round-trip de sesión: la lista restaurada refleja ambos cambios.
    const cargada = LP.repository.load();
    expect(cargada.warnings).toEqual([]);
    expect(cargada.productos.map((p) => p.id)).toEqual(["prod-1", "prod-3"]);

    const editado = cargada.productos.find((p) => p.id === "prod-1");
    expect(editado.nombre).toBe("Servicio básico");
    expect(editado.lineas).toHaveLength(1);
    expect(editado.lineas[0]).toMatchObject({
      parametroId: "p2",
      cantidad: 6,
      subtotal: 30,
    });
    expect(editado.precioTotal).toBe(30);

    // El Producto no tocado se conserva íntegro.
    const intacto = cargada.productos.find((p) => p.id === "prod-3");
    expect(intacto.precioTotal).toBe(10);
    expect(intacto.lineas).toEqual([
      { parametroId: "p2", cantidad: 2, subtotal: 10 },
    ]);
  });
});
