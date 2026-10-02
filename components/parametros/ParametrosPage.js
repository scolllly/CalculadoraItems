"use client";

// components/parametros/ParametrosPage.js — Página completa de Parámetros.
//
// Requisitos: 5.1–5.11

import { useContext, useState } from "react";
import { AppContext } from "../AppProvider.js";
import { useNotifier } from "../NotifierContext.js";
import {
  validarNombreParametro,
  validarPrecioUnitario,
  validarUnidad,
} from "../../lib/validation.js";
import { crearParametro } from "../../lib/models.js";
import { formatearPEN } from "../../lib/currency.js";

export function ParametrosPage() {
  const ctx = useContext(AppContext);
  const notifier = useNotifier();

  const [nombre, setNombre] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [unidad, setUnidad] = useState("");
  const [idEnEdicion, setIdEnEdicion] = useState(null);
  const [error, setError] = useState(null);

  if (!ctx) return null;
  const {
    parametros,
    productos,
    saveAll,
    calculadoraLineas,
    setCalculadoraLineas,
  } = ctx;

  const notificar = (type, message) => {
    if (notifier) notifier.dispatch({ type, message });
  };

  const limpiar = () => {
    setNombre("");
    setPrecioUnitario("");
    setUnidad("");
    setIdEnEdicion(null);
    setError(null);
  };

  const contarReferencias = (parametroId) => {
    const lineas = Array.isArray(calculadoraLineas) ? calculadoraLineas : [];
    return lineas.filter((l) => l && l.parametroId === parametroId).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const precioNumerico = Number(precioUnitario);

    const vNombre = validarNombreParametro(nombre, parametros, idEnEdicion);
    if (!vNombre.valido) {
      setError(vNombre.mensaje);
      return;
    }
    const vPrecio = validarPrecioUnitario(precioNumerico);
    if (!vPrecio.valido) {
      setError(vPrecio.mensaje);
      return;
    }
    const vUnidad = validarUnidad(unidad);
    if (!vUnidad.valido) {
      setError(vUnidad.mensaje);
      return;
    }
    setError(null);

    let nuevos;
    if (idEnEdicion) {
      nuevos = parametros.map((p) =>
        p.id === idEnEdicion
          ? { ...p, nombre: nombre.trim(), precioUnitario: precioNumerico, unidad }
          : p
      );
    } else {
      nuevos = [...parametros, crearParametro(nombre.trim(), precioNumerico, unidad)];
    }

    const ok = await saveAll({ parametros: nuevos, productos });
    notificar(
      ok ? "info" : "error",
      ok ? "Parámetro guardado correctamente." : "No se pudo guardar el parámetro."
    );
    if (ok) limpiar();
  };

  const handleEditar = (parametro) => {
    setNombre(parametro.nombre);
    setPrecioUnitario(String(parametro.precioUnitario));
    setUnidad(parametro.unidad);
    setIdEnEdicion(parametro.id);
    setError(null);
  };

  const handleEliminar = async (parametroId) => {
    const referencias = contarReferencias(parametroId);

    if (referencias > 0) {
      const mensaje =
        `Este parámetro está referenciado en ${referencias} línea(s) de la ` +
        `calculadora. Si continúas, esas líneas quedarán sin parámetro. ` +
        `¿Deseas continuar?`;
      if (typeof window !== "undefined" && !window.confirm(mensaje)) {
        return;
      }
      // Desreferenciar las líneas afectadas en la calculadora.
      if (setCalculadoraLineas) {
        setCalculadoraLineas((lineas) =>
          (Array.isArray(lineas) ? lineas : []).map((l) =>
            l && l.parametroId === parametroId ? { ...l, parametroId: null } : l
          )
        );
      }
    }

    const nuevos = parametros.filter((p) => p.id !== parametroId);
    const ok = await saveAll({ parametros: nuevos, productos });
    notificar(
      ok ? "info" : "error",
      ok ? "Parámetro eliminado correctamente." : "No se pudo eliminar el parámetro."
    );
    if (ok && idEnEdicion === parametroId) limpiar();
  };

  return (
    <main className="container py-3 lp-pagina-parametros">
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <h2 className="h5">
            {idEnEdicion ? "Editar parámetro" : "Nuevo parámetro"}
          </h2>

          {error && (
            <div className="alert alert-danger lp-param-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="lp-param-form">
            <div className="mb-3">
              <label className="form-label" htmlFor="lp-param-nombre">
                Nombre
              </label>
              <input
                id="lp-param-nombre"
                type="text"
                maxLength={100}
                className="form-control lp-param-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="lp-param-precio">
                Precio unitario
              </label>
              <input
                id="lp-param-precio"
                type="number"
                step="0.01"
                min="0"
                className="form-control lp-param-precio"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="lp-param-unidad">
                Unidad
              </label>
              <input
                id="lp-param-unidad"
                type="text"
                maxLength={20}
                className="form-control lp-param-unidad"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
              />
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary lp-param-guardar">
                Guardar
              </button>
              {idEnEdicion && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={limpiar}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="col-12 col-lg-7">
          <h2 className="h5">Parámetros</h2>
          {parametros.length === 0 ? (
            <p className="text-muted">No hay parámetros guardados.</p>
          ) : (
            <ul className="list-group lp-lista-parametros">
              {parametros.map((p) => (
                <li
                  key={p.id}
                  className="list-group-item d-flex justify-content-between align-items-center lp-parametro"
                >
                  <span>
                    <span className="fw-semibold lp-parametro-nombre">
                      {p.nombre}
                    </span>{" "}
                    <span className="badge bg-success rounded-pill">
                      {formatearPEN(p.precioUnitario)}
                    </span>{" "}
                    <span className="text-muted">{p.unidad}</span>
                  </span>
                  <span className="btn-group">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm lp-parametro-editar"
                      aria-label="Editar"
                      onClick={() => handleEditar(p)}
                    >
                      <i className="bi bi-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm lp-parametro-eliminar"
                      aria-label="Eliminar"
                      onClick={() => handleEliminar(p.id)}
                    >
                      <i className="bi bi-trash" aria-hidden="true"></i>
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

export default ParametrosPage;
