// tests/productos.ops.property.test.js — Pruebas de propiedad (fast-check) del
// dominio puro `src/productos.ops.js`.
//
// Cubre las Tareas 2.2, 2.3, 2.4 (resolverDetalle), 2.6, 2.7, 2.8
// (editarProducto) y 2.9 (eliminarProducto) del spec
// `product-detail-edit-delete`. Cada propiedad de diseño se implementa con
// EXACTAMENTE un test de propiedad, con `numRuns: 100`.
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
  ]);
});

// ---------------------------------------------------------------------------
// Generadores reutilizables (arbitraries)
// ---------------------------------------------------------------------------

// Redondeo half-up a 2 decimales, replicado del dominio para construir subtotales
// coherentes con `calculo.redondear2` en los generadores.
function redondear2Local(n) {
  const signo = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const escalado = abs * 100;
  const corregido = escalado + Number.EPSILON * Math.abs(escalado);
  return (signo * Math.round(corregido)) / 100;
}

// Cantidad válida: 0,01 .. 999.999.999,99 con <= 2 decimales.
const arbCantidad = fc
  .integer({ min: 1, max: 99999999999 })
  .map((centesimas) => centesimas / 100);

// Precio unitario: 0,01 .. 100.000 con <= 2 decimales (positivo).
const arbPrecioUnitario = fc
  .integer({ min: 1, max: 10000000 })
  .map((centesimas) => centesimas / 100);

// Cantidad acotada para las pruebas de edición: 0,01 .. 10.000 con <= 2
// decimales. Se acota deliberadamente porque el dominio deriva
// `precioUnitario = subtotal/cantidad` y recalcula; con magnitudes enormes
// (p. ej. cantidad ~2e8 y subtotal ~1.6e13) el producto supera la precisión de
// 2 decimales del punto flotante y el redondeo half-up deja de ser estable.
// Acotar cantidad y precioUnitario mantiene los subtotales y el total dentro del
// rango donde `redondear2` es determinista.
const arbCantidadEdicion = fc
  .integer({ min: 1, max: 1000000 })
  .map((centesimas) => centesimas / 100);

// Un Parametro con id único (asignado por arbListaParametros), nombre 1-100
// chars, precioUnitario positivo y unidad string.
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
  .map((parciales) =>
    parciales.map((p, i) => ({ id: "param-" + i, ...p }))
  );

// ---------------------------------------------------------------------------
// Property 1 (Tarea 2.2): resolverDetalle mapea líneas en orden con nombre,
// unidad y subtotal ALMACENADO cuando todo parametroId existe.
// Validates: Requisitos 2.2, 6.3
// ---------------------------------------------------------------------------
describe("resolverDetalle — orden, nombre, unidad y subtotal almacenado", () => {
  // Feature: product-detail-edit-delete, Property 1: El detalle mapea líneas en
  // orden con nombre, unidad y subtotal almacenado (cuando todo parametroId existe).
  it("Property 1", () => {
    const arbCaso = arbListaParametros.chain((parametros) => {
      const arbLinea = fc.record({
        parametroId: fc.constantFrom(...parametros.map((p) => p.id)),
        cantidad: arbCantidad,
        subtotal: fc.integer({ min: 0, max: 99999999999 }).map((c) => c / 100),
      });
      return fc.record({
        parametros: fc.constant(parametros),
        producto: fc.record({
          id: fc.uuid(),
          nombre: fc.string({ minLength: 1, maxLength: 100 }),
          lineas: fc.array(arbLinea, { minLength: 0, maxLength: 8 }),
          precioTotal: fc
            .integer({ min: 0, max: 99999999999 })
            .map((c) => c / 100),
        }),
      });
    });

    fc.assert(
      fc.property(arbCaso, ({ producto, parametros }) => {
        const detalle = LP.productosOps.resolverDetalle(producto, parametros);
        expect(detalle.lineas).toHaveLength(producto.lineas.length);
        producto.lineas.forEach((origen, i) => {
          const resuelta = detalle.lineas[i];
          const parametro = parametros.find((p) => p.id === origen.parametroId);
          expect(resuelta.ausente).toBe(false);
          expect(resuelta.nombreParametro).toBe(parametro.nombre);
          expect(resuelta.unidad).toBe(parametro.unidad);
          expect(resuelta.cantidad).toBe(origen.cantidad);
          // Subtotal ALMACENADO, sin recalcular.
          expect(resuelta.subtotal).toBe(origen.subtotal);
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2 (Tarea 2.3): resolverDetalle preserva el Precio_Total almacenado.
// Validates: Requisitos 2.3, 6.3
// ---------------------------------------------------------------------------
describe("resolverDetalle — Precio_Total preservado", () => {
  // Feature: product-detail-edit-delete, Property 2: El detalle preserva el
  // Precio_Total almacenado (no recalcula el total).
  it("Property 2", () => {
    const arbLineaLibre = fc.record({
      parametroId: fc.oneof(fc.constant(null), fc.string()),
      cantidad: arbCantidad,
      subtotal: fc.integer({ min: 0, max: 99999999999 }).map((c) => c / 100),
    });
    const arbProducto = fc.record({
      id: fc.uuid(),
      nombre: fc.string({ minLength: 1, maxLength: 100 }),
      lineas: fc.array(arbLineaLibre, { minLength: 0, maxLength: 8 }),
      precioTotal: fc.integer({ min: 0, max: 99999999999 }).map((c) => c / 100),
    });

    fc.assert(
      fc.property(arbProducto, arbListaParametros, (producto, parametros) => {
        const detalle = LP.productosOps.resolverDetalle(producto, parametros);
        expect(detalle.precioTotal).toBe(producto.precioTotal);
        expect(detalle.nombre).toBe(producto.nombre);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3 (Tarea 2.4): líneas con parametroId null o inexistente se marcan
// ausente con nombreParametro === NOMBRE_PARAMETRO_AUSENTE, unidad === "" y
// subtotal preservado.
// Validates: Requisitos 2.4
// ---------------------------------------------------------------------------
describe("resolverDetalle — Parametro ausente", () => {
  // Feature: product-detail-edit-delete, Property 3: Las líneas con Parametro
  // ausente se marcan como Nombre_Parametro_Ausente con Unidad vacía y subtotal
  // preservado.
  it("Property 3", () => {
    const arbCaso = arbListaParametros.chain((parametros) => {
      const idsExistentes = new Set(parametros.map((p) => p.id));
      // parametroId ausente: null o un id que NO está en la lista.
      const arbIdAusente = fc.oneof(
        fc.constant(null),
        fc
          .string({ minLength: 1, maxLength: 12 })
          .filter((s) => !idsExistentes.has(s))
      );
      const arbLineaAusente = fc.record({
        parametroId: arbIdAusente,
        cantidad: arbCantidad,
        subtotal: fc.integer({ min: 0, max: 99999999999 }).map((c) => c / 100),
      });
      return fc.record({
        parametros: fc.constant(parametros),
        producto: fc.record({
          id: fc.uuid(),
          nombre: fc.string({ minLength: 1, maxLength: 100 }),
          lineas: fc.array(arbLineaAusente, { minLength: 1, maxLength: 8 }),
          precioTotal: fc
            .integer({ min: 0, max: 99999999999 })
            .map((c) => c / 100),
        }),
      });
    });

    fc.assert(
      fc.property(arbCaso, ({ producto, parametros }) => {
        const detalle = LP.productosOps.resolverDetalle(producto, parametros);
        detalle.lineas.forEach((resuelta, i) => {
          expect(resuelta.ausente).toBe(true);
          expect(resuelta.nombreParametro).toBe(
            LP.productosOps.NOMBRE_PARAMETRO_AUSENTE
          );
          expect(resuelta.unidad).toBe("");
          expect(resuelta.subtotal).toBe(producto.lineas[i].subtotal);
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Generadores para editarProducto / eliminarProducto: lista de Productos con
// ids únicos. Para las líneas de edición, subtotal = redondear2(cantidad *
// precioUnitario) para que el precioUnitario derivado (subtotal/cantidad)
// reproduzca subtotales/total de forma consistente.
// ---------------------------------------------------------------------------

// Línea de edición ({parametroId, cantidad, subtotal}) coherente con un
// precioUnitario elegido.
const arbLineaProducto = fc
  .record({
    parametroId: fc.oneof(
      fc.constant(null),
      fc.string({ minLength: 1, maxLength: 12 })
    ),
    cantidad: arbCantidadEdicion,
    precioUnitario: arbPrecioUnitario,
  })
  .map(({ parametroId, cantidad, precioUnitario }) => ({
    parametroId,
    cantidad,
    subtotal: redondear2Local(cantidad * precioUnitario),
  }));

// Producto arbitrario (id asignado por arbListaProductos).
function arbProductoSinId() {
  return fc.record({
    nombre: fc.string({ minLength: 1, maxLength: 100 }),
    lineas: fc.array(arbLineaProducto, { minLength: 0, maxLength: 6 }),
    precioTotal: fc.integer({ min: 0, max: 99999999999 }).map((c) => c / 100),
  });
}

// Lista de Productos con ids únicos y no vacía.
const arbListaProductos = fc
  .array(arbProductoSinId(), { minLength: 1, maxLength: 6 })
  .map((parciales) =>
    parciales.map((p, i) => ({ id: "prod-" + i, ...p }))
  );

// Caso: lista + id existente + nuevas líneas de edición.
const arbCasoEdicion = arbListaProductos.chain((productos) =>
  fc.record({
    productos: fc.constant(productos),
    id: fc.constantFrom(...productos.map((p) => p.id)),
    lineasProducto: fc.array(arbLineaProducto, { minLength: 0, maxLength: 6 }),
  })
);

// ---------------------------------------------------------------------------
// Property 4 (Tarea 2.6): editarProducto conserva id y nombre.
// Validates: Requisitos 3.5
// ---------------------------------------------------------------------------
describe("editarProducto — conserva id y nombre", () => {
  // Feature: product-detail-edit-delete, Property 4: La edición conserva el
  // identificador y el nombre del Producto.
  it("Property 4", () => {
    fc.assert(
      fc.property(arbCasoEdicion, ({ productos, id, lineasProducto }) => {
        const original = productos.find((p) => p.id === id);
        const nueva = LP.productosOps.editarProducto(
          productos,
          id,
          lineasProducto
        );
        const editado = nueva.find((p) => p.id === id);
        expect(editado).toBeTruthy();
        expect(editado.id).toBe(original.id);
        expect(editado.nombre).toBe(original.nombre);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5 (Tarea 2.7): editarProducto recalcula subtotales = redondear2(
// cantidad*precioUnitario) y precioTotal = redondear2(sum(subtotales)).
// Validates: Requisitos 3.5
// ---------------------------------------------------------------------------
describe("editarProducto — subtotales y Precio_Total consistentes", () => {
  // Feature: product-detail-edit-delete, Property 5: La edición recalcula de
  // forma consistente los subtotales y el Precio_Total.
  it("Property 5", () => {
    fc.assert(
      fc.property(arbCasoEdicion, ({ productos, id, lineasProducto }) => {
        const nueva = LP.productosOps.editarProducto(
          productos,
          id,
          lineasProducto
        );
        const editado = nueva.find((p) => p.id === id);
        expect(editado.lineas).toHaveLength(lineasProducto.length);

        // El controlador construye subtotal = cantidad * precioUnitario; el
        // dominio deriva precioUnitario = subtotal/cantidad y recalcula. Con
        // subtotales redondeados a 2 decimales el resultado es idempotente.
        const subtotalesEsperados = lineasProducto.map((linea) => {
          const cantidad = linea.cantidad;
          const precioUnitario =
            cantidad === 0 || cantidad == null ? 0 : linea.subtotal / cantidad;
          return LP.calculo.redondear2(cantidad * precioUnitario);
        });

        editado.lineas.forEach((linea, i) => {
          expect(linea.subtotal).toBe(subtotalesEsperados[i]);
          expect(linea.parametroId).toBe(lineasProducto[i].parametroId);
          expect(linea.cantidad).toBe(lineasProducto[i].cantidad);
        });

        // precioTotal = redondear2(suma de los subtotales recalculados).
        const totalEsperado = LP.calculo.redondear2(
          editado.lineas.reduce((a, l) => a + l.subtotal, 0)
        );
        expect(editado.precioTotal).toBe(totalEsperado);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6 (Tarea 2.8): editarProducto no altera los demás Productos ni el
// tamaño/orden de la lista.
// Validates: Requisitos 3.5
// ---------------------------------------------------------------------------
describe("editarProducto — aislamiento del resto y tamaño de la lista", () => {
  // Feature: product-detail-edit-delete, Property 6: La edición no altera los
  // demás Productos ni el tamaño de la lista.
  it("Property 6", () => {
    fc.assert(
      fc.property(arbCasoEdicion, ({ productos, id, lineasProducto }) => {
        // Copia profunda previa para comparar los demás Productos.
        const snapshot = JSON.parse(JSON.stringify(productos));
        const nueva = LP.productosOps.editarProducto(
          productos,
          id,
          lineasProducto
        );

        expect(nueva).toHaveLength(productos.length);
        nueva.forEach((p, i) => {
          // El orden se conserva (mismos ids en las mismas posiciones).
          expect(p.id).toBe(snapshot[i].id);
          if (p.id !== id) {
            // Los demás Productos permanecen sin cambios.
            expect(p).toEqual(snapshot[i]);
          }
        });
        // No muta la entrada original.
        expect(productos).toEqual(snapshot);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9 (Tarea 2.9): eliminarProducto quita exactamente el Producto y
// conserva el resto (un elemento menos).
// Validates: Requisitos 4.2
// ---------------------------------------------------------------------------
describe("eliminarProducto — quita uno, conserva el resto", () => {
  // Feature: product-detail-edit-delete, Property 9: Eliminar quita exactamente
  // el Producto objetivo y conserva el resto (un elemento menos).
  it("Property 9", () => {
    const arbCasoEliminacion = arbListaProductos.chain((productos) =>
      fc.record({
        productos: fc.constant(productos),
        id: fc.constantFrom(...productos.map((p) => p.id)),
      })
    );

    fc.assert(
      fc.property(arbCasoEliminacion, ({ productos, id }) => {
        const snapshot = JSON.parse(JSON.stringify(productos));
        const nueva = LP.productosOps.eliminarProducto(productos, id);

        // Un elemento menos y ninguno con el id objetivo.
        expect(nueva).toHaveLength(productos.length - 1);
        expect(nueva.some((p) => p.id === id)).toBe(false);

        // Conserva el resto sin cambios y en el mismo orden relativo.
        const restoEsperado = snapshot.filter((p) => p.id !== id);
        expect(nueva).toEqual(restoEsperado);

        // No muta la entrada original.
        expect(productos).toEqual(snapshot);
      }),
      { numRuns: 100 }
    );
  });
});
