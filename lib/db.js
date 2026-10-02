// lib/db.js — Capa de acceso a datos sobre Supabase.
//
// Traduce entre la forma de dominio (camelCase) y el esquema de Supabase
// (snake_case) para las tablas `params`, `products` y `product_rows`. No
// referencia APIs del navegador en el nivel superior.
//
// Esquema esperado:
//   params(id, nombre, precio_unitario, unidad)
//   products(id, nombre, precio_total, unidad, compuesto)
//   product_rows(id?, product_id, parametro_id, cantidad, subtotal,
//                fuente_de_componente, producto_componente_id)
//
// Requisitos: 3.3, 3.4, 3.5, 8.4

import { normalizarProducto, FUENTE_COMPONENTE } from "./models.js";

// ---------------------------------------------------------------------------
// Mapeadores snake_case <-> camelCase
// ---------------------------------------------------------------------------

/**
 * Mapea una fila de `params` (snake_case) a un Parametro de dominio.
 * @param {object} fila
 * @returns {{ id: string, nombre: string, precioUnitario: number, unidad: string }}
 */
function filaAParametro(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    precioUnitario: fila.precio_unitario,
    unidad: fila.unidad,
  };
}

/**
 * Mapea un Parametro de dominio a una fila de `params` (snake_case).
 * @param {{ id: string, nombre: string, precioUnitario: number, unidad: string }} parametro
 * @returns {object}
 */
function parametroAFila(parametro) {
  return {
    id: parametro.id,
    nombre: parametro.nombre,
    precio_unitario: parametro.precioUnitario,
    unidad: parametro.unidad,
  };
}

/**
 * Mapea una fila de `product_rows` (snake_case) a una LineaDeCalculo de dominio.
 * @param {object} fila
 * @returns {object}
 */
function filaALinea(fila) {
  return {
    parametroId: fila.parametro_id ?? null,
    cantidad: fila.cantidad ?? null,
    subtotal: fila.subtotal ?? 0,
    fuenteDeComponente: fila.fuente_de_componente ?? "Parámetro",
    productoComponenteId: fila.producto_componente_id ?? null,
  };
}

/**
 * Mapea una LineaDeCalculo de dominio a una fila de `product_rows` (snake_case),
 * asociándola a `productId`.
 * @param {string} productId
 * @param {object} linea
 * @returns {object}
 */
function lineaAFila(productId, linea) {
  return {
    product_id: productId,
    parametro_id: linea.parametroId ?? null,
    cantidad: linea.cantidad ?? null,
    subtotal: linea.subtotal ?? 0,
    fuente_de_componente: linea.fuenteDeComponente ?? "Parámetro",
    producto_componente_id: linea.productoComponenteId ?? null,
  };
}

/**
 * Mapea un Producto de dominio a una fila de `products` (snake_case). Las
 * líneas se persisten aparte en `product_rows`.
 * @param {object} producto
 * @returns {object}
 */
function productoAFila(producto) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    precio_total: producto.precioTotal,
    unidad: producto.unidad,
    compuesto: producto.compuesto,
  };
}

/**
 * Lanza un Error legible a partir de un error de Supabase.
 * @param {string} contexto
 * @param {{ message?: string }} error
 */
function lanzarError(contexto, error) {
  const detalle = error && error.message ? error.message : "error desconocido";
  throw new Error(`${contexto}: ${detalle}`);
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/**
 * Lee todos los Parametros y Productos desde Supabase. Para cada Producto lee
 * sus `product_rows` y aplica `normalizarProducto`. Lanza un Error legible si
 * Supabase devuelve error.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabaseClient
 * @returns {Promise<{ parametros: object[], productos: object[] }>}
 */
export async function getData(supabaseClient) {
  const { data: filasParams, error: errorParams } = await supabaseClient
    .from("params")
    .select("*");
  if (errorParams) lanzarError("No se pudieron leer los parámetros", errorParams);

  const { data: filasProducts, error: errorProducts } = await supabaseClient
    .from("products")
    .select("*");
  if (errorProducts)
    lanzarError("No se pudieron leer los productos", errorProducts);

  const parametros = (filasParams || []).map(filaAParametro);

  const productos = [];
  for (const filaProducto of filasProducts || []) {
    const { data: filasRows, error: errorRows } = await supabaseClient
      .from("product_rows")
      .select("*")
      .eq("product_id", filaProducto.id);
    if (errorRows)
      lanzarError("No se pudieron leer las líneas del producto", errorRows);

    const lineas = (filasRows || []).map(filaALinea);

    const producto = normalizarProducto({
      id: filaProducto.id,
      nombre: filaProducto.nombre,
      lineas,
      precioTotal: filaProducto.precio_total,
      unidad: filaProducto.unidad,
      compuesto: filaProducto.compuesto,
    });

    productos.push(producto);
  }

  return { parametros, productos };
}

// ---------------------------------------------------------------------------
// Helpers de persistencia (puros, testeables sin Supabase)
// ---------------------------------------------------------------------------

/**
 * Ordena los Productos según el Orden_De_Persistencia: primero los Productos
 * simples (`compuesto !== true`) y luego los compuestos (`compuesto === true`),
 * conservando el orden relativo dentro de cada grupo. Garantiza que, al
 * insertar las `product_rows` de un Producto compuesto, los Productos simples
 * que sus Lineas_De_Producto puedan referenciar ya existan en la base de datos
 * (evita violaciones de clave foránea en `producto_componente_id`). No muta la
 * entrada (Req 3.4.1).
 *
 * @param {object[]} productos
 * @returns {object[]} nueva lista `[...simples, ...compuestos]`
 */
export function ordenarProductosParaPersistir(productos) {
  const lista = Array.isArray(productos) ? productos : [];
  const simples = lista.filter((p) => !p || p.compuesto !== true);
  const compuestos = lista.filter((p) => p && p.compuesto === true);
  return [...simples, ...compuestos];
}

/**
 * Aplica la Validación_De_Linea_Por_Fuente a una lista de Lineas_De_Calculo,
 * conservando únicamente las líneas con una referencia válida a su fuente
 * (Req 3.4.2):
 *  - Linea_De_Parametro (`fuenteDeComponente === "Parámetro"`, incluida la
 *    ausencia de fuente interpretada como Parámetro): se conserva solo si
 *    `parametroId != null`.
 *  - Linea_De_Producto (`fuenteDeComponente === "Producto"`): se conserva solo
 *    si `productoComponenteId != null`.
 * Descarta cualquier línea que no cumpla la condición de su fuente (por
 * ejemplo, una Linea_De_Producto con `productoComponenteId` nulo proveniente de
 * un respaldo corrupto). No muta la entrada.
 *
 * @param {object[]} lineas
 * @returns {object[]} líneas válidas
 */
export function filtrarLineasValidas(lineas) {
  const lista = Array.isArray(lineas) ? lineas : [];
  return lista.filter((linea) => {
    if (!linea) return false;
    const fuente =
      linea.fuenteDeComponente == null
        ? FUENTE_COMPONENTE.PARAMETRO
        : linea.fuenteDeComponente;
    if (fuente === FUENTE_COMPONENTE.PRODUCTO) {
      return linea.productoComponenteId != null;
    }
    return linea.parametroId != null;
  });
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/**
 * Persiste la lista completa de Parametros y Productos en Supabase mediante
 * upserts, siguiendo el Orden_De_Persistencia (Parametros, luego Productos
 * simples, por último Productos compuestos) y aplicando la
 * Validación_De_Linea_Por_Fuente a las líneas de cada Producto antes de
 * insertarlas (Req 3.4, 3.4.1, 3.4.2). Para cada Producto reemplaza sus
 * `product_rows` (DELETE + INSERT). Lanza un Error legible ante cualquier error
 * de Supabase.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabaseClient
 * @param {{ parametros: object[], productos: object[] }} datos
 * @returns {Promise<void>}
 */
export async function putData(supabaseClient, { parametros, productos }) {
  const listaParametros = Array.isArray(parametros) ? parametros : [];
  // Orden_De_Persistencia: simples antes que compuestos (Req 3.4.1).
  const listaProductos = ordenarProductosParaPersistir(productos);

  // 1) Upsert de todos los Parametros primero.
  for (const parametro of listaParametros) {
    const { error } = await supabaseClient
      .from("params")
      .upsert(parametroAFila(parametro), { onConflict: "id" });
    if (error) lanzarError("No se pudo guardar un parámetro", error);
  }

  // 2) Upsert de Productos (simples -> compuestos) + reemplazo de sus líneas.
  for (const producto of listaProductos) {
    const { error: errorProducto } = await supabaseClient
      .from("products")
      .upsert(productoAFila(producto), { onConflict: "id" });
    if (errorProducto)
      lanzarError("No se pudo guardar un producto", errorProducto);

    const { error: errorDelete } = await supabaseClient
      .from("product_rows")
      .delete()
      .eq("product_id", producto.id);
    if (errorDelete)
      lanzarError("No se pudieron reemplazar las líneas del producto", errorDelete);

    // Validación_De_Linea_Por_Fuente: descartar líneas con referencia nula a su
    // fuente antes de insertar, para no violar las claves foráneas (Req 3.4.2).
    const lineas = filtrarLineasValidas(producto.lineas);
    if (lineas.length > 0) {
      const filas = lineas.map((linea) => lineaAFila(producto.id, linea));
      const { error: errorInsert } = await supabaseClient
        .from("product_rows")
        .insert(filas);
      if (errorInsert)
        lanzarError("No se pudieron insertar las líneas del producto", errorInsert);
    }
  }
}

/**
 * Importa un respaldo completo. Igual que `putData` pero sin retornar datos;
 * la UI la llama directamente y luego invoca `getData` para refrescar.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabaseClient
 * @param {{ parametros: object[], productos: object[] }} datos
 * @returns {Promise<void>}
 */
export async function importBackup(supabaseClient, { parametros, productos }) {
  await putData(supabaseClient, { parametros, productos });
}
