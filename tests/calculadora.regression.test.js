// tests/calculadora.regression.test.js — Pruebas de regresión (jsdom) de la
// Calculadora tras extraer la lógica de líneas al editor reutilizable
// (`src/lineas.editor.js`) e integrarlo en `src/productos.controller.js`.
//
// Cubre la Tarea 5.2 del spec `product-detail-edit-delete`:
//   - Verificar que "calcular" sigue funcionando tras la extracción: agregar una
//     línea, seleccionar un Parametro e ingresar una Cantidad y luego calcular
//     renderiza los subtotales por línea y el Precio_Total en PEN.
//   - Verificar que "guardar" sigue funcionando: construye el Producto y lo
//     persiste (vía repository.saveProductos) actualizando el estado compartido
//     (setProductos), sin regresiones.
//   - Verificar que la desreferencia de Parametros de la Calculadora sigue
//     operando: las funciones de módulo `contarLineasQueReferencian` /
//     `desreferenciarParametro` delegan en el editor de la Calculadora activa
//     (Req 2.4 base, Req 3.3).
//
// Los efectos son sobre el DOM: se ejercitan bajo el entorno jsdom de Vitest.
// Los Scripts_Clasicos se cargan con `cargarLP`, que evalúa los IIFE de src/
// contra el `window` de jsdom y puebla `window.LP`.

import { describe, it, expect, beforeEach } from "vitest";
import { cargarLP } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

// Parametros vigentes usados por la Calculadora en las pruebas.
const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

/**
 * Monta en el `document` de jsdom el marcado mínimo de la Calculadora, replicando
 * los ids de #pagina-productos en index.html, más el contenedor de notificaciones
 * que usa notifier.js.
 */
function montarDomCalculadora() {
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
 * Crea e inicializa un controlador de la Calculadora sobre el DOM montado.
 * Devuelve el controlador junto con el estado de Productos capturado y los
 * accesores empleados.
 *
 * @param {{ productosIniciales?: Array }} [opciones]
 */
function crearControladorMontado(opciones = {}) {
  const estado = { productos: opciones.productosIniciales || [] };

  const controlador = LP.productosController.crearProductosController({
    getParametros: () => PARAMETROS,
    getProductos: () => estado.productos,
    setProductos: (productos) => {
      estado.productos = productos;
    },
  });
  controlador.init();

  return { controlador, estado };
}

/** Selecciona un Parametro en la primera fila de línea renderizada. */
function seleccionarParametroPrimeraLinea(parametroId) {
  const select = document.querySelector(".lp-linea-parametro");
  select.value = parametroId;
  select.dispatchEvent(new window.Event("change"));
}

/** Escribe una cantidad en la primera fila de línea renderizada. */
function escribirCantidadPrimeraLinea(cantidad) {
  const input = document.querySelector(".lp-linea-cantidad");
  input.value = String(cantidad);
  input.dispatchEvent(new window.Event("input"));
}

beforeEach(() => {
  // Recargar los Scripts_Clasicos sobre un window limpio en cada prueba para
  // aislar el controlador activo de módulo y el estado del editor.
  montarDomCalculadora();
  LP = cargarLP();
});

// ---------------------------------------------------------------------------
// Regresión de "calcular" (Req 3.3)
// ---------------------------------------------------------------------------
describe("Calculadora — regresión de calcular tras la extracción del editor", () => {
  it("agregar línea + seleccionar Parametro + Cantidad y calcular renderiza subtotales y total", () => {
    crearControladorMontado();

    // El botón "Agregar línea" está cableado al editor (integración 5.1).
    document
      .getElementById("btn-agregar-linea")
      .dispatchEvent(new window.Event("click"));

    // Rellenar la línea con el Parametro p1 (10) y cantidad 3 => subtotal 30.
    seleccionarParametroPrimeraLinea("p1");
    escribirCantidadPrimeraLinea(3);

    // Nombre válido de producto.
    document.getElementById("producto-nombre").value = "Servicio A";

    // Calcular.
    document
      .getElementById("btn-calcular")
      .dispatchEvent(new window.Event("click"));

    const resultado = document.getElementById("resultado-calculo");
    // Un subtotal por línea.
    const subtotales = resultado.querySelectorAll(".lp-subtotal");
    expect(subtotales).toHaveLength(1);
    expect(subtotales[0].textContent).toContain("Mano de obra");
    expect(subtotales[0].textContent).toContain("S/ 30.00");

    // Precio total en PEN.
    const total = resultado.querySelector(".lp-precio-total");
    expect(total).not.toBeNull();
    expect(total.textContent).toContain("S/ 30.00");
  });

  it("calcular suma múltiples líneas y muestra el Precio_Total correcto", () => {
    crearControladorMontado();
    const btnAgregar = document.getElementById("btn-agregar-linea");

    // Línea 1: p1 (10) x 2 = 20.
    btnAgregar.dispatchEvent(new window.Event("click"));
    const filas1 = document.querySelectorAll(".lp-linea");
    filas1[0].querySelector(".lp-linea-parametro").value = "p1";
    filas1[0]
      .querySelector(".lp-linea-parametro")
      .dispatchEvent(new window.Event("change"));
    filas1[0].querySelector(".lp-linea-cantidad").value = "2";
    filas1[0]
      .querySelector(".lp-linea-cantidad")
      .dispatchEvent(new window.Event("input"));

    // Línea 2: p2 (5) x 4 = 20.
    btnAgregar.dispatchEvent(new window.Event("click"));
    const filas2 = document.querySelectorAll(".lp-linea");
    filas2[1].querySelector(".lp-linea-parametro").value = "p2";
    filas2[1]
      .querySelector(".lp-linea-parametro")
      .dispatchEvent(new window.Event("change"));
    filas2[1].querySelector(".lp-linea-cantidad").value = "4";
    filas2[1]
      .querySelector(".lp-linea-cantidad")
      .dispatchEvent(new window.Event("input"));

    document.getElementById("producto-nombre").value = "Servicio combinado";
    document
      .getElementById("btn-calcular")
      .dispatchEvent(new window.Event("click"));

    const resultado = document.getElementById("resultado-calculo");
    expect(resultado.querySelectorAll(".lp-subtotal")).toHaveLength(2);
    // Total = 20 + 20 = 40.
    expect(resultado.querySelector(".lp-precio-total").textContent).toContain(
      "S/ 40.00"
    );
  });

  it("calcular con nombre inválido notifica error y no renderiza resultado", () => {
    crearControladorMontado();

    let errorMostrado = null;
    LP.notifier.error = (mensaje) => {
      errorMostrado = mensaje;
    };

    document
      .getElementById("btn-agregar-linea")
      .dispatchEvent(new window.Event("click"));
    seleccionarParametroPrimeraLinea("p1");
    escribirCantidadPrimeraLinea(3);
    // Nombre vacío => inválido.
    document.getElementById("producto-nombre").value = "";

    document
      .getElementById("btn-calcular")
      .dispatchEvent(new window.Event("click"));

    expect(errorMostrado).toBe(
      LP.validation.MENSAJES.NOMBRE_PRODUCTO_OBLIGATORIO
    );
    const resultado = document.getElementById("resultado-calculo");
    expect(resultado.querySelector(".lp-precio-total")).toBeNull();
  });

  it("calcular sin líneas notifica el mensaje SIN_LINEAS", () => {
    crearControladorMontado();

    let errorMostrado = null;
    LP.notifier.error = (mensaje) => {
      errorMostrado = mensaje;
    };

    document.getElementById("producto-nombre").value = "Servicio A";
    document
      .getElementById("btn-calcular")
      .dispatchEvent(new window.Event("click"));

    expect(errorMostrado).toBe(LP.productosController.MENSAJES.SIN_LINEAS);
  });
});

// ---------------------------------------------------------------------------
// Regresión de "guardar" (Req 3.3)
// ---------------------------------------------------------------------------
describe("Calculadora — regresión de guardar tras la extracción del editor", () => {
  it("guardar construye y persiste el Producto y actualiza el estado compartido", () => {
    // Espiar la persistencia del repositorio (resolución en tiempo de llamada).
    const guardados = [];
    LP.repository.saveProductos = (productos) => {
      guardados.push(productos);
      return { status: "ok" };
    };

    const { estado } = crearControladorMontado();

    document
      .getElementById("btn-agregar-linea")
      .dispatchEvent(new window.Event("click"));
    seleccionarParametroPrimeraLinea("p1"); // precioUnitario 10
    escribirCantidadPrimeraLinea(3); // 10 * 3 = 30
    document.getElementById("producto-nombre").value = "  Servicio A  ";

    document
      .getElementById("btn-guardar-producto")
      .dispatchEvent(new window.Event("click"));

    // Se invocó la persistencia con la lista completa (un producto).
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toHaveLength(1);

    // El estado compartido se actualizó con el nuevo Producto.
    expect(estado.productos).toHaveLength(1);
    const producto = estado.productos[0];
    expect(producto.nombre).toBe("Servicio A"); // nombre recortado
    expect(producto.precioTotal).toBe(30);
    expect(producto.lineas).toHaveLength(1);
    expect(producto.lineas[0].parametroId).toBe("p1");
    expect(producto.lineas[0].cantidad).toBe(3);
    expect(producto.lineas[0].subtotal).toBe(30);
    expect(typeof producto.id).toBe("string");

    // La lista de Productos guardados se renderizó con el nuevo Producto.
    const lista = document.getElementById("lista-productos");
    expect(lista.querySelectorAll(".lp-producto")).toHaveLength(1);
    expect(
      lista.querySelector(".lp-producto-nombre").textContent
    ).toBe("Servicio A");
  });

  it("guardar con fallo de escritura conserva el Producto en memoria y notifica", () => {
    LP.repository.saveProductos = () => ({
      status: "failed",
      reason: "quota",
    });

    let errorMostrado = null;
    LP.notifier.error = (mensaje) => {
      errorMostrado = mensaje;
    };

    const { estado } = crearControladorMontado();

    document
      .getElementById("btn-agregar-linea")
      .dispatchEvent(new window.Event("click"));
    seleccionarParametroPrimeraLinea("p2"); // precioUnitario 5
    escribirCantidadPrimeraLinea(2); // 5 * 2 = 10
    document.getElementById("producto-nombre").value = "Servicio B";

    document
      .getElementById("btn-guardar-producto")
      .dispatchEvent(new window.Event("click"));

    // Se conserva en memoria pese al fallo de persistencia.
    expect(estado.productos).toHaveLength(1);
    expect(estado.productos[0].precioTotal).toBe(10);
    // Se notificó un error (no persistente).
    expect(errorMostrado).not.toBeNull();
    expect(errorMostrado).toContain("no se pudieron guardar de forma persistente");
  });

  it("guardar con parámetro no seleccionado notifica SIN_PARAMETRO y no persiste", () => {
    let persistio = false;
    LP.repository.saveProductos = () => {
      persistio = true;
      return { status: "ok" };
    };
    let errorMostrado = null;
    LP.notifier.error = (mensaje) => {
      errorMostrado = mensaje;
    };

    const { estado } = crearControladorMontado();

    // Agregar una línea con cantidad válida pero sin seleccionar parámetro.
    document
      .getElementById("btn-agregar-linea")
      .dispatchEvent(new window.Event("click"));
    escribirCantidadPrimeraLinea(3);
    document.getElementById("producto-nombre").value = "Servicio C";

    document
      .getElementById("btn-guardar-producto")
      .dispatchEvent(new window.Event("click"));

    expect(errorMostrado).toBe(
      LP.productosController.MENSAJES.SIN_PARAMETRO
    );
    expect(persistio).toBe(false);
    expect(estado.productos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Regresión de la desreferencia de Parametros de la Calculadora (Req 2.4 / 3.3)
// ---------------------------------------------------------------------------
describe("Calculadora — desreferencia de Parametros vía funciones de módulo", () => {
  it("contarLineasQueReferencian delega en el editor de la Calculadora activa", () => {
    crearControladorMontado();
    const btnAgregar = document.getElementById("btn-agregar-linea");

    // Dos líneas referencian p1, una referencia p2.
    btnAgregar.dispatchEvent(new window.Event("click"));
    btnAgregar.dispatchEvent(new window.Event("click"));
    btnAgregar.dispatchEvent(new window.Event("click"));

    const selects = document.querySelectorAll(".lp-linea-parametro");
    ["p1", "p1", "p2"].forEach((id, i) => {
      selects[i].value = id;
      selects[i].dispatchEvent(new window.Event("change"));
    });

    // Las funciones de módulo operan sobre el controlador activo.
    expect(LP.productosController.contarLineasQueReferencian("p1")).toBe(2);
    expect(LP.productosController.contarLineasQueReferencian("p2")).toBe(1);
    expect(LP.productosController.contarLineasQueReferencian("inexistente")).toBe(0);
  });

  it("desreferenciarParametro marca como 'sin parámetro' las líneas afectadas de la Calculadora", () => {
    crearControladorMontado();
    const btnAgregar = document.getElementById("btn-agregar-linea");

    btnAgregar.dispatchEvent(new window.Event("click"));
    btnAgregar.dispatchEvent(new window.Event("click"));

    const selects = document.querySelectorAll(".lp-linea-parametro");
    selects[0].value = "p1";
    selects[0].dispatchEvent(new window.Event("change"));
    selects[1].value = "p2";
    selects[1].dispatchEvent(new window.Event("change"));

    expect(LP.productosController.contarLineasQueReferencian("p1")).toBe(1);

    // Desreferenciar p1 vía la función de módulo (como haría parametros.controller).
    LP.productosController.desreferenciarParametro("p1");

    // La línea que referenciaba p1 quedó sin parámetro; la de p2 no cambia.
    expect(LP.productosController.contarLineasQueReferencian("p1")).toBe(0);
    expect(LP.productosController.contarLineasQueReferencian("p2")).toBe(1);

    // Tras la desreferencia, el select de la primera línea cae en la opción vacía.
    const selectsTrasDesref = document.querySelectorAll(".lp-linea-parametro");
    expect(selectsTrasDesref[0].value).toBe("");
  });
});
