// app/api/data/route.js — Ruta de API Next.js para leer y escribir los datos.
//
// GET  /api/data  → devuelve { parametros, productos } desde Supabase.
// PUT  /api/data  → persiste { parametros, productos } en Supabase.
//
// Los errores de Supabase se registran en el servidor y se devuelven mensajes
// genéricos al cliente, sin exponer detalles internos.
//
// Requisitos: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8

import { createSupabaseClient } from "../../../lib/supabase.js";
import { getData, putData } from "../../../lib/db.js";

/**
 * GET /api/data — lee los Parametros y Productos.
 * @returns {Promise<Response>}
 */
export async function GET() {
  try {
    const supabase = createSupabaseClient();
    const { parametros, productos } = await getData(supabase);
    return Response.json({ parametros, productos }, { status: 200 });
  } catch (error) {
    console.error("GET /api/data falló:", error);
    return Response.json(
      { error: "Error al leer los datos." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/data — persiste la lista completa de Parametros y Productos.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function PUT(request) {
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json(
      {
        error:
          "Se requieren los campos parametros y productos como arreglos.",
      },
      { status: 400 }
    );
  }

  if (
    !cuerpo ||
    !Array.isArray(cuerpo.parametros) ||
    !Array.isArray(cuerpo.productos)
  ) {
    return Response.json(
      {
        error:
          "Se requieren los campos parametros y productos como arreglos.",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseClient();
    await putData(supabase, {
      parametros: cuerpo.parametros,
      productos: cuerpo.productos,
    });
    return Response.json({}, { status: 200 });
  } catch (error) {
    console.error("PUT /api/data falló:", error);
    return Response.json(
      { error: "Error al guardar los datos." },
      { status: 500 }
    );
  }
}
