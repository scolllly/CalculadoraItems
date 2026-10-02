// tests/AppProvider.smoke.test.js — Prueba de humo del AppProvider.
//
// Verifica que el AppProvider se monta sin lanzar en jsdom, mockeando `fetch`
// y el cliente Supabase.
//
// Requisitos: 4.1, 4.2

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import React from "react";

// Mock del cliente Supabase: devuelve un canal encadenable y sin red real.
vi.mock("../lib/supabase.js", () => {
  const canal = {
    on: () => canal,
    subscribe: () => canal,
  };
  return {
    createSupabaseClient: () => ({
      channel: () => canal,
      removeChannel: () => {},
    }),
  };
});

import { AppProvider } from "../components/AppProvider.js";

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ parametros: [], productos: [] }),
    })
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AppProvider — humo", () => {
  it("se monta sin lanzar y llama a GET /api/data", async () => {
    const { container } = render(
      <AppProvider>
        <div data-testid="hijo">contenido</div>
      </AppProvider>
    );

    expect(container.querySelector('[data-testid="hijo"]')).not.toBeNull();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/data",
        expect.anything()
      );
    });
  });

  it("expone el contexto sin romper el render de los hijos", async () => {
    const { getByText } = render(
      <AppProvider>
        <span>hola mundo</span>
      </AppProvider>
    );
    expect(getByText("hola mundo")).toBeTruthy();
  });
});
