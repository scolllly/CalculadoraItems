"use client";

// components/productos/ListaProductos.js — Lista con pestañas compuestos/simples.
//
// Requisitos: 6.1, 6.2, 6.12, 6.13, 6.14

import { useState } from "react";
import { redondear2 } from "../../lib/calculo.js";
import { formatearPEN } from "../../lib/currency.js";

const DIVISOR_DE_SUGERIDO = 0.7;
const MULTIPLO_DE_REDONDEO = 5;

const collator = new Intl.Collator("es", { sensitivity: "base" });

/**
 * Precio_Sugerido = redondear2(precioTotal / 0.70), protegido contra entradas
 * no finitas/negativas.
 * @param {number} precioTotal
 * @returns {number}
 */
function calcularPrecioSugerido(precioTotal) {
  const base =
    Number.isFinite(precioTotal) && precioTotal >= 0 ? precioTotal : 0;
  const sugerido = redondear2(base / DIVISOR_DE_SUGERIDO);
  return Number.isFinite(sugerido) ? sugerido : 0;
}

/**
 * Precio_Redondeado = menor múltiplo de 5 mayor o igual al Precio_Sugerido.
 * @param {number} precioSugerido
 * @returns {number}
 */
function calcularPrecioRedondeado(precioSugerido) {
  if (!Number.isFinite(precioSugerido) || precioSugerido < 0) return 0;
  return (
    Math.ceil(redondear2(precioSugerido / MULTIPLO_DE_REDONDEO)) *
    MULTIPLO_DE_REDONDEO
  );
}

/**
 * Particiona y ordena una lista de productos por nombre según la dirección.
 * @param {object[]} productos
 * @param {"asc"|"desc"} direccion
 * @returns {{ compuestos: object[], simples: object[] }}
 */
export function particionarYOrdenar(productos, direccion) {
  const lista = Array.isArray(productos) ? productos : [];
  const compuestos = lista.filter((p) => p.compuesto === true);
  const simples = lista.filter((p) => p.compuesto !== true);
  const signo = direccion === "desc" ? -1 : 1;
  const ordenar = (a, b) => signo * collator.compare(a.nombre, b.nombre);
  return {
    compuestos: [...compuestos].sort(ordenar),
    simples: [...simples].sort(ordenar),
  };
}

/**
 * Tarjeta de un producto con badges y botones de acción.
 */
function TarjetaProducto({ producto, onVerDetalle, onEditar, onEliminar }) {
  const sugerido = calcularPrecioSugerido(producto.precioTotal);
  const redondeado = calcularPrecioRedondeado(sugerido);

  return (
    <li className="list-group-item lp-producto d-flex justify-content-between align-items-center">
      <div className="d-flex flex-column">
        <span className="lp-producto-nombre fw-semibold">
          {producto.nombre}
        </span>
        <span>
          <span className="badge bg-success rounded-pill lp-producto-precio me-1">
            {formatearPEN(producto.precioTotal)}
          </span>
          <span className="badge bg-light text-dark rounded-pill lp-producto-sugerido">
            {formatearPEN(sugerido)} {"->"} {formatearPEN(redondeado)}
          </span>
        </span>
      </div>
      <div className="btn-group" role="group">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm lp-producto-detalle"
          aria-label="Ver detalle"
          onClick={() => onVerDetalle(producto)}
        >
          <i className="bi bi-eye" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm lp-producto-editar"
          aria-label="Editar"
          onClick={() => onEditar(producto)}
        >
          <i className="bi bi-pencil" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm lp-producto-eliminar"
          aria-label="Eliminar"
          onClick={() => onEliminar(producto.id)}
        >
          <i className="bi bi-trash" aria-hidden="true"></i>
        </button>
      </div>
    </li>
  );
}

/**
 * @param {{
 *  productos: object[],
 *  parametros: object[],
 *  direccionOrden: "asc"|"desc",
 *  onToggleOrden: Function,
 *  onVerDetalle: Function,
 *  onEditar: Function,
 *  onEliminar: Function
 * }} props
 */
export function ListaProductos({
  productos,
  direccionOrden = "asc",
  onToggleOrden,
  onVerDetalle,
  onEditar,
  onEliminar,
}) {
  const [tab, setTab] = useState("compuestos");
  const lista = Array.isArray(productos) ? productos : [];
  const { compuestos, simples } = particionarYOrdenar(lista, direccionOrden);

  if (lista.length === 0) {
    return <p className="text-muted">No hay productos guardados.</p>;
  }

  const grupo = tab === "compuestos" ? compuestos : simples;
  const vacioMsg =
    tab === "compuestos"
      ? "No hay productos compuestos."
      : "No hay productos simples.";

  const siguienteDireccion = direccionOrden === "asc" ? "descendente" : "ascendente";

  return (
    <section className="lp-lista-productos">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              type="button"
              className={"nav-link" + (tab === "compuestos" ? " active" : "")}
              onClick={() => setTab("compuestos")}
            >
              Compuestos
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={"nav-link" + (tab === "simples" ? " active" : "")}
              onClick={() => setTab("simples")}
            >
              Simples
            </button>
          </li>
        </ul>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm lp-orden"
          aria-label={`Ordenar de forma ${siguienteDireccion}`}
          onClick={() => onToggleOrden && onToggleOrden()}
        >
          <i
            className={
              "bi " +
              (direccionOrden === "asc"
                ? "bi-sort-alpha-down"
                : "bi-sort-alpha-up")
            }
            aria-hidden="true"
          ></i>
        </button>
      </div>

      {grupo.length === 0 ? (
        <p className="text-muted">{vacioMsg}</p>
      ) : (
        <ul className="list-group">
          {grupo.map((producto) => (
            <TarjetaProducto
              key={producto.id}
              producto={producto}
              onVerDetalle={onVerDetalle}
              onEditar={onEditar}
              onEliminar={onEliminar}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default ListaProductos;
