// tests/validation.test.js
//
// Pruebas unitarias de los validadores puros de `lib/validation.js`.
//
// Cubre todos los exports:
//   - MENSAJES: verificación de mensajes exactos
//   - validarNombreParametro: longitud, duplicados, idEnEdicion
//   - validarPrecioUnitario: rango, decimales, tipos inválidos
//   - validarUnidad: longitud mínima y máxima
//   - validarNombreProducto: obligatorio, longitud máxima, solo espacios
//   - validarCantidad: rango, decimales, tipos inválidos
//
// Requirements: 11.1, 11.4

import { describe, it, expect } from "vitest";
import {
  MENSAJES,
  VALIDO,
  validarNombreParametro,
  validarPrecioUnitario,
  validarUnidad,
  validarNombreProducto,
  validarCantidad,
} from "../lib/validation.js";

// ---------------------------------------------------------------------------
// MENSAJES — verificación de mensajes exactos
// ---------------------------------------------------------------------------
describe("MENSAJES — mensajes exactos exigidos por los criterios de aceptación", () => {
  it("NOMBRE_PARAMETRO_LONGITUD tiene el texto exacto", () => {
    expect(MENSAJES.NOMBRE_PARAMETRO_LONGITUD).toBe(
      "El nombre debe contener entre 1 y 100 caracteres."
    );
  });

  it("NOMBRE_PARAMETRO_DUPLICADO tiene el texto exacto", () => {
    expect(MENSAJES.NOMBRE_PARAMETRO_DUPLICADO).toBe(
      "Ya existe un parámetro con ese nombre."
    );
  });

  it("PRECIO_UNITARIO_INVALIDO tiene el texto exacto", () => {
    expect(MENSAJES.PRECIO_UNITARIO_INVALIDO).toBe(
      "El precio unitario debe ser un número entre 0.00 y 999999999.99 con un máximo de 2 decimales."
    );
  });

  it("UNIDAD_LONGITUD tiene el texto exacto", () => {
    expect(MENSAJES.UNIDAD_LONGITUD).toBe(
      "La unidad debe contener entre 1 y 20 caracteres."
    );
  });

  it("NOMBRE_PRODUCTO_OBLIGATORIO tiene el texto exacto", () => {
    expect(MENSAJES.NOMBRE_PRODUCTO_OBLIGATORIO).toBe(
      "El nombre del producto es obligatorio."
    );
  });

  it("NOMBRE_PRODUCTO_LONGITUD tiene el texto exacto", () => {
    expect(MENSAJES.NOMBRE_PRODUCTO_LONGITUD).toBe(
      "El nombre del producto supera la longitud máxima permitida."
    );
  });

  it("CANTIDAD_INVALIDA tiene el texto exacto", () => {
    expect(MENSAJES.CANTIDAD_INVALIDA).toBe(
      "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99."
    );
  });
});

// ---------------------------------------------------------------------------
// VALIDO — objeto canónico de resultado válido
// ---------------------------------------------------------------------------
describe("VALIDO — objeto canónico", () => {
  it("tiene valido: true", () => {
    expect(VALIDO.valido).toBe(true);
  });

  it("está congelado (inmutable)", () => {
    expect(Object.isFrozen(VALIDO)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validarNombreParametro
// ---------------------------------------------------------------------------
describe("validarNombreParametro — longitud", () => {
  it("acepta nombre de 1 carácter", () => {
    expect(validarNombreParametro("A").valido).toBe(true);
  });

  it("acepta nombre de 100 caracteres", () => {
    expect(validarNombreParametro("x".repeat(100)).valido).toBe(true);
  });

  it("rechaza cadena vacía con mensaje de longitud", () => {
    const r = validarNombreParametro("");
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PARAMETRO_LONGITUD);
  });

  it("rechaza cadena de solo espacios (queda vacía tras trim)", () => {
    const r = validarNombreParametro("   ");
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PARAMETRO_LONGITUD);
  });

  it("rechaza nombre de 101 caracteres", () => {
    const r = validarNombreParametro("x".repeat(101));
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PARAMETRO_LONGITUD);
  });

  it("recorta espacios antes de medir la longitud (100 chars + espacios es válido)", () => {
    expect(validarNombreParametro("  " + "x".repeat(100) + "  ").valido).toBe(true);
  });

  it("rechaza valor no-string (undefined → '')", () => {
    const r = validarNombreParametro(undefined);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PARAMETRO_LONGITUD);
  });
});

describe("validarNombreParametro — duplicados", () => {
  const existentes = [
    { id: "a", nombre: "Mano de obra", precioUnitario: 10, unidad: "h" },
    { id: "b", nombre: "Material", precioUnitario: 5, unidad: "m" },
  ];

  it("rechaza nombre duplicado exacto", () => {
    const r = validarNombreParametro("Mano de obra", existentes);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PARAMETRO_DUPLICADO);
  });

  it("rechaza nombre duplicado ignorando espacios alrededor", () => {
    const r = validarNombreParametro("  Material  ", existentes);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PARAMETRO_DUPLICADO);
  });

  it("acepta nombre único", () => {
    expect(validarNombreParametro("Transporte", existentes).valido).toBe(true);
  });

  it("acepta nombre que coincide con el propio idEnEdicion (edición sin cambio de nombre)", () => {
    const r = validarNombreParametro("Mano de obra", existentes, "a");
    expect(r.valido).toBe(true);
  });

  it("sigue rechazando duplicado con otro id distinto al idEnEdicion", () => {
    const r = validarNombreParametro("Material", existentes, "a");
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PARAMETRO_DUPLICADO);
  });

  it("acepta con lista vacía de existentes", () => {
    expect(validarNombreParametro("Nuevo", []).valido).toBe(true);
  });

  it("acepta sin pasar lista de existentes", () => {
    expect(validarNombreParametro("Nuevo").valido).toBe(true);
  });

  it("tolera lista con entradas null/undefined sin lanzar", () => {
    const r = validarNombreParametro("Único", [null, undefined, { id: "x", nombre: "Otro" }]);
    expect(r.valido).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validarPrecioUnitario
// ---------------------------------------------------------------------------
describe("validarPrecioUnitario — valores válidos", () => {
  it("acepta 0 (mínimo absoluto)", () => {
    expect(validarPrecioUnitario(0).valido).toBe(true);
  });

  it("acepta 0.01 (un centavo)", () => {
    expect(validarPrecioUnitario(0.01).valido).toBe(true);
  });

  it("acepta 999999999.99 (máximo)", () => {
    expect(validarPrecioUnitario(999999999.99).valido).toBe(true);
  });

  it("acepta enteros positivos (p.ej. 100)", () => {
    expect(validarPrecioUnitario(100).valido).toBe(true);
  });

  it("acepta un decimal (p.ej. 10.5)", () => {
    expect(validarPrecioUnitario(10.5).valido).toBe(true);
  });

  it("acepta dos decimales (p.ej. 10.55)", () => {
    expect(validarPrecioUnitario(10.55).valido).toBe(true);
  });
});

describe("validarPrecioUnitario — valores inválidos", () => {
  it("rechaza valor negativo (-0.01)", () => {
    const r = validarPrecioUnitario(-0.01);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.PRECIO_UNITARIO_INVALIDO);
  });

  it("rechaza valor superior al máximo (1000000000)", () => {
    const r = validarPrecioUnitario(1000000000);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.PRECIO_UNITARIO_INVALIDO);
  });

  it("rechaza tres decimales (1.005)", () => {
    const r = validarPrecioUnitario(1.005);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.PRECIO_UNITARIO_INVALIDO);
  });

  it("rechaza cadena numérica ('10')", () => {
    const r = validarPrecioUnitario("10");
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.PRECIO_UNITARIO_INVALIDO);
  });

  it("rechaza NaN", () => {
    const r = validarPrecioUnitario(NaN);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.PRECIO_UNITARIO_INVALIDO);
  });

  it("rechaza Infinity", () => {
    const r = validarPrecioUnitario(Infinity);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.PRECIO_UNITARIO_INVALIDO);
  });

  it("rechaza null", () => {
    const r = validarPrecioUnitario(null);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.PRECIO_UNITARIO_INVALIDO);
  });

  it("rechaza undefined", () => {
    const r = validarPrecioUnitario(undefined);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.PRECIO_UNITARIO_INVALIDO);
  });
});

// ---------------------------------------------------------------------------
// validarUnidad
// ---------------------------------------------------------------------------
describe("validarUnidad — valores válidos", () => {
  it("acepta unidad de 1 carácter", () => {
    expect(validarUnidad("m").valido).toBe(true);
  });

  it("acepta unidad de 20 caracteres (máximo)", () => {
    expect(validarUnidad("x".repeat(20)).valido).toBe(true);
  });

  it("acepta unidades típicas ('kg', 'HORA', 'UND')", () => {
    expect(validarUnidad("kg").valido).toBe(true);
    expect(validarUnidad("HORA").valido).toBe(true);
    expect(validarUnidad("UND").valido).toBe(true);
  });
});

describe("validarUnidad — valores inválidos", () => {
  it("rechaza cadena vacía con mensaje de longitud", () => {
    const r = validarUnidad("");
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.UNIDAD_LONGITUD);
  });

  it("rechaza unidad de 21 caracteres", () => {
    const r = validarUnidad("x".repeat(21));
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.UNIDAD_LONGITUD);
  });

  it("rechaza valor no-string (null → longitud 0)", () => {
    const r = validarUnidad(null);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.UNIDAD_LONGITUD);
  });

  it("rechaza valor no-string (undefined → longitud 0)", () => {
    const r = validarUnidad(undefined);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.UNIDAD_LONGITUD);
  });

  // Nota: la Unidad NO aplica trim, los espacios cuentan como caracteres.
  it("cadena de espacios ('   ') tiene longitud > 0 y es válida si ≤ 20", () => {
    expect(validarUnidad("   ").valido).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validarNombreProducto
// ---------------------------------------------------------------------------
describe("validarNombreProducto — valores válidos", () => {
  it("acepta nombre de 1 carácter", () => {
    expect(validarNombreProducto("A").valido).toBe(true);
  });

  it("acepta nombre de 100 caracteres", () => {
    expect(validarNombreProducto("x".repeat(100)).valido).toBe(true);
  });

  it("acepta nombre con espacios al inicio/final si queda ≥ 1 char tras trim", () => {
    expect(validarNombreProducto("  Producto  ").valido).toBe(true);
  });
});

describe("validarNombreProducto — vacío / solo espacios → OBLIGATORIO", () => {
  it("rechaza cadena vacía con mensaje OBLIGATORIO", () => {
    const r = validarNombreProducto("");
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PRODUCTO_OBLIGATORIO);
  });

  it("rechaza cadena de solo espacios con mensaje OBLIGATORIO", () => {
    const r = validarNombreProducto("   ");
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PRODUCTO_OBLIGATORIO);
  });

  it("rechaza valor no-string (null → '' tras trim) con mensaje OBLIGATORIO", () => {
    const r = validarNombreProducto(null);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PRODUCTO_OBLIGATORIO);
  });

  it("rechaza undefined con mensaje OBLIGATORIO", () => {
    const r = validarNombreProducto(undefined);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PRODUCTO_OBLIGATORIO);
  });
});

describe("validarNombreProducto — supera longitud máxima → LONGITUD", () => {
  it("rechaza nombre de 101 caracteres con mensaje LONGITUD", () => {
    const r = validarNombreProducto("x".repeat(101));
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PRODUCTO_LONGITUD);
  });

  it("rechaza nombre de 200 caracteres con mensaje LONGITUD", () => {
    const r = validarNombreProducto("x".repeat(200));
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PRODUCTO_LONGITUD);
  });

  it("nombre con espacios al inicio que tras trim supera 100 chars sigue siendo inválido", () => {
    // "  " + 101 chars = trim → 101 chars → LONGITUD
    const r = validarNombreProducto("  " + "x".repeat(101));
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.NOMBRE_PRODUCTO_LONGITUD);
  });
});

// ---------------------------------------------------------------------------
// validarCantidad
// ---------------------------------------------------------------------------
describe("validarCantidad — valores válidos", () => {
  it("acepta el borde inferior 0.01", () => {
    expect(validarCantidad(0.01).valido).toBe(true);
  });

  it("acepta el borde superior 999999999.99", () => {
    expect(validarCantidad(999999999.99).valido).toBe(true);
  });

  it("acepta un número entero en rango (5)", () => {
    expect(validarCantidad(5).valido).toBe(true);
  });

  it("acepta un decimal (10.5)", () => {
    expect(validarCantidad(10.5).valido).toBe(true);
  });

  it("acepta exactamente dos decimales (10.55)", () => {
    expect(validarCantidad(10.55).valido).toBe(true);
  });
});

describe("validarCantidad — fuera de rango", () => {
  it("rechaza 0 (por debajo del mínimo)", () => {
    const r = validarCantidad(0);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza 0.009 (inferior al borde 0.01)", () => {
    const r = validarCantidad(0.009);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza valor negativo (-1)", () => {
    const r = validarCantidad(-1);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza 1000000000 (superior al máximo)", () => {
    const r = validarCantidad(1000000000);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });
});

describe("validarCantidad — decimales inválidos", () => {
  it("rechaza tres decimales (1.005)", () => {
    const r = validarCantidad(1.005);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza cuatro decimales (1.0001)", () => {
    const r = validarCantidad(1.0001);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });
});

describe("validarCantidad — tipos inválidos", () => {
  it("rechaza cadena numérica ('5') — el contrato exige number", () => {
    const r = validarCantidad("5");
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza NaN", () => {
    const r = validarCantidad(NaN);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza Infinity", () => {
    const r = validarCantidad(Infinity);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza -Infinity", () => {
    const r = validarCantidad(-Infinity);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza null", () => {
    const r = validarCantidad(null);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza undefined", () => {
    const r = validarCantidad(undefined);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza objeto", () => {
    const r = validarCantidad({ valor: 5 });
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza array", () => {
    const r = validarCantidad([5]);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });

  it("rechaza boolean", () => {
    const r = validarCantidad(true);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(MENSAJES.CANTIDAD_INVALIDA);
  });
});
