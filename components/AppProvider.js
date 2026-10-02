"use client";

// components/AppProvider.js — Estado global del cliente y sincronización Realtime.
//
// Carga inicial de datos via GET /api/data, guardado optimista via PUT /api/data,
// y suscripciones Realtime a las tablas `params`, `products` y `product_rows`.
//
// Requisitos: 3.9, 3.10, 3.11, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8

import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createSupabaseClient } from "../lib/supabase.js";
import { normalizarProducto } from "../lib/models.js";

export const AppContext = createContext(null);

// Tiempo máximo de espera de la carga inicial antes de marcar error (Req 4.7).
const TIMEOUT_CARGA_MS = 10000;

/**
 * Normaliza la lista de Productos recibida del servidor aplicando
 * `normalizarProducto` a cada uno (Req 4.8).
 * @param {unknown} productos
 * @returns {object[]}
 */
function normalizarProductos(productos) {
  return Array.isArray(productos) ? productos.map(normalizarProducto) : [];
}

/**
 * Proveedor del estado global de la aplicación.
 * @param {{ children: React.ReactNode }} props
 */
export function AppProvider({ children }) {
  const [parametros, setParametros] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calculadoraLineas, setCalculadoraLineas] = useState([]);

  // Cliente Supabase memoizado para las suscripciones Realtime. Se crea una vez;
  // si las variables de entorno faltan, se deja en null y se omite Realtime.
  const supabaseRef = useRef(null);
  if (supabaseRef.current === null) {
    try {
      supabaseRef.current = createSupabaseClient();
    } catch {
      supabaseRef.current = undefined; // marcado como "no disponible"
    }
  }

  /**
   * Lee los datos desde la API y actualiza el estado global. Normaliza los
   * Productos recibidos.
   * @returns {Promise<void>}
   */
  const recargarDatos = useCallback(async () => {
    const respuesta = await fetch("/api/data");
    if (!respuesta.ok) {
      throw new Error("La API devolvió un estado no exitoso.");
    }
    const datos = await respuesta.json();
    setParametros(Array.isArray(datos.parametros) ? datos.parametros : []);
    setProductos(normalizarProductos(datos.productos));
  }, []);

  // Carga inicial con tope de tiempo (Req 4.2, 4.6, 4.7).
  useEffect(() => {
    let cancelado = false;
    const controlador =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const temporizador = setTimeout(() => {
      if (controlador) controlador.abort();
    }, TIMEOUT_CARGA_MS);

    (async () => {
      try {
        const respuesta = await fetch("/api/data", {
          signal: controlador ? controlador.signal : undefined,
        });
        if (!respuesta.ok) {
          throw new Error("La API devolvió un estado no exitoso.");
        }
        const datos = await respuesta.json();
        if (cancelado) return;
        setParametros(
          Array.isArray(datos.parametros) ? datos.parametros : []
        );
        setProductos(normalizarProductos(datos.productos));
      } catch (e) {
        if (!cancelado) {
          setError("No se pudieron cargar los datos.");
        }
      } finally {
        if (!cancelado) setLoading(false);
        clearTimeout(temporizador);
      }
    })();

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      if (controlador) controlador.abort();
    };
  }, []);

  // Suscripciones Realtime a las tres tablas (Req 3.9, 3.10, 3.11, 4.8).
  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return undefined;

    const alCambiar = () => {
      recargarDatos().catch(() => {
        setError("No se pudieron refrescar los datos en tiempo real.");
      });
    };

    const canal = supabase
      .channel("limpiapipas-datos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "params" },
        alCambiar
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        alCambiar
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_rows" },
        alCambiar
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [recargarDatos]);

  /**
   * Guarda la lista completa de Parametros y Productos con actualización
   * optimista y reversión en caso de fallo (Req 4.3, 4.4, 4.5).
   * @param {{ parametros: object[], productos: object[] }} datos
   * @returns {Promise<boolean>} true si se persistió, false si falló.
   */
  const saveAll = useCallback(
    async ({ parametros: nuevosParametros, productos: nuevosProductos }) => {
      const previoParametros = parametros;
      const previoProductos = productos;

      // Actualización optimista.
      setParametros(nuevosParametros);
      setProductos(nuevosProductos);

      try {
        const respuesta = await fetch("/api/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parametros: nuevosParametros,
            productos: nuevosProductos,
          }),
        });
        if (!respuesta.ok) {
          throw new Error("La API devolvió un estado no exitoso.");
        }
        return true;
      } catch (e) {
        // Reversión al estado previo.
        setParametros(previoParametros);
        setProductos(previoProductos);
        setError("No se pudieron guardar los datos.");
        return false;
      }
    },
    [parametros, productos]
  );

  const valor = {
    parametros,
    productos,
    loading,
    error,
    calculadoraLineas,
    setParametros,
    setProductos,
    setCalculadoraLineas,
    saveAll,
    recargarDatos,
    supabase: supabaseRef.current,
  };

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}

export default AppProvider;
