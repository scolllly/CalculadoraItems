// tests/models.test.js — Pruebas unitarias y de propiedad para lib/models.js
//
// Cubre: FUENTE_COMPONENTE, crearParametro, crearProducto, crearLinea,
// normalizarLinea, normalizarProducto, esCompuesto.
// Requisitos: 11.1, 11.4

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  FUENTE_COMPONENTE,
  generarId,
  crearParametro,
  crearProducto,
  crearLinea,
  normalizarLinea,
  normalizarProducto,
  esCompuesto,
} from "../lib/models.js";

// ---------------------------------------------------------------------------
// FUENTE_COMPONENTE
// ---------------------------------------------------------------------------
describe("FUENTE_COMPONENTE", () => {
  it('PARAMETRO vale "Parámetro"', () => {
    expect(FUENTE_COMPONENTE.PARAMETRO).toBe("Parámetro");
  });

  it('PRODUCTO vale "Producto"', () => {
    expect(FUENTE_COMPONENTE.PRODUCTO).toBe("Producto");
  });

  it("tiene exactamente las claves PARAMETRO y PRODUCTO", () => {
    expect(Object.keys(FUENTE_COMPONENTE)).toEqual(
      expect.arrayContaining(["PARAMETRO", "PRODUCTO"])
    );
    expect(Object.keys(FUENTE_COMPONENTE)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// generarId
// ---------------------------------------------------------------------------
describe("generarId", () => {
  it("devuelve un string no vacío", () => {
    const id = generarId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("dos llamadas consecutivas producen ids distintos", () => {
    expect(generarId()).not.toBe(generarId());
  });
});

// ---------------------------------------------------------------------------
// crearParametro
// ---------------------------------------------------------------------------
describe("crearParametro", () => {
  it("devuelve un objeto con los campos esperados", () => {
    const p = crearParametro("Mano de obra", 25.5, "MIN");
    expect(p).toHaveProperty("id");
    expect(p.nombre).toBe("Mano de obra");
    expect(p.precioUnitario).toBe(25.5);
    expect(p.unidad).toBe("MIN");
  });

  it("el id es un string no vacío", () => {
    const p = crearParametro("X", 0, "UND");
    expect(typeof p.id).toBe("string");
    expect(p.id.length).toBeGreaterThan(0);
  });

  it("dos Parámetros creados con los mismos datos tienen ids distintos", () => {
    const p1 = crearParametro("Pintura", 10, "GLN");
    const p2 = crearParametro("Pintura", 10, "GLN");
    expect(p1.id).not.toBe(p2.id);
  });

  it("no añade campos extra inesperados", () => {
    const p = crearParametro("Cemento", 5.0, "KG");
    expect(Object.keys(p)).toEqual(
      expect.arrayContaining(["id", "nombre", "precioUnitario", "unidad"])
    );
    expect(Object.keys(p)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// crearLinea
// ---------------------------------------------------------------------------
describe("crearLinea", () => {
  it("sin argumentos crea una Linea_De_Parametro con defaults", () => {
    const l = crearLinea();
    expect(l.parametroId).toBeNull();
    expect(l.cantidad).toBeNull();
    expect(l.subtotal).toBe(0);
    expect(l.fuenteDeComponente).toBe(FUENTE_COMPONENTE.PARAMETRO);
    expect(l.productoComponenteId).toBeNull();
  });

  it("acepta parametroId y cantidad explícitos", () => {
    const l = crearLinea("param-1", 3.5);
    expect(l.parametroId).toBe("param-1");
    expect(l.cantidad).toBe(3.5);
    expect(l.fuenteDeComponente).toBe(FUENTE_COMPONENTE.PARAMETRO);
    expect(l.productoComponenteId).toBeNull();
  });

  it("crea una Linea_De_Producto cuando se especifica la fuente", () => {
    const l = crearLinea(null, 2, FUENTE_COMPONENTE.PRODUCTO, "prod-abc");
    expect(l.fuenteDeComponente).toBe(FUENTE_COMPONENTE.PRODUCTO);
    expect(l.productoComponenteId).toBe("prod-abc");
    expect(l.parametroId).toBeNull();
    expect(l.cantidad).toBe(2);
    expect(l.subtotal).toBe(0);
  });

  it("el subtotal inicial siempre es 0", () => {
    expect(crearLinea("p", 10).subtotal).toBe(0);
    expect(crearLinea(null, null, FUENTE_COMPONENTE.PRODUCTO, "q").subtotal).toBe(0);
  });

  it("tiene exactamente los 5 campos esperados", () => {
    const l = crearLinea();
    expect(Object.keys(l)).toEqual(
      expect.arrayContaining([
        "parametroId",
        "cantidad",
        "subtotal",
        "fuenteDeComponente",
        "productoComponenteId",
      ])
    );
    expect(Object.keys(l)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// crearProducto
// ---------------------------------------------------------------------------
describe("crearProducto", () => {
  it("devuelve un objeto con todos los campos esperados", () => {
    const lineas = [crearLinea("p1", 2)];
    const prod = crearProducto("Tubo PVC", lineas, 50.0);
    expect(typeof prod.id).toBe("string");
    expect(prod.nombre).toBe("Tubo PVC");
    expect(prod.lineas).toBe(lineas);
    expect(prod.precioTotal).toBe(50.0);
    expect(prod.unidad).toBe("UND"); // valor por defecto
    expect(typeof prod.compuesto).toBe("boolean");
  });

  it("usa 'UND' como unidad por defecto", () => {
    const prod = crearProducto("X", [], 0);
    expect(prod.unidad).toBe("UND");
  });

  it("acepta unidad personalizada", () => {
    const prod = crearProducto("X", [], 0, "JGO");
    expect(prod.unidad).toBe("JGO");
  });

  it("compuesto es false cuando no hay Lineas_De_Producto", () => {
    const lineas = [crearLinea("p1", 1), crearLinea("p2", 2)];
    const prod = crearProducto("Solo parámetros", lineas, 30);
    expect(prod.compuesto).toBe(false);
  });

  it("compuesto es true cuando hay al menos una Linea_De_Producto", () => {
    const lineas = [
      crearLinea("p1", 1),
      crearLinea(null, 1, FUENTE_COMPONENTE.PRODUCTO, "prod-1"),
    ];
    const prod = crearProducto("Con componente", lineas, 100);
    expect(prod.compuesto).toBe(true);
  });

  it("compuesto es false para un Producto sin líneas", () => {
    const prod = crearProducto("Vacío", [], 0);
    expect(prod.compuesto).toBe(false);
  });

  it("dos Productos creados con los mismos datos tienen ids distintos", () => {
    const prod1 = crearProducto("A", [], 0);
    const prod2 = crearProducto("A", [], 0);
    expect(prod1.id).not.toBe(prod2.id);
  });
});

// ---------------------------------------------------------------------------
// esCompuesto
// ---------------------------------------------------------------------------
describe("esCompuesto", () => {
  it("devuelve false para un array vacío", () => {
    expect(esCompuesto([])).toBe(false);
  });

  it("devuelve false cuando solo hay Lineas_De_Parametro", () => {
    const lineas = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PARAMETRO },
      { fuenteDeComponente: FUENTE_COMPONENTE.PARAMETRO },
    ];
    expect(esCompuesto(lineas)).toBe(false);
  });

  it("devuelve true cuando hay al menos una Linea_De_Producto", () => {
    const lineas = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PARAMETRO },
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO },
    ];
    expect(esCompuesto(lineas)).toBe(true);
  });

  it("devuelve true cuando todas las líneas son Lineas_De_Producto", () => {
    const lineas = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO },
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO },
    ];
    expect(esCompuesto(lineas)).toBe(true);
  });

  it("interpreta líneas sin fuenteDeComponente como Linea_De_Parametro (Req 3.4)", () => {
    const lineas = [{ parametroId: "p1", cantidad: 2, subtotal: 0 }];
    expect(esCompuesto(lineas)).toBe(false);
  });

  it("devuelve false para null", () => {
    expect(esCompuesto(null)).toBe(false);
  });

  it("devuelve false para undefined", () => {
    expect(esCompuesto(undefined)).toBe(false);
  });

  it("devuelve false para no-array (objeto)", () => {
    expect(esCompuesto({})).toBe(false);
  });

  it("no muta las líneas evaluadas (Req 3.5)", () => {
    const lineas = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO, cantidad: 1 },
    ];
    const snapshot = structuredClone(lineas);
    esCompuesto(lineas);
    expect(lineas).toEqual(snapshot);
  });

  it("es determinista: dos llamadas con la misma entrada devuelven el mismo resultado", () => {
    const lineas = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO },
      { fuenteDeComponente: FUENTE_COMPONENTE.PARAMETRO },
    ];
    expect(esCompuesto(lineas)).toBe(esCompuesto(lineas));
  });

  // Propiedad: esCompuesto(lineas) === lineas.some(l => l.fuenteDeComponente === "Producto")
  it("propiedad — equivale a some(fuenteDeComponente === 'Producto') para cualquier lista", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            fuenteDeComponente: fc.constantFrom(
              FUENTE_COMPONENTE.PARAMETRO,
              FUENTE_COMPONENTE.PRODUCTO,
              undefined
            ),
          }).map(({ fuenteDeComponente }) => {
            const l = {};
            if (fuenteDeComponente !== undefined) {
              l.fuenteDeComponente = fuenteDeComponente;
            }
            return l;
          }),
          { minLength: 0, maxLength: 8 }
        ),
        (lineas) => {
          const esperado = lineas.some(
            (l) => l.fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO
          );
          expect(esCompuesto(lineas)).toBe(esperado);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// normalizarLinea
// ---------------------------------------------------------------------------
describe("normalizarLinea", () => {
  it("completa fuenteDeComponente ausente con 'Parámetro'", () => {
    const l = normalizarLinea({ parametroId: "p1", cantidad: 1, subtotal: 5 });
    expect(l.fuenteDeComponente).toBe(FUENTE_COMPONENTE.PARAMETRO);
  });

  it("completa fuenteDeComponente null con 'Parámetro'", () => {
    const l = normalizarLinea({
      parametroId: null,
      cantidad: null,
      subtotal: 0,
      fuenteDeComponente: null,
    });
    expect(l.fuenteDeComponente).toBe(FUENTE_COMPONENTE.PARAMETRO);
  });

  it("conserva fuenteDeComponente 'Producto' cuando está presente", () => {
    const l = normalizarLinea({
      parametroId: null,
      cantidad: 2,
      subtotal: 10,
      fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
      productoComponenteId: "prod-x",
    });
    expect(l.fuenteDeComponente).toBe(FUENTE_COMPONENTE.PRODUCTO);
    expect(l.productoComponenteId).toBe("prod-x");
  });

  it("completa productoComponenteId ausente con null", () => {
    const l = normalizarLinea({ parametroId: "p1", cantidad: 1, subtotal: 0 });
    expect(l.productoComponenteId).toBeNull();
  });

  it("completa subtotal ausente con 0", () => {
    const l = normalizarLinea({ parametroId: "p1", cantidad: 1 });
    expect(l.subtotal).toBe(0);
  });

  it("completa parametroId ausente con null", () => {
    const l = normalizarLinea({ cantidad: 1, subtotal: 5 });
    expect(l.parametroId).toBeNull();
  });

  it("completa cantidad ausente con null", () => {
    const l = normalizarLinea({ parametroId: "p1", subtotal: 0 });
    expect(l.cantidad).toBeNull();
  });

  it("no muta la entrada", () => {
    const entrada = { parametroId: "p1", cantidad: 2, subtotal: 10 };
    const snapshot = { ...entrada };
    normalizarLinea(entrada);
    expect(entrada).toEqual(snapshot);
  });

  it("opera defensivamente sobre null", () => {
    const l = normalizarLinea(null);
    expect(l.parametroId).toBeNull();
    expect(l.cantidad).toBeNull();
    expect(l.subtotal).toBe(0);
    expect(l.fuenteDeComponente).toBe(FUENTE_COMPONENTE.PARAMETRO);
    expect(l.productoComponenteId).toBeNull();
  });

  it("opera defensivamente sobre undefined", () => {
    const l = normalizarLinea(undefined);
    expect(l.fuenteDeComponente).toBe(FUENTE_COMPONENTE.PARAMETRO);
  });

  it("el resultado siempre tiene exactamente los 5 campos esperados", () => {
    const l = normalizarLinea({});
    expect(Object.keys(l)).toEqual(
      expect.arrayContaining([
        "parametroId",
        "cantidad",
        "subtotal",
        "fuenteDeComponente",
        "productoComponenteId",
      ])
    );
    expect(Object.keys(l)).toHaveLength(5);
  });

  it("es idempotente: normalizar dos veces produce el mismo resultado", () => {
    const entrada = { parametroId: "p", cantidad: 3 };
    const una = normalizarLinea(entrada);
    const dos = normalizarLinea(una);
    expect(dos).toEqual(una);
  });
});

// ---------------------------------------------------------------------------
// normalizarProducto
// ---------------------------------------------------------------------------
describe("normalizarProducto", () => {
  it("preserva los campos id, nombre, lineas, precioTotal, unidad (Req 4.3)", () => {
    const lineas = [crearLinea("p1", 1)];
    const p = {
      id: "abc",
      nombre: "Prod A",
      lineas,
      precioTotal: 99.5,
      unidad: "JGO",
      compuesto: false,
    };
    const resultado = normalizarProducto(p);
    expect(resultado.id).toBe("abc");
    expect(resultado.nombre).toBe("Prod A");
    expect(resultado.lineas).toBe(lineas);
    expect(resultado.precioTotal).toBe(99.5);
    expect(resultado.unidad).toBe("JGO");
  });

  it("deriva compuesto de las líneas cuando el campo es ausente (Req 4.1)", () => {
    const lineas = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO, cantidad: 1, subtotal: 0 },
    ];
    const p = { id: "1", nombre: "X", lineas, precioTotal: 0, unidad: "UND" };
    const resultado = normalizarProducto(p);
    expect(resultado.compuesto).toBe(true);
  });

  it("deriva compuesto false cuando todas son Lineas_De_Parametro y el campo es ausente", () => {
    const lineas = [crearLinea("p1", 1)];
    const p = { id: "1", nombre: "X", lineas, precioTotal: 0, unidad: "UND" };
    const resultado = normalizarProducto(p);
    expect(resultado.compuesto).toBe(false);
  });

  it("conserva compuesto true si ya es booleano, sin recalcular (Req 4.2)", () => {
    // El producto tiene líneas solo de parámetro, pero compuesto=true ya está fijado.
    const lineas = [crearLinea("p1", 1)]; // sin Lineas_De_Producto
    const p = { id: "1", nombre: "X", lineas, precioTotal: 0, unidad: "UND", compuesto: true };
    const resultado = normalizarProducto(p);
    expect(resultado.compuesto).toBe(true); // se conserva, no se recalcula
  });

  it("conserva compuesto false si ya es booleano, sin recalcular (Req 4.2)", () => {
    // El producto tiene una Linea_De_Producto, pero compuesto=false ya está fijado.
    const lineas = [
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO, cantidad: 1, subtotal: 0 },
    ];
    const p = { id: "2", nombre: "Y", lineas, precioTotal: 0, unidad: "UND", compuesto: false };
    const resultado = normalizarProducto(p);
    expect(resultado.compuesto).toBe(false); // se conserva
  });

  it("el compuesto resultante siempre es booleano", () => {
    const p1 = normalizarProducto({ id: "1", nombre: "A", lineas: [], precioTotal: 0, unidad: "UND" });
    const p2 = normalizarProducto({ id: "2", nombre: "B", lineas: [], precioTotal: 0, unidad: "UND", compuesto: null });
    expect(typeof p1.compuesto).toBe("boolean");
    expect(typeof p2.compuesto).toBe("boolean");
  });

  it("no muta la entrada", () => {
    const lineas = [crearLinea("p1", 1)];
    const entrada = { id: "x", nombre: "Q", lineas, precioTotal: 10, unidad: "UND" };
    const snapshot = { ...entrada };
    normalizarProducto(entrada);
    expect(entrada).toEqual(snapshot);
  });

  it("opera defensivamente sobre null", () => {
    const resultado = normalizarProducto(null);
    expect(typeof resultado.compuesto).toBe("boolean");
  });

  it("opera defensivamente sobre undefined", () => {
    const resultado = normalizarProducto(undefined);
    expect(typeof resultado.compuesto).toBe("boolean");
  });

  it("es idempotente: normalizar dos veces produce el mismo resultado (Req 4.2)", () => {
    const lineas = [
      crearLinea("p1", 2),
      { fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO, productoComponenteId: "prod-z", cantidad: 1, subtotal: 0 },
    ];
    const p = { id: "99", nombre: "Test", lineas, precioTotal: 50, unidad: "UND" };
    const primera = normalizarProducto(p);
    const segunda = normalizarProducto(primera);
    expect(segunda).toEqual(primera);
  });

  // Propiedad: idempotencia + conservación de campos + compuesto derivado correctamente
  it("propiedad — conservación e idempotencia para cualquier producto", () => {
    const AUSENTE = Symbol("ausente");
    const arbLinea = fc
      .record({
        fuente: fc.constantFrom(
          FUENTE_COMPONENTE.PARAMETRO,
          FUENTE_COMPONENTE.PRODUCTO,
          AUSENTE
        ),
      })
      .map(({ fuente }) => {
        const l = {};
        if (fuente !== AUSENTE) l.fuenteDeComponente = fuente;
        return l;
      });

    const arbProducto = fc
      .record({
        id: fc.string({ minLength: 1, maxLength: 24 }),
        nombre: fc.string({ minLength: 1, maxLength: 100 }),
        lineas: fc.array(arbLinea, { minLength: 0, maxLength: 8 }),
        precioTotal: fc.integer({ min: 0, max: 999999999 }).map((n) => n / 100),
        unidad: fc.string({ minLength: 1, maxLength: 12 }),
        compuesto: fc.constantFrom(true, false, AUSENTE, null),
      })
      .map(({ id, nombre, lineas, precioTotal, unidad, compuesto }) => {
        const p = { id, nombre, lineas, precioTotal, unidad };
        if (compuesto !== AUSENTE) p.compuesto = compuesto;
        return p;
      });

    fc.assert(
      fc.property(arbProducto, (producto) => {
        const eraBooleano = typeof producto.compuesto === "boolean";
        const valorEntrada = producto.compuesto;

        const resultado = normalizarProducto(producto);

        // compuesto booleano se conserva; no-booleano se deriva
        if (eraBooleano) {
          expect(resultado.compuesto).toBe(valorEntrada);
        } else {
          expect(resultado.compuesto).toBe(esCompuesto(producto.lineas));
        }

        // compuesto siempre es booleano
        expect(typeof resultado.compuesto).toBe("boolean");

        // campos conservados
        expect(resultado.id).toBe(producto.id);
        expect(resultado.nombre).toBe(producto.nombre);
        expect(resultado.lineas).toBe(producto.lineas);
        expect(resultado.precioTotal).toBe(producto.precioTotal);
        expect(resultado.unidad).toBe(producto.unidad);

        // idempotencia
        const doble = normalizarProducto(resultado);
        expect(doble).toEqual(resultado);
      }),
      { numRuns: 100 }
    );
  });
});
