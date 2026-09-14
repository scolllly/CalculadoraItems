// tests/cantidad.linea.producto.exploracion.property.test.js
//
// Spec: product-line-quantity-validation-fix — Tarea 1 (Exploración de la
// Bug_Condition, ANTES de implementar el arreglo).
//
// Property 1 (Bug Condition): una cadena numérica válida en una
// Linea_De_Producto debe ACEPTARSE (no debe reportarse `cantidad-invalida`).
//
// CRÍTICO: Esta prueba DEBE FALLAR sobre el código NO arreglado. El fallo
// confirma que el bug existe (isBugCondition(X) === true pero
// `validarLineasProducto` reporta `cantidad-invalida` porque pasa la cadena
// cruda a `validation.validarCantidad`, que exige `typeof valor === 'number'`).
// Cuando el arreglo esté implementado (Tarea 3), esta MISMA prueba pasará.
//
// Los Scripts_Clasicos se cargan con `cargarModulos`, que evalúa los IIFE de
// src/ contra el `window` de jsdom y puebla `window.LP`. Se invocan las
// funciones puras (`validarLineasProducto`, `detectarCicloComposicion`)
// directamente sobre `window.LP`.

import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";
import { cargarModulos } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

// Producto_Componente existente al que apuntan las Lineas_De_Producto de prueba.
const PRODUCTO_COMPONENTE = {
  id: "comp-1",
  nombre: "Componente base",
  lineas: [{ parametroId: "p1", cantidad: 1, subtotal: 10 }],
  precioTotal: 10,
};

// Lista de Productos vigentes (contexto para resolver `productoComponenteId`).
const PRODUCTOS = [PRODUCTO_COMPONENTE];

// Id del Producto_Contenedor en edición. Al crear uno nuevo (Calculadora /
// guardado nuevo) el controlador usa `null`.
const ID_EN_EDICION = null;

beforeAll(() => {
  LP = cargarModulos([
    "currency.js",
    "calculo.js",
    "validation.js",
    "models.js",
    "productos.ops.js",
  ]);
});

/**
 * Construye una Linea_De_Producto en edición: Fuente_De_Componente "Producto",
 * un `productoComponenteId` existente y la cantidad cruda (cadena) indicada.
 * @param {string} cantidad Cantidad cruda tal como la captura el editor (cadena).
 * @returns {object}
 */
function lineaDeProducto(cantidad) {
  const F = (LP.models && LP.models.FUENTE_COMPONENTE) || { PRODUCTO: "Producto" };
  return {
    parametroId: null,
    fuenteDeComponente: F.PRODUCTO,
    productoComponenteId: PRODUCTO_COMPONENTE.id,
    cantidad,
  };
}

/**
 * ¿El resultado de `validarLineasProducto` contiene un error
 * `{ indice, tipo: "cantidad-invalida" }` para el índice dado?
 * @param {{ valido: boolean, errores?: Array<{indice:number,tipo:string}> }} resultado
 * @param {number} indice
 * @returns {boolean}
 */
function tieneCantidadInvalida(resultado, indice) {
  if (!resultado || resultado.valido) return false;
  const errores = resultado.errores || [];
  return errores.some((e) => e.indice === indice && e.tipo === "cantidad-invalida");
}

/**
 * Reproduce fielmente la ruta de validación de las Lineas_De_Producto que hace
 * `validarLineasEnEdicion` en `productos.controller.js` (privada, no exportable):
 * delega la cantidad de las Lineas_De_Producto en
 * `productosOps.validarLineasProducto` y, si hay Lineas_De_Producto, comprueba
 * ciclos con `detectarCicloComposicion`. Para una línea de cantidad "5" con
 * componente válido y sin ciclo, el resultado esperado es `{ valido: true }`.
 * @param {Array<object>} lineas
 * @param {string|null} idContenedor
 * @returns {{ valido: true } | { valido: false, mensaje: string }}
 */
function validarLineasEnEdicionEquivalente(lineas, idContenedor) {
  const MENSAJES = LP.validation.MENSAJES;
  const resultado = LP.productosOps.validarLineasProducto(
    lineas,
    PRODUCTOS,
    idContenedor
  );
  if (!resultado.valido) {
    const errores = resultado.errores || [];
    const hayProblemaProducto = errores.some(
      (e) => e.tipo === "sin-producto" || e.tipo === "producto-inexistente"
    );
    if (hayProblemaProducto) {
      return { valido: false, mensaje: MENSAJES.LINEA_SIN_PRODUCTO };
    }
    return { valido: false, mensaje: MENSAJES.CANTIDAD_INVALIDA };
  }

  const F = (LP.models && LP.models.FUENTE_COMPONENTE) || { PRODUCTO: "Producto" };
  const hayLineasDeProducto = lineas.some(
    (l) => l && l.fuenteDeComponente === F.PRODUCTO
  );
  if (hayLineasDeProducto) {
    const idParaCiclos = idContenedor == null ? "__nuevo_producto__" : idContenedor;
    const ciclo = LP.productosOps.detectarCicloComposicion(
      idParaCiclos,
      lineas,
      PRODUCTOS
    );
    if (ciclo && ciclo.hayCiclo) {
      return { valido: false, mensaje: MENSAJES.REFERENCIA_PRODUCTO_NO_DISPONIBLE };
    }
  }
  return { valido: true };
}

// ---------------------------------------------------------------------------
// Property 1 (Bug Condition): cadena numérica válida en Linea_De_Producto se
// acepta (no se reporta `cantidad-invalida`).
// Validates: Requirements 1.1, 1.2, 1.3
// ---------------------------------------------------------------------------
describe("Exploración Bug_Condition — cadena numérica válida en Linea_De_Producto se acepta", () => {
  // Generador de cadenas numéricas válidas dentro de 0,01–999.999.999,99 con
  // <= 2 decimales, con formato aceptable por Number() (punto decimal, sin
  // separador de miles). Se generan como centésimas enteras y se formatean a
  // cadena con hasta 2 decimales.
  const arbCantidadStringValida = fc
    .integer({ min: 1, max: 99999999999 })
    .map((centesimas) => {
      const valor = centesimas / 100;
      // Formatear con hasta 2 decimales, sin ceros de más innecesarios.
      const texto = Number.isInteger(valor) ? String(valor) : String(valor);
      return texto;
    });

  it("Property 1 — validarLineasProducto no reporta cantidad-invalida para cadenas numéricas válidas", () => {
    fc.assert(
      fc.property(arbCantidadStringValida, (cantidad) => {
        // Precondición: isBugCondition(X) === true (cadena que representa un
        // número válido). Verificamos que la cadena es efectivamente válida
        // como número (mismo criterio que aNumeroCantidad + validarCantidad).
        const numerico = Number(String(cantidad).trim());
        fc.pre(
          Number.isFinite(numerico) &&
            LP.validation.validarCantidad(numerico).valido
        );

        const linea = lineaDeProducto(cantidad);
        const resultado = LP.productosOps.validarLineasProducto(
          [linea],
          PRODUCTOS,
          ID_EN_EDICION
        );
        // Comportamiento esperado (Expected Behavior 2.1/2.2): NO debe haber
        // error `cantidad-invalida` para la línea 0.
        expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // Casos concretos deterministas para reproducibilidad.
  it.each([["5"], ["0.01"], ["10.5"]])(
    "caso determinista — cantidad %s en Linea_De_Producto no produce cantidad-invalida",
    (cantidad) => {
      const linea = lineaDeProducto(cantidad);
      const resultado = LP.productosOps.validarLineasProducto(
        [linea],
        PRODUCTOS,
        ID_EN_EDICION
      );
      expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
    }
  );

  it("caso end-to-end — con cantidad '5', validarLineasEnEdicion devuelve { valido: true }", () => {
    const linea = lineaDeProducto("5");
    const resultado = validarLineasEnEdicionEquivalente([linea], ID_EN_EDICION);
    expect(resultado).toEqual({ valido: true });
  });
});
