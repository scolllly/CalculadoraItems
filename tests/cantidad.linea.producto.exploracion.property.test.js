// tests/cantidad.linea.producto.exploracion.property.test.js
//
// Migrada al entorno Next.js (ES modules). El único cambio respecto a la
// versión en `old/tests/` es reemplazar `cargarModulos([...])` + `window.LP.*`
// por imports ES directos de `../lib/productos.ops.js`, `../lib/validation.js`
// y `../lib/models.js`. Los generadores y la propiedad se conservan idénticos.
//
// Requisitos: 11.1, 11.2, 11.4

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validarLineasProducto,
  detectarCicloComposicion,
} from "../lib/productos.ops.js";
import { validarCantidad, MENSAJES } from "../lib/validation.js";
import { FUENTE_COMPONENTE } from "../lib/models.js";

// Producto_Componente existente al que apuntan las Lineas_De_Producto de prueba.
const PRODUCTO_COMPONENTE = {
  id: "comp-1",
  nombre: "Componente base",
  lineas: [{ parametroId: "p1", cantidad: 1, subtotal: 10 }],
  precioTotal: 10,
};

const PRODUCTOS = [PRODUCTO_COMPONENTE];
const ID_EN_EDICION = null;

function lineaDeProducto(cantidad) {
  return {
    parametroId: null,
    fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
    productoComponenteId: PRODUCTO_COMPONENTE.id,
    cantidad,
  };
}

function tieneCantidadInvalida(resultado, indice) {
  if (!resultado || resultado.valido) return false;
  const errores = resultado.errores || [];
  return errores.some((e) => e.indice === indice && e.tipo === "cantidad-invalida");
}

function validarLineasEnEdicionEquivalente(lineas, idContenedor) {
  const resultado = validarLineasProducto(lineas, PRODUCTOS, idContenedor);
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

  const hayLineasDeProducto = lineas.some(
    (l) => l && l.fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO
  );
  if (hayLineasDeProducto) {
    const idParaCiclos = idContenedor == null ? "__nuevo_producto__" : idContenedor;
    const ciclo = detectarCicloComposicion(idParaCiclos, lineas, PRODUCTOS);
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
  const arbCantidadStringValida = fc
    .integer({ min: 1, max: 99999999999 })
    .map((centesimas) => {
      const valor = centesimas / 100;
      const texto = Number.isInteger(valor) ? String(valor) : String(valor);
      return texto;
    });

  it("Property 1 — validarLineasProducto no reporta cantidad-invalida para cadenas numéricas válidas", () => {
    fc.assert(
      fc.property(arbCantidadStringValida, (cantidad) => {
        const numerico = Number(String(cantidad).trim());
        fc.pre(Number.isFinite(numerico) && validarCantidad(numerico).valido);

        const linea = lineaDeProducto(cantidad);
        const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
        expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it.each([["5"], ["0.01"], ["10.5"]])(
    "caso determinista — cantidad %s en Linea_De_Producto no produce cantidad-invalida",
    (cantidad) => {
      const linea = lineaDeProducto(cantidad);
      const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
      expect(tieneCantidadInvalida(resultado, 0)).toBe(false);
    }
  );

  it("caso end-to-end — con cantidad '5', validarLineasEnEdicion devuelve { valido: true }", () => {
    const linea = lineaDeProducto("5");
    const resultado = validarLineasEnEdicionEquivalente([linea], ID_EN_EDICION);
    expect(resultado).toEqual({ valido: true });
  });
});
