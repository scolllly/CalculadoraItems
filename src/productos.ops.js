// productos.ops.js — Operaciones puras sobre la lista de Productos (sin DOM ni
// persistencia).
//
// Funciones puras que reciben y devuelven datos inmutables (no mutan sus
// entradas). Dan soporte a las acciones de Ver detalle, Editar y Eliminar
// Productos de la Pagina_Productos.
//
// Requisitos: 2.2, 2.3, 2.4, 6.3 (resolverDetalle).
//
// Se carga como Script_Clasico bajo file:// y publica su API en el espacio de
// nombres global `window.LP` (en `LP.productosOps`), sin sintaxis de Módulos ES.

(function (global) {
  "use strict";
  // Espacio de nombres global de la aplicación.
  const LP = (global.LP = global.LP || {});

  /**
   * Texto Nombre_Parametro_Ausente que la Ventana_Detalle muestra en lugar del
   * nombre del Parametro cuando una Linea_De_Calculo referencia un Parametro que
   * ya no existe o no tiene Parametro asociado (Req 2.4).
   * @type {string}
   */
  const NOMBRE_PARAMETRO_AUSENTE = "Parámetro no disponible";

  /**
   * @typedef {Object} LineaDeCalculo
   * @property {string|null} parametroId
   * @property {number} cantidad
   * @property {number} subtotal
   *
   * @typedef {Object} Producto
   * @property {string} id
   * @property {string} nombre
   * @property {LineaDeCalculo[]} lineas
   * @property {number} precioTotal
   *
   * @typedef {Object} Parametro
   * @property {string} id
   * @property {string} nombre
   * @property {number} precioUnitario
   * @property {string} unidad
   *
   * @typedef {Object} LineaResuelta
   * @property {string} nombreParametro
   * @property {boolean} ausente
   * @property {number} cantidad
   * @property {string} unidad
   * @property {number} subtotal
   *
   * @typedef {Object} DetalleResuelto
   * @property {string} nombre
   * @property {number} precioTotal
   * @property {LineaResuelta[]} lineas
   */

  /**
   * Resuelve las líneas de un Producto para su visualización de solo lectura,
   * mapeando cada `parametroId` al nombre y la Unidad del Parametro vigente. Si
   * el Parametro no existe o `parametroId` es null, marca la línea como
   * "ausente" (nombreParametro = NOMBRE_PARAMETRO_AUSENTE, unidad = ""),
   * conservando el `subtotal` almacenado tal cual (Req 2.4).
   *
   * Conserva el orden de creación de las líneas (Req 2.2) y preserva el
   * `precioTotal` del Producto sin recalcular (Req 2.3, 6.3). No muta sus
   * entradas.
   *
   * @param {Producto} producto Producto_Seleccionado a resolver.
   * @param {Parametro[]} parametros Lista de Parametros vigentes.
   * @returns {DetalleResuelto} Detalle resuelto para la Ventana_Detalle.
   */
  function resolverDetalle(producto, parametros) {
    const lista = Array.isArray(parametros) ? parametros : [];
    const lineasOrigen = Array.isArray(producto.lineas) ? producto.lineas : [];

    const lineas = lineasOrigen.map((linea) => {
      const parametro =
        linea.parametroId == null
          ? undefined
          : lista.find((p) => p && p.id === linea.parametroId);

      if (!parametro) {
        return {
          nombreParametro: NOMBRE_PARAMETRO_AUSENTE,
          ausente: true,
          cantidad: linea.cantidad,
          unidad: "",
          subtotal: linea.subtotal,
        };
      }

      return {
        nombreParametro: parametro.nombre,
        ausente: false,
        cantidad: linea.cantidad,
        unidad: parametro.unidad,
        subtotal: linea.subtotal,
      };
    });

    return {
      nombre: producto.nombre,
      precioTotal: producto.precioTotal,
      lineas,
    };
  }

  /**
   * Devuelve una NUEVA lista de Productos con el Producto de id `id` reemplazado
   * por una versión con las nuevas líneas, sus subtotales recalculados y el
   * `precioTotal` recalculado mediante `calculo.calcularProducto` y
   * `calculo.redondear2`. Conserva el `id` y el `nombre` originales del Producto
   * (Req 3.5). El resto de Productos se conserva sin cambios y en el mismo orden.
   * Si no existe el `id`, devuelve una copia de la lista sin cambios.
   *
   * Asume líneas ya válidas (validadas en el controlador). No muta sus entradas.
   *
   * @param {Producto[]} productos Lista de Productos vigente.
   * @param {string} id Identificador del Producto a editar.
   * @param {Array<{parametroId: string|null, cantidad: number, subtotal: number}>} lineasProducto
   *   Nuevas líneas en edición; cada `subtotal` es el precalculado por el
   *   controlador a partir del Precio_Unitario del Parametro.
   * @returns {Producto[]} Nueva lista de Productos.
   */
  function editarProducto(productos, id, lineasProducto) {
    const lista = Array.isArray(productos) ? productos : [];
    const lineasEntrada = Array.isArray(lineasProducto) ? lineasProducto : [];
    const calculo = LP.calculo;

    // Resolver cada línea a { cantidad, precioUnitario } para que el cálculo del
    // producto fluya por `calculo.calcularProducto`. El Precio_Unitario se
    // deriva del subtotal precalculado por el controlador (subtotal = cantidad *
    // precioUnitario), lo que permite recalcular subtotal y total de forma
    // consistente sin necesitar la lista de Parametros aquí.
    const lineasResueltas = lineasEntrada.map((linea) => {
      const cantidad = linea.cantidad;
      const precioUnitario =
        cantidad === 0 || cantidad == null
          ? 0
          : linea.subtotal / cantidad;
      return { cantidad, precioUnitario };
    });

    const { subtotales, total } = calculo.calcularProducto(lineasResueltas);

    return lista.map((producto) => {
      if (!producto || producto.id !== id) {
        return producto;
      }

      const lineas = lineasEntrada.map((linea, indice) => ({
        parametroId: linea.parametroId,
        cantidad: linea.cantidad,
        subtotal: subtotales[indice],
      }));

      return {
        id: producto.id,
        nombre: producto.nombre,
        lineas,
        precioTotal: calculo.redondear2(total),
      };
    });
  }

  /**
   * Devuelve una NUEVA lista de Productos sin el Producto de id `id`. El resto se
   * conserva sin cambios y en el mismo orden (Req 4.2). Si no existe el `id`,
   * devuelve una copia de la lista sin cambios. No muta sus entradas.
   *
   * @param {Producto[]} productos Lista de Productos vigente.
   * @param {string} id Identificador del Producto a eliminar.
   * @returns {Producto[]} Nueva lista de Productos.
   */
  function eliminarProducto(productos, id) {
    const lista = Array.isArray(productos) ? productos : [];
    return lista.filter((producto) => !producto || producto.id !== id);
  }

  // Publicación de la API en el espacio de nombres global.
  LP.productosOps = {
    NOMBRE_PARAMETRO_AUSENTE,
    resolverDetalle,
    editarProducto,
    eliminarProducto,
  };
})(window);
