"use client";

// components/productos/Calculadora.js — Formulario de cálculo y guardado.
//
// Requisitos: 6.3–6.11

import { useState } from "react";
import EditorDeLineas from "./EditorDeLineas.js";
import { validarLineasEnEdicion } from "./mensajesProducto.js";
import { validarNombreProducto } from "../../lib/validation.js";
import { calcularContenedor } from "../../lib/productos.ops.js";
import { formatearPEN } from "../../lib/currency.js";
import { FUENTE_COMPONENTE } from "../../lib/models.js";

/**
 * Normaliza las líneas crudas del editor a líneas con cantidad numérica para el
 * cálculo (deja intactas las referencias).
 * @param {object[]} lineas
 * @returns {object[]}
 */
function lineasNumericas(lineas) {
  return lineas.map((l) => ({
    ...l,
    cantidad: typeof l.cantidad === "string" ? Number(l.cantidad) : l.cantidad,
  }));
}

/**
 * Etiqueta de cada subtotal (nombre del componente).
 * @param {object} linea
 * @param {object[]} parametros
 * @param {object[]} productos
 * @returns {string}
 */
function nombreComponente(linea, parametros, productos) {
  if (linea.fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO) {
    const p = productos.find((x) => x.id === linea.productoComponenteId);
    return p ? p.nombre : "Producto no disponible";
  }
  const p = parametros.find((x) => x.id === linea.parametroId);
  return p ? p.nombre : "Parámetro no disponible";
}

/**
 * @param {{
 *  parametros: object[],
 *  productos: object[],
 *  onGuardar: Function
 * }} props
 */
export function Calculadora({ parametros, productos, onGuardar }) {
  const [nombre, setNombre] = useState("");
  const [lineas, setLineas] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const validar = () => {
    const vNombre = validarNombreProducto(nombre);
    if (!vNombre.valido) {
      setError(vNombre.mensaje);
      return false;
    }
    const vLineas = validarLineasEnEdicion(lineas);
    if (!vLineas.valido) {
      setError(vLineas.mensaje);
      return false;
    }
    setError(null);
    return true;
  };

  const calcular = () => {
    if (!validar()) {
      setResultado(null);
      return;
    }
    const calc = calcularContenedor(
      lineasNumericas(lineas),
      parametros,
      productos
    );
    setResultado(calc);
  };

  const guardar = () => {
    if (!validar()) return;
    onGuardar(nombre, lineasNumericas(lineas));
    // Reiniciar el formulario.
    setNombre("");
    setLineas([]);
    setResultado(null);
    setError(null);
  };

  return (
    <section className="lp-calculadora">
      <h2 className="h5">Calculadora</h2>

      {error && (
        <div className="alert alert-danger lp-calc-error" role="alert">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="lp-calc-nombre">
          Nombre del producto
        </label>
        <input
          id="lp-calc-nombre"
          type="text"
          maxLength={100}
          className="form-control lp-calc-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <EditorDeLineas
        lineas={lineas}
        onChange={setLineas}
        parametros={parametros}
        productos={productos}
      />

      <div className="d-flex gap-2 mt-3">
        <button
          type="button"
          className="btn btn-outline-primary lp-calc-calcular"
          onClick={calcular}
        >
          Calcular
        </button>
        <button
          type="button"
          className="btn btn-primary lp-calc-guardar"
          onClick={guardar}
        >
          Guardar
        </button>
      </div>

      {resultado && (
        <div className="lp-calc-resultado mt-3">
          <ul className="list-group">
            {resultado.subtotales.map((s, i) => (
              <li
                className="list-group-item d-flex justify-content-between lp-subtotal"
                key={i}
              >
                <span>{nombreComponente(lineas[i], parametros, productos)}</span>
                <span>{formatearPEN(s)}</span>
              </li>
            ))}
          </ul>
          <div className="d-flex justify-content-between mt-2">
            <strong>Precio total</strong>
            <strong className="lp-precio-total">
              {formatearPEN(resultado.total)}
            </strong>
          </div>
        </div>
      )}
    </section>
  );
}

export default Calculadora;
