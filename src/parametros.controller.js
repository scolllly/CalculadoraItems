// parametros.controller.js — Controlador del Gestor_De_Parametros (efectos DOM).
//
// Renderiza el formulario de creación/edición y la lista de Parametros
// (nombre, Precio_Unitario en PEN y Unidad), muestra la indicación de estado
// vacío y gestiona crear, editar y eliminar, coordinando `validation`,
// `models`, `repository` y `notifier`.
//
// Requisitos: 1.1, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 8.6 (y 6.6 para el fallo de
// persistencia).
//
// -----------------------------------------------------------------------------
// API pública (para el cableado en app.js, tarea 16.1)
// -----------------------------------------------------------------------------
//
//   const controlador = LP.parametrosController.initParametros({
//     // Accesores del estado compartido (única fuente de verdad en app.js):
//     getParametros: () => Parametro[],           // requerido
//     setParametros: (Parametro[]) => void,        // requerido
//
//     // Coordinación con la Calculadora para la desreferencia (Req 2.4):
//     contarLineasReferenciando: (parametroId) => number,  // opcional
//     desreferenciarParametro: (parametroId) => void,      // opcional
//
//     // Hook de re-render tras un cambio (p. ej. refrescar el selector de la
//     // Calculadora en productos.controller). Opcional:
//     onParametrosCambio: () => void,
//
//     // Contenedor raíz opcional (por defecto usa `document`), útil en pruebas.
//     root: Document | HTMLElement,
//   });
//
//   // Métodos devueltos:
//   controlador.render();   // vuelve a pintar la lista (llamar tras load inicial)
//   controlador.destroy();  // desmonta los listeners (opcional)
//
// DOM del que depende (definido en index.html):
//   - Formulario  id="form-parametro"
//   - Inputs      id="param-nombre", id="param-precio" (number), id="param-unidad"
//   - Botón submit id="btn-guardar-parametro"
//   - Lista       id="lista-parametros"
//   (Las notificaciones las gestiona notifier.js vía id="notificaciones".)

// Dependencias consumidas desde el espacio de nombres global window.LP
// (carga vía <script> clásico bajo file://). No se usa sintaxis de módulos ES.
//   - LP.validation: validarNombreParametro, validarPrecioUnitario, validarUnidad
//   - LP.models: crearParametro
//   - LP.repository: saveParametros
//   - LP.notifier: info, error, confirmar
//   - LP.currency: formatearPEN

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  // Ids del DOM (contrato con index.html).
  const IDS = Object.freeze({
    FORM: "form-parametro",
    NOMBRE: "param-nombre",
    PRECIO: "param-precio",
    UNIDAD: "param-unidad",
    BTN_GUARDAR: "btn-guardar-parametro",
    LISTA: "lista-parametros",
  });

  /**
   * Inicializa el controlador del Gestor_De_Parametros.
   *
   * @param {Object} opciones
   * @param {() => Array} opciones.getParametros Devuelve la lista actual de Parametros.
   * @param {(parametros: Array) => void} opciones.setParametros Reemplaza la lista de Parametros en el estado compartido.
   * @param {(parametroId: string) => number} [opciones.contarLineasReferenciando] Cuántas líneas de la Calculadora referencian ese parámetro (Req 2.4).
   * @param {(parametroId: string) => void} [opciones.desreferenciarParametro] Marca `parametroId = null` en las líneas que lo referenciaban (Req 2.4).
   * @param {() => void} [opciones.onParametrosCambio] Hook invocado tras cada cambio persistido (p. ej. refrescar la Calculadora).
   * @param {Document | HTMLElement} [opciones.root] Raíz de búsqueda del DOM (por defecto `document`).
   * @returns {{ render: () => void, destroy: () => void }}
   */
  function initParametros(opciones) {
    const {
      getParametros,
      setParametros,
      contarLineasReferenciando,
      desreferenciarParametro,
      onParametrosCambio,
      root,
    } = opciones || {};

    if (typeof getParametros !== "function" || typeof setParametros !== "function") {
      throw new Error(
        "initParametros requiere las funciones getParametros y setParametros.",
      );
    }

    const raiz = root || (typeof document !== "undefined" ? document : null);
    if (raiz === null) {
      throw new Error("initParametros requiere un DOM disponible.");
    }

    // Id del Parametro actualmente en edición; null => se está creando uno nuevo.
    let idEnEdicion = null;

    const buscar = (id) =>
      typeof raiz.getElementById === "function"
        ? raiz.getElementById(id)
        : raiz.querySelector(`#${id}`);

    const form = buscar(IDS.FORM);
    const inputNombre = buscar(IDS.NOMBRE);
    const inputPrecio = buscar(IDS.PRECIO);
    const inputUnidad = buscar(IDS.UNIDAD);
    const btnGuardar = buscar(IDS.BTN_GUARDAR);
    const lista = buscar(IDS.LISTA);

    // ---------------------------------------------------------------------------
    // Persistencia
    // ---------------------------------------------------------------------------

    /**
     * Persiste la lista completa de Parametros. Si la escritura falla, notifica al
     * usuario que los cambios no se pudieron guardar de forma persistente (Req 6.6)
     * sin descartar el estado en memoria.
     * @param {Array} parametros
     */
    function persistir(parametros) {
      const resultado = window.LP.repository.saveParametros(parametros);
      if (resultado && resultado.status === "failed") {
        window.LP.notifier.error(
          "Los cambios no se pudieron guardar de forma persistente.",
        );
      }
    }

    /**
     * Actualiza el estado compartido, persiste la lista y refresca las vistas.
     * @param {Array} parametros Lista completa ya actualizada.
     */
    function confirmarCambio(parametros) {
      setParametros(parametros);
      persistir(parametros);
      render();
      if (typeof onParametrosCambio === "function") {
        onParametrosCambio();
      }
    }

    // ---------------------------------------------------------------------------
    // Lectura del formulario
    // ---------------------------------------------------------------------------

    /**
     * Convierte el valor crudo del input de precio a número.
     * Devuelve `NaN` (o el valor original no numérico) para que la validación lo
     * rechace con el mensaje exacto.
     * @param {HTMLInputElement | null} input
     * @returns {number}
     */
    function leerPrecio(input) {
      if (!input) return NaN;
      const crudo = typeof input.value === "string" ? input.value.trim() : "";
      if (crudo === "") return NaN;
      return Number(crudo);
    }

    function leerNombre() {
      return inputNombre && typeof inputNombre.value === "string"
        ? inputNombre.value
        : "";
    }

    function leerUnidad() {
      return inputUnidad && typeof inputUnidad.value === "string"
        ? inputUnidad.value
        : "";
    }

    function limpiarFormulario() {
      if (inputNombre) inputNombre.value = "";
      if (inputPrecio) inputPrecio.value = "";
      if (inputUnidad) inputUnidad.value = "";
      idEnEdicion = null;
      if (btnGuardar) btnGuardar.textContent = "Guardar parámetro";
    }

    // ---------------------------------------------------------------------------
    // Alta / edición
    // ---------------------------------------------------------------------------

    /**
     * Valida los campos del formulario. Devuelve el primer error encontrado
     * (mensaje exacto) o `null` si todo es válido. El nombre se valida ignorando
     * el parámetro en edición para la comprobación de unicidad.
     * @param {string} nombre
     * @param {number} precio
     * @param {string} unidad
     * @returns {string | null}
     */
    function validarEntrada(nombre, precio, unidad) {
      const existentes = getParametros();
      const rNombre = window.LP.validation.validarNombreParametro(nombre, existentes, idEnEdicion);
      if (!rNombre.valido) return rNombre.mensaje;

      const rPrecio = window.LP.validation.validarPrecioUnitario(precio);
      if (!rPrecio.valido) return rPrecio.mensaje;

      const rUnidad = window.LP.validation.validarUnidad(unidad);
      if (!rUnidad.valido) return rUnidad.mensaje;

      return null;
    }

    /**
     * Maneja el envío del formulario: crea un Parametro nuevo o actualiza el que
     * está en edición. Rechaza entradas inválidas conservando lo ingresado
     * (Req 1.2–1.5, 2.3) y muestra el mensaje exacto vía notifier.error.
     * @param {Event} [evento]
     */
    function alEnviar(evento) {
      if (evento && typeof evento.preventDefault === "function") {
        evento.preventDefault();
      }

      const nombre = leerNombre();
      const precio = leerPrecio(inputPrecio);
      const unidad = leerUnidad();

      const error = validarEntrada(nombre, precio, unidad);
      if (error !== null) {
        // Rechazo: no se toca el estado; los valores ingresados se conservan.
        window.LP.notifier.error(error);
        return;
      }

      const nombreLimpio = nombre.trim();
      const parametros = getParametros().slice();

      if (idEnEdicion !== null) {
        // Edición en sitio, conservando el resto (Req 2.1).
        const indice = parametros.findIndex((p) => p && p.id === idEnEdicion);
        if (indice === -1) {
          // El parámetro desapareció (estado inconsistente): tratar como creación.
          window.LP.notifier.error("El parámetro que intentabas editar ya no existe.");
          limpiarFormulario();
          render();
          return;
        }
        parametros[indice] = {
          ...parametros[indice],
          nombre: nombreLimpio,
          precioUnitario: precio,
          unidad,
        };
        confirmarCambio(parametros);
        window.LP.notifier.info("Parámetro actualizado.");
      } else {
        // Alta de un nuevo Parametro (Req 1.1).
        parametros.push(window.LP.models.crearParametro(nombreLimpio, precio, unidad));
        confirmarCambio(parametros);
        window.LP.notifier.info("Parámetro agregado.");
      }

      limpiarFormulario();
    }

    /**
     * Carga un Parametro en el formulario para editarlo.
     * @param {string} id
     */
    function iniciarEdicion(id) {
      const parametro = getParametros().find((p) => p && p.id === id);
      if (!parametro) return;
      idEnEdicion = id;
      if (inputNombre) inputNombre.value = parametro.nombre;
      if (inputPrecio) inputPrecio.value = String(parametro.precioUnitario);
      if (inputUnidad) inputUnidad.value = parametro.unidad;
      if (btnGuardar) btnGuardar.textContent = "Actualizar parámetro";
      if (inputNombre && typeof inputNombre.focus === "function") {
        inputNombre.focus();
      }
    }

    // ---------------------------------------------------------------------------
    // Eliminación
    // ---------------------------------------------------------------------------

    /**
     * Elimina un Parametro. Si está referenciado por líneas de la Calculadora,
     * solicita confirmación explícita indicando cuántas líneas se afectan y, al
     * confirmar, las desreferencia (parametroId = null) (Req 2.4). Conserva los
     * demás parámetros sin cambios (Req 2.2).
     * @param {string} id
     */
    function eliminar(id) {
      const parametros = getParametros();
      const parametro = parametros.find((p) => p && p.id === id);
      if (!parametro) return;

      const referencias =
        typeof contarLineasReferenciando === "function"
          ? Number(contarLineasReferenciando(id)) || 0
          : 0;

      let mensaje;
      if (referencias > 0) {
        const plural = referencias === 1 ? "línea" : "líneas";
        mensaje =
          `El parámetro "${parametro.nombre}" está referenciado por ${referencias} ` +
          `${plural} de la calculadora. Si continúas, ${referencias === 1 ? "esa línea quedará" : "esas líneas quedarán"} ` +
          `sin parámetro asociado. ¿Eliminar de todos modos?`;
      } else {
        mensaje = `¿Eliminar el parámetro "${parametro.nombre}"?`;
      }

      const confirmado = window.LP.notifier.confirmar(mensaje);
      if (!confirmado) {
        // Cancelado: no se modifica nada.
        return;
      }

      // Desreferenciar las líneas afectadas antes de quitar el Parametro (Req 2.4).
      if (referencias > 0 && typeof desreferenciarParametro === "function") {
        desreferenciarParametro(id);
      }

      const restantes = parametros.filter((p) => p && p.id !== id);

      // Si el parámetro en edición es el que se elimina, reiniciar el formulario.
      if (idEnEdicion === id) {
        limpiarFormulario();
      }

      confirmarCambio(restantes);
      window.LP.notifier.info("Parámetro eliminado.");
    }

    // ---------------------------------------------------------------------------
    // Renderizado de la lista (Req 1.6, 1.7, 8.6)
    // ---------------------------------------------------------------------------

    /**
     * Renderiza la lista de Parametros con nombre, Precio_Unitario en PEN y
     * Unidad, más botones de editar y eliminar. Muestra la indicación de estado
     * vacío cuando no hay parámetros (Req 1.7).
     */
    function render() {
      if (!lista) return;

      // Vaciar contenido previo.
      lista.textContent = "";

      const parametros = getParametros();

      if (!Array.isArray(parametros) || parametros.length === 0) {
        const vacio = crearElemento("p", {
          className: "text-muted",
          textContent: "No hay parámetros configurados.",
        });
        lista.appendChild(vacio);
        return;
      }

      const grupo = crearElemento("ul", { className: "list-group" });

      for (const parametro of parametros) {
        if (!parametro) continue;
        const item = crearElemento("li", {
          className:
            "list-group-item d-flex justify-content-between align-items-center",
        });

        const info = crearElemento("div", { className: "lp-param-info" });
        const nombre = crearElemento("span", {
          className: "fw-bold me-2",
          textContent: parametro.nombre,
        });
        const detalle = crearElemento("span", {
          className: "text-muted",
          textContent: `${window.LP.currency.formatearPEN(parametro.precioUnitario)} / ${parametro.unidad}`,
        });
        info.appendChild(nombre);
        info.appendChild(detalle);

        const acciones = crearElemento("div", { className: "btn-group btn-group-sm" });

        const btnEditar = crearElemento("button", {
          className: "btn btn-outline-secondary",
          textContent: "Editar",
        });
        btnEditar.type = "button";
        btnEditar.addEventListener("click", () => iniciarEdicion(parametro.id));

        const btnEliminar = crearElemento("button", {
          className: "btn btn-outline-danger",
          textContent: "Eliminar",
        });
        btnEliminar.type = "button";
        btnEliminar.addEventListener("click", () => eliminar(parametro.id));

        acciones.appendChild(btnEditar);
        acciones.appendChild(btnEliminar);

        item.appendChild(info);
        item.appendChild(acciones);
        grupo.appendChild(item);
      }

      lista.appendChild(grupo);
    }

    /**
     * Helper para crear un elemento del DOM aplicando propiedades sencillas.
     * @param {string} tag
     * @param {{ className?: string, textContent?: string }} [props]
     * @returns {HTMLElement}
     */
    function crearElemento(tag, props = {}) {
      const doc =
        raiz.ownerDocument ||
        (typeof raiz.createElement === "function" ? raiz : document);
      const el = doc.createElement(tag);
      if (props.className) el.className = props.className;
      if (props.textContent !== undefined) el.textContent = props.textContent;
      return el;
    }

    // ---------------------------------------------------------------------------
    // Cableado de eventos y ciclo de vida
    // ---------------------------------------------------------------------------

    if (form && typeof form.addEventListener === "function") {
      form.addEventListener("submit", alEnviar);
    }

    // Render inicial.
    render();

    return {
      render,
      destroy() {
        if (form && typeof form.removeEventListener === "function") {
          form.removeEventListener("submit", alEnviar);
        }
      },
    };
  }
    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.parametrosController = { IDS, initParametros };
})(window);
