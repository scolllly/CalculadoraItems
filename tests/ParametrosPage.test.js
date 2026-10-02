// tests/ParametrosPage.test.js — Comportamiento del formulario de Parámetros.
//
// Requisitos: 11.3

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import ParametrosPage from "../components/parametros/ParametrosPage.js";
import { AppContext } from "../components/AppProvider.js";
import { NotifierContext } from "../components/NotifierContext.js";

const EXISTENTES = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
];

afterEach(cleanup);

function montar(overrides = {}) {
  const saveAll = overrides.saveAll || vi.fn(async () => true);
  const setCalculadoraLineas = overrides.setCalculadoraLineas || vi.fn();
  const notifRegistro = [];

  const appValor = {
    parametros: overrides.parametros || EXISTENTES,
    productos: [],
    loading: false,
    error: null,
    calculadoraLineas: overrides.calculadoraLineas || [],
    setParametros: () => {},
    setProductos: () => {},
    setCalculadoraLineas,
    saveAll,
    recargarDatos: async () => {},
    supabase: undefined,
  };

  const notifValor = {
    notificaciones: [],
    dispatch: (n) => notifRegistro.push(n),
    quitar: () => {},
  };

  render(
    <AppContext.Provider value={appValor}>
      <NotifierContext.Provider value={notifValor}>
        <ParametrosPage />
      </NotifierContext.Provider>
    </AppContext.Provider>
  );

  return { saveAll, setCalculadoraLineas, notifRegistro };
}

function rellenar(nombre, precio, unidad) {
  fireEvent.change(document.querySelector(".lp-param-nombre"), {
    target: { value: nombre },
  });
  fireEvent.change(document.querySelector(".lp-param-precio"), {
    target: { value: precio },
  });
  fireEvent.change(document.querySelector(".lp-param-unidad"), {
    target: { value: unidad },
  });
}

describe("ParametrosPage — validación", () => {
  it("nombre duplicado muestra NOMBRE_PARAMETRO_DUPLICADO", () => {
    montar();
    rellenar("Mano de obra", "5", "UND");
    fireEvent.click(screen.getByText("Guardar"));
    expect(
      screen.getByText("Ya existe un parámetro con ese nombre.")
    ).toBeInTheDocument();
  });

  it("precio fuera de rango muestra PRECIO_UNITARIO_INVALIDO", () => {
    montar();
    rellenar("Nuevo", "1000000000", "UND");
    fireEvent.click(screen.getByText("Guardar"));
    expect(
      screen.getByText(
        "El precio unitario debe ser un número entre 0.00 y 999999999.99 con un máximo de 2 decimales."
      )
    ).toBeInTheDocument();
  });

  it("nombre vacío muestra NOMBRE_PARAMETRO_LONGITUD", () => {
    montar();
    rellenar("", "5", "UND");
    fireEvent.click(screen.getByText("Guardar"));
    expect(
      screen.getByText("El nombre debe contener entre 1 y 100 caracteres.")
    ).toBeInTheDocument();
  });

  it("unidad vacía muestra UNIDAD_LONGITUD", () => {
    montar();
    rellenar("Nuevo", "5", "");
    fireEvent.click(screen.getByText("Guardar"));
    expect(
      screen.getByText("La unidad debe contener entre 1 y 20 caracteres.")
    ).toBeInTheDocument();
  });
});

describe("ParametrosPage — operaciones", () => {
  it("crear parámetro válido llama saveAll con la lista ampliada", async () => {
    const { saveAll } = montar();
    rellenar("Transporte", "15.5", "KM");
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() => {
      expect(saveAll).toHaveBeenCalledTimes(1);
    });
    const arg = saveAll.mock.calls[0][0];
    expect(arg.parametros).toHaveLength(2);
    expect(arg.parametros[1].nombre).toBe("Transporte");
  });

  it("editar parámetro carga valores en el formulario", () => {
    montar();
    fireEvent.click(screen.getByLabelText("Editar"));
    expect(document.querySelector(".lp-param-nombre").value).toBe(
      "Mano de obra"
    );
    expect(document.querySelector(".lp-param-precio").value).toBe("10");
    expect(document.querySelector(".lp-param-unidad").value).toBe("HORA");
  });

  it("eliminar parámetro referenciado muestra confirmación con el número de líneas", async () => {
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockImplementation(() => false);
    const setCalculadoraLineas = vi.fn();
    montar({
      calculadoraLineas: [
        { parametroId: "p1", cantidad: 1 },
        { parametroId: "p1", cantidad: 2 },
      ],
      setCalculadoraLineas,
    });
    fireEvent.click(screen.getByLabelText("Eliminar"));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0][0]).toContain("2");
    // Como se canceló (confirm=false), no se desreferencia.
    expect(setCalculadoraLineas).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
