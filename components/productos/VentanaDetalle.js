"use client";

// components/productos/VentanaDetalle.js — Modal de solo lectura del detalle.
//
// Requisitos: 7.1, 7.2, 7.3

import { resolverDetalle } from "../../lib/productos.ops.js";
import { formatearPEN } from "../../lib/currency.js";

/**
 * @param {{
 *  producto: object|null,
 *  parametros: object[],
 *  productos: object[],
 *  onClose: Function
 * }} props
 */
export function VentanaDetalle({ producto, parametros, productos, onClose }) {
  if (!producto) return null;

  const detalle = resolverDetalle(producto, parametros, productos);

  return (
    <div
      className="modal d-block lp-ventana-detalle"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{producto.nombre}</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={() => onClose()}
            ></button>
          </div>

          <div className="modal-body">
            {detalle.lineas.length === 0 ? (
              <p className="text-muted">
                Este producto no tiene líneas de cálculo.
              </p>
            ) : (
              <ul className="list-group lp-detalle-lineas">
                {detalle.lineas.map((linea, i) => (
                  <li
                    className="list-group-item d-flex justify-content-between align-items-center"
                    key={i}
                  >
                    <span>
                      {linea.nombreParametro}
                      {!linea.ausente && (
                        <span className="text-muted">
                          {" "}
                          — {linea.cantidad} {linea.unidad}
                        </span>
                      )}
                    </span>
                    <span className="badge bg-secondary">
                      {formatearPEN(linea.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-footer d-flex justify-content-between">
            <strong className="lp-detalle-total">
              {formatearPEN(detalle.precioTotal)}
            </strong>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onClose()}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VentanaDetalle;
