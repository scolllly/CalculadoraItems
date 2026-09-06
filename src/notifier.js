// notifier.js — Capa de mensajería de UI.
//
// Concentra la presentación de mensajes visibles al usuario (informativos y de
// error) y la solicitud de confirmaciones explícitas. Mantiene las demás capas
// (controladores, dominio) libres de detalles de presentación.
//
// Estrategia:
//   - `info`/`error` renderizan una alerta de Bootstrap dentro de un contenedor
//     del DOM identificado por `id="notificaciones"`. Si el contenedor o el DOM
//     no están presentes, degradan de forma segura a `console` sin lanzar.
//   - `confirmar` usa `window.confirm` para obtener un sí/no explícito y devuelve
//     el booleano correspondiente (Requisitos 2.4, 9.4).
//
// Sin dependencias externas: usa únicamente las APIs del navegador y las clases
// de estilo de Bootstrap ya cargadas de forma local.

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  /**
   * Id del contenedor del DOM donde se insertan las alertas.
   *
   * `index.html` debe incluir un elemento con este id (por ejemplo,
   * `<div id="notificaciones" aria-live="polite"></div>`) para que los mensajes
   * sean visibles. Si no existe, los mensajes se registran en consola.
   *
   * @type {string}
   */
  const ID_CONTENEDOR = "notificaciones";

  /**
   * Milisegundos tras los cuales una alerta informativa se descarta sola.
   * Las alertas de error permanecen hasta que el usuario las cierre.
   *
   * @type {number}
   */
  const AUTO_DESCARTE_INFO_MS = 5000;

  /**
   * Muestra un mensaje informativo al usuario.
   *
   * @param {string} mensaje
   * @returns {void}
   */
  function info(mensaje) {
    mostrarAlerta(mensaje, "info");
  }

  /**
   * Muestra un mensaje de error al usuario.
   *
   * @param {string} mensaje
   * @returns {void}
   */
  function error(mensaje) {
    mostrarAlerta(mensaje, "error");
  }

  /**
   * Solicita una confirmación explícita al usuario y devuelve su respuesta.
   *
   * Usa `window.confirm`, que bloquea hasta que el usuario acepta o cancela. En
   * entornos sin `window`/`confirm` disponible, degrada devolviendo `false`
   * (interpretado como "no confirmado") para no ejecutar acciones destructivas
   * sin consentimiento explícito.
   *
   * @param {string} mensaje
   * @returns {boolean} `true` si el usuario confirma; `false` si cancela.
   */
  function confirmar(mensaje) {
    try {
      if (typeof window !== "undefined" && typeof window.confirm === "function") {
        return window.confirm(mensaje) === true;
      }
    } catch {
      // Si `confirm` no está disponible o lanza, no confirmamos.
    }
    return false;
  }

  /**
   * Renderiza una alerta de Bootstrap en el contenedor de notificaciones.
   *
   * Degrada de forma segura:
   *   - Si no hay `document` o no existe el contenedor, escribe en consola.
   *   - Nunca propaga excepciones hacia el llamador.
   *
   * @param {string} mensaje
   * @param {"info" | "error"} tipo
   * @returns {void}
   */
  function mostrarAlerta(mensaje, tipo) {
    const texto = typeof mensaje === "string" ? mensaje : String(mensaje);

    const contenedor = obtenerContenedor();
    if (contenedor === null) {
      registrarEnConsola(texto, tipo);
      return;
    }

    try {
      const alerta = construirAlerta(texto, tipo);
      contenedor.appendChild(alerta);

      if (tipo === "info") {
        programarAutoDescarte(alerta);
      }
    } catch {
      // Ante cualquier fallo de manipulación del DOM, degradamos a consola.
      registrarEnConsola(texto, tipo);
    }
  }

  /**
   * Obtiene el contenedor de notificaciones del DOM, o `null` si no existe.
   *
   * @returns {HTMLElement | null}
   */
  function obtenerContenedor() {
    if (typeof document === "undefined" || document === null) {
      return null;
    }
    try {
      return document.getElementById(ID_CONTENEDOR);
    } catch {
      return null;
    }
  }

  /**
   * Construye el elemento de alerta de Bootstrap descartable.
   *
   * @param {string} texto
   * @param {"info" | "error"} tipo
   * @returns {HTMLElement}
   */
  function construirAlerta(texto, tipo) {
    const claseContextual = tipo === "error" ? "alert-danger" : "alert-info";

    const alerta = document.createElement("div");
    alerta.className = `alert ${claseContextual} alert-dismissible fade show`;
    alerta.setAttribute("role", "alert");

    // El texto se asigna como contenido de texto (no HTML) para evitar inyección.
    const cuerpo = document.createElement("span");
    cuerpo.textContent = texto;
    alerta.appendChild(cuerpo);

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn-close";
    boton.setAttribute("aria-label", "Cerrar");
    boton.addEventListener("click", () => {
      quitarAlerta(alerta);
    });
    alerta.appendChild(boton);

    return alerta;
  }

  /**
   * Programa el descarte automático de una alerta informativa.
   *
   * @param {HTMLElement} alerta
   * @returns {void}
   */
  function programarAutoDescarte(alerta) {
    if (typeof setTimeout !== "function") {
      return;
    }
    setTimeout(() => {
      quitarAlerta(alerta);
    }, AUTO_DESCARTE_INFO_MS);
  }

  /**
   * Quita una alerta del DOM de forma segura.
   *
   * @param {HTMLElement} alerta
   * @returns {void}
   */
  function quitarAlerta(alerta) {
    try {
      if (alerta && typeof alerta.remove === "function") {
        alerta.remove();
      } else if (alerta && alerta.parentNode) {
        alerta.parentNode.removeChild(alerta);
      }
    } catch {
      // Sin acción: la alerta ya no está en el DOM.
    }
  }

  /**
   * Registra el mensaje en consola como mecanismo de respaldo.
   *
   * @param {string} texto
   * @param {"info" | "error"} tipo
   * @returns {void}
   */
  function registrarEnConsola(texto, tipo) {
    if (typeof console === "undefined" || console === null) {
      return;
    }
    if (tipo === "error" && typeof console.error === "function") {
      console.error(texto);
    } else if (typeof console.info === "function") {
      console.info(texto);
    } else if (typeof console.log === "function") {
      console.log(texto);
    }
  }
    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.notifier = { ID_CONTENEDOR, info, error, confirmar };
})(window);
