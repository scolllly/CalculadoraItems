// tests/cantidad.linea.producto.preservacion.property.test.js
//
// Spec: product-line-quantity-validation-fix — Tarea 2 (Pruebas de
// preservación, ANTES de implementar el arreglo).
//
// Property 2 (Preservation): para toda entrada donde NOT isBugCondition(X), el
// resultado del código arreglado (F') debe coincidir con el del código original
// (F). Estas pruebas capturan la LÍNEA BASE observada sobre el código NO
// arreglado.
//
// Metodología observation-first: primero se observó el comportamiento real del
// código NO arreglado y luego se codificó ese comportamiento como aserciones.
// Sobre el código NO arreglado, estas pruebas DEBEN PASAR (confirman la línea
// base a preservar). Tras el arreglo (Tarea 3), estas MISMAS pruebas deben
// seguir pasando (no hay regresiones) porque solo cubren entradas que NO cumplen
// la Bug_Condition.
//
// Los Scripts_Clasicos se cargan con `cargarModulos`, que evalúa los IIFE de
// src/ contra el `window` de jsdom y puebla `window.LP`. Se invocan las
// funciones puras (`validarLineasProducto`, `detectarCicloComposicion`,
// `validation.validarCantidad`) directamente sobre `window.LP`.

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

// Id del Producto_Contenedor en edición. Al crear uno nuevo el controlador usa null.
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

function fuentes() {
  return (
    (LP.models && LP.models.FUENTE_COMPONENTE) || {
      PARAMETRO: "Parámetro",
      PRODUCTO: "Producto",
    }
  );
}

// ---------------------------------------------------------------------------
// 3.1 Preservación de las Lineas_De_Parametro: `validarLineasProducto` las
// IGNORA por completo (con o sin el campo `fuenteDeComponente`). Comportamiento
// observado sobre el código NO arreglado: no se produce ningún error para ellas.
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------
describe("Preservación 3.1 — validarLineasProducto ignora las Lineas_De_Parametro", () => {
  // Generador de cantidades crudas arbitrarias (válidas o inválidas, de
  // cualquier tipo): la fuente Parámetro no las valida en esta función.
  const arbCantidadCruda = fc.oneof(
    fc.string(),
    fc.integer({ min: -1000, max: 1000000000 }),
    fc.double({ noNaN: false }),
    fc.constant(null),
    fc.constant(undefined)
  );

  it("Property 2 — línea con fuenteDeComponente 'Parámetro' nunca genera errores", () => {
    const F = fuentes();
    fc.assert(
      fc.property(arbCantidadCruda, (cantidad) => {
        const linea = {
          parametroId: "p1",
          fuenteDeComponente: F.PARAMETRO,
          productoComponenteId: null,
          cantidad,
        };
        const resultado = LP.productosOps.validarLineasProducto(
          [linea],
          PRODUCTOS,
          ID_EN_EDICION
        );
        // Observado en el código original: `{ valido: true }` (ignorada).
        expect(resultado).toEqual({ valido: true });
      }),
      { numRuns: 100 }
    );
  });

  it("Property 2 — línea SIN campo fuenteDeComponente se interpreta como Parámetro y se ignora", () => {
    fc.assert(
      fc.property(arbCantidadCruda, (cantidad) => {
        const linea = {
          parametroId: "p1",
          productoComponenteId: null,
          cantidad,
        };
        const resultado = LP.productosOps.validarLineasProducto(
          [linea],
          PRODUCTOS,
          ID_EN_EDICION
        );
        expect(resultado).toEqual({ valido: true });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// 3.2 Preservación del rechazo de cantidades realmente inválidas en
// Lineas_De_Producto. En estas entradas NO se cumple la Bug_Condition, porque la
// cadena NO representa un número válido dentro de rango con <= 2 decimales.
// Comportamiento observado sobre el código NO arreglado: se reporta
// `cantidad-invalida`.
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------
describe("Preservación 3.2 — Lineas_De_Producto con cantidad inválida siguen rechazándose", () => {
  function tieneCantidadInvalida(resultado, indice) {
    if (!resultado || resultado.valido) return false;
    const errores = resultado.errores || [];
    return errores.some(
      (e) => e.indice === indice && e.tipo === "cantidad-invalida"
    );
  }

  // Casos deterministas requeridos por la tarea. Todos con un componente
  // EXISTENTE (para aislar el error de cantidad y evitar sin-producto).
  it.each([["0"], ["-3"], ["1000000000"], ["1.005"], ["", "cadena vacía"], ["abc"]])(
    "cantidad %s (cadena inválida) produce cantidad-invalida",
    (cantidad) => {
      const F = fuentes();
      const linea = {
        parametroId: null,
        fuenteDeComponente: F.PRODUCTO,
        productoComponenteId: PRODUCTO_COMPONENTE.id,
        cantidad,
      };
      const resultado = LP.productosOps.validarLineasProducto(
        [linea],
        PRODUCTOS,
        ID_EN_EDICION
      );
      expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
    }
  );

  it("cantidad null en Linea_De_Producto produce cantidad-invalida", () => {
    const F = fuentes();
    const linea = {
      parametroId: null,
      fuenteDeComponente: F.PRODUCTO,
      productoComponenteId: PRODUCTO_COMPONENTE.id,
      cantidad: null,
    };
    const resultado = LP.productosOps.validarLineasProducto(
      [linea],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
  });

  // Property-based: cadenas que NO representan un número válido (fuera de
  // rango, con más de 2 decimales, o no numéricas) — NOT isBugCondition —
  // siempre reportan cantidad-invalida en el código no arreglado.
  const arbCantidadInvalida = fc
    .oneof(
      // Fuera de rango por arriba.
      fc
        .integer({ min: 1000000000, max: 9999999999 })
        .map((n) => String(n)),
      // Cero o negativos (fuera de rango por abajo).
      fc.integer({ min: -1000, max: 0 }).map((n) => String(n)),
      // Más de 2 decimales.
      fc
        .integer({ min: 1, max: 1000 })
        .map((n) => `1.${String(n).padStart(3, "0")}`),
      // No numéricas.
      fc.constantFrom("abc", "", "  ", "5,5", "1e3suf", "NaN", "1,000.5")
    )
    .filter((cadena) => {
      // Garantizar que realmente NO es una cantidad válida (NOT isBugCondition):
      // convertida como aNumeroCantidad + validarCantidad NO es válida.
      const t = String(cadena).trim();
      if (t === "") return true;
      const n = Number(t);
      if (!Number.isFinite(n)) return true;
      return !LP.validation.validarCantidad(n).valido;
    });

  it("Property 2 — cadena inválida en Linea_De_Producto siempre reporta cantidad-invalida", () => {
    const F = fuentes();
    fc.assert(
      fc.property(arbCantidadInvalida, (cantidad) => {
        const linea = {
          parametroId: null,
          fuenteDeComponente: F.PRODUCTO,
          productoComponenteId: PRODUCTO_COMPONENTE.id,
          cantidad,
        };
        const resultado = LP.productosOps.validarLineasProducto(
          [linea],
          PRODUCTOS,
          ID_EN_EDICION
        );
        expect(tieneCantidadInvalida(resultado, 0)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// 3.3 Preservación de la priorización de errores: una Linea_De_Producto sin
// `productoComponenteId` reporta `sin-producto`. Comportamiento observado sobre
// el código NO arreglado: el error `sin-producto` está presente (además del de
// cantidad si aplica). Aquí usamos cantidad válida como NÚMERO (no string) para
// que NO se cumpla la Bug_Condition y para que la cantidad no genere error, de
// modo que solo aparezca `sin-producto`.
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------
describe("Preservación 3.3 — priorización sin-producto sobre cantidad", () => {
  it("Linea_De_Producto sin productoComponenteId y cantidad válida reporta solo sin-producto", () => {
    const F = fuentes();
    const linea = {
      parametroId: null,
      fuenteDeComponente: F.PRODUCTO,
      productoComponenteId: null,
      // Cantidad numérica válida (no string) => NOT isBugCondition; no genera
      // error de cantidad ni en el código original ni en el arreglado.
      cantidad: 5,
    };
    const resultado = LP.productosOps.validarLineasProducto(
      [linea],
      PRODUCTOS,
      ID_EN_EDICION
    );
    // Observado en el código original.
    expect(resultado).toEqual({
      valido: false,
      errores: [{ indice: 0, tipo: "sin-producto" }],
    });
  });

  it("Linea_De_Producto con productoComponenteId inexistente y cantidad válida reporta producto-inexistente", () => {
    const F = fuentes();
    const linea = {
      parametroId: null,
      fuenteDeComponente: F.PRODUCTO,
      productoComponenteId: "no-existe",
      cantidad: 5,
    };
    const resultado = LP.productosOps.validarLineasProducto(
      [linea],
      PRODUCTOS,
      ID_EN_EDICION
    );
    expect(resultado).toEqual({
      valido: false,
      errores: [{ indice: 0, tipo: "producto-inexistente" }],
    });
  });
});

// ---------------------------------------------------------------------------
// 3.4 Preservación de la detección de Ciclos_De_Composicion: el arreglo no toca
// `detectarCicloComposicion`. Comportamiento observado sobre el código NO
// arreglado, registrado como línea base.
// Validates: Requirements 3.4
// ---------------------------------------------------------------------------
describe("Preservación 3.4 — detectarCicloComposicion sin cambios", () => {
  it("grafo sin ciclos: hayCiclo false", () => {
    const F = fuentes();
    const productos = [
      { id: "A", lineas: [], precioTotal: 0 },
      {
        id: "B",
        lineas: [
          {
            fuenteDeComponente: F.PRODUCTO,
            productoComponenteId: "A",
            cantidad: 1,
          },
        ],
        precioTotal: 0,
      },
    ];
    const lineasContenedor = [
      { fuenteDeComponente: F.PRODUCTO, productoComponenteId: "B", cantidad: 1 },
    ];
    const resultado = LP.productosOps.detectarCicloComposicion(
      "C",
      lineasContenedor,
      productos
    );
    expect(resultado).toEqual({ hayCiclo: false });
  });

  it("ciclo directo: el contenedor se referencia a sí mismo", () => {
    const F = fuentes();
    const lineasContenedor = [
      { fuenteDeComponente: F.PRODUCTO, productoComponenteId: "X", cantidad: 1 },
    ];
    const resultado = LP.productosOps.detectarCicloComposicion(
      "X",
      lineasContenedor,
      [{ id: "X", lineas: [], precioTotal: 0 }]
    );
    expect(resultado).toEqual({
      hayCiclo: true,
      tipo: "directo",
      secuencia: ["X", "X"],
    });
  });

  it("ciclo indirecto: A -> B -> A", () => {
    const F = fuentes();
    const productos = [
      {
        id: "B",
        lineas: [
          {
            fuenteDeComponente: F.PRODUCTO,
            productoComponenteId: "A",
            cantidad: 1,
          },
        ],
        precioTotal: 0,
      },
    ];
    const lineasContenedor = [
      { fuenteDeComponente: F.PRODUCTO, productoComponenteId: "B", cantidad: 1 },
    ];
    const resultado = LP.productosOps.detectarCicloComposicion(
      "A",
      lineasContenedor,
      productos
    );
    expect(resultado).toEqual({
      hayCiclo: true,
      tipo: "indirecto",
      secuencia: ["A", "B", "A"],
    });
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
          const resultado = LP.productosOps.detectarCicloComposicion(
            "C",
            lineasParametro,
            PRODUCTOS
          );
          // Sin referencias a productos => sin ciclo.
          expect(resultado).toEqual({ hayCiclo: false });
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// 3.5 Preservación del contrato de `validation.validarCantidad` para entradas
// NUMÉRICAS: el arreglo no modifica esta función pura. Comportamiento observado
// sobre el código NO arreglado, registrado como línea base.
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------
describe("Preservación 3.5 — validation.validarCantidad conserva su contrato numérico", () => {
  it.each([
    [5, true, "número válido"],
    [0.009, false, "por debajo del mínimo"],
    [1000000000, false, "por encima del máximo"],
    [1.005, false, "más de 2 decimales"],
    [0.01, true, "borde mínimo válido"],
    [999999999.99, true, "borde máximo válido"],
    [1.5, true, "2 decimales válido"],
    [1.55, true, "2 decimales exactos válido"],
  ])(
    "validarCantidad(%s) => valido=%s (%s)",
    (valor, esperado) => {
      expect(LP.validation.validarCantidad(valor).valido).toBe(esperado);
    }
  );

  it("Property 2 — para números finitos, validarCantidad respeta rango [0.01, 999999999.99] con <= 2 decimales", () => {
    fc.assert(
      fc.property(
        // Números como centésimas enteras => a lo sumo 2 decimales.
        fc.integer({ min: -100000000000, max: 200000000000 }),
        (centesimas) => {
          const valor = centesimas / 100;
          const esperado =
            Number.isFinite(valor) && valor >= 0.01 && valor <= 999999999.99;
          expect(LP.validation.validarCantidad(valor).valido).toBe(esperado);
        }
      ),
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
          expect(LP.validation.validarCantidad(valor).valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
