// tests/helpers/providers.js — Wrappers de contexto para pruebas de componentes.

import React from "react";
import { AppContext } from "../../components/AppProvider.js";
import { NotifierContext } from "../../components/NotifierContext.js";

/**
 * Crea un valor de AppContext mínimo con overrides.
 * @param {object} overrides
 * @returns {object}
 */
export function crearAppContext(overrides = {}) {
  return {
    parametros: [],
    productos: [],
    loading: false,
    error: null,
    calculadoraLineas: [],
    setParametros: () => {},
    setProductos: () => {},
    setCalculadoraLineas: () => {},
    saveAll: async () => true,
    recargarDatos: async () => {},
    supabase: undefined,
    ...overrides,
  };
}

/**
 * Crea un valor de NotifierContext que registra los dispatch.
 * @param {object[]} registro Array donde se acumulan las notificaciones.
 * @returns {object}
 */
export function crearNotifierContext(registro = []) {
  return {
    notificaciones: [],
    dispatch: (n) => {
      registro.push(n);
    },
    quitar: () => {},
  };
}

/**
 * Envuelve `children` con AppContext y NotifierContext.
 * @param {{ app?: object, notifierRegistro?: object[], children: React.ReactNode }} props
 */
export function Providers({ app, notifierRegistro, children }) {
  const appValor = app || crearAppContext();
  const notifValor = crearNotifierContext(notifierRegistro || []);
  return (
    <AppContext.Provider value={appValor}>
      <NotifierContext.Provider value={notifValor}>
        {children}
      </NotifierContext.Provider>
    </AppContext.Provider>
  );
}
