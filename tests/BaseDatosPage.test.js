// tests/BaseDatosPage.test.js — Exportar/importar respaldos.
//
// Migra los escenarios de old/tests/exportar.importar.integracion.test.js.
//
// Requisitos: 11.3

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React, { useState } from "react";
import BaseDatosPage from "../components/base-datos/BaseDatosPage.js";
import { AppContext } from "../components/AppProvider.js";
import { NotifierContext } from "../components/NotifierContext.js";
import { serializarRespaldo } from "../lib/backup.js";
import * as db from "../lib/db.js";

const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
];
const PRODUCTOS = [
  { id: "x1", nombre: "Prod", lineas: [], precioTotal: 0, compuesto: false },
];

let notifRegistro;

// Harness con estado para observar los cambios de setParametros/setProductos.
// `supabase` por defecto es undefined (camino en memoria); se puede pasar un
// cliente simulado para ejercitar el camino de persistencia en Supabase.
function Harness({ supabase = undefined } = {}) {
  const [parametros, setParametros] = useState(PARAMETROS);
  const [productos, setProductos] = useState(PRODUCTOS);

  const appValor = {
    parametros,
    productos,
    loading: false,
    error: null,
    calculadoraLineas: [],
    setParametros,
    setProductos,
    setCalculadoraLineas: () => {},
    saveAll: async () => true,
    recargarDatos: async () => {},
    supabase,
  };
  const notifValor = {
    notificaciones: [],
    dispatch: (n) => notifRegistro.push(n),
    quitar: () => {},
  };

  return (
    <AppContext.Provider value={appValor}>
      <NotifierContext.Provider value={notifValor}>
        <BaseDatosPage />
        <div data-testid="conteo-param">{parametros.length}</div>
        <div data-testid="conteo-prod">{productos.length}</div>
      </NotifierContext.Provider>
    </AppContext.Provider>
  );
}

/**
 * Simula la selección de un archivo con el contenido dado disparando el
 * onChange del input con un objeto File real (jsdom soporta FileReader).
 * @param {string} contenido
 */
function seleccionarArchivo(contenido) {
  const input = document.querySelector(".lp-importar");
  const file = new File([contenido], "respaldo.json", {
    type: "application/json",
  });
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  notifRegistro = [];
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BaseDatosPage — exportar", () => {
  it("exportar dispara una descarga (createObjectURL + click + revoke)", () => {
    const createUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:fake");
    const revokeUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<Harness />);
    fireEvent.click(screen.getByText("Exportar respaldo"));

    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith("blob:fake");
  });
});

describe("BaseDatosPage — importar", () => {
  it("archivo válido muestra el diálogo de confirmación", async () => {
    render(<Harness />);
    const contenido = serializarRespaldo(
      [{ id: "p9", nombre: "Nuevo", precioUnitario: 2, unidad: "UND" }],
      [
        { id: "x9", nombre: "Importado", lineas: [], precioTotal: 0, compuesto: false },
        { id: "x8", nombre: "Otro", lineas: [], precioTotal: 0, compuesto: false },
      ]
    );
    seleccionarArchivo(contenido);

    await waitFor(() => {
      expect(
        document.querySelector(".lp-confirmar-importacion")
      ).not.toBeNull();
    });
  });

  it("confirmar importación actualiza el estado global", async () => {
    render(<Harness />);
    const contenido = serializarRespaldo(
      [{ id: "p9", nombre: "Nuevo", precioUnitario: 2, unidad: "UND" }],
      [
        { id: "x9", nombre: "Importado", lineas: [], precioTotal: 0, compuesto: false },
        { id: "x8", nombre: "Otro", lineas: [], precioTotal: 0, compuesto: false },
      ]
    );
    seleccionarArchivo(contenido);

    await waitFor(() => {
      expect(screen.getByText("Importar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Importar"));

    await waitFor(() => {
      expect(screen.getByTestId("conteo-prod").textContent).toBe("2");
      expect(screen.getByTestId("conteo-param").textContent).toBe("1");
    });
  });

  it("cancelar importación no cambia el estado", async () => {
    render(<Harness />);
    const contenido = serializarRespaldo(
      [{ id: "p9", nombre: "Nuevo", precioUnitario: 2, unidad: "UND" }],
      [{ id: "x9", nombre: "Importado", lineas: [], precioTotal: 0, compuesto: false }]
    );
    seleccionarArchivo(contenido);

    await waitFor(() => {
      expect(screen.getByText("Cancelar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Cancelar"));

    expect(screen.getByTestId("conteo-prod").textContent).toBe("1");
    expect(screen.getByTestId("conteo-param").textContent).toBe("1");
  });

  it("archivo inválido muestra error con el motivo de parsearRespaldo", async () => {
    render(<Harness />);
    seleccionarArchivo("{ esto no es json válido");

    await waitFor(() => {
      expect(notifRegistro.some((n) => n.type === "error")).toBe(true);
    });
    // No se muestra el diálogo de confirmación.
    expect(document.querySelector(".lp-confirmar-importacion")).toBeNull();
  });

  it("fallo al guardar en Supabase muestra toast de error y no reemplaza el estado (Req 8.7)", async () => {
    // Simula un cliente Supabase presente cuya persistencia falla.
    const importSpy = vi
      .spyOn(db, "importBackup")
      .mockRejectedValue(new Error("fallo de red Supabase"));
    const getSpy = vi.spyOn(db, "getData");

    const supabaseFake = {}; // basta con que sea truthy para tomar el camino de persistencia
    render(<Harness supabase={supabaseFake} />);

    const contenido = serializarRespaldo(
      [{ id: "p9", nombre: "Nuevo", precioUnitario: 2, unidad: "UND" }],
      [
        { id: "x9", nombre: "Importado", lineas: [], precioTotal: 0, compuesto: false },
        { id: "x8", nombre: "Otro", lineas: [], precioTotal: 0, compuesto: false },
      ]
    );
    seleccionarArchivo(contenido);

    await waitFor(() => {
      expect(screen.getByText("Importar")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Importar"));

    // Se intentó persistir en Supabase.
    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledTimes(1);
    });

    // Se muestra un toast de error indicando el fallo de guardado en Supabase.
    await waitFor(() => {
      expect(
        notifRegistro.some(
          (n) => n.type === "error" && /Supabase/i.test(n.message)
        )
      ).toBe(true);
    });

    // No se re-lee el estado y no se reemplazan los datos previos.
    expect(getSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("conteo-prod").textContent).toBe("1");
    expect(screen.getByTestId("conteo-param").textContent).toBe("1");
    // El diálogo de confirmación se cerró.
    expect(document.querySelector(".lp-confirmar-importacion")).toBeNull();
  });
});
