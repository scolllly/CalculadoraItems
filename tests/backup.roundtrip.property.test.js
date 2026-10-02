// tests/backup.roundtrip.property.test.js — Prueba de propiedad (fast-check)
// del round-trip del Archivo_De_Respaldo sobre la lista de Productos.
//
// Migrada al entorno Next.js (ES modules). El único cambio respecto a la
// versión en `old/tests/` es reemplazar `cargarModulos([...])` + `window.LP.*`
// por imports ES directos de `../lib/backup.js` y `../lib/productos.ops.js`.
// Los generadores `fc` y las propiedades (Property 10 round-trip, Property 8
// Flag_Compuesto) permanecen idénticos.
//
// Requisitos: 11.1, 11.2, 11.4, 11.7

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { serializarRespaldo, parsearRespaldo } from "../lib/backup.js";
import { editarProducto, eliminarProducto } from "../lib/productos.ops.js";

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

// Cantidad válida acotada: 0,01 .. 10.000 con <= 2 decimales.
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

// Línea de Producto ({parametroId, cantidad, subtotal}) con subtotal coherente.
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
    const idsExistentes = productos.map((p) => p.id);
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
function derivarLista({ productosBase, idEditar, lineasEdicion, idEliminar }) {
  let lista = productosBase;
  if (idEditar !== null) {
    lista = editarProducto(lista, idEditar, lineasEdicion);
  }
  if (idEliminar !== null) {
    lista = eliminarProducto(lista, idEliminar);
  }
  return lista;
}

// ---------------------------------------------------------------------------
// Property 10: el respaldo preserva la lista de Productos (round-trip).
// Validates: Requisitos 6.1
// ---------------------------------------------------------------------------
describe("backup — round-trip de la lista de Productos", () => {
  // Feature: product-detail-edit-delete, Property 10: El respaldo preserva la
  // lista de Productos (round-trip).
  it("Property 10", () => {
    fc.assert(
      fc.property(arbCasoRoundTrip, (caso) => {
        const { parametros } = caso;
        const productos = derivarLista(caso);

        const texto = serializarRespaldo(parametros, productos);
        const resultado = parsearRespaldo(texto);

        expect(resultado.status).toBe("ok");

        const restaurados = resultado.productos;
        expect(restaurados).toHaveLength(productos.length);

        productos.forEach((original, i) => {
          const restaurado = restaurados[i];
          expect(restaurado.id).toBe(original.id);
          expect(restaurado.nombre).toBe(original.nombre);
          expect(restaurado.precioTotal).toBe(original.precioTotal);
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
// Property 8: el Flag_Compuesto sobrevive el round-trip del respaldo.
// Validates: Requisitos 5.2, 5.3
// ---------------------------------------------------------------------------

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

const arbListaProductosConFlag = fc
  .array(arbProductoConFlagSinId(), { minLength: 0, maxLength: 6 })
  .map((parciales) => parciales.map((p, i) => ({ id: "prod-" + i, ...p })));

const arbCasoRoundTripFlag = arbListaParametros.chain((parametros) =>
  arbListaProductosConFlag.map((productos) => ({ parametros, productos }))
);

describe("backup — round-trip del Flag_Compuesto", () => {
  // Feature: producto-simple-vs-compuesto-tabs, Property 8: El flag sobrevive el
  // roundtrip del respaldo.
  it("Property 8", () => {
    fc.assert(
      fc.property(arbCasoRoundTripFlag, ({ parametros, productos }) => {
        const texto = serializarRespaldo(parametros, productos);
        const resultado = parsearRespaldo(texto);

        expect(resultado.status).toBe("ok");

        const restaurados = resultado.productos;
        expect(restaurados).toHaveLength(productos.length);

        productos.forEach((original, i) => {
          const restaurado = restaurados[i];
          expect(restaurado.compuesto).toBe(original.compuesto);
        });
      }),
      { numRuns: 100 }
    );
  });
});
