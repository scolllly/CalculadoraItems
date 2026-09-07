// lineas.editor.js — Editor de Lineas_De_Calculo reutilizable (efectos DOM)
//
// Extrae de `productos.controller.js` la lógica de edición de líneas hoy contenida
// en `agregarLinea`, `eliminarLinea`, `renderLineas`, `construirFilaLinea`,
// `actualizarUnidad` y `aNumeroCantidad`, sin cambiar su comportamiento (selector
// de Parametro, visualización de la Unidad, input de cantidad, botón eliminar e
// indicación de estado sin líneas).
//
// El editor mantiene su propio estado de líneas en edición. NO valida ni calcula:
// solo captura la entrada del usuario (parametroId por línea y cantidad cruda) y la
// expone mediante `getLineas()`. La validación y el cálculo los realiza el
// consumidor (Calculadora o Ventana_Edicion).
//
// Se instancia con un contenedor DOM, un accesor a los Parametros vigentes y,
// opcionalmente, un botón "Agregar línea" a cablear. Todos los accesos al DOM se
// guardan contra `null` para degradar de forma segura si el DOM está ausente.
//
// Requisitos: 3.2 (precarga de líneas del Producto), 3.3 (mismo mecanismo de la
// Calculadora para agregar/eliminar líneas, seleccionar Parametro, ingresar
// Cantidad, ver la Unidad e indicación de estado vacío).
//
// ─────────── API publicada en window.LP.lineasEditor (para consumidores) ───────────
//
//   crearEditorDeLineas(opciones) -> EditorDeLineas
//
//     opciones:
//       - contenedor: HTMLElement          Nodo donde renderizar las filas.
//       - getParametros(): Parametro[]     Accesor a los Parametros vigentes.
//       - botonAgregar?: HTMLElement       Botón "Agregar línea" a cablear (opcional).
//
//     EditorDeLineas:
//       - render(): void                   Renderiza las filas o el estado vacío.
//       - agregarLinea(): void             Agrega una línea vacía y re-renderiza.
//       - eliminarLinea(indice): void      Elimina la línea del índice y re-renderiza.
//       - setLineas(lineas): void          Carga líneas iniciales con deep-copy.
//       - getLineas(): Array               Líneas en edición (parametroId + cantidad cruda).
//       - contarLineasQueReferencian(parametroId): number
//       - desreferenciarParametro(parametroId): void

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  // Se resuelve en tiempo de llamada para no depender del orden de carga.
  const crearLinea = (...args) => window.LP.models.crearLinea(...args);

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
   * @param {HTMLElement} [opciones.botonAgregar] Botón "Agregar línea" a cablear.
   * @returns {EditorDeLineas}
   */
  function crearEditorDeLineas({ contenedor, getParametros, botonAgregar } = {}) {
    if (typeof getParametros !== "function") {
      throw new TypeError("getParametros debe ser una función");
    }

    // Estado en edición: las líneas del producto en edición. Cada línea usa la
    // forma de models.crearLinea: { parametroId, cantidad, subtotal }. Aquí
    // `cantidad` puede quedar como string crudo del input o null si está vacía;
    // el consumidor la valida/convierte al calcular para conservar lo ingresado.
    /** @type {Array<{ parametroId: string|null, cantidad: any, subtotal: number }>} */
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
     * Agrega una nueva línea vacía (parámetro sin seleccionar, cantidad vacía).
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

      // Columna: selector de Parametro.
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
      select.value =
        linea.parametroId != null && buscarParametro(linea.parametroId)
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

      // Columna: visualización de la Unidad del Parametro seleccionado.
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

    // ─────────────────────────── Estado en edición ───────────────────────────

    /**
     * Carga las líneas iniciales en el editor, haciendo un deep-copy de la
     * entrada para aislar el estado en edición del Producto original: modificar
     * las líneas en edición no muta el Producto de origen (Req 3.9).
     * @param {Array<{ parametroId: string|null, cantidad: any, subtotal?: number }>} lineasIniciales
     */
    function setLineas(lineasIniciales) {
      const origen = Array.isArray(lineasIniciales) ? lineasIniciales : [];
      lineas = origen.map((linea) => ({
        parametroId: linea ? linea.parametroId : null,
        cantidad: linea ? linea.cantidad : null,
        subtotal: linea && linea.subtotal != null ? linea.subtotal : 0,
      }));
      render();
    }

    /**
     * Devuelve las líneas en edición actuales (parametroId y cantidad cruda tal
     * como fueron capturadas). El consumidor valida y calcula.
     * @returns {Array<{ parametroId: string|null, cantidad: any, subtotal: number }>}
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
