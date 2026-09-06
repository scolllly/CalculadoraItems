// router.js — Enrutador SPA (efectos DOM)
//
// Componente de la capa de UI del Aplicacion (Calculadora de precios
// Limpiapipas). Conmuta entre las tres vistas de la SPA mostrando una sección y
// ocultando las otras dos, sin recargas de página ni solicitudes de red.
//
// Requisito 7.3: alternar entre vistas mediante conmutación (estilo SPA), sin
//   recargas de página ni solicitudes de red.
// Requisito 8.2: mostrar la Pagina_Productos como vista de inicio.
// Requisitos 8.3, 8.4, 8.5: al mostrar una vista, ocultar las otras dos.
//
// Contrato del DOM (debe coincidir con index.html, tarea 12.1):
//   Secciones de vista (ids):
//     - "pagina-productos"    → vista "productos"
//     - "pagina-parametros"   → vista "parametros"
//     - "pagina-basedatos"    → vista "basedatos"
//   Botones de navegación (opcionales; se resaltan con la clase "active"):
//     - por atributo:  [data-vista="productos"|"parametros"|"basedatos"]
//     - o por id:      "nav-productos", "nav-parametros", "nav-basedatos"
//   La visibilidad se conmuta con la clase "d-none" de Bootstrap: se añade a las
//   secciones ocultas y se retira de la sección visible.

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  /**
   * @typedef {"productos" | "parametros" | "basedatos"} Vista
   */

  /** Lista de vistas válidas de la SPA. */
  const VISTAS = /** @type {const} */ (["productos", "parametros", "basedatos"]);

  /** Mapa de cada Vista al id de su sección en el DOM. */
  const ID_SECCION = {
    productos: "pagina-productos",
    parametros: "pagina-parametros",
    basedatos: "pagina-basedatos",
  };

  /** Mapa de cada Vista al id de su botón de navegación en el DOM. */
  const ID_NAV = {
    productos: "nav-productos",
    parametros: "nav-parametros",
    basedatos: "nav-basedatos",
  };

  /**
   * Obtiene el elemento de la sección asociada a una Vista, si existe.
   *
   * @param {Vista} vista vista cuya sección se busca
   * @returns {HTMLElement | null} el elemento de la sección o `null` si no existe
   */
  function seccionDe(vista) {
    return document.getElementById(ID_SECCION[vista]);
  }

  /**
   * Obtiene el botón de navegación asociado a una Vista, buscando primero por el
   * atributo `data-vista` y, si no lo encuentra, por su id convencional.
   *
   * @param {Vista} vista vista cuyo botón de navegación se busca
   * @returns {HTMLElement | null} el botón de navegación o `null` si no existe
   */
  function navDe(vista) {
    const porAtributo = document.querySelector(`[data-vista="${vista}"]`);
    if (porAtributo instanceof HTMLElement) return porAtributo;
    return document.getElementById(ID_NAV[vista]);
  }

  /**
   * Muestra la sección de la vista indicada y oculta las otras dos, actualizando
   * también el estado activo de los botones de navegación disponibles.
   *
   * La visibilidad se controla con la clase "d-none" de Bootstrap; no se produce
   * ninguna recarga de página ni solicitud de red. La función es tolerante ante
   * elementos ausentes del DOM: si una sección o un botón no existe, simplemente
   * se omite. Una vista desconocida se ignora sin lanzar excepciones.
   *
   * Requisitos 8.3, 8.4, 8.5.
   *
   * @param {Vista} vista vista a mostrar
   * @returns {void}
   */
  function mostrar(vista) {
    if (!VISTAS.includes(vista)) return;

    for (const v of VISTAS) {
      const seccion = seccionDe(v);
      if (seccion) {
        seccion.classList.toggle("d-none", v !== vista);
      }

      const nav = navDe(v);
      if (nav) {
        nav.classList.toggle("active", v === vista);
      }
    }
  }

  /**
   * Muestra la vista de inicio predeterminada (Pagina_Productos).
   *
   * Requisito 8.2.
   *
   * @returns {void}
   */
  function vistaInicial() {
    mostrar("productos");
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.router = { mostrar, vistaInicial };
})(window);
