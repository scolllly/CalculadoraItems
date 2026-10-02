"use client";

// components/productos/EditorDeLineas.js — Editor controlado de líneas de cálculo.
//
// Renderiza una fila por línea: selector de Fuente (Parámetro/Producto),
// selector de Componente, cantidad, unidad derivada y botón eliminar.
//
// Requisitos: 6.3, 7.9

import {
  FUENTE_COMPONENTE,
  crearLinea,
} from "../../lib/models.js";
import {
  NOMBRE_PRODUCTO_COMPONENTE_AUSENTE,
  UNIDAD_DE_REEMPLAZO,
} from "../../lib/productos.ops.js";

/**
 * Deriva la unidad a mostrar para una línea según su fuente y componente.
 * @param {object} linea
 * @param {object[]} parametros
 * @param {object[]} productos
 * @returns {string}
 */
function unidadDeLinea(linea, parametros, productos) {
  if (linea.fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO) {
    const comp = productos.find((p) => p.id === linea.productoComponenteId);
    if (!comp) return "";
    return comp.unidad == null || comp.unidad === ""
      ? UNIDAD_DE_REEMPLAZO
      : comp.unidad;
  }
  const param = parametros.find((p) => p.id === linea.parametroId);
  return param ? param.unidad : "";
}

/**
 * @param {{
 *  lineas: object[],
 *  onChange: Function,
 *  parametros: object[],
 *  productos: object[],
 *  idProductoContenedor?: string|null
 * }} props
 */
export function EditorDeLineas({
  lineas,
  onChange,
  parametros,
  productos,
  idProductoContenedor = null,
}) {
  const listaParametros = Array.isArray(parametros) ? parametros : [];
  const listaProductos = Array.isArray(productos) ? productos : [];
  const listaLineas = Array.isArray(lineas) ? lineas : [];

  // Productos candidatos como componente: todos menos el contenedor.
  const productosComponente = listaProductos.filter(
    (p) => p.id !== idProductoContenedor
  );

  const actualizarLinea = (indice, cambios) => {
    const nuevas = listaLineas.map((l, i) =>
      i === indice ? { ...l, ...cambios } : l
    );
    onChange(nuevas);
  };

  const cambiarFuente = (indice, fuente) => {
    // Al cambiar la fuente, se reinicia la referencia del componente.
    actualizarLinea(indice, {
      fuenteDeComponente: fuente,
      parametroId: null,
      productoComponenteId: null,
    });
  };

  const cambiarComponente = (indice, valor) => {
    const linea = listaLineas[indice];
    if (linea.fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO) {
      actualizarLinea(indice, { productoComponenteId: valor || null });
    } else {
      actualizarLinea(indice, { parametroId: valor || null });
    }
  };

  const cambiarCantidad = (indice, valor) => {
    actualizarLinea(indice, { cantidad: valor });
  };

  const eliminarLinea = (indice) => {
    onChange(listaLineas.filter((_, i) => i !== indice));
  };

  const agregarLinea = () => {
    onChange([...listaLineas, crearLinea()]);
  };

  return (
    <div className="lp-editor-lineas">
      {listaLineas.length === 0 ? (
        <p className="text-muted lp-sin-lineas">No hay líneas agregadas.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {listaLineas.map((linea, indice) => {
            const esProducto =
              linea.fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO;
            const valorComponente = esProducto
              ? linea.productoComponenteId || ""
              : linea.parametroId || "";
            const unidad = unidadDeLinea(linea, listaParametros, listaProductos);

            // Referencia colgante a un producto componente eliminado.
            const refColgante =
              esProducto &&
              linea.productoComponenteId &&
              !productosComponente.some(
                (p) => p.id === linea.productoComponenteId
              );

            return (
              <div
                className="lp-linea row g-2 align-items-center"
                key={indice}
              >
                <div className="col-auto">
                  <select
                    className="form-select lp-linea-fuente"
                    aria-label="Fuente del componente"
                    value={linea.fuenteDeComponente}
                    onChange={(e) => cambiarFuente(indice, e.target.value)}
                  >
                    <option value={FUENTE_COMPONENTE.PARAMETRO}>
                      {FUENTE_COMPONENTE.PARAMETRO}
                    </option>
                    <option value={FUENTE_COMPONENTE.PRODUCTO}>
                      {FUENTE_COMPONENTE.PRODUCTO}
                    </option>
                  </select>
                </div>

                <div className="col">
                  <select
                    className="form-select lp-linea-componente"
                    aria-label="Componente"
                    value={valorComponente}
                    onChange={(e) =>
                      cambiarComponente(indice, e.target.value)
                    }
                  >
                    <option value="">
                      {refColgante
                        ? NOMBRE_PRODUCTO_COMPONENTE_AUSENTE
                        : "Seleccionar…"}
                    </option>
                    {esProducto
                      ? productosComponente.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))
                      : listaParametros.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="col-auto">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-control lp-linea-cantidad"
                    aria-label="Cantidad"
                    value={linea.cantidad == null ? "" : linea.cantidad}
                    onChange={(e) => cambiarCantidad(indice, e.target.value)}
                  />
                </div>

                <div className="col-auto">
                  <span className="lp-linea-unidad text-muted">{unidad}</span>
                </div>

                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm lp-linea-eliminar"
                    aria-label="Eliminar línea"
                    onClick={() => eliminarLinea(indice)}
                  >
                    <i className="bi bi-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="btn btn-outline-primary btn-sm mt-2 lp-agregar-linea"
        onClick={agregarLinea}
      >
        Agregar línea
      </button>
    </div>
  );
}

export default EditorDeLineas;
