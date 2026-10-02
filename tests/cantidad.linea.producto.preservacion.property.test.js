// tests/cantidad.linea.producto.preservacion.property.test.js
//
// Migrada al entorno Next.js (ES modules). El único cambio respecto a la
// versión en `old/tests/` es reemplazar `cargarModulos([...])` + `window.LP.*`
// por imports ES directos de `../lib/productos.ops.js`, `../lib/validation.js`
// y `../lib/models.js`. Los generadores y las propiedades se conservan.
//
// Requisitos: 11.1, 11.2, 11.4

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validarLineasProducto,
  detectarCicloComposicion,
} from "../lib/productos.ops.js";
import { validarCantidad } from "../lib/validation.js";
import { FUENTE_COMPONENTE } from "../lib/models.js";

const PRODUCTO_COMPONENTE = {
  id: "comp-1",
  nombre: "Componente base",
  lineas: [{ parametroId: "p1", cantidad: 1, subtotal: 10 }],
  precioTotal: 10,
};

const PRODUCTOS = [PRODUCTO_COMPONENTE];
const ID_EN_EDICION = null;

// ---------------------------------------------------------------------------
// 3.1 Preservación de las Lineas_De_Parametro: se IGNORAN por completo.
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------
describe("Preservación 3.1 — validarLineasProducto ignora las Lineas_De_Parametro", () => {
  const arbCantidadCruda = fc.oneof(
    fc.string(),
    fc.integer({ min: -1000, max: 1000000000 }),
    fc.double({ noNaN: false }),
    fc.constant(null),
    fc.constant(undefined)
  );

  it("Property 2 — línea con fuenteDeComponente 'Parámetro' nunca genera errores", () => {
    fc.assert(
      fc.property(arbCantidadCruda, (cantidad) => {
        const linea = {
          parametroId: "p1",
          fuenteDeComponente: FUENTE_COMPONENTE.PARAMETRO,
          productoComponenteId: null,
          cantidad,
        };
        const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
        expect(resultado).toEqual({ valido: true });
      }),
      { numRuns: 100 }
    );
  });

  it("Property 2 — línea SIN campo fuenteDeComponente se interpreta como Parámetro y se ignora", () => {
    fc.assert(
      fc.property(arbCantidadCruda, (cantidad) => {
        const linea = { parametroId: "p1", productoComponenteId: null, cantidad };
        const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
        expect(resultado).toEqual({ valido: true });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// 3.2 Preservación del rechazo de cantidades realmente inválidas.
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------
describe("Preservación 3.2 — Lineas_De_Producto con cantidad inválida siguen rechazándose", () => {
  function tieneCantidadInvalida(resultado, indice) {
    if (!resultado || resultado.valido) return false;
    const errores = resultado.errores || [];
    return errores.some((e) => e.indice === indice && e.tipo === "cantidad-invalida");
  }

  it.each([["0"], ["-3"], ["1000000000"], ["1.005"], ["", "cadena vacía"], ["abc"]])(
    "cantidad %s (cadena inválida) produce cantidad-invalida",
    (cantidad) => {
      const linea = {
        parametroId: null,
        fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
        productoComponenteId: PRODUCTO_COMPONENTE.id,
        cantidad,
      };
      const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
      expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
    }
  );

  it("cantidad null en Linea_De_Producto produce cantidad-invalida", () => {
    const linea = {
      parametroId: null,
      fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
      productoComponenteId: PRODUCTO_COMPONENTE.id,
      cantidad: null,
    };
    const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  const arbCantidadInvalida = fc
    .oneof(
      fc.integer({ min: 1000000000, max: 9999999999 }).map((n) => String(n)),
      fc.integer({ min: -1000, max: 0 }).map((n) => String(n)),
      fc.integer({ min: 1, max: 1000 }).map((n) => `1.${String(n).padStart(3, "0")}`),
      fc.constantFrom("abc", "", "  ", "5,5", "1e3suf", "NaN", "1,000.5")
    )
    .filter((cadena) => {
      const t = String(cadena).trim();
      if (t === "") return true;
      const n = Number(t);
      if (!Number.isFinite(n)) return true;
      return !validarCantidad(n).valido;
    });

  it("Property 2 — cadena inválida en Linea_De_Producto siempre reporta cantidad-invalida", () => {
    fc.assert(
      fc.property(arbCantidadInvalida, (cantidad) => {
        const linea = {
          parametroId: null,
          fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
          productoComponenteId: PRODUCTO_COMPONENTE.id,
          cantidad,
        };
        const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
        expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// 3.3 Preservación de la priorización de errores.
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------
describe("Preservación 3.3 — priorización sin-producto sobre cantidad", () => {
  it("Linea_De_Producto sin productoComponenteId y cantidad válida reporta solo sin-producto", () => {
    const linea = {
      parametroId: null,
      fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
      productoComponenteId: null,
      cantidad: 5,
    };
    const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
    expect(resultado).toEqual({
      valido: false,
      errores: [{ indice: 0, tipo: "sin-producto" }],
    });
  });

  it("Linea_De_Producto con productoComponenteId inexistente y cantidad válida reporta producto-inexistente", () => {
    const linea = {
      parametroId: null,
      fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
      productoComponenteId: "no-existe",
      cantidad: 5,
    };
    const resultado = validarLineasProducto([linea], PRODUCTOS, ID_EN_EDICION);
    expect(resultado).toEqual({
      valido: false,
      errores: [{ indice: 0, tipo: "producto-inexistente" }],
    });
  });
});

// ---------------------------------------------------------------------------
// 3.4 Preservación de la detección de Ciclos_De_Composicion.
// Validates: Requirements 3.4
// ---------------------------------------------------------------------------
describe("Preservación 3.4 — detectarCicloComposicion sin cambios", () => {
  it("grafo sin ciclos: hayCiclo false", () => {
    const productos = [
      { id: "A", lineas: [], precioTotal: 0 },
      {
        id: "B",
        lineas: [
          { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO, productoComponenteId: "A", cantidad: 1 },
        ],
        precioTotal: 0,
      },
    ];
    const lineasContenedor = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO, productoComponenteId: "B", cantidad: 1 },
    ];
    const resultado = detectarCicloComposicion("C", lineasContenedor, productos);
    expect(resultado).toEqual({ hayCiclo: false });
  });

  it("ciclo directo: el contenedor se referencia a sí mismo", () => {
    const lineasContenedor = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO, productoComponenteId: "X", cantidad: 1 },
    ];
    const resultado = detectarCicloComposicion(
      "X",
      lineasContenedor,
      [{ id: "X", lineas: [], precioTotal: 0 }]
    );
    expect(resultado).toEqual({ hayCiclo: true, tipo: "directo", secuencia: ["X", "X"] });
  });

  it("ciclo indirecto: A -> B -> A", () => {
    const productos = [
      {
        id: "B",
        lineas: [
          { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO, productoComponenteId: "A", cantidad: 1 },
        ],
        precioTotal: 0,
      },
    ];
    const lineasContenedor = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO, productoComponenteId: "B", cantidad: 1 },
    ];
    const resultado = detectarCicloComposicion("A", lineasContenedor, productos);
    expect(resultado).toEqual({ hayCiclo: true, tipo: "indirecto", secuencia: ["A", "B", "A"] });
  });

  it("Property 2 — detectarCicloComposicion ignora Lineas_De_Parametro (no forman grafo)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            parametroId: fc.constantFrom("p1", "p2", "p3"),
            cantidad: fc.integer({ min: 1, max: 100 }),
          }),
          { maxLength: 5 }
        ),
        (lineasParametro) => {
          const resultado = detectarCicloComposicion("C", lineasParametro, PRODUCTOS);
          expect(resultado).toEqual({ hayCiclo: false });
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// 3.5 Preservación del contrato de validarCantidad para entradas NUMÉRICAS.
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------
describe("Preservación 3.5 — validarCantidad conserva su contrato numérico", () => {
  it.each([
    [5, true, "número válido"],
    [0.009, false, "por debajo del mínimo"],
    [1000000000, false, "por encima del máximo"],
    [1.005, false, "más de 2 decimales"],
    [0.01, true, "borde mínimo válido"],
    [999999999.99, true, "borde máximo válido"],
    [1.5, true, "2 decimales válido"],
    [1.55, true, "2 decimales exactos válido"],
  ])("validarCantidad(%s) => valido=%s (%s)", (valor, esperado) => {
    expect(validarCantidad(valor).valido).toBe(esperado);
  });

  it("Property 2 — para números finitos, validarCantidad respeta rango [0.01, 999999999.99] con <= 2 decimales", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000000000, max: 200000000000 }), (centesimas) => {
        const valor = centesimas / 100;
        const esperado = Number.isFinite(valor) && valor >= 0.01 && valor <= 999999999.99;
        expect(validarCantidad(valor).valido).toBe(esperado);
      }),
      { numRuns: 200 }
    );
  });

  it("Property 2 — validarCantidad sigue rechazando entradas no numéricas", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.constant(null),
          fc.constant(undefined),
          fc.boolean(),
          fc.constant(NaN),
          fc.constant(Infinity)
        ),
        (valor) => {
          expect(validarCantidad(valor).valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
