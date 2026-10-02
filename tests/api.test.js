// tests/api.test.js — Pruebas de los handlers GET/PUT de app/api/data/route.js.
//
// Mockea lib/db.js y lib/supabase.js para aislar los handlers de la red real.
//
// Requisitos: 3.4, 3.5, 3.6, 3.8, 11.6

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock del cliente Supabase (no se usa su valor, solo se pasa a db).
vi.mock("../lib/supabase.js", () => ({
  createSupabaseClient: () => ({}),
}));

// Mock de la capa de datos.
vi.mock("../lib/db.js", () => ({
  getData: vi.fn(),
  putData: vi.fn(),
}));

import { GET, PUT } from "../app/api/data/route.js";
import { getData, putData } from "../lib/db.js";

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Construye un Request con cuerpo JSON para PUT.
 * @param {unknown} cuerpo
 * @returns {Request}
 */
function requestConCuerpo(cuerpo) {
  return new Request("http://localhost/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

// ---------------------------------------------------------------------------
// 12.1 GET con tablas vacías
// ---------------------------------------------------------------------------
describe("GET /api/data — tablas vacías", () => {
  it("responde 200 con { parametros: [], productos: [] }", async () => {
    getData.mockResolvedValue({ parametros: [], productos: [] });

    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ parametros: [], productos: [] });
  });
});

// ---------------------------------------------------------------------------
// 12.2 PUT con cuerpo válido
// ---------------------------------------------------------------------------
describe("PUT /api/data — cuerpo válido", () => {
  it("responde 200 cuando putData resuelve sin error", async () => {
    putData.mockResolvedValue(undefined);

    const cuerpo = {
      parametros: [{ id: "p1", nombre: "A", precioUnitario: 1, unidad: "UND" }],
      productos: [{ id: "x1", nombre: "Prod", lineas: [], precioTotal: 0 }],
    };
    const respuesta = await PUT(requestConCuerpo(cuerpo));
    expect(respuesta.status).toBe(200);
    expect(putData).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 12.3 GET con error de Supabase
// ---------------------------------------------------------------------------
describe("GET /api/data — error de Supabase", () => {
  it("responde 500 con campo error cuando getData lanza", async () => {
    getData.mockRejectedValue(new Error("fallo supabase"));

    const respuesta = await GET();
    expect(respuesta.status).toBe(500);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toHaveProperty("error");
  });
});

// ---------------------------------------------------------------------------
// 12.4 PUT con cuerpo malformado
// ---------------------------------------------------------------------------
describe("PUT /api/data — cuerpo malformado", () => {
  it("responde 400 cuando falta el campo productos como array", async () => {
    const respuesta = await PUT(requestConCuerpo({ parametros: [] }));
    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toContain("parametros");
    expect(putData).not.toHaveBeenCalled();
  });

  it("responde 400 cuando parametros no es un array", async () => {
    const respuesta = await PUT(
      requestConCuerpo({ parametros: "no-array", productos: [] })
    );
    expect(respuesta.status).toBe(400);
    expect(putData).not.toHaveBeenCalled();
  });
});
