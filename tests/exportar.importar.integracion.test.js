// tests/exportar.importar.integracion.test.js — Pruebas de integración de
// exportar/importar el Archivo_De_Respaldo tras editar/eliminar Productos.
//
// Cubre la Tarea 12.3 del spec `product-detail-edit-delete`:
//   - Tras editar/eliminar, el respaldo (serializarRespaldo) incluye los
//     Productos actualizados y excluye los eliminados; importar los muestra en la
//     Lista_De_Productos con las tres acciones (Ver detalle / Editar / Eliminar)
//     (Req 6.1, 6.2).
//   - El detalle/edición de un Producto importado se muestra tal cual se importó,
//     sin recalcular ni alterar líneas, subtotales ni Precio_Total (Req 6.3).
//   - Una importación inválida (JSON malformado o sin lista `productos`) se
//     rechaza vía parsearRespaldo / el flujo del controlador de la
//     Pagina_Base_De_Datos, se muestra un error y se conservan sin cambios los
//     Productos existentes (Req 6.4).
//
// Se ejercita el flujo real: las operaciones puras de edición/eliminación
// (productos.ops), la serialización/parseo del respaldo (backup) y el
// controlador de la Pagina_Base_De_Datos (basedatos.controller) sobre el `window`
// de jsdom. Los Scripts_Clasicos se cargan con `cargarLP`, que evalúa los IIFE de
// src/ contra el `window` de jsdom y puebla `window.LP`. Se recarga en cada
// prueba para aislar el estado del controlador y del editor de líneas.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cargarLP } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

// Parametros vigentes usados por los detalles y la resolución de líneas.
const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

// Productos iniciales. `prod-1` con dos líneas, `prod-2` con una línea,
// `prod-3` con una línea. `prod-2` se editará y `prod-3` se eliminará en los
// escenarios de round-trip.
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
      nombre: "Servicio a eliminar",
      lineas: [{ parametroId: "p2", cantidad: 3, subtotal: 15 }],
      precioTotal: 15,
    },
  ];
}

/**
 * Monta el marcado del DOM que cablean los controladores:
 *   - La Pagina_Productos: Lista_De_Productos, controles de la Calculadora que
 *     `init()` consulta, y los modales de detalle y edición (copiados de
 *     index.html), con los que trabajan `abrirDetalle`/`abrirEdicion`.
 *   - La Pagina_Base_De_Datos: botón Exportar e input de importación que cablea
 *     `basedatosController.initBaseDatos`.
 *   - El contenedor de notificaciones para notifier.
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

    <section id="pagina-basedatos">
      <button type="button" id="btn-exportar">Exportar datos</button>
      <input type="file" id="input-importar" accept="application/json,.json" />
    </section>

    <!-- Modal Ver detalle (solo lectura) -->
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

    <!-- Modal Editar (agregar/eliminar líneas) -->
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
 * Crea e inicializa un controlador de Productos cableado a un estado en memoria
 * compartido, y (opcionalmente) el controlador de la Pagina_Base_De_Datos
 * apuntando al mismo estado (única fuente de verdad, como hace app.js).
 *
 * @param {Array} productos Lista inicial de Productos.
 * @param {Array} [parametros] Parametros vigentes.
 * @returns {{ controlador: any, estado: { parametros: Array, productos: Array } }}
 */
function crearEntorno(productos, parametros = PARAMETROS) {
  const estado = { parametros: parametros.slice(), productos: productos.slice() };

  const controlador = LP.productosController.crearProductosController({
    getParametros: () => estado.parametros,
    getProductos: () => estado.productos,
    setProductos: (nueva) => {
      estado.productos = nueva;
    },
  });
  controlador.init();

  // Controlador de la Pagina_Base_De_Datos compartiendo el mismo estado y
  // re-renderizando la Lista_De_Productos tras importar.
  LP.basedatosController.initBaseDatos({
    getParametros: () => estado.parametros,
    getProductos: () => estado.productos,
    setParametros: (nueva) => {
      estado.parametros = nueva;
    },
    setProductos: (nueva) => {
      estado.productos = nueva;
    },
    refrescarVistas: () => {
      // `render()` re-renderiza el editor de líneas y la Lista_De_Productos.
      controlador.render();
    },
  });

  return { controlador, estado };
}

// --- Utilidades sobre la Lista_De_Productos ---

function contenedorLista() {
  return document.getElementById("lista-productos");
}

function itemPorId(id) {
  return contenedorLista().querySelector(`li.lp-producto[data-id="${id}"]`);
}

function abrirDetalleDe(id) {
  itemPorId(id)
    .querySelector(".lp-producto-detalle")
    .dispatchEvent(new window.Event("click"));
}

function abrirEdicionDe(id) {
  itemPorId(id)
    .querySelector(".lp-producto-editar")
    .dispatchEvent(new window.Event("click"));
}

function filasEdicion() {
  return document
    .getElementById("modal-edicion-lineas")
    .querySelectorAll(".lp-linea");
}

// --- Espías / stubs de infraestructura ---

/** Captura los mensajes de error mostrados por notifier.error. */
function capturarErrores() {
  const errores = [];
  LP.notifier.error = (mensaje) => {
    errores.push(mensaje);
  };
  return errores;
}

/**
 * Fuerza la respuesta de notifier.confirmar (el controlador de base de datos pide
 * confirmación antes de reemplazar los datos al importar).
 */
function fijarConfirmacion(valor) {
  LP.notifier.confirmar = () => valor;
}

/**
 * Simula la importación de un texto de respaldo a través del input de archivo,
 * usando un FileReader stub que entrega el `texto` de forma síncrona.
 *
 * @param {string} texto Contenido del "archivo" importado.
 */
function importarTexto(texto) {
  // Stub de FileReader que entrega el texto de forma síncrona al invocar onload.
  const OriginalFileReader = window.FileReader;
  window.FileReader = class {
    readAsText() {
      this.result = texto;
      if (typeof this.onload === "function") {
        this.onload({ target: this });
      }
    }
  };

  try {
    const input = document.getElementById("input-importar");
    // Stub del archivo seleccionado (el controlador solo requiere files[0]).
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [{ name: "respaldo.json" }],
    });
    input.dispatchEvent(new window.Event("change"));
  } finally {
    window.FileReader = OriginalFileReader;
  }
}

beforeEach(() => {
  montarDOM();
  LP = cargarLP();
  // Sin la API de Bootstrap: los modales usan el fallback manual (d-none/show).
  delete window.bootstrap;
});

afterEach(() => {
  delete window.bootstrap;
});

// ---------------------------------------------------------------------------
// Req 6.1: el respaldo incluye Productos actualizados y excluye los eliminados
// ---------------------------------------------------------------------------
describe("Exportar tras editar/eliminar (Req 6.1)", () => {
  it("el respaldo refleja la edición (líneas/subtotales/total) y excluye el eliminado", () => {
    // Editar prod-2 (p1 x1 => p1 x3 => subtotal 30, total 30) y eliminar prod-3.
    const productos = productosIniciales();
    const editado = LP.productosOps.editarProducto(productos, "prod-2", [
      { parametroId: "p1", cantidad: 3, subtotal: 30 },
    ]);
    const resultante = LP.productosOps.eliminarProducto(editado, "prod-3");

    const texto = LP.backup.serializarRespaldo(PARAMETROS, resultante);
    const parseado = LP.backup.parsearRespaldo(texto);

    expect(parseado.status).toBe("ok");
    const ids = parseado.productos.map((p) => p.id);
    // El eliminado no aparece; el resto conserva el orden.
    expect(ids).toEqual(["prod-1", "prod-2"]);
    expect(ids).not.toContain("prod-3");

    // El Producto editado en el respaldo lleva las líneas/subtotal/total nuevos.
    const prod2 = parseado.productos.find((p) => p.id === "prod-2");
    expect(prod2.lineas).toHaveLength(1);
    expect(prod2.lineas[0].parametroId).toBe("p1");
    expect(prod2.lineas[0].cantidad).toBe(3);
    expect(prod2.lineas[0].subtotal).toBe(30);
    expect(prod2.precioTotal).toBe(30);

    // El Producto no editado se conserva íntegro.
    const prod1 = parseado.productos.find((p) => p.id === "prod-1");
    expect(prod1.precioTotal).toBe(40);
    expect(prod1.lineas).toHaveLength(2);
  });

  it("el respaldo captura una edición y una eliminación aplicadas desde la UI", () => {
    // Ejercitar el flujo completo de la UI: editar prod-2 y eliminar prod-3.
    const { estado } = crearEntorno(productosIniciales());
    // Persistencia inofensiva en las pruebas.
    LP.repository.saveProductos = () => ({ status: "ok" });
    fijarConfirmacion(true); // confirmar la eliminación

    // Editar prod-2: cambiar la cantidad a 4 (p1 x4 => subtotal 40, total 40).
    abrirEdicionDe("prod-2");
    const cantidad = filasEdicion()[0].querySelector(".lp-linea-cantidad");
    cantidad.value = "4";
    cantidad.dispatchEvent(new window.Event("input"));
    document
      .getElementById("btn-guardar-edicion")
      .dispatchEvent(new window.Event("click"));

    // Eliminar prod-3 (confirmación forzada a true).
    itemPorId("prod-3")
      .querySelector(".lp-producto-eliminar")
      .dispatchEvent(new window.Event("click"));

    // Exportar el estado resultante.
    const texto = LP.backup.serializarRespaldo(
      estado.parametros,
      estado.productos
    );
    const parseado = LP.backup.parsearRespaldo(texto);

    expect(parseado.status).toBe("ok");
    expect(parseado.productos.map((p) => p.id)).toEqual(["prod-1", "prod-2"]);
    const prod2 = parseado.productos.find((p) => p.id === "prod-2");
    expect(prod2.lineas[0].cantidad).toBe(4);
    expect(prod2.lineas[0].subtotal).toBe(40);
    expect(prod2.precioTotal).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// Req 6.2: importar muestra los Productos con las tres acciones por cada uno
// ---------------------------------------------------------------------------
describe("Importar muestra la Lista_De_Productos con las tres acciones (Req 6.2)", () => {
  it("tras importar un respaldo válido, cada Producto muestra Ver detalle, Editar y Eliminar", () => {
    // Estado inicial vacío; el respaldo trae la lista resultante de ediciones.
    const { estado } = crearEntorno([]);
    fijarConfirmacion(true);

    // Respaldo con los Productos ya editados/depurados.
    const productosRespaldo = LP.productosOps.eliminarProducto(
      productosIniciales(),
      "prod-3"
    );
    const texto = LP.backup.serializarRespaldo(PARAMETROS, productosRespaldo);

    importarTexto(texto);

    // El estado compartido quedó con los Productos importados.
    expect(estado.productos.map((p) => p.id)).toEqual(["prod-1", "prod-2"]);

    // La Lista_De_Productos renderiza un <li> por Producto con las 3 acciones.
    const items = contenedorLista().querySelectorAll("li.lp-producto");
    expect(items).toHaveLength(2);
    items.forEach((li) => {
      expect(li.querySelector(".lp-producto-detalle")).not.toBeNull();
      expect(li.querySelector(".lp-producto-editar")).not.toBeNull();
      expect(li.querySelector(".lp-producto-eliminar")).not.toBeNull();
    });
    expect(itemPorId("prod-1")).not.toBeNull();
    expect(itemPorId("prod-2")).not.toBeNull();
    expect(itemPorId("prod-3")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Req 6.3: detalle/edición de un Producto importado no recalcula ni altera valores
// ---------------------------------------------------------------------------
describe("Producto importado: detalle/edición no recalculan (Req 6.3)", () => {
  // Producto importado con un subtotal/total "no derivable" de precioUnitario
  // vigente, para evidenciar que la vista muestra lo importado sin recalcular.
  const IMPORTADO = {
    id: "imp-1",
    nombre: "Producto importado",
    lineas: [
      { parametroId: "p1", cantidad: 2, subtotal: 999.99 },
      { parametroId: "p2", cantidad: 5, subtotal: 111.11 },
    ],
    precioTotal: 1111.1,
  };

  function importarProductoUnico() {
    const { estado } = crearEntorno([]);
    fijarConfirmacion(true);
    const texto = LP.backup.serializarRespaldo(PARAMETROS, [IMPORTADO]);
    importarTexto(texto);
    return estado;
  }

  it("la Ventana_Detalle muestra líneas, subtotales y Precio_Total tal como se importaron", () => {
    importarProductoUnico();

    abrirDetalleDe("imp-1");

    // Precio_Total mostrado tal cual (sin recalcular).
    expect(document.getElementById("modal-detalle-total").textContent).toBe(
      LP.currency.formatearPEN(1111.1)
    );

    const items = document
      .getElementById("modal-detalle-lineas")
      .querySelectorAll("li.lp-detalle-linea");
    expect(items).toHaveLength(2);

    // Subtotales mostrados exactamente como se importaron.
    const subtotales = Array.from(items).map(
      (li) => li.querySelector(".lp-detalle-linea-subtotal").textContent
    );
    expect(subtotales).toEqual([
      LP.currency.formatearPEN(999.99),
      LP.currency.formatearPEN(111.11),
    ]);
  });

  it("no muta el Producto importado al abrir el detalle (valores intactos)", () => {
    const estado = importarProductoUnico();
    const antes = JSON.parse(JSON.stringify(estado.productos));

    abrirDetalleDe("imp-1");

    expect(estado.productos).toEqual(antes);
    const imp = estado.productos.find((p) => p.id === "imp-1");
    expect(imp.precioTotal).toBe(1111.1);
    expect(imp.lineas[0].subtotal).toBe(999.99);
    expect(imp.lineas[1].subtotal).toBe(111.11);
  });

  it("la Ventana_Edicion precarga las líneas importadas (cantidad/parametro) sin alterarlas al abrir", () => {
    const estado = importarProductoUnico();
    const antes = JSON.parse(JSON.stringify(estado.productos));

    abrirEdicionDe("imp-1");

    // El nombre en solo lectura y las líneas precargadas tal como se importaron.
    expect(document.getElementById("modal-edicion-nombre").value).toBe(
      "Producto importado"
    );
    const filas = filasEdicion();
    expect(filas).toHaveLength(2);
    expect(filas[0].querySelector(".lp-linea-parametro").value).toBe("p1");
    expect(filas[0].querySelector(".lp-linea-cantidad").value).toBe("2");
    expect(filas[1].querySelector(".lp-linea-parametro").value).toBe("p2");
    expect(filas[1].querySelector(".lp-linea-cantidad").value).toBe("5");

    // Abrir la edición (sobre una copia) no muta el Producto importado.
    expect(estado.productos).toEqual(antes);
  });
});

// ---------------------------------------------------------------------------
// Req 6.4: importación inválida se rechaza, muestra error y conserva los Productos
// ---------------------------------------------------------------------------
describe("Importación inválida (Req 6.4)", () => {
  it("JSON malformado: parsearRespaldo devuelve invalid con un motivo", () => {
    crearEntorno(productosIniciales());
    const resultado = LP.backup.parsearRespaldo("{ esto no es json ]");
    expect(resultado.status).toBe("invalid");
    expect(typeof resultado.reason).toBe("string");
    expect(resultado.reason.length).toBeGreaterThan(0);
  });

  it("respaldo sin lista `productos`: parsearRespaldo lo rechaza", () => {
    const resultado = LP.backup.parsearRespaldo(
      JSON.stringify({ version: "1", parametros: [] })
    );
    expect(resultado.status).toBe("invalid");
  });

  it("importar JSON malformado muestra error y conserva los Productos existentes", () => {
    const { estado } = crearEntorno(productosIniciales());
    const errores = capturarErrores();
    fijarConfirmacion(true); // no debería llegar a confirmarse
    const antes = JSON.parse(JSON.stringify(estado.productos));

    importarTexto("{{ no-es-json");

    // Se mostró un error y no se alteró la lista de Productos existente.
    expect(errores.length).toBeGreaterThan(0);
    expect(estado.productos).toEqual(antes);
    expect(estado.productos.map((p) => p.id)).toEqual([
      "prod-1",
      "prod-2",
      "prod-3",
    ]);
    // La Lista_De_Productos sigue mostrando los tres Productos originales.
    expect(contenedorLista().querySelectorAll("li.lp-producto")).toHaveLength(3);
  });

  it("importar un respaldo sin lista `productos` muestra error y conserva los Productos", () => {
    const { estado } = crearEntorno(productosIniciales());
    const errores = capturarErrores();
    fijarConfirmacion(true);
    const antes = JSON.parse(JSON.stringify(estado.productos));

    importarTexto(JSON.stringify({ version: "1", parametros: [] }));

    expect(errores.length).toBeGreaterThan(0);
    expect(estado.productos).toEqual(antes);
    expect(contenedorLista().querySelectorAll("li.lp-producto")).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Normalización al IMPORTAR un Archivo_De_Respaldo (Req 4.5)
// Tarea 12.1 del spec `producto-simple-vs-compuesto-tabs`.
//
// Escenario retrocompatible: se importa un respaldo cuyos Productos fueron
// guardados ANTES de esta funcionalidad, es decir, SIN el Flag_Compuesto
// (`compuesto` ausente). Al aplicar el reemplazo (`aplicarReemplazo`), el
// Normalizador_De_Producto se aplica a cada Producto importado ANTES de fijarlo
// en el estado y de persistirlo (Req 4.5), de modo que quedan CLASIFICADOS (su
// `compuesto` deriva de las líneas mediante `LP.models.esCompuesto`) y su
// clasificación queda PERSISTIDA en el Almacenamiento_Local (visible al recargar
// con `LP.repository.load`).
//
// Se ejercita el flujo real de importación (input de archivo -> FileReader ->
// parsearRespaldo -> confirmar -> aplicarReemplazo -> repository.replaceAll) sobre
// el `localStorage` de jsdom.
// ---------------------------------------------------------------------------

// Productos "antiguos" SIN `compuesto` dentro del respaldo: uno con una
// Linea_De_Producto (debe quedar COMPUESTO) y dos solo con Lineas_De_Parametro
// (una con `fuenteDeComponente: "Parámetro"` y otra SIN la propiedad,
// retrocompatibilidad Req 3.4) que deben quedar SIMPLES.
function productosRespaldoSinFlag() {
  return [
    {
      id: "imp-compuesto",
      nombre: "Con sub-producto",
      lineas: [
        { parametroId: "p1", cantidad: 2, subtotal: 20 },
        {
          parametroId: null,
          cantidad: 1,
          subtotal: 15,
          fuenteDeComponente: "Producto",
          productoComponenteId: "imp-simple-param",
        },
      ],
      precioTotal: 35,
      // Sin `compuesto`.
    },
    {
      id: "imp-simple-param",
      nombre: "Solo parámetros (con fuente)",
      lineas: [
        { parametroId: "p1", cantidad: 1, subtotal: 10, fuenteDeComponente: "Parámetro" },
      ],
      precioTotal: 10,
      // Sin `compuesto`.
    },
    {
      id: "imp-simple-legacy",
      nombre: "Solo parámetros (línea legada sin fuente)",
      lineas: [{ parametroId: "p2", cantidad: 2, subtotal: 10 }],
      precioTotal: 10,
      // Sin `compuesto` y con una línea SIN `fuenteDeComponente` (Req 3.4).
    },
  ];
}

describe("Normalización al importar (Req 4.5)", () => {
  beforeEach(() => {
    // Aislar el Almacenamiento_Local real para verificar la persistencia.
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("clasifica los Productos importados SIN `compuesto` derivando el flag de sus líneas", () => {
    const { estado } = crearEntorno([]);
    fijarConfirmacion(true);

    const texto = LP.backup.serializarRespaldo(
      PARAMETROS,
      productosRespaldoSinFlag()
    );
    importarTexto(texto);

    // El estado compartido quedó con los Productos importados YA clasificados.
    expect(estado.productos.map((p) => p.id)).toEqual([
      "imp-compuesto",
      "imp-simple-param",
      "imp-simple-legacy",
    ]);
    estado.productos.forEach((p) => {
      expect(typeof p.compuesto).toBe("boolean");
      expect(p.compuesto).toBe(LP.models.esCompuesto(p.lineas));
    });

    const porId = Object.fromEntries(estado.productos.map((p) => [p.id, p]));
    // El Producto con una Linea_De_Producto queda COMPUESTO.
    expect(porId["imp-compuesto"].compuesto).toBe(true);
    // Los Productos con solo Lineas_De_Parametro (incluida una línea legada sin
    // `fuenteDeComponente`) quedan SIMPLES (Req 3.4).
    expect(porId["imp-simple-param"].compuesto).toBe(false);
    expect(porId["imp-simple-legacy"].compuesto).toBe(false);

    // Se conservan los demás campos del Producto (Req 4.3).
    expect(porId["imp-compuesto"]).toMatchObject({
      id: "imp-compuesto",
      nombre: "Con sub-producto",
      precioTotal: 35,
    });
    expect(porId["imp-compuesto"].lineas).toHaveLength(2);
  });

  it("persiste la clasificación derivada en el Almacenamiento_Local al importar (round-trip)", () => {
    crearEntorno([]);
    fijarConfirmacion(true);

    const texto = LP.backup.serializarRespaldo(
      PARAMETROS,
      productosRespaldoSinFlag()
    );
    importarTexto(texto);

    // Recargar desde el Almacenamiento_Local REAL: la clasificación quedó guardada.
    const cargada = LP.repository.load();
    expect(cargada.warnings).not.toContain("productos corruptos");
    expect(cargada.productos.map((p) => p.id)).toEqual([
      "imp-compuesto",
      "imp-simple-param",
      "imp-simple-legacy",
    ]);

    const porId = Object.fromEntries(cargada.productos.map((p) => [p.id, p]));
    expect(porId["imp-compuesto"].compuesto).toBe(true);
    expect(porId["imp-simple-param"].compuesto).toBe(false);
    expect(porId["imp-simple-legacy"].compuesto).toBe(false);

    // Coherencia final: cada flag persistido coincide con el Clasificador.
    cargada.productos.forEach((p) => {
      expect(p.compuesto).toBe(LP.models.esCompuesto(p.lineas));
    });
  });
});
