// app.js — Raíz de composición (arranque de la SPA).
//
// Único punto de cableado de la Aplicacion (Calculadora de precios Limpiapipas).
// Mantiene la única fuente de verdad del estado en memoria (las listas de
// Parametros y Productos) y coordina el resto de las capas al arrancar:
//   - `repository` para cargar/persistir (Requisitos 6.3, 6.4, 6.5).
//   - `router` para conmutar entre vistas y mostrar la Pagina_Productos como
//     vista de inicio (Requisitos 8.1, 8.2).
//   - los controladores de Parametros, Productos y Base de datos.
//   - `notifier` para mostrar mensajes visibles (p. ej. carga fallida).
//
// Además detecta si el CSS local de Bootstrap no se cargó y revela una
// indicación visible manteniendo la app funcional (Requisito 7.4).
//
// Requisitos: 6.3, 6.4, 6.5, 7.4, 8.1, 8.2.
//
// Cargado vía <script> clásico bajo file://. Es el ÚLTIMO script en cargarse,
// por lo que todas las dependencias `window.LP.*` ya están disponibles al
// ejecutarse. No se usa sintaxis de módulos ES: las APIs se consumen desde
// `window.LP` (repository, router, notifier y los controladores).

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  /**
   * Id del aviso visible que se revela si el CSS de Bootstrap no se cargó.
   * Coincide con `index.html` (elemento oculto con la clase `d-none`).
   * @type {string}
   */
  const ID_AVISO_ESTILOS = "aviso-estilos";

  /**
   * Mensaje mostrado cuando los datos guardados no se pudieron cargar por estar
   * corruptos o con forma inesperada (Requisito 6.5).
   * @type {string}
   */
  const MENSAJE_CARGA_FALLIDA =
    "Los datos guardados no se pudieron cargar; se inició con listas vacías.";

  /**
   * Arranca la Aplicacion: carga el estado, inicializa los controladores, cablea
   * la navegación, muestra la vista de inicio, renderiza las listas iniciales y
   * detecta el fallo de carga del CSS de Bootstrap.
   *
   * Es tolerante ante elementos ausentes del DOM: cada paso degrada de forma
   * segura para que la app siga siendo funcional.
   *
   * @returns {void}
   */
  function iniciarApp() {
    // ---------------------------------------------------------------------------
    // 1) Cargar el estado inicial desde el Almacenamiento_Local (Req 6.3–6.5).
    //    `repository.load()` nunca lanza: devuelve listas utilizables (vacías
    //    ante ausencia o corrupción) más las advertencias correspondientes.
    // ---------------------------------------------------------------------------
    const cargado = window.LP.repository.load();

    // Única fuente de verdad del estado en memoria.
    let parametros = Array.isArray(cargado.parametros) ? cargado.parametros : [];
    let productos = Array.isArray(cargado.productos) ? cargado.productos : [];

    // Retrocompatibilidad: aplicar el Normalizador_De_Producto a cada Producto
    // cargado desde el Almacenamiento_Local para completar el Flag_Compuesto
    // ausente antes de fijarlos en el estado en memoria (Req 4.4). Se aplica de
    // forma defensiva: solo si `LP.models.normalizarProducto` está disponible, y
    // sin lanzar si no lo está (degradación segura bajo file://).
    if (
      window.LP.models &&
      typeof window.LP.models.normalizarProducto === "function"
    ) {
      productos = productos.map(window.LP.models.normalizarProducto);
    }

    // Ante JSON corrupto (o forma inválida) se inician listas vacías y se avisa
    // que los datos guardados no se pudieron cargar (Req 6.5). Las listas vacías
    // por ausencia de datos simplemente arrancan vacías, sin aviso (Req 6.4).
    if (Array.isArray(cargado.warnings) && cargado.warnings.length > 0) {
      window.LP.notifier.error(MENSAJE_CARGA_FALLIDA);
    }

    // ---------------------------------------------------------------------------
    // 2) Accesores del estado compartido (única fuente de verdad).
    // ---------------------------------------------------------------------------
    const getParametros = () => parametros;
    const setParametros = (nuevos) => {
      parametros = Array.isArray(nuevos) ? nuevos : [];
    };
    const getProductos = () => productos;
    const setProductos = (nuevos) => {
      productos = Array.isArray(nuevos) ? nuevos : [];
    };

    // ---------------------------------------------------------------------------
    // 3) Inicializar los controladores.
    // ---------------------------------------------------------------------------

    // Controlador de Productos (Calculadora + lista de Productos guardados).
    const productosController = window.LP.productosController.crearProductosController({
      getParametros,
      getProductos,
      setProductos,
    });
    productosController.init();

    // Controlador de Parametros. Se coordina con la Calculadora para contar y
    // desreferenciar líneas al eliminar un Parametro (Req 2.4) y para refrescar
    // el selector por línea cuando cambian los Parametros.
    const parametrosController = window.LP.parametrosController.initParametros({
      getParametros,
      setParametros,
      contarLineasReferenciando: (parametroId) =>
        productosController.contarLineasQueReferencian(parametroId),
      desreferenciarParametro: (parametroId) =>
        productosController.desreferenciarParametro(parametroId),
      onParametrosCambio: () => {
        // Al cambiar los Parametros, re-renderizar la Calculadora para que el
        // selector por línea y las unidades reflejen los Parametros vigentes.
        productosController.render();
      },
    });

    // Callback compartido para re-renderizar ambas vistas tras una importación.
    const refrescarVistas = () => {
      parametrosController.render();
      productosController.render();
    };

    // Controlador de Base de datos (exportar/importar respaldo).
    window.LP.basedatosController.initBaseDatos({
      getParametros,
      getProductos,
      setParametros,
      setProductos,
      refrescarVistas,
    });

    // ---------------------------------------------------------------------------
    // 4) Cablear la Barra_De_Navegacion (Req 8.1) y mostrar la vista de inicio
    //    (Pagina_Productos, Req 8.2).
    // ---------------------------------------------------------------------------
    cablearNavegacion();
    window.LP.router.vistaInicial();

    // ---------------------------------------------------------------------------
    // 5) Renderizar las listas iniciales de Parametros y Productos (Req 6.3).
    //    Los controladores ya renderizan en su init; re-renderizamos de forma
    //    explícita para dejar el estado inicial reflejado sin ambigüedad.
    // ---------------------------------------------------------------------------
    parametrosController.render();
    productosController.render();

    // ---------------------------------------------------------------------------
    // 6) Detectar el fallo de carga del CSS de Bootstrap (Req 7.4).
    // ---------------------------------------------------------------------------
    if (!bootstrapCargado()) {
      revelarAvisoEstilos();
    }

    // ---------------------------------------------------------------------------
    // 7) Detección oportunista de los iconos de Bootstrap (Req 5.4, 5.5, 1.8).
    //    Si la hoja de iconos no parece aplicada, marcar el <body> con
    //    `lp-sin-iconos` para revelar las etiquetas de texto de fallback. NO
    //    suprime `revelarAvisoEstilos()`: ambos avisos son independientes.
    // ---------------------------------------------------------------------------
    if (!iconosCargados() && document && document.body && document.body.classList) {
      document.body.classList.add("lp-sin-iconos");
    }
  }

  /**
   * Cablea los tres botones de la Barra_De_Navegacion para conmutar de vista al
   * hacer clic (Req 8.1, 8.3–8.5). Degrada de forma segura si algún botón no
   * existe en el DOM.
   *
   * @returns {void}
   */
  function cablearNavegacion() {
    if (typeof document === "undefined" || document === null) return;

    /** @type {Array<{ id: string, vista: "productos"|"parametros"|"basedatos" }>} */
    const botones = [
      { id: "nav-productos", vista: "productos" },
      { id: "nav-parametros", vista: "parametros" },
      { id: "nav-basedatos", vista: "basedatos" },
    ];

    for (const { id, vista } of botones) {
      const boton = document.getElementById(id);
      if (boton && typeof boton.addEventListener === "function") {
        boton.addEventListener("click", () => {
          window.LP.router.mostrar(vista);
        });
      }
    }
  }

  /**
   * Determina si el CSS de Bootstrap se cargó y aplicó correctamente.
   *
   * Comprueba una regla conocida de Bootstrap: la clase utilitaria `d-none`
   * establece `display: none`. Se crea un elemento temporal con esa clase, se
   * añade fuera de pantalla y se lee su estilo computado. Si `display` es "none",
   * Bootstrap está aplicado; en caso contrario (o ante cualquier error) se
   * considera que no se cargó.
   *
   * @returns {boolean} `true` si Bootstrap parece cargado; `false` si no.
   */
  function bootstrapCargado() {
    if (
      typeof document === "undefined" ||
      document === null ||
      !document.body ||
      typeof window === "undefined" ||
      typeof window.getComputedStyle !== "function"
    ) {
      // Sin DOM/estilos computables no podemos afirmar el fallo; asumimos cargado
      // para no mostrar un aviso incorrecto.
      return true;
    }

    let sonda = null;
    try {
      sonda = document.createElement("div");
      sonda.className = "d-none";
      // Fuera del flujo visible mientras medimos.
      sonda.setAttribute("aria-hidden", "true");
      sonda.style.position = "absolute";
      document.body.appendChild(sonda);

      const display = window.getComputedStyle(sonda).display;
      return display === "none";
    } catch {
      // Ante cualquier fallo de medición, asumimos cargado para no molestar.
      return true;
    } finally {
      if (sonda && typeof sonda.remove === "function") {
        try {
          sonda.remove();
        } catch {
          // Sin acción: la sonda ya no está en el DOM.
        }
      }
    }
  }

  /**
   * ¿Se aplicó la hoja de estilos de Bootstrap Icons? (opcional / best-effort).
   *
   * Reutiliza el mismo enfoque de sonda que `bootstrapCargado()`: crea un
   * elemento con una clase `bi`, lo añade fuera de pantalla y comprueba si la
   * regla `font-family` de `bootstrap-icons.css` se aplicó a su pseudo-elemento
   * `::before` (debe contener "bootstrap-icons"). Ante duda o error se asume
   * cargado, para no mostrar un fallback incorrecto.
   *
   * Limitación documentada: esta sonda detecta si la HOJA DE ESTILOS se aplicó
   * (la regla `font-family`), no si el archivo de fuente `.woff2` se decodificó
   * realmente bajo `file://` (poco fiable de verificar). Por eso la accesibilidad
   * no depende de esta detección: se satisface por construcción (aria-label/title
   * y una etiqueta de texto oculta siempre presentes en cada Boton_De_Icono).
   * Marcar `lp-sin-iconos` es solo una mejora oportunista para el caso en que
   * falte la hoja de estilos.
   *
   * @returns {boolean} `true` si los iconos parecen cargados; `false` si no.
   */
  function iconosCargados() {
    if (
      typeof document === "undefined" ||
      document === null ||
      !document.body ||
      typeof window === "undefined" ||
      typeof window.getComputedStyle !== "function"
    ) {
      // Sin DOM/estilos computables no podemos afirmar el fallo; asumimos cargado
      // para no mostrar un fallback incorrecto.
      return true;
    }

    let sonda = null;
    try {
      sonda = document.createElement("i");
      sonda.className = "bi bi-eye";
      // Fuera del flujo visible mientras medimos.
      sonda.setAttribute("aria-hidden", "true");
      sonda.style.position = "absolute";
      document.body.appendChild(sonda);

      // bootstrap-icons.css fija font-family: "bootstrap-icons" en .bi::before.
      const antes = window.getComputedStyle(sonda, "::before");
      const familia = antes && antes.fontFamily ? antes.fontFamily : "";
      return /bootstrap-icons/i.test(familia);
    } catch {
      // Ante cualquier fallo de medición, asumimos cargado para no molestar.
      return true;
    } finally {
      if (sonda && typeof sonda.remove === "function") {
        try {
          sonda.remove();
        } catch {
          // Sin acción: la sonda ya no está en el DOM.
        }
      }
    }
  }

  /**
   * Revela el aviso visible de que los estilos de Bootstrap no se cargaron,
   * quitándole la clase `d-none`. La app permanece funcional (Req 7.4). Degrada
   * de forma segura si el elemento no existe.
   *
   * @returns {void}
   */
  function revelarAvisoEstilos() {
    if (typeof document === "undefined" || document === null) return;
    const aviso = document.getElementById(ID_AVISO_ESTILOS);
    if (aviso && aviso.classList && typeof aviso.classList.remove === "function") {
      aviso.classList.remove("d-none");
    }
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.app = {
      ID_AVISO_ESTILOS,
      iniciarApp,
    };

    // ---------------------------------------------------------------------------
    // Arranque automático al cargar el documento.
    // ---------------------------------------------------------------------------
    if (typeof document !== "undefined" && document !== null) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarApp, { once: true });
      } else {
        // El documento ya está listo (p. ej. el script se cargó tarde).
        iniciarApp();
      }
    }
})(window);
