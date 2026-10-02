"use client";

// components/NotifierContext.js — Contexto y reducer de notificaciones.
//
// Gestiona una pila de notificaciones `{ type: 'info'|'error', message }`.
//
// Requisitos: 10.1

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";

export const NotifierContext = createContext(null);

let contadorId = 0;
function siguienteId() {
  contadorId += 1;
  return "notif-" + contadorId;
}

function reducer(estado, accion) {
  switch (accion.type) {
    case "agregar":
      return [...estado, accion.notificacion];
    case "quitar":
      return estado.filter((n) => n.id !== accion.id);
    default:
      return estado;
  }
}

/**
 * Proveedor de notificaciones. Expone `dispatch({ type, message })` y la lista
 * de notificaciones activas, además de `quitar(id)`.
 * @param {{ children: React.ReactNode }} props
 */
export function NotifierProvider({ children }) {
  const [notificaciones, enviar] = useReducer(reducer, []);

  const dispatch = useCallback(({ type, message }) => {
    const id = siguienteId();
    enviar({
      type: "agregar",
      notificacion: { id, type: type === "error" ? "error" : "info", message },
    });
    return id;
  }, []);

  const quitar = useCallback((id) => {
    enviar({ type: "quitar", id });
  }, []);

  const valor = useMemo(
    () => ({ notificaciones, dispatch, quitar }),
    [notificaciones, dispatch, quitar]
  );

  return (
    <NotifierContext.Provider value={valor}>
      {children}
    </NotifierContext.Provider>
  );
}

/**
 * Atajo a `useContext(NotifierContext)`.
 * @returns {{ notificaciones: object[], dispatch: Function, quitar: Function }}
 */
export function useNotifier() {
  return useContext(NotifierContext);
}

export default NotifierProvider;
