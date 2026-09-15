// lineas.editor.js — Editor de Lineas_De_Calculo reutilizable (efectos DOM)
//
// Extrae de `productos.controller.js` la lógica de edición de líneas hoy contenida
// en `agregarLinea`, `eliminarLinea`, `renderLineas`, `construirFilaLinea`,
// `actualizarUnidad` y `aNumeroCantidad`, sin cambiar su comportamiento (selector
// de Parametro, visualización de la Unidad, input de cantidad, botón eliminar e
// indicación de estado sin líneas).
//
// El editor mantiene su propio estado de líneas en edición. NO valida ni calcula:
// solo captura la entrada del usuario (Fuente_De_Componente, parametroId o
// productoComponenteId por línea y cantidad cruda) y la expone mediante
// `getLineas()`. La validación y el cálculo los realiza el consumidor
// (Calculadora o Ventana_Edicion).
//
// Se instancia con un contenedor DOM, un accesor a los Parametros vigentes,
// accesores opcionales a los Productos vigentes y al id del Producto_Contenedor
// en edición (para excluirlo del selector de componentes), y, opcionalmente, un
// botón "Agregar línea" a cablear. Todos los accesos al DOM se guardan contra
// `null` para degradar de forma segura si el DOM está ausente (file://).
//
// Requisitos:
//   1.1 (control de Fuente_De_Componente), 1.2 (fuente inicial "Parámetro"),
//   1.3 (render fuente Parámetro), 1.4 (render fuente Producto + unidad de
//   reemplazo de solo lectura), 1.5/1.6 (reset al cambiar de fuente),
//   2.1 (Productos ordenados), 2.2 (sin productos disponibles),
//   2.3 (exclusión del propio Producto_Contenedor), 2.4/2.5 (registro/reemplazo
//   de productoComponenteId), 2.6/8.6 (referencia colgante), 7.2 (compatibilidad
//   con datos antiguos), 7.6 (Unidad_De_Reemplazo), 3.2 (precarga de líneas),
//   3.3 (mismo mecanismo de la Calculadora para agregar/eliminar/seleccionar/
//   cantidad/unidad/estado vacío).
//
// ─────────── API publicada en window.LP.lineasEditor (para consumidores) ───────────
//
//   crearEditorDeLineas(opciones) -> EditorDeLineas
//
//     opciones:
//       - contenedor: HTMLElement            Nodo donde renderizar las filas.
//       - getParametros(): Parametro[]       Accesor a los Parametros vigentes.
//       - getProductos?(): Producto[]        Accesor a los Productos vigentes (default => []).
//       - getIdEnEdicion?(): string|null     Id del Producto_Contenedor en edición (default => null).
//       - botonAgregar?: HTMLElement         Botón "Agregar línea" a cablear (opcional).
//
//     EditorDeLineas:
//       - render(): void                     Renderiza las filas o el estado vacío.
//       - agregarLinea(): void               Agrega una línea vacía y re-renderiza.
//       - eliminarLinea(indice): void        Elimina la línea del índice y re-renderiza.
//       - setLineas(lineas): void            Carga líneas iniciales con deep-copy normalizado.
//       - getLineas(): Array                 Líneas en edición (fuente + referencia + cantidad cruda).
//       - contarLineasQueReferencian(parametroId): number
//       - desreferenciarParametro(parametroId): void

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  // Se resuelven en tiempo de llamada para no depender del orden de carga.
  const crearLinea = (...args) => window.LP.models.crearLinea(...args);
  const normalizarLinea = (linea) => window.LP.models.normalizarLinea(linea);

  /**
   * Valores de Fuente_De_Componente. Se resuelven desde models con un fallback
   * seguro por si el módulo no estuviera cargado (degradación defensiva).
   * @returns {{ PARAMETRO: string, PRODUCTO: string }}
   */
  function fuentes() {
    const models = window.LP && window.LP.models;
    return (
      (models && models.FUENTE_COMPONENTE) || {
        PARAMETRO: "Parámetro",
        PRODUCTO: "Producto",
      }
    );
  }

  /**
   * Texto Nombre_Producto_Componente_Ausente, resuelto desde productosOps con
   * fallback seguro.
   * @returns {string}
   */
  function nombreProductoAusente() {
    const ops = window.LP && window.LP.productosOps;
    return (ops && ops.NOMBRE_PRODUCTO_COMPONENTE_AUSENTE) || "Producto no disponible";
  }

  /**
   * Unidad_De_Reemplazo de visualización, resuelta desde productosOps con
   * fallback seguro.
   * @returns {string}
   */
  function unidadDeReemplazo() {
    const ops = window.LP && window.LP.productosOps;
    return (ops && ops.UNIDAD_DE_REEMPLAZO) || "UND";
  }

  // Nombre de la acción del Boton_Eliminar_Linea (una sola fuente de verdad).
  const ACCION_ELIMINAR_LINEA = "Eliminar línea";

  /**
   * Convierte el botón de eliminar en un Boton_Eliminar_Linea con icono:
   * vacía su texto directo, añade el Icono_Papelera (aria-hidden) y una
   * Etiqueta_De_Texto_Fallback visualmente oculta, y fija el Nombre_Accesible
   * exacto en aria-label y title (Req 1.1–1.4, 3.1–3.4). Usa document.createElement
   * y setAttribute/textContent (sin innerHTML).
   * @param {HTMLButtonElement} boton Botón ya con sus clases/colores aplicados.
   */
  function convertirEnBotonEliminarIcono(boton) {
    boton.textContent = ""; // sin texto directo (Req 1.3)
    boton.setAttribute("aria-label", ACCION_ELIMINAR_LINEA); // Nombre_Accesible (Req 3.1)
    boton.setAttribute("title", ACCION_ELIMINAR_LINEA); // idéntico a aria-label (Req 3.2)

    const glifo = document.createElement("i");
    glifo.className = "bi bi-trash"; // Icono_Papelera (Req 1.1)
    glifo.setAttribute("aria-hidden", "true"); // excluido del nombre (Req 1.2, 3.3)

    const etiqueta = document.createElement("span");
    etiqueta.className = "visually-hidden lp-accion-texto"; // fallback (Req 1.4, 4.5)
    etiqueta.textContent = ACCION_ELIMINAR_LINEA;

    boton.appendChild(glifo);
    boton.appendChild(etiqueta);
  }

  /**
   * @typedef {Object} EditorDeLineas
   * @property {() => void} render
   * @property {() => void} agregarLinea
   * @property {(indice: number) => void} eliminarLinea
   * @property {(lineas: Array) => void} setLineas
   * @property {() => Array} getLineas
   * @property {(parametroId: string) => number} contarLineasQueReferencian
   * @property {(parametroId: string) => void} desreferenciarParametro
   */

  /**
   * Crea un editor de líneas reutilizable.
   *
   * @param {Object} opciones
   * @param {HTMLElement} [opciones.contenedor] Nodo donde renderizar las filas.
   * @param {() => Array<{id: string, nombre: string, precioUnitario: number, unidad: string}>} opciones.getParametros
   * @param {() => Array<{id: string, nombre: string, unidad?: string}>} [opciones.getProductos]
   *        Accesor a los Productos vigentes (Req 2.1). Opcional; default => [].
   * @param {() => (string|null)} [opciones.getIdEnEdicion]
   *        Id del Producto_Contenedor en edición, para excluirlo del selector de
   *        componentes (Req 2.3). Opcional; default => null (p. ej. Calculadora).
   * @param {HTMLElement} [opciones.botonAgregar] Botón "Agregar línea" a cablear.
   * @returns {EditorDeLineas}
   */
  function crearEditorDeLineas({
    contenedor,
    getParametros,
    getProductos,
    getIdEnEdicion,
    botonAgregar,
  } = {}) {
    if (typeof getParametros !== "function") {
      throw new TypeError("getParametros debe ser una función");
    }

    // Accesores opcionales con defaults seguros: no rompen a la Calculadora ni a
    // las llamadas existentes que solo pasaban getParametros (Req 2.1, 2.3, 7.2).
    const accederProductos =
      typeof getProductos === "function" ? getProductos : () => [];
    const accederIdEnEdicion =
      typeof getIdEnEdicion === "function" ? getIdEnEdicion : () => null;

    // Estado en edición: las líneas del producto en edición. Cada línea usa la
    // forma de models.crearLinea: { parametroId, cantidad, subtotal,
    // fuenteDeComponente, productoComponenteId }. Aquí `cantidad` puede quedar
    // como string crudo del input o null si está vacía; el consumidor la
    // valida/convierte al calcular para conservar lo ingresado.
    /** @type {Array<{ parametroId: string|null, cantidad: any, subtotal: number, fuenteDeComponente: string, productoComponenteId: string|null }>} */
    let lineas = [];

    /**
     * Devuelve el Parametro con el id indicado, o null si no existe.
     * @param {string|null} parametroId
     * @returns {Object|null}
     */
    function buscarParametro(parametroId) {
      if (parametroId == null) return null;
      const params = getParametros() || [];
      return params.find((p) => p && p.id === parametroId) || null;
    }

    /**
     * Devuelve el Producto con el id indicado, o null si no existe.
     * @param {string|null} productoId
     * @returns {Object|null}
     */
    function buscarProducto(productoId) {
      if (productoId == null) return null;
      const productos = accederProductos() || [];
      return productos.find((p) => p && p.id === productoId) || null;
    }

    /**
     * Productos ofrecibles como Producto_Componente: todos los Productos vigentes
     * ordenados alfabéticamente por nombre y excluyendo el Producto_Contenedor en
     * edición (Req 2.1, 2.3).
     * @returns {Array<{id: string, nombre: string, unidad?: string}>}
     */
    function productosComponentesDisponibles() {
      const productos = accederProductos() || [];
      const idEnEdicion = accederIdEnEdicion();
      return productos
        .filter((p) => p && p.id !== idEnEdicion)
        .slice()
        .sort((a, b) =>
          String(a.nombre == null ? "" : a.nombre).localeCompare(
            String(b.nombre == null ? "" : b.nombre)
          )
        );
    }

    /**
     * Agrega una nueva línea vacía. La Fuente_De_Componente inicial es
     * "Parámetro" (Req 1.2), parámetro sin seleccionar y cantidad vacía.
     */
    function agregarLinea() {
      lineas.push(crearLinea(null, null));
      render();
    }

    /**
     * Elimina la línea en el índice indicado del producto en edición.
     * @param {number} indice
     */
    function eliminarLinea(indice) {
      if (indice >= 0 && indice < lineas.length) {
        lineas.splice(indice, 1);
        render();
      }
    }

    // ─────────────────────────── Render de líneas ───────────────────────────

    /**
     * Renderiza todas las filas de líneas en el contenedor, o la indicación de
     * estado vacío si no hay líneas.
     */
    function render() {
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
     * Construye la fila del DOM de una línea de cálculo: control de fuente,
     * selector del componente (Parametro o Producto_Componente según la fuente),
     * input de cantidad, visualización de la Unidad y botón de eliminar.
     * @param {{ parametroId: string|null, cantidad: any, subtotal: number, fuenteDeComponente: string, productoComponenteId: string|null }} linea
     * @param {number} indice
     * @returns {HTMLElement}
     */
    function construirFilaLinea(linea, indice) {
      const F = fuentes();
      const fila = document.createElement("div");
      fila.className = "row g-2 align-items-end mb-2 lp-linea";
      fila.dataset.indice = String(indice);

      // Columna: control de Fuente_De_Componente (Req 1.1).
      const colFuente = document.createElement("div");
      colFuente.className = "col-6 col-md-2";
      const selectFuente = document.createElement("select");
      selectFuente.className = "form-select lp-linea-fuente";
      selectFuente.setAttribute("aria-label", "Fuente del componente");

      const optParam = document.createElement("option");
      optParam.value = F.PARAMETRO;
      optParam.textContent = F.PARAMETRO;
      selectFuente.appendChild(optParam);

      const optProd = document.createElement("option");
      optProd.value = F.PRODUCTO;
      optProd.textContent = F.PRODUCTO;
      selectFuente.appendChild(optProd);

      selectFuente.value =
        linea.fuenteDeComponente === F.PRODUCTO ? F.PRODUCTO : F.PARAMETRO;

      selectFuente.addEventListener("change", () => {
        cambiarFuente(linea, selectFuente.value);
        render();
      });
      colFuente.appendChild(selectFuente);
      fila.appendChild(colFuente);

      // Columna: selector del componente (Parametro o Producto_Componente).
      const colComponente = document.createElement("div");
      colComponente.className = "col-12 col-md-4";
      if (linea.fuenteDeComponente === F.PRODUCTO) {
        colComponente.appendChild(construirSelectorProducto(fila, linea));
      } else {
        colComponente.appendChild(construirSelectorParametro(fila, linea));
      }
      fila.appendChild(colComponente);

      // Columna: cantidad.
      const colCant = document.createElement("div");
      colCant.className = "col-8 col-md-3";
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

      // Columna: visualización de la Unidad del componente seleccionado.
      const colUnidad = document.createElement("div");
      colUnidad.className = "col-4 col-md-2";
      const unidadSpan = document.createElement("span");
      unidadSpan.className = "form-text lp-linea-unidad";
      colUnidad.appendChild(unidadSpan);
      fila.appendChild(colUnidad);

      // Columna: botón eliminar.
      const colBtn = document.createElement("div");
      colBtn.className = "col-12 col-md-1";
      const btnEliminar = document.createElement("button");
      btnEliminar.type = "button";
      btnEliminar.className = "btn btn-outline-danger btn-sm lp-linea-eliminar";
      convertirEnBotonEliminarIcono(btnEliminar);
      btnEliminar.addEventListener("click", () => {
        const idx = Number(fila.dataset.indice);
        eliminarLinea(idx);
      });
      colBtn.appendChild(btnEliminar);
      fila.appendChild(colBtn);

      // Inicializar la unidad mostrada según la fuente actual.
      actualizarUnidad(fila, linea);

      return fila;
    }

    /**
     * Construye el selector de Parametro para una Linea_De_Parametro. Mantiene el
     * comportamiento previo a esta funcionalidad (Req 1.3).
     * @param {HTMLElement} fila
     * @param {{ parametroId: string|null }} linea
     * @returns {HTMLElement}
     */
    function construirSelectorParametro(fila, linea) {
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
      select.value =
        linea.parametroId != null && buscarParametro(linea.parametroId)
          ? linea.parametroId
          : "";

      select.addEventListener("change", () => {
        linea.parametroId = select.value === "" ? null : select.value;
        actualizarUnidad(fila, linea);
      });

      return select;
    }

    /**
     * Construye el selector de Producto_Componente para una Linea_De_Producto
     * (Req 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.6). Los Productos se ofrecen en
     * orden alfabético excluyendo el Producto_Contenedor en edición. Si no hay
     * productos disponibles, muestra la indicación de vacío y deja la línea sin
     * componente. Si la referencia actual es colgante, muestra el texto
     * Nombre_Producto_Componente_Ausente sin ofrecer un componente válido.
     * @param {HTMLElement} fila
     * @param {{ productoComponenteId: string|null }} linea
     * @returns {HTMLElement}
     */
    function construirSelectorProducto(fila, linea) {
      const disponibles = productosComponentesDisponibles();
      const nombreAusente = nombreProductoAusente();

      // Sin productos disponibles (Req 2.2): indicación y línea sin componente.
      if (disponibles.length === 0) {
        linea.productoComponenteId = null;
        const aviso = document.createElement("span");
        aviso.className = "form-text lp-linea-sin-productos";
        aviso.textContent = "No hay productos disponibles";
        return aviso;
      }

      const select = document.createElement("select");
      select.className = "form-select lp-linea-producto";
      select.setAttribute("aria-label", "Producto componente de la línea");

      // Referencia colgante (Req 2.6, 8.6): el productoComponenteId actual no
      // corresponde a ningún Producto disponible. Se muestra como opción
      // seleccionada con el texto Nombre_Producto_Componente_Ausente, dejando la
      // línea sin componente válido pero conservando la Cantidad y el subtotal.
      const referenciaColgante =
        linea.productoComponenteId != null &&
        !disponibles.some((p) => p.id === linea.productoComponenteId);

      if (referenciaColgante) {
        const optAusente = document.createElement("option");
        optAusente.value = "";
        optAusente.textContent = nombreAusente;
        optAusente.className = "lp-linea-producto-ausente";
        select.appendChild(optAusente);
      } else {
        const optVacia = document.createElement("option");
        optVacia.value = "";
        optVacia.textContent = "Seleccione un producto";
        select.appendChild(optVacia);
      }

      disponibles.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.nombre;
        if (linea.productoComponenteId === p.id) opt.selected = true;
        select.appendChild(opt);
      });

      select.value = referenciaColgante
        ? ""
        : linea.productoComponenteId != null
        ? linea.productoComponenteId
        : "";

      select.addEventListener("change", () => {
        // Registrar/reemplazar la referencia al Producto_Componente (Req 2.4, 2.5).
        linea.productoComponenteId = select.value === "" ? null : select.value;
        actualizarUnidad(fila, linea);
      });

      return select;
    }

    /**
     * Alterna la Fuente_De_Componente de una línea, descartando la referencia
     * previa y restableciendo la Cantidad a "sin ingresar" (Req 1.5, 1.6). No
     * re-renderiza por sí misma; el llamador se encarga.
     * @param {{ parametroId: string|null, productoComponenteId: string|null, cantidad: any, fuenteDeComponente: string }} linea
     * @param {string} nuevaFuente
     */
    function cambiarFuente(linea, nuevaFuente) {
      const F = fuentes();
      const fuenteNormalizada =
        nuevaFuente === F.PRODUCTO ? F.PRODUCTO : F.PARAMETRO;
      if (linea.fuenteDeComponente === fuenteNormalizada) return;
      linea.fuenteDeComponente = fuenteNormalizada;
      // Descartar ambas referencias: la relevante para la nueva fuente queda sin
      // seleccionar y la de la fuente anterior se limpia.
      linea.parametroId = null;
      linea.productoComponenteId = null;
      // Restablecer la Cantidad a un valor sin ingresar.
      linea.cantidad = null;
    }

    /**
     * Actualiza el texto de la Unidad mostrada para una línea según su fuente:
     *  - Fuente "Parámetro": Unidad del Parametro seleccionado (o "").
     *  - Fuente "Producto": Unidad_De_Producto del Producto_Componente si está
     *    definida, o Unidad_De_Reemplazo "UND" si el componente existe pero no la
     *    tiene (Req 1.4, 7.6). Sin componente o referencia colgante => "".
     * @param {HTMLElement} fila
     * @param {{ parametroId: string|null, productoComponenteId: string|null, fuenteDeComponente: string }} linea
     */
    function actualizarUnidad(fila, linea) {
      const span = fila.querySelector(".lp-linea-unidad");
      if (!span) return;
      const F = fuentes();
      if (linea.fuenteDeComponente === F.PRODUCTO) {
        const componente = buscarProducto(linea.productoComponenteId);
        if (!componente) {
          span.textContent = "";
          return;
        }
        span.textContent =
          componente.unidad != null && componente.unidad !== ""
            ? componente.unidad
            : unidadDeReemplazo();
        return;
      }
      const parametro = buscarParametro(linea.parametroId);
      span.textContent = parametro ? parametro.unidad : "";
    }

    // ─────────────────────────── Estado en edición ───────────────────────────

    /**
     * Carga las líneas iniciales en el editor, haciendo un deep-copy normalizado
     * de la entrada para aislar el estado en edición del Producto original:
     * modificar las líneas en edición no muta el Producto de origen (Req 3.9). La
     * normalización (`models.normalizarLinea`) completa `fuenteDeComponente`
     * (ausente => "Parámetro") y `productoComponenteId` (ausente => null) para los
     * datos antiguos (Req 7.2, 7.3).
     * @param {Array<object>} lineasIniciales
     */
    function setLineas(lineasIniciales) {
      const origen = Array.isArray(lineasIniciales) ? lineasIniciales : [];
      lineas = origen.map((linea) => normalizarLinea(linea));
      render();
    }

    /**
     * Devuelve las líneas en edición actuales (fuente, referencia y cantidad
     * cruda tal como fueron capturadas). El consumidor valida y calcula.
     * @returns {Array<{ parametroId: string|null, cantidad: any, subtotal: number, fuenteDeComponente: string, productoComponenteId: string|null }>}
     */
    function getLineas() {
      return lineas;
    }

    // ─────────────────────── Coordinación con Parametros ───────────────────────

    /**
     * Cuenta cuántas líneas en edición referencian el parametroId indicado.
     * @param {string} parametroId
     * @returns {number}
     */
    function contarLineasQueReferencian(parametroId) {
      if (parametroId == null) return 0;
      return lineas.reduce(
        (conteo, linea) =>
          linea.parametroId === parametroId ? conteo + 1 : conteo,
        0
      );
    }

    /**
     * Marca como "sin parámetro" (parametroId = null) las líneas en edición que
     * referenciaban el parametroId indicado; el resto no cambia.
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
        render();
      }
    }

    // Cablear el botón "Agregar línea" si se provee (degradación segura si es null).
    if (botonAgregar) {
      botonAgregar.addEventListener("click", agregarLinea);
    }

    /** @type {EditorDeLineas} */
    return {
      render,
      agregarLinea,
      eliminarLinea,
      setLineas,
      getLineas,
      contarLineasQueReferencian,
      desreferenciarParametro,
    };
  }

  // Publicación en el espacio de nombres global window.LP (carga vía <script>
  // clásico bajo file://). No se usa sintaxis de módulos ES.
  LP.lineasEditor = { crearEditorDeLineas };
})(window);
