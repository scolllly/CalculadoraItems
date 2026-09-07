// tests/ventana.edicion.test.js — Pruebas (jsdom) de la Ventana_Edicion
// implementada en `src/productos.controller.js`
// (window.LP.productosController.crearProductosController -> abrirEdicion /
// guardarEdicion).
//
// Cubre la Tarea 9.3 del spec `product-detail-edit-delete`:
//   - Abrir precarga las líneas del Producto y muestra el nombre en solo lectura
//     (Req 3.1, 3.2).
//   - Los rechazos de guardado producen los MENSAJES exactos SIN_LINEAS /
//     CANTIDAD_INVALIDA / SIN_PARAMETRO, sin persistir y conservando los datos en
//     edición (Req 3.6–3.8).
//   - Guardar válido reemplaza el Producto por id, conserva id y nombre, persiste
//     (repository.saveProductos) y cierra el modal (Req 3.5).
//   - Un fallo de escritura (status "failed") conserva el cambio en memoria y
//     muestra MENSAJE_NO_PERSISTENTE (Req 5.3).
//   - Cancelar/cerrar la Ventana_Edicion no muta la lista de Productos (Req 3.9).
//
// El controlador produce efectos DOM: se ejercita bajo el entorno jsdom de
// Vitest. Los Scripts_Clasicos se cargan con el helper `cargarLP`, que evalúa los
// IIFE de src/ contra el `window` de jsdom y puebla `window.LP`. Se recarga en
// cada prueba para aislar el estado del editor y del controlador activo.

import { describe, it, expect, beforeEach } from "vitest";
import { cargarLP } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

// Parametros vigentes usados por la Ventana_Edicion en las pruebas.
const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

// Productos iniciales. `prod-1` tiene dos líneas; `prod-2` una línea.
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
  ];
}

/**
 * Monta en el `document` de jsdom el marcado mínimo que el controlador cablea:
 * la Lista_De_Productos, los controles de la Calculadora que `init()` consulta,
 * el contenedor de notificaciones y el marcado del modal de edición (copiado de
 * index.html, #modal-edicion).
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
  // para aislar el editor de edición y el controlador activo de módulo.
  montarDOM();
  LP = cargarLP();
});

// ---------------------------------------------------------------------------
// Req 3.1, 3.2: abrir precarga líneas y muestra el nombre en solo lectura
// ---------------------------------------------------------------------------
describe("Ventana_Edicion — apertura (Req 3.1, 3.2)", () => {
  it("muestra el nombre del Producto en el input de solo lectura (Req 3.1)", () => {
    crearControlador();
    abrirEdicionDe("prod-1");

    const inputNombre = document.getElementById("modal-edicion-nombre");
    expect(inputNombre.value).toBe("Servicio básico");
    // El input es de solo lectura (marcado en el DOM).
    expect(inputNombre.readOnly).toBe(true);
  });

  it("precarga una línea por cada Linea_De_Calculo con Parametro y Cantidad (Req 3.2)", () => {
    crearControlador();
    abrirEdicionDe("prod-1");

    const filas = filasEdicion();
    expect(filas).toHaveLength(2);

    // Línea 1: p1 x 2.
    expect(filas[0].querySelector(".lp-linea-parametro").value).toBe("p1");
    expect(filas[0].querySelector(".lp-linea-cantidad").value).toBe("2");
    // Línea 2: p2 x 4.
    expect(filas[1].querySelector(".lp-linea-parametro").value).toBe("p2");
    expect(filas[1].querySelector(".lp-linea-cantidad").value).toBe("4");
  });

  it("precarga refleja exactamente las líneas del Producto abierto (prod-2)", () => {
    crearControlador();
    abrirEdicionDe("prod-2");

    const filas = filasEdicion();
    expect(filas).toHaveLength(1);
    expect(filas[0].querySelector(".lp-linea-parametro").value).toBe("p1");
    expect(filas[0].querySelector(".lp-linea-cantidad").value).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// Req 3.6–3.8: rechazos con los mensajes exactos, sin persistir, conservando datos
// ---------------------------------------------------------------------------
describe("Ventana_Edicion — rechazos de guardado (Req 3.6–3.8)", () => {
  it("sin líneas rechaza con SIN_LINEAS, no persiste y conserva el estado (Req 3.6)", () => {
    const { estado } = crearControlador();
    const guardados = espiarSave();
    const errores = capturarErrores();
    const antes = JSON.parse(JSON.stringify(estado.productos));

    abrirEdicionDe("prod-1");
    // Eliminar todas las líneas precargadas. Cada eliminación re-renderiza y
    // reindexa las filas, por lo que se elimina siempre la primera hasta vaciar.
    while (filasEdicion().length > 0) {
      filasEdicion()[0]
        .querySelector(".lp-linea-eliminar")
        .dispatchEvent(new window.Event("click"));
    }
    expect(filasEdicion()).toHaveLength(0);

    clicGuardarEdicion();

    expect(errores).toContain(LP.productosController.MENSAJES.SIN_LINEAS);
    expect(guardados).toHaveLength(0);
    expect(estado.productos).toEqual(antes);
  });

  it("cantidad inválida rechaza con CANTIDAD_INVALIDA, no persiste y conserva datos (Req 3.7)", () => {
    const { estado } = crearControlador();
    const guardados = espiarSave();
    const errores = capturarErrores();
    const antes = JSON.parse(JSON.stringify(estado.productos));

    abrirEdicionDe("prod-1");
    // Cantidad fuera de rango (0) en la primera línea.
    setCantidadFila(0, 0);

    clicGuardarEdicion();

    expect(errores).toContain(LP.productosController.MENSAJES.CANTIDAD_INVALIDA);
    expect(guardados).toHaveLength(0);
    expect(estado.productos).toEqual(antes);
    // Los datos en edición se conservan (la fila con la cantidad inválida sigue).
    expect(filasEdicion()[0].querySelector(".lp-linea-cantidad").value).toBe("0");
  });

  it("línea sin Parametro rechaza con SIN_PARAMETRO, no persiste y conserva datos (Req 3.8)", () => {
    const { estado } = crearControlador();
    const guardados = espiarSave();
    const errores = capturarErrores();
    const antes = JSON.parse(JSON.stringify(estado.productos));

    abrirEdicionDe("prod-1");
    // Quitar el Parametro de la primera línea (queda sin seleccionar).
    setParametroFila(0, "");

    clicGuardarEdicion();

    expect(errores).toContain(LP.productosController.MENSAJES.SIN_PARAMETRO);
    expect(guardados).toHaveLength(0);
    expect(estado.productos).toEqual(antes);
    // La línea sin parámetro se conserva en edición.
    expect(filasEdicion()[0].querySelector(".lp-linea-parametro").value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Req 3.5: guardar válido reemplaza por id, conserva id/nombre, persiste y cierra
// ---------------------------------------------------------------------------
describe("Ventana_Edicion — guardado válido (Req 3.5)", () => {
  it("reemplaza el Producto por id conservando id y nombre, recalcula y persiste", () => {
    const { estado } = crearControlador();
    const guardados = espiarSave();

    abrirEdicionDe("prod-1");
    // Editar: dejar solo la primera línea (p1) con cantidad 5 => subtotal 50.
    // Eliminar la segunda línea primero.
    filasEdicion()[1]
      .querySelector(".lp-linea-eliminar")
      .dispatchEvent(new window.Event("click"));
    expect(filasEdicion()).toHaveLength(1);
    setParametroFila(0, "p1"); // precioUnitario 10
    setCantidadFila(0, 5); // 10 * 5 = 50

    clicGuardarEdicion();

    // Persistió la lista completa (2 Productos), no solo el editado.
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toHaveLength(2);

    // El estado en memoria refleja la edición.
    const editado = estado.productos.find((p) => p.id === "prod-1");
    expect(editado).toBeDefined();
    // id y nombre originales conservados (Req 3.5).
    expect(editado.id).toBe("prod-1");
    expect(editado.nombre).toBe("Servicio básico");
    // Nuevas líneas + subtotal/total recalculados.
    expect(editado.lineas).toHaveLength(1);
    expect(editado.lineas[0].parametroId).toBe("p1");
    expect(editado.lineas[0].cantidad).toBe(5);
    expect(editado.lineas[0].subtotal).toBe(50);
    expect(editado.precioTotal).toBe(50);

    // El otro Producto se conserva sin cambios y en el mismo orden.
    expect(estado.productos.map((p) => p.id)).toEqual(["prod-1", "prod-2"]);
    const otro = estado.productos.find((p) => p.id === "prod-2");
    expect(otro.precioTotal).toBe(10);
  });

  it("cierra el modal tras un guardado válido", () => {
    crearControlador();
    espiarSave();

    abrirEdicionDe("prod-2");
    setParametroFila(0, "p2"); // 5
    setCantidadFila(0, 3); // 15

    clicGuardarEdicion();

    // Con el fallback manual (sin Bootstrap), cerrar añade d-none / display none.
    const modal = document.getElementById("modal-edicion");
    expect(modal.classList.contains("d-none")).toBe(true);
    expect(modal.style.display).toBe("none");
  });

  it("re-renderiza la Lista_De_Productos con el Precio_Total actualizado", () => {
    crearControlador();
    espiarSave();

    abrirEdicionDe("prod-2");
    setParametroFila(0, "p2"); // 5
    setCantidadFila(0, 3); // 15

    clicGuardarEdicion();

    const precio = itemPorId("prod-2").querySelector(".lp-producto-precio");
    expect(precio.textContent).toBe(LP.currency.formatearPEN(15));
  });
});

// ---------------------------------------------------------------------------
// Req 5.3: fallo de escritura conserva en memoria y muestra MENSAJE_NO_PERSISTENTE
// ---------------------------------------------------------------------------
describe("Ventana_Edicion — fallo de persistencia (Req 5.3)", () => {
  it("aplica el cambio en memoria y muestra MENSAJE_NO_PERSISTENTE cuando saveProductos falla", () => {
    const { estado } = crearControlador();
    espiarSave({ status: "failed", reason: "quota" });
    const errores = capturarErrores();

    abrirEdicionDe("prod-2");
    setParametroFila(0, "p1"); // 10
    setCantidadFila(0, 2); // 20

    clicGuardarEdicion();

    // El cambio se aplica en memoria pese al fallo de escritura.
    const editado = estado.productos.find((p) => p.id === "prod-2");
    expect(editado.lineas[0].cantidad).toBe(2);
    expect(editado.precioTotal).toBe(20);

    // Se mostró el mensaje exacto de no persistencia.
    expect(errores).toContain(
      "Los cambios se aplicaron en esta sesión, pero no se pudieron guardar de forma persistente."
    );
  });
});

// ---------------------------------------------------------------------------
// Req 3.9: cancelar/cerrar descarta la edición sin mutar la lista de Productos
// ---------------------------------------------------------------------------
describe("Ventana_Edicion — cancelar/cerrar (Req 3.9)", () => {
  it("cancelar tras editar líneas no muta la lista de Productos ni persiste", () => {
    const { estado } = crearControlador();
    const guardados = espiarSave();
    const antes = JSON.parse(JSON.stringify(estado.productos));

    abrirEdicionDe("prod-1");
    // Modificar el editor (sin guardar): cambiar cantidad y agregar una línea.
    setCantidadFila(0, 99);
    document
      .getElementById("btn-agregar-linea-edicion")
      .dispatchEvent(new window.Event("click"));

    // Cancelar (control con data-bs-dismiss cableado al fallback manual).
    document
      .getElementById("btn-cancelar-edicion")
      .dispatchEvent(new window.Event("click"));

    // No persiste y la lista de Productos permanece intacta (Req 3.9).
    expect(guardados).toHaveLength(0);
    expect(estado.productos).toEqual(antes);
  });

  it("cerrar y reabrir descarta las modificaciones no guardadas del editor", () => {
    const { estado } = crearControlador();
    espiarSave();
    const antes = JSON.parse(JSON.stringify(estado.productos));

    abrirEdicionDe("prod-1");
    setCantidadFila(0, 99); // modificar sin guardar
    // Cerrar mediante el botón de la cabecera (data-bs-dismiss).
    document
      .querySelector("#modal-edicion .btn-close")
      .dispatchEvent(new window.Event("click"));

    // Reabrir: las líneas vuelven a reflejar el Producto original (deep-copy).
    abrirEdicionDe("prod-1");
    expect(filasEdicion()[0].querySelector(".lp-linea-cantidad").value).toBe("2");

    // El estado nunca cambió.
    expect(estado.productos).toEqual(antes);
  });
});
