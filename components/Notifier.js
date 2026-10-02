"use client";

// components/Notifier.js — Renderiza la pila de alertas Bootstrap.
//
// Las alertas `info` desaparecen a los 5000 ms; las `error` permanecen hasta
// que el usuario las cierra.
//
// Requisitos: 10.1, 10.2, 10.3

import { useEffect } from "react";
import { useNotifier } from "./NotifierContext.js";

const AUTO_CIERRE_MS = 5000;

/**
 * Una alerta individual. Programa su auto-cierre si es de tipo `info`.
 * @param {{ notificacion: object, onCerrar: Function }} props
 */
function Alerta({ notificacion, onCerrar }) {
  const { id, type, message } = notificacion;

  useEffect(() => {
    if (type !== "info") return undefined;
    const t = setTimeout(() => onCerrar(id), AUTO_CIERRE_MS);
    return () => clearTimeout(t);
  }, [id, type, onCerrar]);

  const clase = type === "error" ? "alert-danger" : "alert-info";

  return (
    <div
      className={`alert ${clase} alert-dismissible d-flex align-items-center`}
      role="alert"
      aria-live="polite"
    >
      <span className="flex-grow-1">{message}</span>
      <button
        type="button"
        className="btn-close"
        aria-label="Cerrar"
        onClick={() => onCerrar(id)}
      ></button>
    </div>
  );
}

/**
 * Pila de alertas fija en la parte superior de la página.
 */
export function Notifier() {
  const notifier = useNotifier();
  if (!notifier) return null;

  const { notificaciones, quitar } = notifier;

  return (
    <div
      className="lp-notificaciones position-fixed top-0 start-50 translate-middle-x p-3"
      style={{ zIndex: 1080, maxWidth: "480px", width: "100%" }}
      aria-live="polite"
    >
      {notificaciones.map((n) => (
        <Alerta key={n.id} notificacion={n} onCerrar={quitar} />
      ))}
    </div>
  );
}

export default Notifier;
