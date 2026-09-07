// tests/helpers/cargarLP.js — Helper de carga de los Scripts_Clasicos de src/.
//
// La Aplicacion se carga bajo file:// como Scripts_Clasicos: cada archivo es un
// IIFE `(function (global) { ... })(window)` que publica su API en `window.LP`.
// No hay sintaxis de Módulos ES ni exports; las pruebas no pueden `import` esos
// archivos directamente.
//
// Este helper evalúa el código fuente de cada script contra un objeto `window`
// (el `window` global de jsdom por defecto) de forma que su referencia libre a
// `window` resuelva a ese objeto y pueble `window.LP`. Así las suites de pruebas
// pueden ejercitar el dominio puro (LP.calculo, LP.validation, ...) y, con jsdom,
// los controladores DOM.
//
// IMPORTANTE: este helper es exclusivo de las pruebas. NO altera cómo carga la
// Aplicacion en index.html (sigue siendo <script> clásico).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
// tests/helpers -> raíz del repositorio.
const RAIZ = path.resolve(AQUI, "..", "..");
const DIR_SRC = path.join(RAIZ, "src");

/**
 * Orden de carga de los Scripts_Clasicos, en dependencias, replicando el orden
 * declarado en index.html (más los módulos nuevos de esta funcionalidad cuando
 * existan). Sólo se cargan los archivos presentes en disco, de modo que el
 * helper funcione de forma incremental mientras se implementan los módulos.
 *
 * @type {string[]}
 */
const ORDEN_SCRIPTS = [
  // 1. Dominio puro
  "currency.js",
  "calculo.js",
  "validation.js",
  "models.js",
  "productos.ops.js", // NUEVO (puede no existir todavía)
  "backup.js",
  // 2. Persistencia
  "storage.js",
  "repository.js",
  // 3. Infraestructura de UI
  "notifier.js",
  "router.js",
  "lineas.editor.js", // NUEVO (puede no existir todavía)
  // 4. Controladores
  "parametros.controller.js",
  "productos.controller.js",
  "basedatos.controller.js",
  // 5. Arranque (normalmente no se carga en pruebas unitarias)
  // "app.js",
];

/**
 * Evalúa el código fuente de un Script_Clasico contra un objeto global `window`.
 *
 * Los scripts usan el patrón `(function (global) { ... })(window)` y referencian
 * globales del navegador (`window`, `document`, `console`, `setTimeout`,
 * `crypto`). Envolvemos el código en una función cuyo `this` y cuyas variables
 * libres apuntan al `window` provisto, ejecutándolo con `vm.runInContext` sobre
 * un contexto que usa `window` como objeto global.
 *
 * @param {string} codigo Código fuente del script.
 * @param {object} win Objeto window destino (por defecto, el de jsdom).
 * @param {string} nombre Nombre del archivo (para mensajes de error).
 * @returns {void}
 */
function evaluarScript(codigo, win, nombre) {
  // Aseguramos que `window` sea auto-referencial dentro del contexto.
  if (win.window !== win) {
    win.window = win;
  }
  const contexto = vm.createContext(win);
  const script = new vm.Script(codigo, { filename: nombre });
  script.runInContext(contexto);
}

/**
 * Carga los Scripts_Clasicos de `src/` sobre un objeto `window`, poblando
 * `window.LP` con las APIs de la Aplicacion.
 *
 * @param {object} [win] Objeto window destino. Por defecto usa el `window` global
 *   (jsdom bajo el entorno de pruebas de Vitest). Debe existir para las pruebas
 *   de controladores DOM.
 * @param {object} [opciones]
 * @param {string[]} [opciones.scripts] Lista explícita de archivos a cargar (en
 *   orden). Por defecto se usa ORDEN_SCRIPTS filtrado a los existentes.
 * @returns {object} El espacio de nombres `window.LP` poblado.
 */
export function cargarLP(win = globalThis.window, opciones = {}) {
  if (!win) {
    throw new Error(
      "cargarLP requiere un objeto window (usa el entorno jsdom de Vitest)."
    );
  }

  const solicitados =
    opciones && Array.isArray(opciones.scripts)
      ? opciones.scripts
      : ORDEN_SCRIPTS;

  for (const nombre of solicitados) {
    const ruta = path.join(DIR_SRC, nombre);
    if (!fs.existsSync(ruta)) {
      // Carga incremental: se omiten los módulos aún no implementados.
      continue;
    }
    const codigo = fs.readFileSync(ruta, "utf8");
    evaluarScript(codigo, win, nombre);
  }

  return win.LP;
}

/**
 * Carga únicamente los módulos indicados (en el orden dado) sobre `window`.
 * Útil para probar un módulo del dominio puro de forma aislada.
 *
 * @param {string[]} scripts Nombres de archivo dentro de `src/`.
 * @param {object} [win] Objeto window destino (por defecto el de jsdom).
 * @returns {object} El espacio de nombres `window.LP` poblado.
 */
export function cargarModulos(scripts, win = globalThis.window) {
  return cargarLP(win, { scripts });
}

export { ORDEN_SCRIPTS };
