// productos.controller.js — Calculadora + lista de Productos (efectos DOM)
//
// Controlador de la Pagina_Productos. Gestiona:
//   - el campo de nombre del producto (1..100 caracteres) — Req 3.1;
//   - agregar/eliminar Lineas_De_Calculo mediante botones y la indicación de
//     estado vacío cuando no hay líneas — Req 4.1, 4.5, 4.6;
//   - el selector de Parametro por línea, mostrando la Unidad asociada — Req 4.2, 4.7;
//   - el cálculo (validación de nombre, existencia de al menos una línea,
//     cantidad y parámetro por línea) mostrando subtotales por línea y el
//     Precio_Total formateados en PEN — Req 3.2, 3.3, 3.4, 5.1–5.6;
//   - el guardado del Producto vía `repository` y la renderización de la lista
//     de Productos guardados (nombre + Precio_Total) — Req 8.7, 6.6.
//
// Coordina la lógica pura de `validation`, `calculo` y `currency`, las fábricas
// de `models`, la persistencia de `repository` y los mensajes de `notifier`.
//
// ─────────────── API publicada en window.LP.productosController (para app.js) ───────────────
//
//   crearProductosController(opciones) -> ProductosController
//
//     opciones:
//       - getParametros(): Parametro[]   Accesor a la lista actual de Parametros.
//                                        Se consulta en cada render para que el
//                                        selector refleje los Parametros vigentes.
//       - getProductos(): Producto[]     Accesor a la lista actual de Productos.
//       - setProductos(productos): void  Fija la lista de Productos en el estado
//                                        compartido (tras guardar uno nuevo).
//
//     ProductosController:
//       - init(): void                   Cablea el DOM y renderiza el estado inicial.
//       - render(): void                 Re-renderiza líneas y lista de Productos
//                                        (p. ej. si cambian los Parametros externos).
//       - contarLineasQueReferencian(parametroId): number
//                                        Cuenta las líneas en edición que
//                                        referencian ese parametroId (Req 2.4).
//       - desreferenciarParametro(parametroId): void
//                                        Marca como "sin parámetro" (parametroId
//                                        = null) las líneas en edición que lo
//                                        referenciaban (Req 2.4).
//
//   Además, se exponen a nivel de módulo las funciones
//     contarLineasQueReferencian(parametroId)  y  desreferenciarParametro(parametroId)
//   que operan sobre el controlador activo (el último inicializado). Esto permite
//   que `parametros.controller.js` consulte/desreferencie las líneas de la
//   Calculadora al eliminar un Parametro referenciado (Req 2.4) sin necesitar una
//   referencia directa a la instancia.
//
//   DOM ids usados (definidos en index.html, dentro de #pagina-productos):
//     - #producto-nombre       input de texto del nombre (maxlength 100)
//     - #lineas-container       contenedor de las filas de líneas de cálculo
//     - #btn-agregar-linea      botón para agregar una nueva línea
//     - #btn-calcular           botón calcular
//     - #resultado-calculo      área de resultados (subtotales + total en PEN)
//     - #btn-guardar-producto   botón guardar
//     - #lista-productos        lista de Productos guardados

// Dependencias consumidas desde el espacio de nombres global `window.LP`
// (carga vía <script> clásico bajo file://). No se usa sintaxis de módulos ES.
// Se resuelven en tiempo de llamada mediante los alias siguientes para no
// depender del orden de carga en el momento de evaluar este archivo.

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  const validarNombreProducto = (...args) =>
    window.LP.validation.validarNombreProducto(...args);
  const validarCantidad = (...args) => window.LP.validation.validarCantidad(...args);
  const calcularProducto = (...args) => window.LP.calculo.calcularProducto(...args);
  const formatearPEN = (...args) => window.LP.currency.formatearPEN(...args);
  const crearProducto = (...args) => window.LP.models.crearProducto(...args);
  const crearLinea = (...args) => window.LP.models.crearLinea(...args);
  const saveProductos = (...args) => window.LP.repository.saveProductos(...args);
  const notifier = {
    info: (...args) => window.LP.notifier.info(...args),
    error: (...args) => window.LP.notifier.error(...args),
    confirmar: (...args) => window.LP.notifier.confirmar(...args),
  };

  // Mensajes exactos exigidos por los criterios de aceptación del Requisito 5.
  const MENSAJES = {
    SIN_LINEAS: "Se debe agregar al menos un parámetro.",
    CANTIDAD_INVALIDA:
      "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99.",
    SIN_PARAMETRO: "Cada línea debe tener un parámetro seleccionado.",
  };

  const IDS = {
    nombre: "producto-nombre",
    lineasContainer: "lineas-container",
    btnAgregarLinea: "btn-agregar-linea",
    btnCalcular: "btn-calcular",
    resultado: "resultado-calculo",
    btnGuardar: "btn-guardar-producto",
    listaProductos: "lista-productos",
  };

  /**
   * Referencia al controlador activo (el último inicializado), usado por las
   * funciones de módulo `contarLineasQueReferencian`/`desreferenciarParametro`.
   * @type {ProductosController | null}
   */
  let controladorActivo = null;

  /**
   * @typedef {Object} ProductosController
   * @property {() => void} init
   * @property {() => void} render
   * @property {(parametroId: string) => number} contarLineasQueReferencian
   * @property {(parametroId: string) => void} desreferenciarParametro
   */

  /**
   * Crea el controlador de la Calculadora y la lista de Productos.
   *
   * @param {Object} opciones
   * @param {() => Array<{id: string, nombre: string, precioUnitario: number, unidad: string}>} opciones.getParametros
   * @param {() => Array<{id: string, nombre: string, lineas: Array, precioTotal: number}>} opciones.getProductos
   * @param {(productos: Array) => void} opciones.setProductos
   * @returns {ProductosController}
   */
  function crearProductosController({
    getParametros,
    getProductos,
    setProductos,
  }) {
    if (typeof getParametros !== "function") {
      throw new TypeError("getParametros debe ser una función");
    }
    if (typeof getProductos !== "function") {
      throw new TypeError("getProductos debe ser una función");
    }
    if (typeof setProductos !== "function") {
      throw new TypeError("setProductos debe ser una función");
    }

    // Estado en edición: las líneas de la Calculadora del producto en edición.
    // Cada línea usa la forma de models.crearLinea: { parametroId, cantidad, subtotal }.
    // Aquí `cantidad` puede quedar como string crudo del input o null si está vacía;
    // se valida/convierte al calcular para conservar lo ingresado (Req 4.4).
    /** @type {Array<{ parametroId: string|null, cantidad: any, subtotal: number }>} */
    let lineas = [];

    /** @returns {HTMLElement|null} */
    const $ = (id) =>
      typeof document !== "undefined" ? document.getElementById(id) : null;

    /**
     * Agrega una nueva línea vacía (parámetro sin seleccionar, cantidad vacía).
     * Req 4.1.
     */
    function agregarLinea() {
      lineas.push(crearLinea(null, null));
      renderLineas();
    }

    /**
     * Elimina la línea en el índice indicado del producto en edición. Req 4.5.
     * @param {number} indice
     */
    function eliminarLinea(indice) {
      if (indice >= 0 && indice < lineas.length) {
        lineas.splice(indice, 1);
        renderLineas();
      }
    }

    /**
     * Devuelve el Parametro con el id indicado, o null si no existe.
     * @param {string|null} parametroId
     */
    function buscarParametro(parametroId) {
      if (parametroId == null) return null;
      const params = getParametros() || [];
      return params.find((p) => p && p.id === parametroId) || null;
    }

    // ─────────────────────────── Render de líneas ───────────────────────────

    /**
     * Renderiza todas las filas de líneas en #lineas-container, o la indicación
     * de estado vacío si no hay líneas (Req 4.6).
     */
    function renderLineas() {
      const contenedor = $(IDS.lineasContainer);
      if (!contenedor) return;

      contenedor.textContent = "";

      if (lineas.length === 0) {
        const vacio = document.createElement("p");
        vacio.className = "text-muted lp-lineas-vacias";
        vacio.textContent = "No hay líneas agregadas.";
        contenedor.appendChild(vacio);
        return;
      }

      lineas.forEach((linea, indice) => {
        contenedor.appendChild(construirFilaLinea(linea, indice));
      });
    }

    /**
     * Construye la fila del DOM de una línea de cálculo: selector de Parametro,
     * visualización de la Unidad, input de cantidad y botón de eliminar.
     * @param {{ parametroId: string|null, cantidad: any, subtotal: number }} linea
     * @param {number} indice
     * @returns {HTMLElement}
     */
    function construirFilaLinea(linea, indice) {
      const fila = document.createElement("div");
      fila.className = "row g-2 align-items-end mb-2 lp-linea";
      fila.dataset.indice = String(indice);

      // Columna: selector de Parametro (Req 4.2).
      const colParam = document.createElement("div");
      colParam.className = "col-12 col-md-5";
      const select = document.createElement("select");
      select.className = "form-select lp-linea-parametro";
      select.setAttribute("aria-label", "Parámetro de la línea");

      const optVacia = document.createElement("option");
      optVacia.value = "";
      optVacia.textContent = "Seleccione un parámetro";
      select.appendChild(optVacia);

      const params = getParametros() || [];
      params.forEach((p) => {
        if (!p) return;
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nombre;
        if (linea.parametroId === p.id) opt.selected = true;
        select.appendChild(opt);
      });
      // Si el parámetro referenciado ya no existe, el select cae en la opción vacía.
      select.value = linea.parametroId != null && buscarParametro(linea.parametroId)
        ? linea.parametroId
        : "";

      select.addEventListener("change", () => {
        linea.parametroId = select.value === "" ? null : select.value;
        actualizarUnidad(fila, linea);
      });
      colParam.appendChild(select);
      fila.appendChild(colParam);

      // Columna: cantidad.
      const colCant = document.createElement("div");
      colCant.className = "col-8 col-md-4";
      const inputCant = document.createElement("input");
      inputCant.type = "number";
      inputCant.className = "form-control lp-linea-cantidad";
      inputCant.min = "0.01";
      inputCant.max = "999999999.99";
      inputCant.step = "0.01";
      inputCant.placeholder = "Cantidad";
      inputCant.setAttribute("aria-label", "Cantidad de la línea");
      if (linea.cantidad != null && linea.cantidad !== "") {
        inputCant.value = String(linea.cantidad);
      }
      inputCant.addEventListener("input", () => {
        linea.cantidad = inputCant.value;
      });
      colCant.appendChild(inputCant);
      fila.appendChild(colCant);

      // Columna: visualización de la Unidad del Parametro seleccionado (Req 4.7).
      const colUnidad = document.createElement("div");
      colUnidad.className = "col-4 col-md-2";
      const unidadSpan = document.createElement("span");
      unidadSpan.className = "form-text lp-linea-unidad";
      colUnidad.appendChild(unidadSpan);
      fila.appendChild(colUnidad);

      // Columna: botón eliminar (Req 4.5).
      const colBtn = document.createElement("div");
      colBtn.className = "col-12 col-md-1";
      const btnEliminar = document.createElement("button");
      btnEliminar.type = "button";
      btnEliminar.className = "btn btn-outline-danger btn-sm lp-linea-eliminar";
      btnEliminar.textContent = "Eliminar";
      btnEliminar.setAttribute("aria-label", "Eliminar línea");
      btnEliminar.addEventListener("click", () => {
        const idx = Number(fila.dataset.indice);
        eliminarLinea(idx);
      });
      colBtn.appendChild(btnEliminar);
      fila.appendChild(colBtn);

      // Inicializar la unidad mostrada.
      actualizarUnidad(fila, linea);

      return fila;
    }

    /**
     * Actualiza el texto de la Unidad mostrada para una línea según su Parametro.
     * @param {HTMLElement} fila
     * @param {{ parametroId: string|null }} linea
     */
    function actualizarUnidad(fila, linea) {
      const span = fila.querySelector(".lp-linea-unidad");
      if (!span) return;
      const parametro = buscarParametro(linea.parametroId);
      span.textContent = parametro ? parametro.unidad : "";
    }

    // ─────────────────────────── Cálculo ───────────────────────────

    /**
     * Convierte el valor crudo de cantidad (string del input o número) a número,
     * devolviendo NaN si no es convertible. No usa parseFloat laxo para no aceptar
     * sufijos; valida que la cadena represente un número completo.
     * @param {any} valor
     * @returns {number}
     */
    function aNumeroCantidad(valor) {
      if (typeof valor === "number") return valor;
      if (typeof valor !== "string") return NaN;
      const recortado = valor.trim();
      if (recortado === "") return NaN;
      const n = Number(recortado);
      return Number.isFinite(n) ? n : NaN;
    }

    /**
     * Ejecuta el cálculo: valida el nombre, la existencia de al menos una línea,
     * la cantidad y el parámetro de cada línea, y muestra los subtotales y el
     * total en PEN. Muestra el mensaje de la PRIMERA condición incumplida
     * (Req 3.2, 3.3, 5.1–5.6). Conserva los datos ingresados ante el rechazo.
     */
    function calcular() {
      const inputNombre = /** @type {HTMLInputElement|null} */ ($(IDS.nombre));
      const nombre = inputNombre ? inputNombre.value : "";

      // 1) Validar nombre del producto (Req 3.2, 3.3).
      const vNombre = validarNombreProducto(nombre);
      if (!vNombre.valido) {
        notifier.error(vNombre.mensaje || "Nombre de producto inválido.");
        return;
      }

      // 2) Debe haber al menos una línea (Req 5.4).
      if (lineas.length === 0) {
        notifier.error(MENSAJES.SIN_LINEAS);
        return;
      }

      // 3) Toda cantidad debe ser válida (Req 5.5).
      for (const linea of lineas) {
        const cantidad = aNumeroCantidad(linea.cantidad);
        if (!validarCantidad(cantidad).valido) {
          notifier.error(MENSAJES.CANTIDAD_INVALIDA);
          return;
        }
      }

      // 4) Toda línea debe tener un parámetro seleccionado y existente (Req 5.6).
      for (const linea of lineas) {
        const parametro = buscarParametro(linea.parametroId);
        if (!parametro) {
          notifier.error(MENSAJES.SIN_PARAMETRO);
          return;
        }
      }

      // 5) Calcular subtotales y total (Req 5.1, 5.2).
      const lineasResueltas = lineas.map((linea) => {
        const parametro = buscarParametro(linea.parametroId);
        return {
          cantidad: aNumeroCantidad(linea.cantidad),
          precioUnitario: parametro.precioUnitario,
        };
      });

      const { subtotales, total } = calcularProducto(lineasResueltas);

      // Registrar los subtotales en las líneas en edición (para el guardado).
      lineas.forEach((linea, i) => {
        linea.subtotal = subtotales[i];
      });

      renderResultado(subtotales, total);
    }

    /**
     * Renderiza los subtotales por línea y el Precio_Total en PEN (Req 5.3).
     * @param {number[]} subtotales
     * @param {number} total
     */
    function renderResultado(subtotales, total) {
      const contenedor = $(IDS.resultado);
      if (!contenedor) return;

      contenedor.textContent = "";

      const lista = document.createElement("ul");
      lista.className = "list-group mb-2";
      subtotales.forEach((subtotal, i) => {
        const item = document.createElement("li");
        item.className =
          "list-group-item d-flex justify-content-between align-items-center lp-subtotal";
        const parametro = buscarParametro(lineas[i] ? lineas[i].parametroId : null);
        const etiqueta = document.createElement("span");
        etiqueta.textContent = `Línea ${i + 1}${parametro ? " · " + parametro.nombre : ""}`;
        const valor = document.createElement("span");
        valor.textContent = formatearPEN(subtotal);
        item.appendChild(etiqueta);
        item.appendChild(valor);
        lista.appendChild(item);
      });
      contenedor.appendChild(lista);

      const totalEl = document.createElement("p");
      totalEl.className = "h5 lp-precio-total";
      totalEl.textContent = `Precio total: ${formatearPEN(total)}`;
      contenedor.appendChild(totalEl);
    }

    // ─────────────────────────── Guardado ───────────────────────────

    /**
     * Guarda el Producto en edición: valida igual que el cálculo, construye el
     * Producto vía `crearProducto`, lo persiste vía `repository.saveProductos` y
     * re-renderiza la lista de Productos guardados (Req 8.7). Si la escritura no
     * es persistente, notifica (Req 6.6).
     */
    function guardar() {
      const inputNombre = /** @type {HTMLInputElement|null} */ ($(IDS.nombre));
      const nombre = inputNombre ? inputNombre.value : "";

      const vNombre = validarNombreProducto(nombre);
      if (!vNombre.valido) {
        notifier.error(vNombre.mensaje || "Nombre de producto inválido.");
        return;
      }
      if (lineas.length === 0) {
        notifier.error(MENSAJES.SIN_LINEAS);
        return;
      }
      for (const linea of lineas) {
        const cantidad = aNumeroCantidad(linea.cantidad);
        if (!validarCantidad(cantidad).valido) {
          notifier.error(MENSAJES.CANTIDAD_INVALIDA);
          return;
        }
      }
      for (const linea of lineas) {
        if (!buscarParametro(linea.parametroId)) {
          notifier.error(MENSAJES.SIN_PARAMETRO);
          return;
        }
      }

      // Resolver subtotales y total.
      const lineasResueltas = lineas.map((linea) => {
        const parametro = buscarParametro(linea.parametroId);
        return {
          cantidad: aNumeroCantidad(linea.cantidad),
          precioUnitario: parametro.precioUnitario,
        };
      });
      const { subtotales, total } = calcularProducto(lineasResueltas);

      // Construir las Lineas_De_Calculo persistibles.
      const lineasProducto = lineas.map((linea, i) => ({
        parametroId: linea.parametroId,
        cantidad: aNumeroCantidad(linea.cantidad),
        subtotal: subtotales[i],
      }));

      const producto = crearProducto(nombre.trim(), lineasProducto, total);

      const productos = (getProductos() || []).slice();
      productos.push(producto);

      const resultado = saveProductos(productos);
      // Actualizamos el estado en memoria en todo caso (Req 6.6: conservar en memoria).
      setProductos(productos);

      if (resultado && resultado.status === "failed") {
        notifier.error(
          "El producto se guardó en esta sesión, pero los cambios no se pudieron guardar de forma persistente."
        );
      } else {
        notifier.info("Producto guardado.");
      }

      renderListaProductos();
    }

    // ─────────────────────── Lista de Productos guardados ───────────────────────

    /**
     * Renderiza la lista de Productos guardados (nombre + Precio_Total en PEN).
     * Req 8.7. Muestra indicación de estado vacío si no hay Productos.
     */
    function renderListaProductos() {
      const contenedor = $(IDS.listaProductos);
      if (!contenedor) return;

      contenedor.textContent = "";

      const productos = getProductos() || [];
      if (productos.length === 0) {
        const vacio = document.createElement("p");
        vacio.className = "text-muted lp-productos-vacios";
        vacio.textContent = "No hay productos guardados.";
        contenedor.appendChild(vacio);
        return;
      }

      const lista = document.createElement("ul");
      lista.className = "list-group";
      productos.forEach((producto) => {
        if (!producto) return;
        const item = document.createElement("li");
        item.className =
          "list-group-item d-flex justify-content-between align-items-center lp-producto";
        const nombreEl = document.createElement("span");
        nombreEl.className = "lp-producto-nombre";
        nombreEl.textContent = producto.nombre;
        const precioEl = document.createElement("span");
        precioEl.className = "badge bg-success rounded-pill lp-producto-precio";
        precioEl.textContent = formatearPEN(producto.precioTotal);
        item.appendChild(nombreEl);
        item.appendChild(precioEl);
        lista.appendChild(item);
      });
      contenedor.appendChild(lista);
    }

    // ─────────────────────────── API pública ───────────────────────────

    /**
     * Cuenta cuántas líneas en edición referencian el parametroId indicado (Req 2.4).
     * @param {string} parametroId
     * @returns {number}
     */
    function contarLineasQueReferencian(parametroId) {
      if (parametroId == null) return 0;
      return lineas.reduce(
        (conteo, linea) => (linea.parametroId === parametroId ? conteo + 1 : conteo),
        0
      );
    }

    /**
     * Marca como "sin parámetro" (parametroId = null) las líneas en edición que
     * referenciaban el parametroId indicado; el resto no cambia (Req 2.4).
     * @param {string} parametroId
     */
    function desreferenciarParametro(parametroId) {
      if (parametroId == null) return;
      let afectadas = false;
      lineas.forEach((linea) => {
        if (linea.parametroId === parametroId) {
          linea.parametroId = null;
          afectadas = true;
        }
      });
      if (afectadas) {
        renderLineas();
      }
    }

    /**
     * Re-renderiza líneas y lista de Productos (p. ej. al cambiar los Parametros
     * externos, para que el selector y las unidades reflejen los vigentes).
     */
    function render() {
      renderLineas();
      renderListaProductos();
    }

    /**
     * Cablea los controles del DOM y renderiza el estado inicial.
     */
    function init() {
      const btnAgregar = $(IDS.btnAgregarLinea);
      if (btnAgregar) btnAgregar.addEventListener("click", agregarLinea);

      const btnCalcular = $(IDS.btnCalcular);
      if (btnCalcular) btnCalcular.addEventListener("click", calcular);

      const btnGuardar = $(IDS.btnGuardar);
      if (btnGuardar) btnGuardar.addEventListener("click", guardar);

      render();
    }

    /** @type {ProductosController} */
    const controlador = {
      init,
      render,
      contarLineasQueReferencian,
      desreferenciarParametro,
    };

    // Registrar como controlador activo para las funciones de módulo.
    controladorActivo = controlador;

    return controlador;
  }

  /**
   * Cuenta las líneas de la Calculadora activa que referencian el parametroId
   * indicado. Operan sobre el controlador activo (último inicializado). Devuelve
   * 0 si no hay controlador activo (Req 2.4).
   * @param {string} parametroId
   * @returns {number}
   */
  function contarLineasQueReferencian(parametroId) {
    return controladorActivo
      ? controladorActivo.contarLineasQueReferencian(parametroId)
      : 0;
  }

  /**
   * Desreferencia el parametroId indicado en las líneas de la Calculadora activa
   * (las marca como "sin parámetro"). No hace nada si no hay controlador activo
   * (Req 2.4).
   * @param {string} parametroId
   */
  function desreferenciarParametro(parametroId) {
    if (controladorActivo) {
      controladorActivo.desreferenciarParametro(parametroId);
    }
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.productosController = {
      MENSAJES,
      IDS,
      crearProductosController,
      contarLineasQueReferencian,
      desreferenciarParametro,
    };
})(window);
