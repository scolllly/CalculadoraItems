// tests/Calculadora.test.js — Comportamiento de la Calculadora.
//
// Requisitos: 11.3

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import Calculadora from "../components/productos/Calculadora.js";
import { FUENTE_COMPONENTE } from "../lib/models.js";

const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

afterEach(cleanup);

function montar(onGuardar = vi.fn()) {
  render(
    <Calculadora parametros={PARAMETROS} productos={[]} onGuardar={onGuardar} />
  );
  return onGuardar;
}

function agregarLineaParametro(parametroId, cantidad) {
  fireEvent.click(screen.getByText("Agregar línea"));
  const componentes = document.querySelectorAll(".lp-linea-componente");
  const ultimo = componentes[componentes.length - 1];
  fireEvent.change(ultimo, { target: { value: parametroId } });
  const cantidades = document.querySelectorAll(".lp-linea-cantidad");
  fireEvent.change(cantidades[cantidades.length - 1], {
    target: { value: String(cantidad) },
  });
}

describe("Calculadora — validación", () => {
  it("Calcular sin nombre muestra NOMBRE_PRODUCTO_OBLIGATORIO", () => {
    montar();
    agregarLineaParametro("p1", 3);
    fireEvent.click(screen.getByText("Calcular"));
    expect(
      screen.getByText("El nombre del producto es obligatorio.")
    ).toBeInTheDocument();
  });

  it("Calcular sin líneas muestra SIN_LINEAS", () => {
    montar();
    fireEvent.change(document.querySelector(".lp-calc-nombre"), {
      target: { value: "Servicio A" },
    });
    fireEvent.click(screen.getByText("Calcular"));
    expect(
      screen.getByText("Se debe agregar al menos un parámetro.")
    ).toBeInTheDocument();
  });

  it("Calcular con cantidad inválida muestra CANTIDAD_INVALIDA", () => {
    montar();
    fireEvent.change(document.querySelector(".lp-calc-nombre"), {
      target: { value: "Servicio A" },
    });
    agregarLineaParametro("p1", 0);
    fireEvent.click(screen.getByText("Calcular"));
    expect(
      screen.getByText(
        "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99."
      )
    ).toBeInTheDocument();
  });

  it("Calcular con parámetro sin seleccionar muestra SIN_PARAMETRO", () => {
    montar();
    fireEvent.change(document.querySelector(".lp-calc-nombre"), {
      target: { value: "Servicio A" },
    });
    fireEvent.click(screen.getByText("Agregar línea"));
    const cantidades = document.querySelectorAll(".lp-linea-cantidad");
    fireEvent.change(cantidades[0], { target: { value: "3" } });
    fireEvent.click(screen.getByText("Calcular"));
    expect(
      screen.getByText("Cada línea debe tener un parámetro seleccionado.")
    ).toBeInTheDocument();
  });
});

describe("Calculadora — cálculo y guardado", () => {
  it("Calcular con datos válidos muestra subtotales y total en PEN", () => {
    montar();
    fireEvent.change(document.querySelector(".lp-calc-nombre"), {
      target: { value: "Servicio A" },
    });
    agregarLineaParametro("p1", 3); // 10 * 3 = 30
    fireEvent.click(screen.getByText("Calcular"));

    expect(document.querySelector(".lp-precio-total").textContent).toContain(
      "S/ 30.00"
    );
    expect(document.querySelectorAll(".lp-subtotal")).toHaveLength(1);
  });

  it("Guardar producto válido llama onGuardar y limpia el formulario", () => {
    const onGuardar = montar();
    fireEvent.change(document.querySelector(".lp-calc-nombre"), {
      target: { value: "Servicio A" },
    });
    agregarLineaParametro("p1", 2);
    fireEvent.click(screen.getByText("Guardar"));

    expect(onGuardar).toHaveBeenCalledTimes(1);
    const [nombre, lineas] = onGuardar.mock.calls[0];
    expect(nombre).toBe("Servicio A");
    expect(lineas).toHaveLength(1);

    // Formulario limpio: nombre vacío, sin líneas, sin resultado.
    expect(document.querySelector(".lp-calc-nombre").value).toBe("");
    expect(document.querySelector(".lp-linea-cantidad")).toBeNull();
    expect(document.querySelector(".lp-precio-total")).toBeNull();
  });
});
