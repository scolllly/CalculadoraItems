import { describe, it, expect } from "vitest";
import {
  redondear2,
  subtotalLinea,
  precioTotal,
  calcularProducto,
} from "../lib/calculo.js";

describe("redondear2", () => {
  it("works", () => {
    expect(redondear2(1.5)).toBe(1.5);
  });
});
