// tests/EditorDeLineas.test.js — Comportamiento del editor de líneas.
//
// Requisitos: 11.3

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React, { useState } from "react";
import EditorDeLineas from "../components/productos/EditorDeLineas.js";
import { FUENTE_COMPONENTE, crearLinea } from "../lib/models.js";

const PARAMETROS = [
  { id: "p1", nombre: "Mano de obra", precioUnitario: 10, unidad: "HORA" },
];
const PRODUCTOS = [
  { id: "x1", nombre: "Compuesto A", lineas: [], precioTotal: 0, unidad: "UND" },
  { id: "x2", nombre: "Compuesto B", lineas: [], precioTotal: 0, unidad: "UND" },
];

afterEach(cleanup);

// Wrapper controlado que mantiene el estado de las líneas.
function Harness({ inicial = [], idProductoContenedor = null, productos = PRODUCTOS }) {
  const [lineas, setLineas] = useState(inicial);
  return (
    <EditorDeLineas
      lineas={lineas}
      onChange={setLineas}
      parametros={PARAMETROS}
      productos={productos}
      idProductoContenedor={idProductoContenedor}
    />
  );
}

describe("EditorDeLineas", () => {
  it("estado vacío muestra 'No hay líneas agregadas.'", () => {
    render(<Harness inicial={[]} />);
    expect(screen.getByText("No hay líneas agregadas.")).toBeInTheDocument();
  });

  it("agregar línea añade una fila", () => {
    render(<Harness inicial={[]} />);
    fireEvent.click(screen.getByText("Agregar línea"));
    expect(document.querySelectorAll(".lp-linea")).toHaveLength(1);
  });

  it("eliminar línea quita la fila", () => {
    render(<Harness inicial={[crearLinea("p1", 2)]} />);
    expect(document.querySelectorAll(".lp-linea")).toHaveLength(1);
    fireEvent.click(screen.getByLabelText("Eliminar línea"));
    expect(document.querySelectorAll(".lp-linea")).toHaveLength(0);
  });

  it("cambiar fuente de Parámetro a Producto actualiza el selector de componente", () => {
    render(<Harness inicial={[crearLinea()]} />);
    const fuente = document.querySelector(".lp-linea-fuente");
    fireEvent.change(fuente, {
      target: { value: FUENTE_COMPONENTE.PRODUCTO },
    });
    // Ahora el selector de componente lista Productos (Compuesto A/B).
    const componente = document.querySelector(".lp-linea-componente");
    const opciones = Array.from(componente.querySelectorAll("option")).map(
      (o) => o.textContent
    );
    expect(opciones).toContain("Compuesto A");
    expect(opciones).toContain("Compuesto B");
  });

  it("idProductoContenedor excluye el producto de la lista de componentes", () => {
    render(
      <Harness
        inicial={[
          {
            ...crearLinea(null, 1, FUENTE_COMPONENTE.PRODUCTO, null),
          },
        ]}
        idProductoContenedor="x1"
      />
    );
    const componente = document.querySelector(".lp-linea-componente");
    const opciones = Array.from(componente.querySelectorAll("option")).map(
      (o) => o.textContent
    );
    expect(opciones).not.toContain("Compuesto A"); // x1 excluido
    expect(opciones).toContain("Compuesto B");
  });
});
