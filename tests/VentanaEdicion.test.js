// tests/VentanaEdicion.test.js — Pruebas de la Ventana_Edicion.
//
// Migra los escenarios de old/tests/ventana.edicion.test.js a React.
//
// Requisitos: 11.3

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import VentanaEdicion from "../components/productos/VentanaEdicion.js";

const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

const PRODUCTO = {
  id: "prod-1",
  nombre: "Servicio básico",
  lineas: [
    { parametroId: "p1", cantidad: 2, subtotal: 20 },
    { parametroId: "p2", cantidad: 4, subtotal: 20 },
  ],
  precioTotal: 40,
};

afterEach(cleanup);

function montar(overrides = {}) {
  const onGuardar = overrides.onGuardar || vi.fn();
  const onClose = overrides.onClose || vi.fn();
  render(
    <VentanaEdicion
      producto={overrides.producto === undefined ? PRODUCTO : overrides.producto}
      parametros={PARAMETROS}
      productos={[]}
      onGuardar={onGuardar}
      onClose={onClose}
    />
  );
  return { onGuardar, onClose };
}

describe("VentanaEdicion", () => {
  it("apertura precarga líneas y muestra el nombre en solo lectura", () => {
    montar();
    const nombre = document.querySelector(".lp-edicion-nombre");
    expect(nombre.value).toBe("Servicio básico");
    expect(nombre.readOnly).toBe(true);
    expect(document.querySelectorAll(".lp-linea")).toHaveLength(2);
  });

  it("rechazo sin líneas muestra SIN_LINEAS", () => {
    montar({ producto: { ...PRODUCTO, lineas: [] } });
    fireEvent.click(screen.getByText("Guardar"));
    expect(
      screen.getByText("Se debe agregar al menos un parámetro.")
    ).toBeInTheDocument();
  });

  it("cantidad inválida muestra CANTIDAD_INVALIDA", () => {
    const { onGuardar } = montar();
    const cantidades = document.querySelectorAll(".lp-linea-cantidad");
    fireEvent.change(cantidades[0], { target: { value: "0" } });
    fireEvent.click(screen.getByText("Guardar"));
    expect(
      screen.getByText(
        "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99."
      )
    ).toBeInTheDocument();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("sin parámetro muestra SIN_PARAMETRO", () => {
    const { onGuardar } = montar();
    const componentes = document.querySelectorAll(".lp-linea-componente");
    fireEvent.change(componentes[0], { target: { value: "" } });
    fireEvent.click(screen.getByText("Guardar"));
    expect(
      screen.getByText("Cada línea debe tener un parámetro seleccionado.")
    ).toBeInTheDocument();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("guardar válido llama onGuardar con id y líneas", () => {
    const { onGuardar } = montar();
    fireEvent.click(screen.getByText("Guardar"));
    expect(onGuardar).toHaveBeenCalledTimes(1);
    const [id, lineas] = onGuardar.mock.calls[0];
    expect(id).toBe("prod-1");
    expect(lineas).toHaveLength(2);
  });

  it("cancelar no llama onGuardar", () => {
    const { onGuardar, onClose } = montar();
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onGuardar).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
