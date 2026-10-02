// components/productos/mensajesProducto.js — Mensajes de validación de la UI de
// Productos y helpers de validación de líneas en edición.
//
// Replica los mensajes exactos y el orden de validación del controlador de
// Productos original (Calculadora y Ventana_Edicion): sin líneas → SIN_LINEAS;
// cantidad inválida → CANTIDAD_INVALIDA; línea sin parámetro → SIN_PARAMETRO.
//
// Requisitos: 6.4–6.11, 7.4, 7.5, 7.8, 7.9

import { FUENTE_COMPONENTE } from "../../lib/models.js";
import { validarCantidad } from "../../lib/validation.js";

export const MENSAJES = {
  SIN_LINEAS: "Se debe agregar al menos un parámetro.",
  CANTIDAD_INVALIDA:
    "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99.",
  SIN_PARAMETRO: "Cada línea debe tener un parámetro seleccionado.",
};

/**
 * Convierte una cantidad cruda (number o string) a número con la misma
 * semántica que `aNumeroCantidad` del dominio: number passthrough; string con
 * trim; cadena vacía o no finita → NaN; no-string → NaN.
 * @param {unknown} valor
 * @returns {number}
 */
export function aNumeroCantidad(valor) {
  if (typeof valor === "number") return valor;
  if (typeof valor !== "string") return NaN;
  const recortado = valor.trim();
  if (recortado === "") return NaN;
  const n = Number(recortado);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Valida las líneas en edición en el mismo orden que la Calculadora y la
 * Ventana_Edicion. Devuelve `{ valido: true }` o
 * `{ valido: false, mensaje }` con el primer mensaje aplicable.
 *
 *  1. Sin líneas → SIN_LINEAS.
 *  2. Alguna cantidad inválida → CANTIDAD_INVALIDA.
 *  3. Alguna Linea_De_Parametro sin parámetro, o Linea_De_Producto sin
 *     componente → SIN_PARAMETRO.
 *
 * @param {object[]} lineas
 * @returns {{ valido: true } | { valido: false, mensaje: string }}
 */
export function validarLineasEnEdicion(lineas) {
  const lista = Array.isArray(lineas) ? lineas : [];

  if (lista.length === 0) {
    return { valido: false, mensaje: MENSAJES.SIN_LINEAS };
  }

  for (const linea of lista) {
    const cantidad = aNumeroCantidad(linea == null ? null : linea.cantidad);
    if (!validarCantidad(cantidad).valido) {
      return { valido: false, mensaje: MENSAJES.CANTIDAD_INVALIDA };
    }
  }

  for (const linea of lista) {
    const origen = linea || {};
    const esProducto =
      origen.fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO;
    const referencia = esProducto
      ? origen.productoComponenteId
      : origen.parametroId;
    if (referencia == null) {
      return { valido: false, mensaje: MENSAJES.SIN_PARAMETRO };
    }
  }

  return { valido: true };
}
