// tests/cantidad.linea.producto.integracion.test.js
//
// Spec: product-line-quantity-validation-fix — Tarea 4.2 (Pruebas de integración
// de los flujos). El arreglo ya está implementado en src/productos.ops.js
// (conversión de la cantidad cruda a número con la semántica de `aNumeroCantidad`
// antes de invocar `validation.validarCantidad`).
//
// Estas pruebas ejercitan los flujos end-to-end a través del CONTROLADOR REAL
// (window.LP.productosController.crearProductosController) bajo jsdom, tal como lo
// hacen las pruebas de la Ventana_Edicion y de persistencia:
//   - Flujo de Calculadora: agregar una Linea_De_Producto (fuente "Producto") con
//     un Producto_Componente válido y cantidad cruda "5", pulsar Calcular → se
//     renderizan los subtotales y el Precio_Total, SIN el mensaje de cantidad
//     inválida (Req 2.1).
//   - Flujo de Guardado: mismo escenario, pulsar Guardar → el Producto se persiste
//     (repository.saveProductos) SIN el mensaje de cantidad inválida (Req 2.2).
//   - Flujo de Ventana_Edicion: editar un Producto con una Linea_De_Producto de
//     cantidad "5" y guardar → se actualiza sin el mensaje (Req 2.2).
//   - Mezcla de líneas: Producto con una Linea_De_Parametro y una Linea_De_Producto
//     válidas → cálculo/guardado correctos; con una Linea_De_Producto inválida → se
//     muestra el mensaje esperado (Req 2.1, 2.2, 3.1).
//
// Los Scripts_Clasicos se cargan con `cargarLP`, que evalúa los IIFE de src/
// contra el `window` de jsdom y puebla `window.LP`. Se recarga en cada prueba para
// aislar el estado del editor y del controlador activo.

import { describe, it, expect, beforeEach } from "vitest";
import { cargarLP } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

// Mensaje EXACTO de cantidad inválida (el bug lo emitía indebidamente).
const MENSAJE_CANTIDAD_INVALIDA =
  "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99.";

// Parametros vigentes usados por la Calculadora / Ventana_Edicion.
const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

/**
 * Productos vigentes iniciales. `comp-1` es el Producto_Componente que las
 * Lineas_De_Producto de la Calculadora/Guardado referencian (precioTotal 10).
 */
function productosIniciales() {
  return [
    {
      id: "comp-1",
      nombre: "Componente base",
      lineas: [{ parametroId: "p1", cantidad: 1, subtotal: 10 }],
      precioTotal: 10,
    },
  ];
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

// ─────────────────────────── Helpers de la Calculadora ───────────────────────────

/** Fija el nombre del Producto en la Calculadora. */
function setNombre(nombre) {
  const input = document.getElementById("producto-nombre");
  input.value = nombre;
  input.dispatchEvent(new window.Event("input"));
}

/** Clic en "Agregar línea" de la Calculadora. */
function agregarLineaCalculadora() {
  document
    .getElementById("btn-agregar-linea")
    .dispatchEvent(new window.Event("click"));
}

/** Filas de línea renderizadas en la Calculadora. */
function filasCalculadora() {
  return document.getElementById("lineas-container").querySelectorAll(".lp-linea");
}

/** Filas de línea renderizadas dentro del modal de edición. */
function filasEdicion() {
  return document
    .getElementById("modal-edicion-lineas")
    .querySelectorAll(".lp-linea");
}

/**
 * Cambia la Fuente_De_Componente de una fila (por índice) a "Producto" o
 * "Parámetro", disparando 'change' (esto re-renderiza la fila).
 * @param {NodeList} filas Colección de filas (Calculadora o Edición).
 * @param {number} indice
 * @param {string} fuente Valor de la fuente ("Producto" / "Parámetro").
 */
function setFuenteEn(contenedorId, indice, fuente) {
  const fila = document.getElementById(contenedorId).querySelectorAll(".lp-linea")[indice];
  const select = fila.querySelector(".lp-linea-fuente");
  select.value = fuente;
  select.dispatchEvent(new window.Event("change"));
}

/** Fija el Producto_Componente de una fila (por índice) disparando 'change'. */
function setProductoComponenteEn(contenedorId, indice, productoId) {
  const fila = document.getElementById(contenedorId).querySelectorAll(".lp-linea")[indice];
  const select = fila.querySelector(".lp-linea-producto");
  select.value = productoId;
  select.dispatchEvent(new window.Event("change"));
}

/** Fija el Parametro de una fila (por índice) disparando 'change'. */
function setParametroEn(contenedorId, indice, parametroId) {
  const fila = document.getElementById(contenedorId).querySelectorAll(".lp-linea")[indice];
  const select = fila.querySelector(".lp-linea-parametro");
  select.value = parametroId;
  select.dispatchEvent(new window.Event("change"));
}

/** Fija la Cantidad cruda de una fila (por índice) disparando 'input'. */
function setCantidadEn(contenedorId, indice, cantidad) {
  const fila = document.getElementById(contenedorId).querySelectorAll(".lp-linea")[indice];
  const input = fila.querySelector(".lp-linea-cantidad");
  input.value = String(cantidad);
  input.dispatchEvent(new window.Event("input"));
}

/** Clic en Calcular. */
function clicCalcular() {
  document.getElementById("btn-calcular").dispatchEvent(new window.Event("click"));
}

/** Clic en Guardar (Calculadora). */
function clicGuardar() {
  document
    .getElementById("btn-guardar-producto")
    .dispatchEvent(new window.Event("click"));
}

/** Clic en Guardar del modal de edición. */
function clicGuardarEdicion() {
  document
    .getElementById("btn-guardar-edicion")
    .dispatchEvent(new window.Event("click"));
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

/** Instala un espía sobre repository.saveProductos que registra las llamadas. */
function espiarSave(resultado = { status: "ok" }) {
  const llamadas = [];
  LP.repository.saveProductos = (productos) => {
    llamadas.push(productos);
    return resultado;
  };
  return llamadas;
}

/** Captura los mensajes mostrados por notifier.error. */
function capturarErrores() {
  const errores = [];
  LP.notifier.error = (mensaje) => {
    errores.push(mensaje);
  };
  return errores;
}

/** Captura los mensajes mostrados por notifier.info. */
function capturarInfos() {
  const infos = [];
  LP.notifier.info = (mensaje) => {
    infos.push(mensaje);
  };
  return infos;
}

beforeEach(() => {
  montarDOM();
  LP = cargarLP();
});

// ---------------------------------------------------------------------------
// Flujo de Calculadora (Req 2.1)
// ---------------------------------------------------------------------------
describe("Integración — flujo de Calculadora con Linea_De_Producto (Req 2.1)", () => {
  it("calcular con una Linea_De_Producto (componente válido, cantidad '5') muestra subtotales y Precio_Total sin el mensaje de cantidad inválida", () => {
    crearControlador();
    const errores = capturarErrores();

    setNombre("Producto compuesto");
    agregarLineaCalculadora();
    // Cambiar la fuente de la línea a "Producto" (re-renderiza con el selector de producto).
    setFuenteEn("lineas-container", 0, "Producto");
    setProductoComponenteEn("lineas-container", 0, "comp-1"); // precioTotal 10
    setCantidadEn("lineas-container", 0, "5"); // cadena cruda del input

    clicCalcular();

    // No se mostró el mensaje de cantidad inválida (el bug lo emitía).
    expect(errores).not.toContain(MENSAJE_CANTIDAD_INVALIDA);
    // Tampoco ningún otro error.
    expect(errores).toEqual([]);

    // Se renderizaron los subtotales y el Precio_Total (5 * 10 = 50).
    const resultado = document.getElementById("resultado-calculo");
    const subtotales = resultado.querySelectorAll(".lp-subtotal");
    expect(subtotales).toHaveLength(1);
    const total = resultado.querySelector(".lp-precio-total");
    expect(total).not.toBeNull();
    expect(total.textContent).toContain(LP.currency.formatearPEN(50));
  });
});

// ---------------------------------------------------------------------------
// Flujo de Guardado (Req 2.2)
// ---------------------------------------------------------------------------
describe("Integración — flujo de Guardado con Linea_De_Producto (Req 2.2)", () => {
  it("guardar con una Linea_De_Producto (componente válido, cantidad '5') persiste el Producto sin el mensaje de cantidad inválida", () => {
    const { estado } = crearControlador();
    const guardados = espiarSave();
    const errores = capturarErrores();
    const infos = capturarInfos();

    setNombre("Producto compuesto");
    agregarLineaCalculadora();
    setFuenteEn("lineas-container", 0, "Producto");
    setProductoComponenteEn("lineas-container", 0, "comp-1"); // precioTotal 10
    setCantidadEn("lineas-container", 0, "5");

    clicGuardar();

    // No se mostró el mensaje de cantidad inválida ni ningún otro error.
    expect(errores).not.toContain(MENSAJE_CANTIDAD_INVALIDA);
    expect(errores).toEqual([]);
    // Se notificó el guardado exitoso.
    expect(infos).toContain("Producto guardado.");

    // Se persistió la lista (componente base + el nuevo Producto compuesto).
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toHaveLength(2);

    const nuevo = estado.productos.find((p) => p.nombre === "Producto compuesto");
    expect(nuevo).toBeDefined();
    // La cantidad cruda "5" se persiste convertida a número (5) y el total es 50.
    expect(nuevo.lineas).toHaveLength(1);
    expect(nuevo.lineas[0].cantidad).toBe(5);
    expect(nuevo.lineas[0].productoComponenteId).toBe("comp-1");
    expect(nuevo.lineas[0].fuenteDeComponente).toBe("Producto");
    expect(nuevo.lineas[0].subtotal).toBe(50);
    expect(nuevo.precioTotal).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Flujo de Ventana_Edicion (Req 2.2)
// ---------------------------------------------------------------------------
describe("Integración — flujo de Ventana_Edicion con Linea_De_Producto (Req 2.2)", () => {
  it("editar un Producto con una Linea_De_Producto de cantidad '5' y guardar actualiza sin el mensaje de cantidad inválida", () => {
    // Estado inicial: un Producto_Componente (comp-1) y un Producto contenedor
    // (cont-1) cuyas líneas se editarán para usar una Linea_De_Producto.
    const productos = [
      {
        id: "comp-1",
        nombre: "Componente base",
        lineas: [{ parametroId: "p1", cantidad: 1, subtotal: 10 }],
        precioTotal: 10,
      },
      {
        id: "cont-1",
        nombre: "Contenedor",
        lineas: [{ parametroId: "p1", cantidad: 2, subtotal: 20 }],
        precioTotal: 20,
      },
    ];
    const { estado } = crearControlador(productos);
    const guardados = espiarSave();
    const errores = capturarErrores();
    const infos = capturarInfos();

    abrirEdicionDe("cont-1");
    // Convertir la única línea a Linea_De_Producto referenciando comp-1 con cantidad "5".
    setFuenteEn("modal-edicion-lineas", 0, "Producto");
    setProductoComponenteEn("modal-edicion-lineas", 0, "comp-1"); // precioTotal 10
    setCantidadEn("modal-edicion-lineas", 0, "5");

    clicGuardarEdicion();

    // No se mostró el mensaje de cantidad inválida ni ningún otro error.
    expect(errores).not.toContain(MENSAJE_CANTIDAD_INVALIDA);
    expect(errores).toEqual([]);
    expect(infos).toContain("Producto actualizado.");

    // El Producto se actualizó conservando id y nombre; total 5 * 10 = 50.
    expect(guardados).toHaveLength(1);
    const editado = estado.productos.find((p) => p.id === "cont-1");
    expect(editado.nombre).toBe("Contenedor");
    expect(editado.lineas).toHaveLength(1);
    expect(editado.lineas[0].cantidad).toBe(5);
    expect(editado.lineas[0].productoComponenteId).toBe("comp-1");
    expect(editado.lineas[0].subtotal).toBe(50);
    expect(editado.precioTotal).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Mezcla de líneas: parámetro + producto válidos / producto inválido (Req 2.1, 2.2, 3.1)
// ---------------------------------------------------------------------------
describe("Integración — mezcla de Linea_De_Parametro y Linea_De_Producto", () => {
  it("con una Linea_De_Parametro y una Linea_De_Producto válidas, calcular y guardar es correcto (Req 2.1, 2.2, 3.1)", () => {
    const { estado } = crearControlador();
    const guardados = espiarSave();
    const errores = capturarErrores();
    const infos = capturarInfos();

    setNombre("Mixto válido");

    // Línea 0: Parámetro p1 (10) x 3 => 30.
    agregarLineaCalculadora();
    setParametroEn("lineas-container", 0, "p1");
    setCantidadEn("lineas-container", 0, "3");

    // Línea 1: Producto comp-1 (10) x 5 => 50.
    agregarLineaCalculadora();
    setFuenteEn("lineas-container", 1, "Producto");
    setProductoComponenteEn("lineas-container", 1, "comp-1");
    setCantidadEn("lineas-container", 1, "5");

    // Calcular: sin errores, subtotales + total (30 + 50 = 80).
    clicCalcular();
    expect(errores).toEqual([]);
    const resultado = document.getElementById("resultado-calculo");
    expect(resultado.querySelectorAll(".lp-subtotal")).toHaveLength(2);
    expect(resultado.querySelector(".lp-precio-total").textContent).toContain(
      LP.currency.formatearPEN(80)
    );

    // Guardar: sin errores, persiste con total 80.
    clicGuardar();
    expect(errores).toEqual([]);
    expect(infos).toContain("Producto guardado.");
    const nuevo = estado.productos.find((p) => p.nombre === "Mixto válido");
    expect(nuevo).toBeDefined();
    expect(nuevo.lineas).toHaveLength(2);
    expect(nuevo.precioTotal).toBe(80);
  });

  it("con una Linea_De_Parametro válida y una Linea_De_Producto de cantidad inválida, calcular muestra el mensaje de cantidad inválida y no persiste (Req 2.2)", () => {
    const { estado } = crearControlador();
    const guardados = espiarSave();
    const errores = capturarErrores();
    const antes = JSON.parse(JSON.stringify(estado.productos));

    setNombre("Mixto inválido");

    // Línea 0: Parámetro p1 (10) x 3 => válida.
    agregarLineaCalculadora();
    setParametroEn("lineas-container", 0, "p1");
    setCantidadEn("lineas-container", 0, "3");

    // Línea 1: Producto comp-1 con cantidad inválida "0" (por debajo del mínimo).
    agregarLineaCalculadora();
    setFuenteEn("lineas-container", 1, "Producto");
    setProductoComponenteEn("lineas-container", 1, "comp-1");
    setCantidadEn("lineas-container", 1, "0");

    // Calcular: se muestra el mensaje EXACTO de cantidad inválida.
    clicCalcular();
    expect(errores).toContain(MENSAJE_CANTIDAD_INVALIDA);

    // Guardar tampoco persiste (mismo rechazo).
    clicGuardar();
    expect(guardados).toHaveLength(0);
    expect(estado.productos).toEqual(antes);
  });
});
