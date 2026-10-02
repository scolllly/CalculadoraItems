"use client";

// components/productos/VentanaEdicion.js — Modal de edición de líneas.
//
// Requisitos: 7.4, 7.5, 7.8, 7.9

import { useEffect, useState } from "react";
import EditorDeLineas from "./EditorDeLineas.js";
import { validarLineasEnEdicion } from "./mensajesProducto.js";

/**
 * Deep-copy simple de las líneas de un producto para edición local.
 * @param {object} producto
 * @returns {object[]}
 */
function copiarLineas(producto) {
  if (!producto || !Array.isArray(producto.lineas)) return [];
  return producto.lineas.map((l) => ({ ...l }));
}

/**
 * @param {{
 *  producto: object|null,
 *  parametros: object[],
 *  productos: object[],
 *  onGuardar: Function,
 *  onClose: Function
 * }} props
 */
export function VentanaEdicion({
  producto,
  parametros,
  productos,
  onGuardar,
  onClose,
}) {
  const [lineas, setLineas] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLineas(copiarLineas(producto));
    setError(null);
  }, [producto]);

  if (!producto) return null;

  const guardar = () => {
    const validacion = validarLineasEnEdicion(lineas);
    if (!validacion.valido) {
      setError(validacion.mensaje);
      return;
    }
    setError(null);
    onGuardar(producto.id, lineas);
  };

  return (
    <div
      className="modal d-block lp-ventana-edicion"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Editar producto</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={() => onClose()}
            ></button>
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Nombre del producto</label>
              <input
                type="text"
                className="form-control lp-edicion-nombre"
                value={producto.nombre}
                readOnly
              />
            </div>

            {error && (
              <div className="alert alert-danger lp-edicion-error" role="alert">
                {error}
              </div>
            )}

            <EditorDeLineas
              lineas={lineas}
              onChange={setLineas}
              parametros={parametros}
              productos={productos}
              idProductoContenedor={producto.id}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onClose()}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary lp-edicion-guardar"
              onClick={guardar}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VentanaEdicion;
