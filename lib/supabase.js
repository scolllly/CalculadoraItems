// lib/supabase.js — Inicialización del cliente Supabase.
//
// Valida en tiempo de carga que las variables de entorno requeridas están
// definidas y expone una fábrica `createSupabaseClient()` que devuelve un
// cliente inicializado. El módulo no referencia APIs del navegador en el nivel
// superior, de modo que puede importarse tanto en el servidor (rutas de API)
// como en el cliente.
//
// Requisitos: 3.1, 3.2

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Valida que ambas variables de entorno estén definidas. Lanza un Error
 * descriptivo indicando cuál falta.
 * @returns {{ url: string, key: string }}
 */
function leerConfiguracion() {
  const faltantes = [];
  if (!SUPABASE_URL) faltantes.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_PUBLISHABLE_KEY)
    faltantes.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (faltantes.length > 0) {
    throw new Error(
      "Faltan variables de entorno de Supabase: " +
        faltantes.join(", ") +
        ". Defínelas en .env.local (ver .env.local.example)."
    );
  }

  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY };
}

/**
 * Crea un cliente Supabase inicializado con las variables de entorno
 * validadas. Lanza si alguna variable requerida falta.
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export function createSupabaseClient() {
  const { url, key } = leerConfiguracion();
  return createClient(url, key);
}
