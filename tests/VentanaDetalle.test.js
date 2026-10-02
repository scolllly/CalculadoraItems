// tests/VentanaDetalle.test.js — Pruebas de la Ventana_Detalle (solo lectura).
//
// Migra los escenarios de old/tests/ventana.detalle.test.js a React.
//
// Requisitos: 11.3

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import VentanaDetalle from "../components/productos/VentanaDetalle.js";
import { FUENTE_COMPONENTE } from "../lib/models.js";

const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
  { id: "p2", nombre: "Material", precioUnitario: 5, unidad: "UND" },
];

afterEach(cleanup);

describe("VentanaDetalle", () => {
  it("producto con líneas: muestra nombre, componentes, unidades y subtotales en PEN", () => {
    const producto = {
      id: "prod-1",
      nombre: "Servicio básico",
      lineas: [
        { parametroId: "p1", cantidad: 2, subtotal: 20 },
        { parametroId: "p2", cantidad: 4, subtotal: 20 },
      ],
      precioTotal: 40,
    };
    render(
      <VentanaDetalle
        producto={producto}
        parametros={PARAMETROS}
        productos={[]}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Servicio básico")).toBeInTheDocument();
    expect(screen.getByText(/Mano de obra/)).toBeInTheDocument();
    expect(screen.getByText(/Material/)).toBeInTheDocument();
    // Dos subtotales de S/ 20.00 y un total de S/ 40.00.
    expect(screen.getAllByText("S/ 20.00")).toHaveLength(2);
    expect(
      document.querySelector(".lp-detalle-total").textContent
    ).toContain("S/ 40.00");
  });

  it("línea con Parametro ausente muestra NOMBRE_PARAMETRO_AUSENTE", () => {
    const producto = {
      id: "prod-x",
      nombre: "Con ausente",
      lineas: [{ parametroId: "no-existe", cantidad: 1, subtotal: 5 }],
      precioTotal: 5,
    };
    render(
      <VentanaDetalle
        producto={producto}
        parametros={PARAMETROS}
        productos={[]}
        onClose={() => {}}
      />
    );
    expect(screen.getByText("Parámetro no disponible")).toBeInTheDocument();
  });

  it("línea con Producto_Componente ausente muestra NOMBRE_PRODUCTO_COMPONENTE_AUSENTE", () => {
    const producto = {
      id: "prod-y",
      nombre: "Compuesto roto",
      lineas: [
        {
          fuenteDeComponente: FUENTE_COMPONENTE.PRODUCTO,
          productoComponenteId: "no-existe",
          cantidad: 1,
          subtotal: 7,
        },
      ],
      precioTotal: 7,
    };
    render(
      <VentanaDetalle
        producto={producto}
        parametros={PARAMETROS}
        productos={[]}
        onClose={() => {}}
      />
    );
    expect(screen.getByText("Producto no disponible")).toBeInTheDocument();
  });

  it("producto sin líneas muestra el mensaje correspondiente", () => {
    const producto = {
      id: "vacio",
      nombre: "Sin líneas",
      lineas: [],
      precioTotal: 0,
    };
    render(
      <VentanaDetalle
        producto={producto}
        parametros={PARAMETROS}
        productos={[]}
        onClose={() => {}}
      />
    );
    expect(
      screen.getByText("Este producto no tiene líneas de cálculo.")
    ).toBeInTheDocument();
  });

  it("es de solo lectura: sin inputs, selects ni controles de edición de líneas", () => {
    const producto = {
      id: "prod-1",
      nombre: "Servicio",
      lineas: [{ parametroId: "p1", cantidad: 2, subtotal: 20 }],
      precioTotal: 20,
    };
    render(
      <VentanaDetalle
        producto={producto}
        parametros={PARAMETROS}
        productos={[]}
        onClose={() => {}}
      />
    );
    expect(document.querySelector("input")).toBeNull();
    expect(document.querySelector("select")).toBeNull();
    expect(document.querySelector(".lp-agregar-linea")).toBeNull();
    expect(document.querySelector(".lp-linea-eliminar")).toBeNull();
  });

  it("no renderiza nada cuando producto es null", () => {
    const { container } = render(
      <VentanaDetalle
        producto={null}
        parametros={PARAMETROS}
        productos={[]}
        onClose={() => {}}
      />
    );
    expect(container.querySelector(".lp-ventana-detalle")).toBeNull();
  });
});
