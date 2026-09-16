// tests/backup.roundtrip.property.test.js — Prueba de propiedad (fast-check)
// del round-trip del Archivo_De_Respaldo sobre la lista de Productos.
//
// Cubre la Tarea 12.1 del spec `product-detail-edit-delete`. Implementa
// EXACTAMENTE un test de propiedad (Property 10), con `numRuns: 100`, sobre las
// funciones puras `backup.serializarRespaldo` / `backup.parsearRespaldo`.
//
// Las listas de Productos usadas en el round-trip son "resultantes" de aplicar
// ediciones y/o eliminaciones (productosOps.editarProducto/eliminarProducto)
// para reflejar el escenario del Requisito 6.1, donde el respaldo debe preservar
// los Productos tras editar/eliminar.
//
// Los Scripts_Clasicos se cargan con el helper `cargarModulos`, que evalúa los
// IIFE de src/ contra el `window` de jsdom y puebla `window.LP`.

import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";
import { cargarModulos } from "./helpers/cargarLP.js";

/** @type {any} */
let LP;

beforeAll(() => {
  LP = cargarModulos([
    "currency.js",
    "calculo.js",
    "validation.js",
    "models.js",
    "productos.ops.js",
    "backup.js",
  ]);
});

// ---------------------------------------------------------------------------
// Redondeo half-up a 2 decimales, replicado del dominio para construir
// subtotales coherentes con `calculo.redondear2` en los generadores.
// ---------------------------------------------------------------------------
function redondear2Local(n) {
  const signo = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const escalado = abs * 100;
  const corregido = escalado + Number.EPSILON * Math.abs(escalado);
  return (signo * Math.round(corregido)) / 100;
}

// ---------------------------------------------------------------------------
// Generadores reutilizables (arbitraries)
// ---------------------------------------------------------------------------

// Cantidad válida acotada: 0,01 .. 10.000 con <= 2 decimales. Se acota (igual
// que en productos.ops.property.test.js) para mantener los subtotales/total
// dentro del rango donde el recálculo con `redondear2` es determinista.
const arbCantidad = fc
  .integer({ min: 1, max: 1000000 })
  .map((centesimas) => centesimas / 100);

// Precio unitario: 0,01 .. 100.000 con <= 2 decimales (positivo).
const arbPrecioUnitario = fc
  .integer({ min: 1, max: 10000000 })
  .map((centesimas) => centesimas / 100);

// Un Parametro con id (asignado por arbListaParametros).
function arbParametroSinId() {
  return fc.record({
    nombre: fc.string({ minLength: 1, maxLength: 100 }),
    precioUnitario: arbPrecioUnitario,
    unidad: fc.string({ minLength: 0, maxLength: 20 }),
  });
}

// Lista de Parametros con ids únicos (>=1 para poder referenciarlos).
const arbListaParametros = fc
  .uniqueArray(arbParametroSinId(), {
    minLength: 1,
    maxLength: 6,
    selector: (p) => p.nombre + "|" + p.unidad,
  })
  .map((parciales) => parciales.map((p, i) => ({ id: "param-" + i, ...p })));

// Línea de Producto ({parametroId, cantidad, subtotal}) con subtotal coherente
// (redondear2(cantidad * precioUnitario)); parametroId puede ser null o un id
// arbitrario (existente o no, no afecta al round-trip).
const arbLineaProducto = fc
  .record({
    parametroId: fc.oneof(
      fc.constant(null),
      fc.string({ minLength: 1, maxLength: 12 })
    ),
    cantidad: arbCantidad,
    precioUnitario: arbPrecioUnitario,
  })
  .map(({ parametroId, cantidad, precioUnitario }) => ({
    parametroId,
    cantidad,
    subtotal: redondear2Local(cantidad * precioUnitario),
  }));

// Producto arbitrario (id asignado por arbListaProductos) con precioTotal
// coherente = redondear2(suma de subtotales).
function arbProductoSinId() {
  return fc
    .array(arbLineaProducto, { minLength: 0, maxLength: 6 })
    .chain((lineas) =>
      fc.record({
        nombre: fc.string({ minLength: 1, maxLength: 100 }),
        lineas: fc.constant(lineas),
        precioTotal: fc.constant(
          redondear2Local(lineas.reduce((a, l) => a + l.subtotal, 0))
        ),
      })
    );
}

// Lista de Productos con ids únicos (puede ser vacía).
const arbListaProductos = fc
  .array(arbProductoSinId(), { minLength: 0, maxLength: 6 })
  .map((parciales) => parciales.map((p, i) => ({ id: "prod-" + i, ...p })));

// Caso: una lista de Productos "resultante" de aplicar (opcionalmente) una
// edición y/o una eliminación, para el escenario del Req 6.1.
const arbCasoRoundTrip = arbListaParametros.chain((parametros) =>
  arbListaProductos.chain((productos) => {
    // Operaciones opcionales sobre la lista para derivar la lista "resultante".
    const idsExistentes = productos.map((p) => p.id);
    // Si no hay Productos, no aplicamos operaciones.
    const arbIdOpcional =
      idsExistentes.length > 0
        ? fc.oneof(fc.constant(null), fc.constantFrom(...idsExistentes))
        : fc.constant(null);

    return fc.record({
      parametros: fc.constant(parametros),
      productosBase: fc.constant(productos),
      idEditar: arbIdOpcional,
      lineasEdicion: fc.array(arbLineaProducto, { minLength: 0, maxLength: 6 }),
      idEliminar: arbIdOpcional,
    });
  })
);

// Aplica las operaciones opcionales para producir la lista resultante.
function derivarLista(LP, { productosBase, idEditar, lineasEdicion, idEliminar }) {
  let lista = productosBase;
  if (idEditar !== null) {
    lista = LP.productosOps.editarProducto(lista, idEditar, lineasEdicion);
  }
  if (idEliminar !== null) {
    lista = LP.productosOps.eliminarProducto(lista, idEliminar);
  }
  return lista;
}

// ---------------------------------------------------------------------------
// Property 10 (Tarea 12.1): el respaldo preserva la lista de Productos
// (round-trip): parsearRespaldo(serializarRespaldo(parametros, productos))
// devuelve un resultado `ok` cuya lista de productos es equivalente a la
// original (mismos ids, nombres, líneas con parametroId/cantidad/subtotal y
// precioTotal, en el mismo orden).
// Validates: Requisitos 6.1
// ---------------------------------------------------------------------------
describe("backup — round-trip de la lista de Productos", () => {
  // Feature: product-detail-edit-delete, Property 10: El respaldo preserva la
  // lista de Productos (round-trip): parsearRespaldo(serializarRespaldo(
  // parametros, productos)) devuelve un resultado ok cuya lista de productos es
  // equivalente a la original (mismos ids, nombres, líneas con parametroId/
  // cantidad/subtotal y precioTotal, en el mismo orden).
  it("Property 10", () => {
    fc.assert(
      fc.property(arbCasoRoundTrip, (caso) => {
        const { parametros } = caso;
        const productos = derivarLista(LP, caso);

        const texto = LP.backup.serializarRespaldo(parametros, productos);
        const resultado = LP.backup.parsearRespaldo(texto);

        // El round-trip produce un resultado ok.
        expect(resultado.status).toBe("ok");

        const restaurados = resultado.productos;

        // Mismo número de Productos y en el mismo orden.
        expect(restaurados).toHaveLength(productos.length);

        productos.forEach((original, i) => {
          const restaurado = restaurados[i];
          // Mismos id y nombre, en la misma posición (orden preservado).
          expect(restaurado.id).toBe(original.id);
          expect(restaurado.nombre).toBe(original.nombre);
          // Precio_Total preservado.
          expect(restaurado.precioTotal).toBe(original.precioTotal);
          // Líneas equivalentes en orden (parametroId, cantidad, subtotal).
          expect(restaurado.lineas).toHaveLength(original.lineas.length);
          original.lineas.forEach((lineaOriginal, j) => {
            const lineaRestaurada = restaurado.lineas[j];
            expect(lineaRestaurada.parametroId).toBe(lineaOriginal.parametroId);
            expect(lineaRestaurada.cantidad).toBe(lineaOriginal.cantidad);
            expect(lineaRestaurada.subtotal).toBe(lineaOriginal.subtotal);
          });
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8 (Tarea 6.4): el Flag_Compuesto sobrevive el round-trip del
// respaldo. Se amplían los generadores para incluir un `compuesto` booleano
// arbitrario (independiente de las líneas, según la nota de generadores del
// diseño para las Propiedades 7 y 8) en cada Producto, y se afirma que
// parsearRespaldo(serializarRespaldo(parametros, productos)) es `ok` y preserva
// el valor de `compuesto` de cada Producto en el mismo orden.
// Validates: Requisitos 5.2, 5.3
// ---------------------------------------------------------------------------

// Producto arbitrario CON `compuesto` booleano (id asignado por la lista). El
// valor de `compuesto` es arbitrario e independiente de las líneas, para
// verificar que el round-trip preserva el valor tal cual.
function arbProductoConFlagSinId() {
  return fc
    .array(arbLineaProducto, { minLength: 0, maxLength: 6 })
    .chain((lineas) =>
      fc.record({
        nombre: fc.string({ minLength: 1, maxLength: 100 }),
        lineas: fc.constant(lineas),
        precioTotal: fc.constant(
          redondear2Local(lineas.reduce((a, l) => a + l.subtotal, 0))
        ),
        compuesto: fc.boolean(),
      })
    );
}

// Lista de Productos con `compuesto` booleano e ids únicos (puede ser vacía).
const arbListaProductosConFlag = fc
  .array(arbProductoConFlagSinId(), { minLength: 0, maxLength: 6 })
  .map((parciales) => parciales.map((p, i) => ({ id: "prod-" + i, ...p })));

// Caso: parámetros + lista de Productos con Flag_Compuesto.
const arbCasoRoundTripFlag = arbListaParametros.chain((parametros) =>
  arbListaProductosConFlag.map((productos) => ({ parametros, productos }))
);

describe("backup — round-trip del Flag_Compuesto", () => {
  // Feature: producto-simple-vs-compuesto-tabs, Property 8: El flag sobrevive el
  // roundtrip del respaldo: parsearRespaldo(serializarRespaldo(parametros,
  // productos)) devuelve un resultado ok cuya lista de Productos preserva el
  // valor de `compuesto` de cada Producto en el mismo orden.
  it("Property 8", () => {
    fc.assert(
      fc.property(arbCasoRoundTripFlag, ({ parametros, productos }) => {
        const texto = LP.backup.serializarRespaldo(parametros, productos);
        const resultado = LP.backup.parsearRespaldo(texto);

        // El round-trip produce un resultado ok.
        expect(resultado.status).toBe("ok");

        const restaurados = resultado.productos;

        // Mismo número de Productos y en el mismo orden.
        expect(restaurados).toHaveLength(productos.length);

        productos.forEach((original, i) => {
          const restaurado = restaurados[i];
          // El Flag_Compuesto se preserva con el mismo valor y en la misma
          // posición (orden preservado).
          expect(restaurado.compuesto).toBe(original.compuesto);
        });
      }),
      { numRuns: 100 }
    );
  });
});
