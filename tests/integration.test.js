// tests/integration.test.js — Integración Realtime del AppProvider.
//
// Mockea lib/supabase.js y lib/db.js. Simula un evento Realtime y verifica que
// el AppProvider dispara una re-lectura (GET /api/data) que refleja los datos
// insertados.
//
// Requisitos: 11.5

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import React, { useContext } from "react";

// Capturamos el handler suscrito al canal para dispararlo manualmente.
let handlerRealtime = null;

vi.mock("../lib/supabase.js", () => {
  const canal = {
    on(_evento, _filtro, cb) {
      handlerRealtime = cb;
      return canal;
    },
    subscribe() {
      return canal;
    },
  };
  return {
    createSupabaseClient: () => ({
      channel: () => canal,
      removeChannel: () => {},
    }),
  };
});

import { AppProvider, AppContext } from "../components/AppProvider.js";

// Sonda que expone los productos del contexto en el DOM.
function Sonda() {
  const ctx = useContext(AppContext);
  return <div data-testid="conteo">{ctx.productos.length}</div>;
}

beforeEach(() => {
  handlerRealtime = null;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AppProvider — integración Realtime", () => {
  it("un evento Realtime dispara re-lectura y refleja los datos nuevos", async () => {
    // Primera carga: vacío. Tras el evento: un producto.
    let llamada = 0;
    global.fetch = vi.fn(() => {
      llamada += 1;
      const productos =
        llamada === 1
          ? []
          : [{ id: "p1", nombre: "Nuevo", lineas: [], precioTotal: 0, compuesto: false }];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ parametros: [], productos }),
      });
    });

    const { getByTestId } = render(
      <AppProvider>
        <Sonda />
      </AppProvider>
    );

    // Carga inicial: 0 productos.
    await waitFor(() => {
      expect(getByTestId("conteo").textContent).toBe("0");
    });

    // Se registró un handler Realtime.
    await waitFor(() => {
      expect(typeof handlerRealtime).toBe("function");
    });

    // Disparar el evento Realtime → re-lectura.
    handlerRealtime({ eventType: "INSERT", table: "products" });

    await waitFor(() => {
      expect(getByTestId("conteo").textContent).toBe("1");
    });
  });
});
