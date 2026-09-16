// basedatos.controller.js — Controlador de la Pagina_Base_De_Datos (efectos DOM).
//
// Cablea los controles de exportación e importación del respaldo y coordina las
// capas puras/persistencia: `backup` (serializar/parsear), `repository`
// (cargar/reemplazar) y `notifier` (mensajes y confirmación). Concentra aquí
// todos los efectos de E/S del navegador (Blob, `URL.createObjectURL`,
// `URL.revokeObjectURL`, `FileReader`) para mantener el resto de las capas puras
// y verificables sin montar la UI.
//
// Contrato del DOM (definido en `index.html`, dentro de `id="pagina-basedatos"`):
//   - `id="btn-exportar"`   → botón que dispara la exportación (descarga JSON).
//   - `id="input-importar"` → `<input type="file" accept="application/json">`
//                              que dispara la importación al seleccionar archivo.
//
// API exportada:
//   initBaseDatos(deps?) → void
//     Cablea los manejadores de eventos de los controles de la vista. Es
//     idempotente frente a la ausencia de elementos del DOM: si algún control no
//     existe, degrada de forma segura sin lanzar.
//
//     `deps` (todas opcionales; permiten a `app.js` compartir la única fuente de
//     verdad del estado en memoria):
//       - getParametros(): unknown[]   Obtiene los Parametros actuales.
//       - getProductos():  unknown[]   Obtiene los Productos actuales.
//       - setParametros(parametros: unknown[]): void  Actualiza el estado tras importar.
//       - setProductos(productos: unknown[]): void     Actualiza el estado tras importar.
//       - refrescarVistas(): void      Re-renderiza todas las vistas tras importar.
//     Si no se proveen `getParametros`/`getProductos`, la exportación recurre a
//     `repository.load()` como fuente de datos.
//
// Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7 (y 6.6 al notificar fallos de escritura).

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  /**
   * Id del botón Exportar de la Pagina_Base_De_Datos.
   * @type {string}
   */
  const ID_BTN_EXPORTAR = "btn-exportar";

  /**
   * Id del `<input type="file">` de importación de la Pagina_Base_De_Datos.
   * @type {string}
   */
  const ID_INPUT_IMPORTAR = "input-importar";

  /**
   * Nombre de archivo sugerido para la descarga del Archivo_De_Respaldo.
   * @type {string}
   */
  const NOMBRE_ARCHIVO_RESPALDO = "limpiapipas-respaldo.json";

  /**
   * Mensaje de advertencia mostrado antes de reemplazar los datos actuales al
   * importar un respaldo válido (Requisito 9.4).
   * @type {string}
   */
  const MENSAJE_CONFIRMAR_REEMPLAZO =
    "La importación reemplazará los parámetros y productos actuales. ¿Deseas continuar?";

  /**
   * Mensaje informativo tras una importación aplicada con éxito.
   * @type {string}
   */
  const MENSAJE_IMPORTACION_OK = "Datos importados correctamente.";

  /**
   * Mensaje de error mostrado cuando el archivo no puede leerse.
   * @type {string}
   */
  const MENSAJE_ERROR_LECTURA = "No se pudo leer el archivo seleccionado.";

  /**
   * Mensaje mostrado cuando la escritura no pudo persistirse (Requisito 6.6).
   * @type {string}
   */
  const MENSAJE_GUARDADO_NO_PERSISTENTE =
    "Los datos importados no pudieron guardarse de forma permanente; se conservarán solo durante esta sesión.";

  /**
   * Inicializa el controlador de la Pagina_Base_De_Datos cableando los controles
   * de exportación e importación. Degrada de forma segura si algún elemento del
   * DOM no está presente (no lanza).
   *
   * @param {{
   *   getParametros?: () => unknown[],
   *   getProductos?: () => unknown[],
   *   setParametros?: (parametros: unknown[]) => void,
   *   setProductos?: (productos: unknown[]) => void,
   *   refrescarVistas?: () => void,
   * }} [deps]
   * @returns {void}
   */
  function initBaseDatos(deps = {}) {
    const botonExportar = obtenerElemento(ID_BTN_EXPORTAR);
    if (botonExportar !== null) {
      botonExportar.addEventListener("click", () => {
        manejarExportar(deps);
      });
    }

    const inputImportar = obtenerElemento(ID_INPUT_IMPORTAR);
    if (inputImportar !== null) {
      inputImportar.addEventListener("change", (evento) => {
        manejarImportar(evento, deps);
      });
    }
  }

  /**
   * Obtiene un elemento del DOM por id de forma segura, o `null` si no existe o no
   * hay `document` disponible.
   *
   * @param {string} id
   * @returns {HTMLElement | null}
   */
  function obtenerElemento(id) {
    if (typeof document === "undefined" || document === null) {
      return null;
    }
    try {
      return document.getElementById(id);
    } catch {
      return null;
    }
  }

  /**
   * Obtiene las colecciones actuales (Parametros y Productos) a partir de los
   * accesores compartidos por `app.js`, o de `repository.load()` como respaldo.
   *
   * @param {{ getParametros?: () => unknown[], getProductos?: () => unknown[] }} deps
   * @returns {{ parametros: unknown[], productos: unknown[] }}
   */
  function obtenerColeccionesActuales(deps) {
    const tieneAccesores =
      typeof deps.getParametros === "function" &&
      typeof deps.getProductos === "function";

    if (tieneAccesores) {
      const parametros = deps.getParametros();
      const productos = deps.getProductos();
      return {
        parametros: Array.isArray(parametros) ? parametros : [],
        productos: Array.isArray(productos) ? productos : [],
      };
    }

    const cargado = window.LP.repository.load();
    return {
      parametros: Array.isArray(cargado.parametros) ? cargado.parametros : [],
      productos: Array.isArray(cargado.productos) ? cargado.productos : [],
    };
  }

  /**
   * Maneja la exportación: serializa el respaldo, crea un `Blob` de tipo
   * `application/json`, genera una URL con `URL.createObjectURL`, dispara la
   * descarga mediante un ancla temporal y libera la URL con `URL.revokeObjectURL`
   * (Requisitos 9.1, 9.2).
   *
   * @param {object} deps
   * @returns {void}
   */
  function manejarExportar(deps) {
    const { parametros, productos } = obtenerColeccionesActuales(deps);
    const contenido = window.LP.backup.serializarRespaldo(parametros, productos);

    let url = null;
    try {
      const blob = new Blob([contenido], { type: "application/json" });
      url = URL.createObjectURL(blob);

      const ancla = document.createElement("a");
      ancla.href = url;
      ancla.download = NOMBRE_ARCHIVO_RESPALDO;
      // El ancla no necesita ser visible; se añade al DOM para máxima
      // compatibilidad con el disparo programático del clic.
      ancla.style.display = "none";
      document.body.appendChild(ancla);
      ancla.click();
      document.body.removeChild(ancla);
    } catch {
      window.LP.notifier.error("No se pudo generar el archivo de respaldo.");
    } finally {
      if (url !== null) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Sin acción: liberar la URL es best-effort.
        }
      }
    }
  }

  /**
   * Maneja la importación: lee el archivo seleccionado con `FileReader`, parsea el
   * respaldo y aplica el reemplazo tras confirmación explícita.
   *
   * Reinicia el valor del input al finalizar para que volver a seleccionar el
   * mismo archivo dispare de nuevo el evento `change`.
   *
   * @param {Event} evento
   * @param {object} deps
   * @returns {void}
   */
  function manejarImportar(evento, deps) {
    const input = /** @type {HTMLInputElement | null} */ (evento && evento.target);
    const archivo =
      input && input.files && input.files.length > 0 ? input.files[0] : null;

    if (archivo === null) {
      return;
    }

    const lector = new FileReader();

    lector.onload = () => {
      const texto = typeof lector.result === "string" ? lector.result : "";
      procesarTextoImportado(texto, deps);
      reiniciarInput(input);
    };

    lector.onerror = () => {
      window.LP.notifier.error(MENSAJE_ERROR_LECTURA);
      reiniciarInput(input);
    };

    try {
      lector.readAsText(archivo);
    } catch {
      window.LP.notifier.error(MENSAJE_ERROR_LECTURA);
      reiniciarInput(input);
    }
  }

  /**
   * Procesa el texto leído del archivo: lo parsea y decide el flujo según el
   * resultado.
   *   - `invalid` → `notifier.error` sin alterar el almacenamiento (Requisito 9.6).
   *   - `ok`      → confirma el reemplazo; si acepta, reemplaza y refresca
   *                 (Requisito 9.5); si cancela, no hace nada (Requisito 9.7).
   *
   * @param {string} texto
   * @param {object} deps
   * @returns {void}
   */
  function procesarTextoImportado(texto, deps) {
    const resultado = window.LP.backup.parsearRespaldo(texto);

    if (resultado.status === "invalid") {
      window.LP.notifier.error(resultado.reason);
      return;
    }

    // status === "ok": pedir confirmación explícita antes de reemplazar.
    const confirmado = window.LP.notifier.confirmar(MENSAJE_CONFIRMAR_REEMPLAZO);
    if (!confirmado) {
      // Cancelado: no se modifica nada (Requisito 9.7).
      return;
    }

    aplicarReemplazo(resultado.parametros, resultado.productos, deps);
  }

  /**
   * Reemplaza ambas colecciones en el Almacenamiento_Local, actualiza el estado
   * compartido y refresca todas las vistas (Requisito 9.5). Si la persistencia
   * falla, notifica que el guardado no fue permanente (Requisito 6.6) pero deja el
   * estado en memoria y las vistas actualizados.
   *
   * @param {unknown[]} parametros
   * @param {unknown[]} productos
   * @param {object} deps
   * @returns {void}
   */
  function aplicarReemplazo(parametros, productos, deps) {
    // Retrocompatibilidad: aplicar el Normalizador_De_Producto a cada Producto
    // importado para completar el Flag_Compuesto ausente antes de persistirlo y
    // mostrarlo (Req 4.5). Se normaliza ANTES de `replaceAll`/`setProductos` para
    // que el flag quede también guardado en el Almacenamiento_Local. Se aplica de
    // forma defensiva: solo si `LP.models.normalizarProducto` está disponible, y
    // sin lanzar si no lo está (degradación segura bajo file://).
    let productosNormalizados = productos;
    if (
      Array.isArray(productos) &&
      window.LP.models &&
      typeof window.LP.models.normalizarProducto === "function"
    ) {
      productosNormalizados = productos.map(window.LP.models.normalizarProducto);
    }

    const resultado = window.LP.repository.replaceAll(
      parametros,
      productosNormalizados
    );

    if (typeof deps.setParametros === "function") {
      deps.setParametros(parametros);
    }
    if (typeof deps.setProductos === "function") {
      deps.setProductos(productosNormalizados);
    }
    if (typeof deps.refrescarVistas === "function") {
      deps.refrescarVistas();
    }

    if (resultado.status === "failed") {
      window.LP.notifier.error(MENSAJE_GUARDADO_NO_PERSISTENTE);
      return;
    }

    window.LP.notifier.info(MENSAJE_IMPORTACION_OK);
  }

  /**
   * Reinicia el valor del input de archivo para permitir volver a importar el
   * mismo archivo (que de otro modo no dispararía un nuevo evento `change`).
   *
   * @param {HTMLInputElement | null} input
   * @returns {void}
   */
  function reiniciarInput(input) {
    if (input === null) {
      return;
    }
    try {
      input.value = "";
    } catch {
      // Sin acción: algunos entornos restringen la asignación del valor.
    }
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.basedatosController = {
      ID_BTN_EXPORTAR,
      ID_INPUT_IMPORTAR,
      NOMBRE_ARCHIVO_RESPALDO,
      initBaseDatos,
    };
})(window);
