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
  const redondear2 = (...args) => window.LP.calculo.redondear2(...args);
  const crearProducto = (...args) => window.LP.models.crearProducto(...args);
  const saveProductos = (...args) => window.LP.repository.saveProductos(...args);
  const crearEditorDeLineas = (...args) =>
    window.LP.lineasEditor.crearEditorDeLineas(...args);
  // Alias a los mensajes exactos de validación (línea de producto, ciclos, etc.).
  const validationMensajes = () => window.LP.validation.MENSAJES;
  // Valores de Fuente_De_Componente publicados por models (con fallback seguro).
  const fuenteComponente = () =>
    (window.LP.models && window.LP.models.FUENTE_COMPONENTE) || {
      PARAMETRO: "Parámetro",
      PRODUCTO: "Producto",
    };
  const productosOps = {
    NOMBRE_PARAMETRO_AUSENTE: () => window.LP.productosOps.NOMBRE_PARAMETRO_AUSENTE,
    resolverDetalle: (...args) => window.LP.productosOps.resolverDetalle(...args),
    resolverPrecioUnitario: (...args) =>
      window.LP.productosOps.resolverPrecioUnitario(...args),
    calcularContenedor: (...args) =>
      window.LP.productosOps.calcularContenedor(...args),
    validarLineasProducto: (...args) =>
      window.LP.productosOps.validarLineasProducto(...args),
    detectarCicloComposicion: (...args) =>
      window.LP.productosOps.detectarCicloComposicion(...args),
    editarProducto: (...args) => window.LP.productosOps.editarProducto(...args),
    eliminarProducto: (...args) => window.LP.productosOps.eliminarProducto(...args),
  };
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
    // Boton_De_Orden de la Lista_De_Productos (Req 1.1).
    btnOrdenar: "btn-ordenar-productos",
    // Ventana_Detalle (Req 2.x)
    modalDetalle: "modal-detalle",
    modalDetalleTitulo: "modal-detalle-titulo",
    modalDetalleLineas: "modal-detalle-lineas",
    modalDetalleTotal: "modal-detalle-total",
    // Ventana_Edicion (Req 3.x)
    modalEdicion: "modal-edicion",
    modalEdicionTitulo: "modal-edicion-titulo",
    modalEdicionNombre: "modal-edicion-nombre",
    modalEdicionLineas: "modal-edicion-lineas",
    btnAgregarLineaEdicion: "btn-agregar-linea-edicion",
    btnCancelarEdicion: "btn-cancelar-edicion",
    btnGuardarEdicion: "btn-guardar-edicion",
  };

  /**
   * Mensaje exacto mostrado cuando una edición o eliminación se aplica en la
   * sesión actual pero no se pudo persistir en el Almacenamiento_Local (Req 4.5,
   * 5.3).
   * @type {string}
   */
  const MENSAJE_NO_PERSISTENTE =
    "Los cambios se aplicaron en esta sesión, pero no se pudieron guardar de forma persistente.";

  /**
   * Mensaje exacto de la confirmación previa a eliminar un Producto (Req 4.1).
   * @type {string}
   */
  const MENSAJE_CONFIRMAR_ELIMINACION =
    "¿Seguro que deseas eliminar este producto? Esta acción no se puede deshacer.";

  // Divisor_De_Sugerido: constante (Req 2.2).
  const DIVISOR_DE_SUGERIDO = 0.6;

  /**
   * Calcula el Precio_Sugerido como redondear2(precioTotal / 0.60) (Req 2.2).
   * Protege la entrada: si precioTotal no es finito o es negativo, se trata como 0
   * (Req 2.7, 2.8), de modo que el resultado sea 0 y formatearPEN no produzca
   * "S/ NaN". Devuelve un número finito listo para formatearPEN.
   *
   * @param {number} precioTotal
   * @returns {number} Precio_Sugerido finito (>= 0)
   */
  function calcularPrecioSugerido(precioTotal) {
    const base =
      Number.isFinite(precioTotal) && precioTotal >= 0 ? precioTotal : 0;
    const sugerido = redondear2(base / DIVISOR_DE_SUGERIDO);
    return Number.isFinite(sugerido) ? sugerido : 0;
  }

  /**
   * Convierte un botón en un Boton_De_Icono: vacía su texto directo, fija el
   * Nombre_Accesible exacto en `aria-label` y `title`, y le añade un glifo `<i>`
   * de Bootstrap Icons (marcado `aria-hidden="true"`) más una etiqueta de texto
   * visualmente oculta que sirve de fallback para lectores de pantalla y para el
   * caso en que la fuente de iconos no cargue (Req 2, 4, 5).
   *
   * Se preservan intactos las clases y el cableado del botón: este helper solo
   * modifica el contenido interno y los atributos accesibles.
   *
   * @param {HTMLButtonElement} boton  Botón ya con sus clases/colores aplicados.
   * @param {string} claseIcono        Clase del glifo, p. ej. "bi-eye".
   * @param {string} accion            Nombre exacto de la acción, p. ej. "Ver detalle".
   */
  function convertirEnBotonDeIcono(boton, claseIcono, accion) {
    boton.textContent = ""; // sin texto directo (evita nombre accesible duplicado)
    boton.setAttribute("aria-label", accion); // Nombre_Accesible (Req 4.6)
    boton.setAttribute("title", accion); // idéntico a aria-label (Req 4.6)

    const glifo = document.createElement("i");
    glifo.className = "bi " + claseIcono; // p. ej. "bi bi-eye" (Req 2.1)
    glifo.setAttribute("aria-hidden", "true"); // el glifo no aporta nombre (Req 4.7)

    const etiqueta = document.createElement("span");
    etiqueta.className = "lp-accion-texto visually-hidden"; // fallback (Req 5.4)
    etiqueta.textContent = accion;

    boton.appendChild(glifo);
    boton.appendChild(etiqueta);
  }

  // ─────────────────── Comparador_De_Nombres (Req 1.7, 1.8) ───────────────────
  //
  // Comparador_De_Nombres: locale 'es', sensibilidad base (ignora
  // mayúsculas/minúsculas y diacríticos), ordena `ñ` y las vocales acentuadas
  // según el alfabeto español (Req 1.7, 1.8). Se crea una sola vez a nivel de
  // módulo. `Intl.Collator` es parte de la plataforma (no requiere dependencias).
  const colacionNombres = new Intl.Collator("es", { sensitivity: "base" });

  /**
   * Normaliza el Nombre_Mostrado a efectos de comparación: devuelve `""` para
   * `null`/`undefined` (Req 1.9) y `String(nombre)` en cualquier otro caso. No
   * recorta espacios: la especificación define "vacío" respecto al valor del
   * nombre, y el tratamiento de `null`/ausente es explícito.
   * @param {string|null|undefined} nombre
   * @returns {string}
   */
  function normalizarNombre(nombre) {
    return nombre == null ? "" : String(nombre);
  }

  /**
   * Devuelve una NUEVA lista de Productos ordenada por Nombre_Mostrado según la
   * Direccion_De_Orden, sin mutar la lista de entrada (Req 1.5, 1.6).
   *
   * Reglas:
   *  - Los Productos con Nombre_Mostrado normalizado igual a "" van al inicio en
   *    `ascendente` (Req 1.10) y al final en `descendente` (Req 1.11),
   *    conservando su orden relativo original (estabilidad, Req 1.12).
   *  - Los no vacíos se ordenan con el Comparador_De_Nombres; en `descendente` se
   *    invierte el sentido. Los empates (`compare === 0`) conservan el orden
   *    previo gracias a la desempate por índice original (Req 1.9, 1.12).
   *
   * @param {Array<{nombre?: string|null}>} productos
   * @param {"ascendente"|"descendente"} direccion
   * @returns {Array} nueva lista ordenada (copia)
   */
  function ordenarProductos(productos, direccion) {
    const lista = (productos || []).slice(); // copia defensiva (no mutar entrada)
    const esDescendente = direccion === "descendente";

    // Partición conservando el orden original dentro de cada grupo (Req 1.12).
    const vacios = [];
    const noVacios = [];
    lista.forEach((producto, indice) => {
      const nombre = normalizarNombre(producto && producto.nombre);
      if (nombre === "") vacios.push({ producto, indice });
      else noVacios.push({ producto, indice });
    });

    noVacios.sort((a, b) => {
      const cmp = colacionNombres.compare(
        normalizarNombre(a.producto.nombre),
        normalizarNombre(b.producto.nombre)
      );
      if (cmp !== 0) return esDescendente ? -cmp : cmp;
      // Empate: preservar el orden previo (estabilidad, Req 1.12).
      return a.indice - b.indice;
    });

    const ordenados = noVacios.map((e) => e.producto);
    const vaciosProductos = vacios.map((e) => e.producto);

    // Vacíos al inicio (ascendente) o al final (descendente) (Req 1.10, 1.11).
    return esDescendente
      ? ordenados.concat(vaciosProductos)
      : vaciosProductos.concat(ordenados);
  }

  /**
   * Referencia al controlador activo (el último inicializado), usado por las
   * funciones de módulo `contarLineasQueReferencian`/`desreferenciarParametro`.
   * @type {ProductosController | null}
   */
  let controladorActivo = null;

  // ─────────────────────── Helper de control de modales ───────────────────────
  //
  // Controla la apertura y el cierre de un modal de forma reutilizable por la
  // Ventana_Detalle y la Ventana_Edicion. Cuando la API de Bootstrap está
  // disponible (`window.bootstrap && window.bootstrap.Modal`) usa
  // `new bootstrap.Modal(el).show()/.hide()`. En su ausencia (p. ej. el bundle no
  // cargó bajo file://), recurre a un control manual mínimo: alterna la clase
  // `d-none` sobre el elemento del modal y gestiona un backdrop propio, en línea
  // con la degradación segura del diseño. Todos los accesos al DOM se guardan
  // contra `null`. Mostrar/ocultar no muta ningún dato (Req 2.6).

  /**
   * Indica si la API de Bootstrap Modal está disponible en el entorno actual.
   * @returns {boolean}
   */
  function hayBootstrapModal() {
    return (
      typeof window !== "undefined" &&
      typeof window.bootstrap !== "undefined" &&
      !!window.bootstrap.Modal
    );
  }

  /** Id del backdrop manual usado por el fallback. */
  const BACKDROP_MANUAL_ID = "lp-modal-backdrop-manual";

  /**
   * Muestra un backdrop propio (fallback) si no existe aún.
   */
  function mostrarBackdropManual() {
    if (typeof document === "undefined" || !document.body) return;
    if (document.getElementById(BACKDROP_MANUAL_ID)) return;
    const backdrop = document.createElement("div");
    backdrop.id = BACKDROP_MANUAL_ID;
    backdrop.className = "modal-backdrop fade show";
    document.body.appendChild(backdrop);
  }

  /**
   * Oculta y elimina el backdrop propio (fallback), si existe.
   */
  function ocultarBackdropManual() {
    if (typeof document === "undefined") return;
    const backdrop = document.getElementById(BACKDROP_MANUAL_ID);
    if (backdrop && backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }
  }

  /**
   * Muestra el modal indicado. Usa la API de Bootstrap cuando está disponible; en
   * caso contrario, alterna `d-none`/`show` y muestra un backdrop propio.
   * Degrada de forma segura si `el` es null.
   * @param {HTMLElement|null} el Elemento raíz del modal (`.modal`).
   */
  function mostrarModal(el) {
    if (!el) return;
    if (hayBootstrapModal()) {
      const instancia =
        window.bootstrap.Modal.getOrCreateInstance
          ? window.bootstrap.Modal.getOrCreateInstance(el)
          : new window.bootstrap.Modal(el);
      instancia.show();
      return;
    }
    // Fallback manual: mostrar el modal alternando d-none + clases de Bootstrap.
    el.classList.remove("d-none");
    el.classList.add("show");
    el.style.display = "block";
    el.setAttribute("aria-hidden", "false");
    el.setAttribute("aria-modal", "true");
    mostrarBackdropManual();
  }

  /**
   * Oculta el modal indicado. Usa la API de Bootstrap cuando está disponible; en
   * caso contrario, alterna `d-none`/`show` y elimina el backdrop propio. No muta
   * ningún dato (Req 2.6). Degrada de forma segura si `el` es null.
   * @param {HTMLElement|null} el Elemento raíz del modal (`.modal`).
   */
  function ocultarModal(el) {
    if (!el) return;
    if (hayBootstrapModal()) {
      const instancia =
        window.bootstrap.Modal.getOrCreateInstance
          ? window.bootstrap.Modal.getOrCreateInstance(el)
          : new window.bootstrap.Modal(el);
      instancia.hide();
      return;
    }
    // Fallback manual.
    el.classList.add("d-none");
    el.classList.remove("show");
    el.style.display = "none";
    el.setAttribute("aria-hidden", "true");
    el.removeAttribute("aria-modal");
    ocultarBackdropManual();
  }

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

    // Editor de líneas reutilizable de la Calculadora (window.LP.lineasEditor).
    // Se crea de forma perezosa en `init()` cuando el DOM está disponible, sobre
    // #lineas-container y cableado a #btn-agregar-linea. Mantiene el estado de las
    // líneas en edición (parametroId + cantidad cruda) y expone `getLineas()`.
    // Req 3.3: la Calculadora reutiliza exactamente el mismo mecanismo de líneas.
    /** @type {import("./lineas.editor.js").EditorDeLineas | null} */
    let editorLineas = null;

    // Editor de líneas reutilizable de la Ventana_Edicion. Se instancia de forma
    // perezosa la primera vez que se abre la edición (`abrirEdicion`), apuntando
    // a #modal-edicion-lineas y cableado a #btn-agregar-linea-edicion. Mantiene su
    // propio estado de líneas en edición (deep-copy de las del Producto), aislado
    // del Producto original hasta que se guarda (Req 3.2, 3.9).
    /** @type {import("./lineas.editor.js").EditorDeLineas | null} */
    let editorEdicion = null;

    // Id y nombre originales del Producto_Seleccionado en edición. Se conservan al
    // guardar (Req 3.5). `null` cuando no hay edición en curso.
    /** @type {string|null} */
    let edicionId = null;

    // Estado de la Direccion_De_Orden de la Lista_De_Productos (Req 1.2).
    // Valores válidos: 'ascendente' | 'descendente'. Inicial: 'ascendente'.
    /** @type {"ascendente"|"descendente"} */
    let direccionDeOrden = "ascendente";

    /** @returns {HTMLElement|null} */
    const $ = (id) =>
      typeof document !== "undefined" ? document.getElementById(id) : null;

    /**
     * Devuelve las líneas en edición de la Calculadora leídas del editor de
     * líneas, o una lista vacía si el editor aún no se ha instanciado.
     * @returns {Array<{ parametroId: string|null, cantidad: any, subtotal: number }>}
     */
    function obtenerLineas() {
      return editorLineas ? editorLineas.getLineas() : [];
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

    /**
     * Devuelve el Producto con el id indicado, o null si no existe.
     * @param {string|null} productoId
     */
    function buscarProducto(productoId) {
      if (productoId == null) return null;
      const productos = getProductos() || [];
      return productos.find((p) => p && p.id === productoId) || null;
    }

    /**
     * Devuelve el nombre del componente de una línea en edición para las
     * etiquetas del resultado del cálculo: nombre del Parametro para las
     * Lineas_De_Parametro, o nombre del Producto_Componente para las
     * Lineas_De_Producto. Devuelve cadena vacía si no hay componente resoluble.
     * @param {{ parametroId?: string|null, productoComponenteId?: string|null, fuenteDeComponente?: string }|null} linea
     * @returns {string}
     */
    function nombreComponenteLinea(linea) {
      if (!linea) return "";
      if (esLineaDeProducto(linea)) {
        const componente = buscarProducto(linea.productoComponenteId);
        return componente ? componente.nombre : "";
      }
      const parametro = buscarParametro(linea.parametroId);
      return parametro ? parametro.nombre : "";
    }

    /**
     * ¿La línea en edición es una Linea_De_Producto (Fuente_De_Componente
     * "Producto")? Una línea sin `fuenteDeComponente` registrada se interpreta
     * como Linea_De_Parametro (retrocompatibilidad, Req 7.2, 7.3).
     * @param {{ fuenteDeComponente?: string }} linea
     * @returns {boolean}
     */
    function esLineaDeProducto(linea) {
      const F = fuenteComponente();
      return !!linea && linea.fuenteDeComponente === F.PRODUCTO;
    }

    /**
     * Valida las líneas en edición combinando la validación de las
     * Lineas_De_Parametro (comportamiento previo: cantidad y parámetro por línea)
     * con la validación acumulativa de las Lineas_De_Producto vía
     * `productosOps.validarLineasProducto` (Req 4.1–4.5), y la detección de
     * Ciclos_De_Composicion vía `productosOps.detectarCicloComposicion`
     * (Req 5.1–5.5).
     *
     * Devuelve `{ valido: true }` cuando todas las líneas son válidas y no hay
     * ciclo. En caso contrario, devuelve `{ valido: false, mensaje }` con el
     * mensaje EXACTO a mostrar vía `notifier.error`, conservando la edición sin
     * cambios (el llamador retorna temprano y no persiste).
     *
     * @param {Array<{ parametroId: string|null, cantidad: any, fuenteDeComponente?: string, productoComponenteId?: string|null }>} lineas
     * @param {string|null} idContenedor Id del Producto_Contenedor en edición, o
     *   null al crear uno nuevo (Calculadora / guardado nuevo).
     * @returns {{ valido: true } | { valido: false, mensaje: string }}
     */
    function validarLineasEnEdicion(lineas, idContenedor) {
      const MENSAJES_VAL = validationMensajes();
      const productos = getProductos() || [];

      // 1) Validación de las Lineas_De_Parametro (comportamiento previo). Para
      //    cada línea de parámetro, la cantidad debe ser válida y el parámetro
      //    debe estar seleccionado y existir. Se muestra el mensaje de la PRIMERA
      //    condición incumplida, preservando el orden previo (cantidad y luego
      //    parámetro) por compatibilidad con la Calculadora/Edicion existentes.
      for (const linea of lineas) {
        if (esLineaDeProducto(linea)) continue;
        const cantidad = aNumeroCantidad(linea.cantidad);
        if (!validarCantidad(cantidad).valido) {
          return { valido: false, mensaje: MENSAJES.CANTIDAD_INVALIDA };
        }
      }
      for (const linea of lineas) {
        if (esLineaDeProducto(linea)) continue;
        if (!buscarParametro(linea.parametroId)) {
          return { valido: false, mensaje: MENSAJES.SIN_PARAMETRO };
        }
      }

      // 2) Validación acumulativa de las Lineas_De_Producto (Req 4.1–4.5, 6.4).
      const resultado = productosOps.validarLineasProducto(
        lineas,
        productos,
        idContenedor
      );
      if (!resultado.valido) {
        const errores = resultado.errores || [];
        // Determinar el mensaje según los tipos de error acumulados. Se prioriza
        // el mensaje de referencia/selección de producto (sin-producto /
        // producto-inexistente) sobre el de cantidad, pues describe el defecto
        // estructural de la Linea_De_Producto (Req 4.1, 4.2, 6.4).
        const hayProblemaProducto = errores.some(
          (e) => e.tipo === "sin-producto" || e.tipo === "producto-inexistente"
        );
        if (hayProblemaProducto) {
          return { valido: false, mensaje: MENSAJES_VAL.LINEA_SIN_PRODUCTO };
        }
        return { valido: false, mensaje: MENSAJES.CANTIDAD_INVALIDA };
      }

      // 3) Detección de Ciclos_De_Composicion (Req 5.1–5.5). Solo aplica cuando
      //    hay Lineas_De_Producto; para productos puramente de parámetro no hay
      //    grafo de composición y `detectarCicloComposicion` devuelve
      //    `{ hayCiclo: false }`.
      const hayLineasDeProducto = lineas.some((linea) => esLineaDeProducto(linea));
      if (hayLineasDeProducto) {
        // Para un Producto nuevo (sin id aún) no puede existir una auto-referencia
        // directa, pues ninguna línea puede referenciar un id inexistente; se usa
        // un id placeholder que no colisiona con ningún Producto guardado para
        // evaluar los ciclos indirectos (Req 5.2).
        const idParaCiclos =
          idContenedor == null ? "__nuevo_producto__" : idContenedor;
        const ciclo = productosOps.detectarCicloComposicion(
          idParaCiclos,
          lineas,
          productos
        );
        if (ciclo && ciclo.hayCiclo) {
          return { valido: false, mensaje: mensajeDeCiclo(ciclo) };
        }
      }

      return { valido: true };
    }

    /**
     * Traduce el resultado de `detectarCicloComposicion` al mensaje EXACTO de
     * `validation.MENSAJES` que corresponde (Req 5.1–5.5).
     * @param {{ tipo: string, secuencia?: string[], productoId?: string }} ciclo
     * @returns {string}
     */
    function mensajeDeCiclo(ciclo) {
      const MENSAJES_VAL = validationMensajes();
      switch (ciclo.tipo) {
        case "directo":
          return MENSAJES_VAL.CICLO_DIRECTO;
        case "indirecto": {
          const secuencia =
            Array.isArray(ciclo.secuencia) && ciclo.secuencia.length > 0
              ? " " + ciclo.secuencia.join(" → ")
              : "";
          return MENSAJES_VAL.CICLO_INDIRECTO + secuencia;
        }
        case "profundidad":
        case "tiempo":
          return MENSAJES_VAL.COMPOSICION_DEMASIADO_PROFUNDA;
        case "referencia-no-resoluble":
          return MENSAJES_VAL.REFERENCIA_PRODUCTO_NO_DISPONIBLE;
        default:
          return MENSAJES_VAL.REFERENCIA_PRODUCTO_NO_DISPONIBLE;
      }
    }

    /**
     * Construye una Linea_De_Calculo persistible a partir de una línea en edición
     * y su subtotal recalculado, conservando la Fuente_De_Componente y las
     * referencias que correspondan (Req 7.1):
     *  - Siempre incluye `parametroId` (null si no aplica), `cantidad` numérica y
     *    `subtotal`, preservando la forma retrocompatible de las
     *    Lineas_De_Parametro.
     *  - Conserva `fuenteDeComponente` cuando está presente en la línea en edición
     *    (el editor lo normaliza a "Parámetro"/"Producto").
     *  - Conserva `productoComponenteId` cuando está presente (null si no aplica),
     *    para las Lineas_De_Producto.
     * @param {{ parametroId?: string|null, cantidad: any, fuenteDeComponente?: string, productoComponenteId?: string|null }} linea
     * @param {number} subtotal
     * @returns {object}
     */
    function construirLineaPersistible(linea, subtotal) {
      const origen = linea || {};
      const persistible = {
        parametroId: origen.parametroId == null ? null : origen.parametroId,
        cantidad: aNumeroCantidad(origen.cantidad),
        subtotal,
      };
      if (origen.fuenteDeComponente != null) {
        persistible.fuenteDeComponente = origen.fuenteDeComponente;
      }
      if (origen.productoComponenteId !== undefined) {
        persistible.productoComponenteId =
          origen.productoComponenteId == null ? null : origen.productoComponenteId;
      }
      return persistible;
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

      const lineas = obtenerLineas();

      // 2) Debe haber al menos una línea (Req 5.4).
      if (lineas.length === 0) {
        notifier.error(MENSAJES.SIN_LINEAS);
        return;
      }

      // 3) Validar Lineas_De_Parametro (cantidad + parámetro) y Lineas_De_Producto
      //    (sin producto / inexistente / cantidad, Req 4.1–4.5) y detectar
      //    Ciclos_De_Composicion (Req 5.1–5.5). La Calculadora crea un Producto
      //    nuevo, por lo que no hay Producto_Contenedor con id (idContenedor null).
      const validacion = validarLineasEnEdicion(lineas, null);
      if (!validacion.valido) {
        notifier.error(validacion.mensaje);
        return;
      }

      // 4) Calcular subtotales y total resolviendo el precio unitario por fuente
      //    (Parametro => precioUnitario; Producto => precioTotal vigente). Los
      //    productos vigentes se usan para resolver las Lineas_De_Producto.
      const { subtotales, total } = productosOps.calcularContenedor(
        lineas,
        getParametros() || [],
        getProductos() || []
      );

      // Registrar los subtotales en las líneas en edición (para el guardado).
      lineas.forEach((linea, i) => {
        linea.subtotal = subtotales[i];
      });

      renderResultado(subtotales, total, lineas);
    }

    /**
     * Renderiza los subtotales por línea y el Precio_Total en PEN (Req 5.3).
     * @param {number[]} subtotales
     * @param {number} total
     * @param {Array<{ parametroId: string|null }>} lineas Líneas en edición usadas para las etiquetas.
     */
    function renderResultado(subtotales, total, lineas) {
      const contenedor = $(IDS.resultado);
      if (!contenedor) return;

      contenedor.textContent = "";

      const lista = document.createElement("ul");
      lista.className = "list-group mb-2";
      subtotales.forEach((subtotal, i) => {
        const item = document.createElement("li");
        item.className =
          "list-group-item d-flex justify-content-between align-items-center lp-subtotal";
        const lineaActual = lineas[i] || null;
        const etiqueta = document.createElement("span");
        etiqueta.textContent = `Línea ${i + 1}${
          nombreComponenteLinea(lineaActual)
            ? " · " + nombreComponenteLinea(lineaActual)
            : ""
        }`;
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

      const lineas = obtenerLineas();

      if (lineas.length === 0) {
        notifier.error(MENSAJES.SIN_LINEAS);
        return;
      }

      // Validar Lineas_De_Parametro y Lineas_De_Producto y detectar ciclos
      // (Req 4.1–4.5, 5.1–5.5). Al guardar un Producto nuevo no hay id de
      // contenedor todavía (idContenedor null).
      const validacion = validarLineasEnEdicion(lineas, null);
      if (!validacion.valido) {
        notifier.error(validacion.mensaje);
        return;
      }

      // Resolver subtotales y total por fuente (Parametro => precioUnitario;
      // Producto => precioTotal vigente del Producto_Componente, Req 3.1, 6.3).
      const { subtotales, total } = productosOps.calcularContenedor(
        lineas,
        getParametros() || [],
        getProductos() || []
      );

      // Construir las Lineas_De_Calculo persistibles conservando la
      // Fuente_De_Componente y las referencias (parametroId /
      // productoComponenteId) según corresponda (Req 7.1).
      const lineasProducto = lineas.map((linea, i) =>
        construirLineaPersistible(linea, subtotales[i])
      );

      // Al crear un Producto nuevo, su Unidad_De_Producto vale "UND"
      // (crearProducto ya lo fija por defecto, Req 9.1).
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

      // Reiniciar el Formulario_De_Calculadora tras un Guardado_Exitoso
      // (Req 1.1–1.4, 1.6). Se alcanza solo si no hubo retorno temprano por
      // Guardado_Rechazado (Req 1.5), cubriendo el éxito normal y la
      // Persistencia_Fallida, con el Producto ya presente en la lista.
      reiniciarFormulario();
    }

    /**
     * Reinicia el Formulario_De_Calculadora al Estado_Inicial_En_Blanco tras un
     * Guardado_Exitoso (Req 1.1, 1.2, 1.3):
     *   (a) fija el campo de nombre (#producto-nombre) en cadena vacía;
     *   (b) elimina todas las Lineas_De_Calculo en edición vía
     *       editorLineas.setLineas([]) (deja cero líneas y muestra la indicación
     *       de estado vacío "No hay líneas agregadas.");
     *   (c) limpia el Area_De_Resultado (#resultado-calculo) poniendo su
     *       textContent en "".
     * Cada acceso al DOM se guarda contra null (degradación segura, file://).
     */
    function reiniciarFormulario() {
      const inputNombre = /** @type {HTMLInputElement|null} */ ($(IDS.nombre));
      if (inputNombre) inputNombre.value = "";

      if (editorLineas) editorLineas.setLineas([]);

      const resultado = $(IDS.resultado);
      if (resultado) resultado.textContent = "";
    }

    // ─────────────────────── Lista de Productos guardados ───────────────────────

    /**
     * Renderiza la lista de Productos guardados. Por cada Producto muestra el
     * nombre, el Precio_Total en PEN (2 decimales) y tres botones: Ver detalle,
     * Editar y Eliminar. Cada `<li>` lleva `data-id` con el id del Producto y los
     * botones se cablean para invocar `abrirDetalle`, `abrirEdicion` y
     * `confirmarYEliminar` con ese id (Req 1.1, 1.3, 1.4, 1.5). Muestra la
     * indicación de estado vacío, sin botones, si no hay Productos (Req 1.2).
     */
    function renderListaProductos() {
      const contenedor = $(IDS.listaProductos);
      if (!contenedor) return;

      contenedor.textContent = "";

      // Estado vacío evaluado ANTES de ordenar, sobre la lista original
      // (Req 1.13); conserva el marcado existente sin invocar el ordenamiento.
      const productosOriginales = getProductos() || [];
      if (productosOriginales.length === 0) {
        const vacio = document.createElement("p");
        vacio.className = "text-muted lp-productos-vacios";
        vacio.textContent = "No hay productos guardados.";
        contenedor.appendChild(vacio);
        return;
      }

      // Renderizar desde una copia ordenada por Nombre_Mostrado según la
      // Direccion_De_Orden actual, sin mutar el arreglo devuelto por
      // getProductos() (Req 1.5, 1.6).
      const productos = ordenarProductos(getProductos().slice(), direccionDeOrden);

      const lista = document.createElement("ul");
      lista.className = "list-group";
      productos.forEach((producto) => {
        if (!producto) return;
        const item = document.createElement("li");
        item.className =
          "list-group-item d-flex justify-content-between align-items-center lp-producto";
        item.setAttribute("data-id", producto.id);

        // Bloque de información: nombre + Precio_Total (Req 1.1).
        const info = document.createElement("div");
        info.className = "d-flex align-items-center gap-2";
        const nombreEl = document.createElement("span");
        nombreEl.className = "lp-producto-nombre";
        nombreEl.textContent = producto.nombre;
        const precioEl = document.createElement("span");
        precioEl.className = "badge bg-success rounded-pill lp-producto-precio";
        precioEl.textContent = formatearPEN(producto.precioTotal);
        // Badge_Sugerido: Precio_Sugerido a la derecha del badge verde (Req 2.1, 2.3, 2.4, 2.5, 2.7, 2.8).
        const sugeridoEl = document.createElement("span");
        sugeridoEl.className = "badge rounded-pill lp-producto-sugerido";
        sugeridoEl.textContent = formatearPEN(
          calcularPrecioSugerido(producto.precioTotal)
        );
        info.appendChild(nombreEl);
        info.appendChild(precioEl);
        info.appendChild(sugeridoEl);

        // Bloque de acciones: Ver detalle / Editar / Eliminar (Req 1.1).
        const acciones = document.createElement("div");
        acciones.className = "btn-group";
        acciones.setAttribute("role", "group");

        const btnDetalle = document.createElement("button");
        btnDetalle.type = "button";
        btnDetalle.className = "btn btn-outline-secondary btn-sm lp-producto-detalle";
        convertirEnBotonDeIcono(btnDetalle, "bi-eye", "Ver detalle");

        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "btn btn-outline-primary btn-sm lp-producto-editar";
        convertirEnBotonDeIcono(btnEditar, "bi-pencil", "Editar");

        const btnEliminar = document.createElement("button");
        btnEliminar.type = "button";
        btnEliminar.className = "btn btn-outline-danger btn-sm lp-producto-eliminar";
        convertirEnBotonDeIcono(btnEliminar, "bi-trash", "Eliminar");

        // Cablear cada botón usando el id leído del atributo data-id del <li>
        // (Req 1.3, 1.4, 1.5).
        btnDetalle.addEventListener("click", () => {
          abrirDetalle(item.getAttribute("data-id"));
        });
        btnEditar.addEventListener("click", () => {
          abrirEdicion(item.getAttribute("data-id"));
        });
        btnEliminar.addEventListener("click", () => {
          confirmarYEliminar(item.getAttribute("data-id"));
        });

        acciones.appendChild(btnDetalle);
        acciones.appendChild(btnEditar);
        acciones.appendChild(btnEliminar);

        item.appendChild(info);
        item.appendChild(acciones);
        lista.appendChild(item);
      });
      contenedor.appendChild(lista);
    }

    // ─────────────── Acciones por Producto (Ver detalle / Editar / Eliminar) ───────────────
    //
    // Marcadores de posición para las acciones de la Lista_De_Productos. La
    // implementación completa de las ventanas (Ventana_Detalle, Ventana_Edicion)
    // y del flujo de eliminación se desarrolla en tareas posteriores (8.x, 9.x,
    // 10.x). Por ahora se definen como no-ops seguros que reciben el id del
    // Producto_Seleccionado leído del `data-id`, para que el cableado de los
    // botones quede operativo sin efectos secundarios.

    /**
     * Abre la Ventana_Detalle del Producto_Seleccionado en modo de solo lectura
     * (Req 1.3, 2.1–2.7). Localiza el Producto por `id`, resuelve sus líneas con
     * `productosOps.resolverDetalle` (mapeo de nombre/unidad del Parametro vigente
     * y marcado de Parametros ausentes) y renderiza:
     *   - el nombre del Producto en el título (Req 2.1);
     *   - cada línea en orden con nombre del Parametro (o texto Nombre_Parametro_
     *     Ausente y Unidad vacía si `ausente`), Cantidad, Unidad y subtotal en PEN
     *     (Req 2.2, 2.4);
     *   - el Precio_Total en PEN (Req 2.3);
     *   - un mensaje de "sin líneas" cuando el Producto no tiene líneas (Req 2.7).
     * No incluye controles de edición (Req 2.5). Al cerrar no muta nada (Req 2.6).
     * Degrada de forma segura si faltan elementos del DOM.
     * @param {string} id id del Producto_Seleccionado.
     */
    function abrirDetalle(id) {
      if (id == null) return;

      const productos = getProductos() || [];
      const producto = productos.find((p) => p && p.id === id);
      if (!producto) return;

      const detalle = productosOps.resolverDetalle(
        producto,
        getParametros() || [],
        getProductos() || []
      );

      // Título: nombre del Producto (Req 2.1).
      const titulo = $(IDS.modalDetalleTitulo);
      if (titulo) titulo.textContent = detalle.nombre;

      // Cuerpo: líneas de cálculo o mensaje de "sin líneas" (Req 2.2, 2.4, 2.7).
      const cuerpo = $(IDS.modalDetalleLineas);
      if (cuerpo) {
        cuerpo.textContent = "";

        if (detalle.lineas.length === 0) {
          const vacio = document.createElement("p");
          vacio.className = "text-muted lp-detalle-vacio";
          vacio.textContent = "Este producto no tiene líneas de cálculo.";
          cuerpo.appendChild(vacio);
        } else {
          const lista = document.createElement("ul");
          lista.className = "list-group lp-detalle-lineas";
          detalle.lineas.forEach((linea) => {
            const item = document.createElement("li");
            item.className =
              "list-group-item d-flex justify-content-between align-items-center lp-detalle-linea";

            const info = document.createElement("span");
            info.className = "lp-detalle-linea-info";
            // Nombre del Parametro (o Nombre_Parametro_Ausente si está ausente),
            // Cantidad y Unidad (vacía si el Parametro está ausente).
            const unidadTexto = linea.unidad ? " " + linea.unidad : "";
            info.textContent = `${linea.nombreParametro} · ${linea.cantidad}${unidadTexto}`;
            if (linea.ausente) {
              item.classList.add("lp-detalle-linea-ausente");
            }

            const subtotal = document.createElement("span");
            subtotal.className = "badge bg-secondary lp-detalle-linea-subtotal";
            subtotal.textContent = formatearPEN(linea.subtotal);

            item.appendChild(info);
            item.appendChild(subtotal);
            lista.appendChild(item);
          });
          cuerpo.appendChild(lista);
        }
      }

      // Pie: Precio_Total en PEN (Req 2.3).
      const totalEl = $(IDS.modalDetalleTotal);
      if (totalEl) totalEl.textContent = formatearPEN(detalle.precioTotal);

      // Cablear (una sola vez) los controles de cierre para el fallback manual,
      // de modo que "Cerrar" oculte el modal aunque la API de Bootstrap no esté
      // disponible. Bootstrap ya gestiona el cierre vía data-bs-dismiss.
      const modal = $(IDS.modalDetalle);
      if (modal && !modal.dataset.lpCierreCableado) {
        modal.dataset.lpCierreCableado = "true";
        const cerradores = modal.querySelectorAll("[data-bs-dismiss='modal']");
        cerradores.forEach((btn) => {
          btn.addEventListener("click", () => {
            if (!hayBootstrapModal()) ocultarModal(modal);
          });
        });
      }

      // Mostrar el modal (Bootstrap o fallback). No muta datos (Req 2.6).
      mostrarModal(modal);
    }

    /**
     * Abre la Ventana_Edicion del Producto_Seleccionado (Req 1.4, 3.1–3.4).
     * Localiza el Producto por `id`, guarda su `id` original, muestra el nombre en
     * solo lectura, crea (o reutiliza) una instancia del editor de líneas sobre
     * #modal-edicion-lineas cableada a #btn-agregar-linea-edicion y precarga sus
     * líneas con `setLineas()` (deep-copy, Req 3.2). Cablea (una sola vez) el
     * botón Guardar a `guardarEdicion` y abre el modal mediante el mismo helper de
     * control (Bootstrap o fallback). Degrada de forma segura si faltan elementos
     * del DOM.
     * @param {string} id id del Producto_Seleccionado.
     */
    function abrirEdicion(id) {
      if (id == null) return;

      const productos = getProductos() || [];
      const producto = productos.find((p) => p && p.id === id);
      if (!producto) return;

      // Conservar el identificador original para el guardado (Req 3.5).
      edicionId = producto.id;

      // Mostrar el nombre del Producto en solo lectura (Req 3.1).
      const inputNombre = /** @type {HTMLInputElement|null} */ (
        $(IDS.modalEdicionNombre)
      );
      if (inputNombre) inputNombre.value = producto.nombre;

      // Crear (una sola vez) la instancia del editor de líneas de la edición
      // apuntando al contenedor del modal y cableada a su botón "Agregar línea".
      if (!editorEdicion) {
        editorEdicion = crearEditorDeLineas({
          contenedor: $(IDS.modalEdicionLineas),
          getParametros,
          // Accesores para el Selector_De_Linea de tipo Producto (Req 2.1, 2.3):
          // se excluye del listado al propio Producto_Contenedor en edición.
          getProductos,
          getIdEnEdicion: () => edicionId,
          botonAgregar: $(IDS.btnAgregarLineaEdicion),
        });
      }

      // Precargar las líneas del Producto con deep-copy (Req 3.2, 3.9).
      editorEdicion.setLineas(producto.lineas || []);

      // Cablear (una sola vez) el botón Guardar a `guardarEdicion` (Req 3.4).
      const btnGuardar = $(IDS.btnGuardarEdicion);
      if (btnGuardar && !btnGuardar.dataset.lpGuardarCableado) {
        btnGuardar.dataset.lpGuardarCableado = "true";
        btnGuardar.addEventListener("click", guardarEdicion);
      }

      // Cablear (una sola vez) los controles de cierre para el fallback manual,
      // de modo que Cancelar/cerrar oculte el modal aunque la API de Bootstrap no
      // esté disponible. Cerrar descarta el estado del editor sin mutar datos
      // (Req 3.9). Bootstrap ya gestiona el cierre vía data-bs-dismiss.
      const modal = $(IDS.modalEdicion);
      if (modal && !modal.dataset.lpCierreCableado) {
        modal.dataset.lpCierreCableado = "true";
        const cerradores = modal.querySelectorAll("[data-bs-dismiss='modal']");
        cerradores.forEach((btn) => {
          btn.addEventListener("click", () => {
            if (!hayBootstrapModal()) ocultarModal(modal);
          });
        });
      }

      // Abrir el modal (Bootstrap o fallback).
      mostrarModal(modal);
    }

    /**
     * Guarda los cambios de la Ventana_Edicion. Valida en el mismo orden y con los
     * mismos MENSAJES que la Calculadora: sin líneas → `SIN_LINEAS` (Req 3.6);
     * cantidad no numérica o fuera de 0,01–999.999.999,99 → `CANTIDAD_INVALIDA`
     * (Req 3.7); línea sin Parametro seleccionado/existente → `SIN_PARAMETRO`
     * (Req 3.8). Ante cualquier rechazo, conserva los datos en edición y no
     * persiste.
     *
     * Si todo es válido: construye `lineasProducto` (parametroId, cantidad
     * numérica, subtotal), llama `productosOps.editarProducto` (conserva id y
     * nombre, recalcula subtotales/total — Req 3.5), persiste con
     * `repository.saveProductos`, aplica `setProductos`, re-renderiza la lista y
     * cierra el modal. Si la escritura falla (`status === "failed"`), aplica
     * `setProductos` igualmente y muestra `MENSAJE_NO_PERSISTENTE` (Req 5.3).
     */
    function guardarEdicion() {
      if (edicionId == null || !editorEdicion) return;

      const lineas = editorEdicion.getLineas();

      // 1) Debe haber al menos una línea (Req 3.6).
      if (lineas.length === 0) {
        notifier.error(MENSAJES.SIN_LINEAS);
        return;
      }

      // 2) Validar Lineas_De_Parametro (cantidad + parámetro) y Lineas_De_Producto
      //    (sin producto / inexistente / cantidad, Req 4.1–4.5, 6.4) y detectar
      //    Ciclos_De_Composicion respecto del propio Producto_Contenedor en
      //    edición (Req 5.1–5.5). Ante error se conserva la edición sin cambios.
      const validacion = validarLineasEnEdicion(lineas, edicionId);
      if (!validacion.valido) {
        notifier.error(validacion.mensaje);
        return;
      }

      // Resolver subtotales por fuente con las líneas ya válidas (Parametro =>
      // precioUnitario; Producto => precioTotal vigente del componente, Req 6.3).
      const { subtotales } = productosOps.calcularContenedor(
        lineas,
        getParametros() || [],
        getProductos() || []
      );

      // Construir las Lineas_De_Calculo persistibles conservando la
      // Fuente_De_Componente y las referencias (Req 3.5, 7.1).
      const lineasProducto = lineas.map((linea, i) =>
        construirLineaPersistible(linea, subtotales[i])
      );

      // Editar el Producto conservando id, nombre y Unidad_De_Producto previa
      // (Req 8.1, 9.5); recalcula subtotales/total por fuente vía
      // `calcularContenedor` dentro de `editarProducto`.
      const nueva = productosOps.editarProducto(
        getProductos() || [],
        edicionId,
        lineasProducto,
        getParametros() || []
      );

      const resultado = saveProductos(nueva);
      // Aplicar el estado en memoria en todo caso (Req 5.3: conservar en sesión).
      setProductos(nueva);

      if (resultado && resultado.status === "failed") {
        notifier.error(MENSAJE_NO_PERSISTENTE);
      } else {
        notifier.info("Producto actualizado.");
      }

      renderListaProductos();

      // Cerrar el modal y limpiar el estado de edición.
      edicionId = null;
      ocultarModal($(IDS.modalEdicion));
    }

    /**
     * Inicia el flujo de eliminación con confirmación del Producto_Seleccionado
     * (Req 1.5, 4.1–4.5, 5.2, 5.3).
     *
     * Solicita una confirmación explícita mediante
     * `notifier.confirmar(MENSAJE_CONFIRMAR_ELIMINACION)` antes de eliminar; si el
     * usuario cancela, no hace nada (Req 4.1, 4.3). Si confirma, calcula la nueva
     * lista con `productosOps.eliminarProducto` (conserva el resto en orden),
     * persiste con `repository.saveProductos`, aplica `setProductos` y re-renderiza
     * la lista, de modo que el Producto deja de mostrarse (Req 4.2, 4.4, 5.2). Si
     * la escritura falla (`status === "failed"`), aplica `setProductos` igualmente
     * y muestra `MENSAJE_NO_PERSISTENTE` (Req 4.5, 5.3). Guarda contra id/Producto
     * ausente para degradar de forma segura.
     * @param {string} id id del Producto_Seleccionado.
     */
    function confirmarYEliminar(id) {
      if (id == null) return;

      // Solo actuar sobre un Producto existente.
      const productos = getProductos() || [];
      const existe = productos.some((p) => p && p.id === id);
      if (!existe) return;

      // Solicitar confirmación explícita; si cancela, no hacer nada (Req 4.1, 4.3).
      if (!notifier.confirmar(MENSAJE_CONFIRMAR_ELIMINACION)) return;

      // Calcular la nueva lista sin el Producto (conserva el resto en orden).
      const nueva = productosOps.eliminarProducto(productos, id);

      const resultado = saveProductos(nueva);
      // Aplicar el estado en memoria en todo caso (Req 4.5, 5.3: conservar en sesión).
      setProductos(nueva);

      if (resultado && resultado.status === "failed") {
        notifier.error(MENSAJE_NO_PERSISTENTE);
      } else {
        notifier.info("Producto eliminado.");
      }

      // Re-renderizar: el Producto deja de mostrarse (Req 4.4).
      renderListaProductos();
    }

    // ─────────────────────────── API pública ───────────────────────────

    /**
     * Cuenta cuántas líneas en edición de la Calculadora referencian el
     * parametroId indicado (Req 2.4). Delega en el editor de líneas activo.
     * @param {string} parametroId
     * @returns {number}
     */
    function contarLineasQueReferencian(parametroId) {
      if (parametroId == null) return 0;
      return editorLineas ? editorLineas.contarLineasQueReferencian(parametroId) : 0;
    }

    /**
     * Marca como "sin parámetro" (parametroId = null) las líneas en edición de la
     * Calculadora que referenciaban el parametroId indicado; el resto no cambia
     * (Req 2.4). Delega en el editor de líneas activo.
     * @param {string} parametroId
     */
    function desreferenciarParametro(parametroId) {
      if (parametroId == null) return;
      if (editorLineas) editorLineas.desreferenciarParametro(parametroId);
    }

    /**
     * Fija el Nombre_Accesible del Boton_De_Orden para que describa la
     * Direccion_De_Orden_Siguiente (el valor opuesto al actual), tanto en
     * `aria-label` como en `title` (Req 1.14). Degrada de forma segura si el
     * botón no existe en el DOM (guarda contra `null`).
     */
    function actualizarNombreAccesibleOrden() {
      const boton = $(IDS.btnOrdenar);
      if (!boton) return;
      const siguiente =
        direccionDeOrden === "ascendente" ? "descendente" : "ascendente";
      const etiqueta = `Ordenar productos por nombre en orden ${siguiente}`;
      boton.setAttribute("aria-label", etiqueta);
      boton.setAttribute("title", etiqueta);
    }

    /**
     * Re-renderiza líneas y lista de Productos (p. ej. al cambiar los Parametros
     * externos, para que el selector y las unidades reflejen los vigentes).
     */
    function render() {
      if (editorLineas) editorLineas.render();
      renderListaProductos();
    }

    /**
     * Cablea los controles del DOM y renderiza el estado inicial. Instancia el
     * editor de líneas reutilizable sobre #lineas-container y lo cablea al botón
     * #btn-agregar-linea (Req 3.3).
     */
    function init() {
      editorLineas = crearEditorDeLineas({
        contenedor: $(IDS.lineasContainer),
        getParametros,
        // Accesores para el Selector_De_Linea de tipo Producto (Req 2.1, 2.3).
        // La Calculadora crea un Producto nuevo: no hay contenedor que excluir.
        getProductos,
        getIdEnEdicion: () => null,
        botonAgregar: $(IDS.btnAgregarLinea),
      });

      const btnCalcular = $(IDS.btnCalcular);
      if (btnCalcular) btnCalcular.addEventListener("click", calcular);

      const btnGuardar = $(IDS.btnGuardar);
      if (btnGuardar) btnGuardar.addEventListener("click", guardar);

      // Cablear el Boton_De_Orden: alterna la Direccion_De_Orden entre
      // 'ascendente' y 'descendente' (Req 1.3, 1.4), actualiza el
      // Nombre_Accesible para reflejar la Direccion_De_Orden_Siguiente (Req 1.14)
      // y re-renderiza la Lista_De_Productos con el nuevo orden (Req 1.5, 1.6).
      const btnOrdenar = $(IDS.btnOrdenar);
      if (btnOrdenar) {
        btnOrdenar.addEventListener("click", () => {
          direccionDeOrden =
            direccionDeOrden === "ascendente" ? "descendente" : "ascendente";
          actualizarNombreAccesibleOrden();
          renderListaProductos();
        });
      }
      // Nombre_Accesible inicial del Boton_De_Orden (Req 1.14).
      actualizarNombreAccesibleOrden();

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
      mostrarModal,
      ocultarModal,
    };
})(window);
