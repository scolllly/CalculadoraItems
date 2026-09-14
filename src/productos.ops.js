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
   * Texto Nombre_Producto_Componente_Ausente que la Ventana_Detalle y el
   * Selector_De_Linea muestran en lugar del nombre del Producto_Componente
   * cuando una Linea_De_Producto referencia un Producto que ya no existe en la
   * lista de Productos (Req 2.6, 6.1).
   * @type {string}
   */
  const NOMBRE_PRODUCTO_COMPONENTE_AUSENTE = "Producto no disponible";

  /**
   * Unidad_De_Reemplazo de visualización "UND" que el Selector_De_Linea usa
   * únicamente para mostrar una Linea_De_Producto cuyo Producto_Componente
   * referenciado no tiene una Unidad_De_Producto definida. Es un valor de
   * visualización que no modifica ni persiste el Producto_Componente
   * (Req 1.4, 6.1, 7.6).
   * @type {string}
   */
  const UNIDAD_DE_REEMPLAZO = "UND";

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
   * distinguiendo la Fuente_De_Componente de cada línea (Req 2.6, 6.1, 6.2):
   *  - Linea_De_Parametro: mapea `parametroId` al nombre y la Unidad del
   *    Parametro vigente. Si el Parametro no existe o `parametroId` es null,
   *    marca la línea como "ausente" (nombreParametro = NOMBRE_PARAMETRO_AUSENTE,
   *    unidad = "").
   *  - Linea_De_Producto: mapea `productoComponenteId` al nombre y la
   *    Unidad_De_Producto del Producto_Componente vigente. Si el Producto no
   *    existe o `productoComponenteId` es null, marca la línea como "ausente"
   *    (nombreParametro = NOMBRE_PRODUCTO_COMPONENTE_AUSENTE, unidad = "").
   *
   * En todos los casos conserva el `subtotal` almacenado tal cual (Req 6.1, 6.2),
   * el orden de creación de las líneas (Req 2.2) y preserva el `precioTotal` del
   * Producto sin recalcular (Req 6.2). No muta sus entradas.
   *
   * Una línea sin `fuenteDeComponente` registrada se interpreta como
   * Linea_De_Parametro (retrocompatibilidad, Req 7.3).
   *
   * @param {Producto} producto Producto_Seleccionado a resolver.
   * @param {Parametro[]} parametros Lista de Parametros vigentes.
   * @param {Producto[]} [productos=[]] Lista de Productos vigente, para resolver
   *   los Productos_Componente de las Lineas_De_Producto. Opcional para no
   *   romper las llamadas existentes que solo resuelven Lineas_De_Parametro.
   * @returns {DetalleResuelto} Detalle resuelto para la Ventana_Detalle.
   */
  function resolverDetalle(producto, parametros, productos = []) {
    const lista = Array.isArray(parametros) ? parametros : [];
    const listaProductos = Array.isArray(productos) ? productos : [];
    const lineasOrigen = Array.isArray(producto.lineas) ? producto.lineas : [];
    const fuentes =
      (LP.models && LP.models.FUENTE_COMPONENTE) || {
        PARAMETRO: "Parámetro",
        PRODUCTO: "Producto",
      };

    const lineas = lineasOrigen.map((linea) => {
      // Una línea sin fuente registrada se interpreta como Linea_De_Parametro
      // (retrocompatibilidad, Req 7.3).
      const fuente =
        linea.fuenteDeComponente == null
          ? fuentes.PARAMETRO
          : linea.fuenteDeComponente;

      if (fuente === fuentes.PRODUCTO) {
        const componente =
          linea.productoComponenteId == null
            ? undefined
            : listaProductos.find(
                (p) => p && p.id === linea.productoComponenteId
              );

        if (!componente) {
          return {
            nombreParametro: NOMBRE_PRODUCTO_COMPONENTE_AUSENTE,
            ausente: true,
            cantidad: linea.cantidad,
            unidad: "",
            subtotal: linea.subtotal,
          };
        }

        return {
          nombreParametro: componente.nombre,
          ausente: false,
          cantidad: linea.cantidad,
          unidad: componente.unidad == null ? "" : componente.unidad,
          subtotal: linea.subtotal,
        };
      }

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
   * Resuelve el Precio_Unitario_De_Componente de una Linea_De_Calculo según su
   * Fuente_De_Componente (Req 3.1, 7.3):
   *  - Fuente "Parámetro": usa el `precioUnitario` del Parametro referenciado por
   *    `parametroId`.
   *  - Fuente "Producto": usa el `precioTotal` vigente del Producto_Componente
   *    referenciado por `productoComponenteId`.
   *
   * Devuelve `{ ok: true, precioUnitario }` si el componente es resoluble, o
   * `{ ok: false, motivo }` si el componente no existe o carece de precio
   * (Req 3.2). No muta sus entradas.
   *
   * @param {LineaDeCalculo} linea Linea_De_Calculo a resolver.
   * @param {Parametro[]} parametros Lista de Parametros vigentes.
   * @param {Producto[]} productos Lista de Productos vigentes.
   * @returns {{ ok: true, precioUnitario: number } | { ok: false, motivo: string }}
   */
  function resolverPrecioUnitario(linea, parametros, productos) {
    const fuentes =
      (LP.models && LP.models.FUENTE_COMPONENTE) || {
        PARAMETRO: "Parámetro",
        PRODUCTO: "Producto",
      };
    const origen = linea || {};
    // Una línea sin fuente registrada se interpreta como Linea_De_Parametro
    // (retrocompatibilidad, Req 7.3).
    const fuente =
      origen.fuenteDeComponente == null
        ? fuentes.PARAMETRO
        : origen.fuenteDeComponente;

    if (fuente === fuentes.PRODUCTO) {
      const lista = Array.isArray(productos) ? productos : [];
      const componente =
        origen.productoComponenteId == null
          ? undefined
          : lista.find((p) => p && p.id === origen.productoComponenteId);

      if (!componente) {
        return {
          ok: false,
          motivo: NOMBRE_PRODUCTO_COMPONENTE_AUSENTE,
        };
      }

      if (typeof componente.precioTotal !== "number") {
        return {
          ok: false,
          motivo: NOMBRE_PRODUCTO_COMPONENTE_AUSENTE,
        };
      }

      return { ok: true, precioUnitario: componente.precioTotal };
    }

    // Fuente "Parámetro" (o cualquier valor no reconocido tratado como tal).
    const lista = Array.isArray(parametros) ? parametros : [];
    const parametro =
      origen.parametroId == null
        ? undefined
        : lista.find((p) => p && p.id === origen.parametroId);

    if (!parametro) {
      return {
        ok: false,
        motivo: NOMBRE_PARAMETRO_AUSENTE,
      };
    }

    if (typeof parametro.precioUnitario !== "number") {
      return {
        ok: false,
        motivo: NOMBRE_PARAMETRO_AUSENTE,
      };
    }

    return { ok: true, precioUnitario: parametro.precioUnitario };
  }

  /**
   * Recalcula los subtotales y el Precio_Total de un Producto_Contenedor a partir
   * de sus líneas en edición, resolviendo el Precio_Unitario_De_Componente de
   * cada línea según su Fuente_De_Componente vía `resolverPrecioUnitario`
   * (Req 3.3, 6.3):
   *  - `subtotal_i = redondear2(cantidad_i * precioUnitario_i)`.
   *  - `total = redondear2(suma de subtotales)` (Req 3.4).
   *  - Un contenedor sin líneas produce `subtotales: []` y `total === 0` (Req 3.5).
   *
   * Usa las utilidades de redondeo half-up de `calculo.js` (`calcularProducto`,
   * que aplica `redondear2` por línea y al total). Asume que las líneas ya fueron
   * validadas (todos los componentes son resolubles). No muta sus entradas.
   *
   * @param {LineaDeCalculo[]} lineas Líneas del Producto_Contenedor en edición.
   * @param {Parametro[]} parametros Lista de Parametros vigentes.
   * @param {Producto[]} productos Lista de Productos vigentes, para resolver los
   *   Productos_Componente de las Lineas_De_Producto.
   * @returns {{ subtotales: number[], total: number }} Subtotales por línea y
   *   total, ambos redondeados a 2 decimales.
   */
  function calcularContenedor(lineas, parametros, productos) {
    const lineasEntrada = Array.isArray(lineas) ? lineas : [];
    const calculo = LP.calculo;

    // Resolver cada línea a { cantidad, precioUnitario } según su fuente, para
    // que el cálculo half-up fluya por `calculo.calcularProducto`. Se asume que
    // las líneas ya fueron validadas y que sus componentes son resolubles; si por
    // seguridad una línea no se resuelve, se trata su precio unitario como 0.
    const lineasResueltas = lineasEntrada.map((linea) => {
      const cantidad = linea == null ? 0 : linea.cantidad;
      const resolucion = resolverPrecioUnitario(linea, parametros, productos);
      const precioUnitario = resolucion.ok ? resolucion.precioUnitario : 0;
      return { cantidad, precioUnitario };
    });

    return calculo.calcularProducto(lineasResueltas);
  }

  /**
   * Devuelve una NUEVA lista de Productos con el Producto de id `id` reemplazado
   * por una versión con las nuevas líneas, sus subtotales recalculados y el
   * `precioTotal` recalculado. Conserva el `id`, el `nombre` y la `unidad`
   * originales del Producto (Req 8.1, 9.5). El resto de Productos se conserva sin
   * cambios y en el mismo orden. Si no existe el `id`, devuelve una copia de la
   * lista sin cambios.
   *
   * El Precio_Unitario_De_Componente de cada línea se resuelve por su
   * Fuente_De_Componente vía `resolverPrecioUnitario` (Precio_Unitario del
   * Parametro para las Lineas_De_Parametro; `precioTotal` vigente del
   * Producto_Componente para las Lineas_De_Producto), y los subtotales/total se
   * recalculan con el redondeo half-up de `calculo.calcularProducto` (Req 6.3).
   *
   * Retrocompatibilidad: cuando el componente de una línea no puede resolverse
   * con las listas `parametros`/`productos` provistas (por ejemplo, las llamadas
   * heredadas que no pasan `parametros` y traen líneas con un `subtotal`
   * precalculado y un `parametroId` que no está en la lista), se deriva el
   * Precio_Unitario del `subtotal` precalculado (`subtotal / cantidad`),
   * preservando el comportamiento previo a esta funcionalidad (Req 7.3).
   *
   * Cada línea resultante conserva su `fuenteDeComponente`, `parametroId`,
   * `productoComponenteId` y `cantidad`, con el `subtotal` recalculado. Asume
   * líneas ya válidas (validadas en el controlador). No muta sus entradas.
   *
   * @param {Producto[]} productos Lista de Productos vigente. También se usa como
   *   lista de Productos para resolver los Productos_Componente de las
   *   Lineas_De_Producto vía `resolverPrecioUnitario`/`calcularContenedor`.
   * @param {string} id Identificador del Producto a editar.
   * @param {Array<{parametroId?: string|null, productoComponenteId?: string|null,
   *   fuenteDeComponente?: string, cantidad: number, subtotal?: number}>} lineasProducto
   *   Nuevas líneas en edición, con su Fuente_De_Componente y su referencia.
   * @param {Parametro[]} [parametros=[]] Lista de Parametros vigentes, para
   *   resolver el Precio_Unitario de las Lineas_De_Parametro. Opcional con valor
   *   por defecto seguro para preservar las llamadas heredadas.
   * @returns {Producto[]} Nueva lista de Productos.
   */
  function editarProducto(productos, id, lineasProducto, parametros = []) {
    const lista = Array.isArray(productos) ? productos : [];
    const lineasEntrada = Array.isArray(lineasProducto) ? lineasProducto : [];
    const listaParametros = Array.isArray(parametros) ? parametros : [];
    const calculo = LP.calculo;

    // Resolver cada línea a { cantidad, precioUnitario } para que el cálculo del
    // producto fluya por `calculo.calcularProducto`. El Precio_Unitario se
    // resuelve por fuente vía `resolverPrecioUnitario` (Precio_Unitario del
    // Parametro o `precioTotal` vigente del Producto_Componente). Si el
    // componente no es resoluble con las listas provistas, se cae al modo
    // heredado derivando el precio del subtotal precalculado (subtotal =
    // cantidad * precioUnitario) para preservar el comportamiento previo.
    const lineasResueltas = lineasEntrada.map((linea) => {
      const cantidad = linea == null ? 0 : linea.cantidad;
      const resolucion = resolverPrecioUnitario(
        linea,
        listaParametros,
        lista
      );

      let precioUnitario;
      if (resolucion.ok) {
        precioUnitario = resolucion.precioUnitario;
      } else if (
        linea != null &&
        typeof linea.subtotal === "number" &&
        cantidad !== 0 &&
        cantidad != null
      ) {
        // Retrocompatibilidad: derivar del subtotal precalculado.
        precioUnitario = linea.subtotal / cantidad;
      } else {
        precioUnitario = 0;
      }

      return { cantidad, precioUnitario };
    });

    const { subtotales, total } = calculo.calcularProducto(lineasResueltas);

    return lista.map((producto) => {
      if (!producto || producto.id !== id) {
        return producto;
      }

      const lineas = lineasEntrada.map((linea, indice) => {
        const origen = linea || {};
        const nuevaLinea = {
          parametroId:
            origen.parametroId == null ? null : origen.parametroId,
          cantidad: origen.cantidad,
          subtotal: subtotales[indice],
        };
        // Conservar los campos de la Fuente_De_Componente cuando estén
        // presentes, sin inventarlos en las líneas heredadas.
        if (origen.fuenteDeComponente != null) {
          nuevaLinea.fuenteDeComponente = origen.fuenteDeComponente;
        }
        if (origen.productoComponenteId !== undefined) {
          nuevaLinea.productoComponenteId =
            origen.productoComponenteId == null
              ? null
              : origen.productoComponenteId;
        }
        return nuevaLinea;
      });

      const editado = {
        id: producto.id,
        nombre: producto.nombre,
        lineas,
        precioTotal: calculo.redondear2(total),
      };
      // Conservar la Unidad_De_Producto previa sin inventar un valor cuando el
      // Producto original no la tiene definida (Req 7.7, 9.5).
      if (producto.unidad !== undefined) {
        editado.unidad = producto.unidad;
      }
      return editado;
    });
  }

  /**
   * Devuelve una NUEVA lista de Productos sin el Producto de id `id`. El resto se
   * conserva en el mismo orden (Req 4.2). Si no existe el `id`, devuelve una
   * copia de la lista sin cambios.
   *
   * Además, para cada Linea_De_Producto de los demás Productos que referenciaba
   * al Producto eliminado (Fuente_De_Componente "Producto" y
   * `productoComponenteId === id`), la marca como referencia no resuelta poniendo
   * `productoComponenteId` en `null` y conservando su `fuenteDeComponente`, su
   * `cantidad` y su `subtotal` almacenado sin recalcular. Los subtotales y el
   * `precioTotal` de los demás Productos se conservan tal cual (Req 8.2). No muta
   * sus entradas: los Productos afectados y sus líneas se copian.
   *
   * @param {Producto[]} productos Lista de Productos vigente.
   * @param {string} id Identificador del Producto a eliminar.
   * @returns {Producto[]} Nueva lista de Productos.
   */
  function eliminarProducto(productos, id) {
    const lista = Array.isArray(productos) ? productos : [];
    const fuentes =
      (LP.models && LP.models.FUENTE_COMPONENTE) || {
        PARAMETRO: "Parámetro",
        PRODUCTO: "Producto",
      };

    return lista
      .filter((producto) => !producto || producto.id !== id)
      .map((producto) => {
        if (!producto) {
          return producto;
        }

        const lineas = Array.isArray(producto.lineas) ? producto.lineas : [];
        // ¿Alguna Linea_De_Producto referenciaba al Producto eliminado?
        const referencia = lineas.some(
          (linea) =>
            linea != null &&
            linea.fuenteDeComponente === fuentes.PRODUCTO &&
            linea.productoComponenteId === id
        );

        // Sin referencias colgantes: conservar el Producto tal cual (misma
        // referencia), sin recalcular ni copiar.
        if (!referencia) {
          return producto;
        }

        // Copiar el Producto y marcar como referencia no resuelta cada
        // Linea_De_Producto que apuntaba al eliminado, conservando el resto.
        const nuevasLineas = lineas.map((linea) => {
          if (
            linea != null &&
            linea.fuenteDeComponente === fuentes.PRODUCTO &&
            linea.productoComponenteId === id
          ) {
            return Object.assign({}, linea, { productoComponenteId: null });
          }
          return linea;
        });

        return Object.assign({}, producto, { lineas: nuevasLineas });
      });
  }

  /**
   * Valida las Lineas_De_Producto de un Producto_Contenedor al calcular o
   * guardar, acumulando TODOS los errores por línea (Req 4.1–4.5, 6.4).
   *
   * Solo se validan las Lineas_De_Producto (Fuente_De_Componente "Producto");
   * las Lineas_De_Parametro se ignoran aquí, pues siguen su validación previa.
   * Una línea sin `fuenteDeComponente` registrada se interpreta como
   * Linea_De_Parametro (retrocompatibilidad, Req 7.3) y no se valida.
   *
   * Para cada Linea_De_Producto, por su índice en `lineas`:
   *  - Si `productoComponenteId` es null/ausente => error `sin-producto` (Req 4.1).
   *  - Si `productoComponenteId` no existe en `productos` => error
   *    `producto-inexistente` (Req 4.2, 6.4). Una auto-referencia que aún existe
   *    en la lista se considera "existente" para este chequeo (los ciclos se
   *    detectan aparte).
   *  - Si la `cantidad` no es válida según `LP.validation.validarCantidad`
   *    (rango 0,01 a 999.999.999,99, hasta 2 decimales) => error
   *    `cantidad-invalida` (Req 4.3). Puede coexistir con los anteriores como una
   *    entrada de error adicional para el mismo índice (Req 4.5).
   *
   * Devuelve `{ valido: true }` cuando ninguna Linea_De_Producto presente tiene
   * error; `{ valido: false, errores: [...] }` acumulando cada `{ indice, tipo }`
   * en caso contrario. No muta sus entradas.
   *
   * @param {Array<LineaDeCalculo>} lineas Líneas del Producto_Contenedor en edición.
   * @param {Producto[]} productos Lista de Productos vigentes.
   * @param {string|null} [idEnEdicion] Identificador del Producto_Contenedor en
   *   edición (no altera este chequeo; los ciclos/auto-referencia se detectan
   *   por separado).
   * @returns {{ valido: true }
   *          | { valido: false, errores: Array<{ indice: number,
   *              tipo: "sin-producto"|"producto-inexistente"|"cantidad-invalida" }> }}
   */
  function validarLineasProducto(lineas, productos, idEnEdicion) {
    // Helper local que replica la semántica exacta de `aNumeroCantidad`
    // (closure privado en `productos.controller.js`), para alinear la
    // conversión de la cantidad cruda de las Lineas_De_Producto con la de las
    // Lineas_De_Parametro antes de validar el número (Req 2.1–2.4):
    //  - number → se devuelve tal cual.
    //  - no string (null, undefined, objeto) → NaN.
    //  - string → trim(); cadena vacía → NaN; en otro caso Number(recortado)
    //    devolviendo el número si Number.isFinite, o NaN.
    const aNumeroCantidad = (valor) => {
      if (typeof valor === "number") return valor;
      if (typeof valor !== "string") return NaN;
      const recortado = valor.trim();
      if (recortado === "") return NaN;
      const n = Number(recortado);
      return Number.isFinite(n) ? n : NaN;
    };

    const lineasEntrada = Array.isArray(lineas) ? lineas : [];
    const listaProductos = Array.isArray(productos) ? productos : [];
    const validation = LP.validation;
    const fuentes =
      (LP.models && LP.models.FUENTE_COMPONENTE) || {
        PARAMETRO: "Parámetro",
        PRODUCTO: "Producto",
      };

    /** @type {Array<{ indice: number, tipo: string }>} */
    const errores = [];

    lineasEntrada.forEach((linea, indice) => {
      const origen = linea || {};
      // Una línea sin fuente registrada se interpreta como Linea_De_Parametro
      // (retrocompatibilidad, Req 7.3); solo se validan las Lineas_De_Producto.
      const fuente =
        origen.fuenteDeComponente == null
          ? fuentes.PARAMETRO
          : origen.fuenteDeComponente;

      if (fuente !== fuentes.PRODUCTO) {
        return;
      }

      // Componente: sin seleccionar => sin-producto; seleccionado pero
      // inexistente en la lista vigente => producto-inexistente.
      if (origen.productoComponenteId == null) {
        errores.push({ indice, tipo: "sin-producto" });
      } else {
        const existe = listaProductos.some(
          (p) => p && p.id === origen.productoComponenteId
        );
        if (!existe) {
          errores.push({ indice, tipo: "producto-inexistente" });
        }
      }

      // Cantidad: convertir la cantidad cruda a número (misma semántica que
      // `aNumeroCantidad` de las Lineas_De_Parametro) antes de reutilizar el
      // validador numérico existente. Se acumula como una entrada de error
      // adicional para el mismo índice (Req 2.1–2.4, 4.5).
      const cantidadNumerica = aNumeroCantidad(origen.cantidad);
      const cantidadOk =
        validation && typeof validation.validarCantidad === "function"
          ? validation.validarCantidad(cantidadNumerica).valido
          : false;
      if (!cantidadOk) {
        errores.push({ indice, tipo: "cantidad-invalida" });
      }
    });

    if (errores.length === 0) {
      return { valido: true };
    }
    return { valido: false, errores };
  }

  /**
   * Límite máximo de Productos distintos visitados durante el recorrido de
   * detección de ciclos (Req 5.3, 5.4).
   * @type {number}
   */
  const LIMITE_PROFUNDIDAD = 1000;

  /**
   * Tope de tiempo, en milisegundos, para completar la evaluación de ciclos
   * (Req 5.3), medido con `Date.now()`.
   * @type {number}
   */
  const TOPE_TIEMPO_MS = 2000;

  /**
   * Detecta un Ciclo_De_Composicion que resultaría de asignar `lineas` al
   * Producto_Contenedor `idContenedor` dentro de la lista `productos`
   * (Req 5.1–5.5). Recorrido transitivo en profundidad sobre las referencias de
   * las Lineas_De_Producto (Fuente_De_Componente "Producto" con
   * `productoComponenteId` no nulo):
   *  - Ciclo directo: alguna de las líneas del contenedor referencia al propio
   *    `idContenedor` => `{ hayCiclo:true, tipo:"directo", secuencia:[idContenedor, idContenedor] }`
   *    (Req 5.1).
   *  - Ciclo indirecto: una cadena de referencias que, siguiendo los Productos
   *    referenciados, regresa a `idContenedor` => `{ hayCiclo:true,
   *    tipo:"indirecto", secuencia }`, con la secuencia ordenada de ids que forman
   *    el ciclo, comenzando y terminando en `idContenedor` (Req 5.2).
   *  - Profundidad: si se visitan más de 1.000 Productos distintos sin terminar
   *    => `{ hayCiclo:true, tipo:"profundidad" }` (Req 5.3, 5.4).
   *  - Tiempo: si el tiempo transcurrido supera 2.000 ms => `{ hayCiclo:true,
   *    tipo:"tiempo" }` (Req 5.3).
   *  - Referencia no resoluble: si una línea referencia un Producto que no existe
   *    en `productos` => `{ hayCiclo:true, tipo:"referencia-no-resoluble",
   *    productoId }` (Req 5.5).
   *
   * Devuelve `{ hayCiclo:false }` cuando no hay ciclo y todas las referencias se
   * resuelven. No muta sus entradas.
   *
   * @param {string} idContenedor Id del Producto_Contenedor en edición/guardado.
   * @param {Array<LineaDeCalculo>} lineas Líneas en edición del contenedor.
   * @param {Producto[]} productos Lista de Productos vigente.
   * @returns {{ hayCiclo: false }
   *          | { hayCiclo: true, tipo: "directo"|"indirecto", secuencia: string[] }
   *          | { hayCiclo: true, tipo: "profundidad" }
   *          | { hayCiclo: true, tipo: "tiempo" }
   *          | { hayCiclo: true, tipo: "referencia-no-resoluble", productoId: string }}
   */
  function detectarCicloComposicion(idContenedor, lineas, productos) {
    const lineasContenedor = Array.isArray(lineas) ? lineas : [];
    const listaProductos = Array.isArray(productos) ? productos : [];
    const fuentes =
      (LP.models && LP.models.FUENTE_COMPONENTE) || {
        PARAMETRO: "Parámetro",
        PRODUCTO: "Producto",
      };
    const inicio = Date.now();

    // Índice por id para resolver Productos en O(1) durante el recorrido.
    const porId = new Map();
    listaProductos.forEach((producto) => {
      if (producto && producto.id != null) {
        porId.set(producto.id, producto);
      }
    });

    /**
     * Extrae los `productoComponenteId` referenciados por las Lineas_De_Producto
     * de un conjunto de líneas (Fuente_De_Componente "Producto", referencia no
     * nula). Las Lineas_De_Parametro y las líneas sin fuente (interpretadas como
     * Linea_De_Parametro, Req 7.3) no participan del grafo de composición.
     * @param {Array<LineaDeCalculo>} lineasProducto
     * @returns {string[]}
     */
    function referenciasDe(lineasProducto) {
      const lista = Array.isArray(lineasProducto) ? lineasProducto : [];
      const refs = [];
      lista.forEach((linea) => {
        const origen = linea || {};
        const fuente =
          origen.fuenteDeComponente == null
            ? fuentes.PARAMETRO
            : origen.fuenteDeComponente;
        if (
          fuente === fuentes.PRODUCTO &&
          origen.productoComponenteId != null
        ) {
          refs.push(origen.productoComponenteId);
        }
      });
      return refs;
    }

    // Ciclo directo: alguna línea del contenedor referencia al propio contenedor
    // (Req 5.1). Se detecta antes del recorrido transitivo.
    const referenciasContenedor = referenciasDe(lineasContenedor);
    if (referenciasContenedor.indexOf(idContenedor) !== -1) {
      return {
        hayCiclo: true,
        tipo: "directo",
        secuencia: [idContenedor, idContenedor],
      };
    }

    // Recorrido en profundidad (DFS). Mantenemos el camino actual (`ruta`) para
    // reconstruir la secuencia del ciclo indirecto, y `visitados` con el conjunto
    // de Productos distintos alcanzados para el límite de profundidad.
    const visitados = new Set();

    /**
     * Explora las referencias transitivas a partir de un id de Producto ya
     * resuelto, con su camino acumulado.
     * @param {string} id Id del Producto actual.
     * @param {string[]} ruta Camino de ids desde el contenedor hasta aquí (incluye `id`).
     * @returns {object|null} Resultado de ciclo/límite si se detecta; null si no.
     */
    function explorar(id, ruta) {
      // Tope de tiempo (Req 5.3).
      if (Date.now() - inicio > TOPE_TIEMPO_MS) {
        return { hayCiclo: true, tipo: "tiempo" };
      }

      const producto = porId.get(id);
      // Referencia no resoluble durante el recorrido (Req 5.5).
      if (!producto) {
        return {
          hayCiclo: true,
          tipo: "referencia-no-resoluble",
          productoId: id,
        };
      }

      const referencias = referenciasDe(producto.lineas);
      for (let i = 0; i < referencias.length; i++) {
        const refId = referencias[i];

        // Ciclo indirecto: la referencia regresa al contenedor (Req 5.2).
        if (refId === idContenedor) {
          return {
            hayCiclo: true,
            tipo: "indirecto",
            secuencia: ruta.concat([idContenedor]),
          };
        }

        // Evitar reprocesar Productos ya visitados en otras ramas (el ciclo que
        // importa es el que regresa al contenedor; otros ciclos entre terceros
        // no bloquean por sí mismos, pero se acotan por profundidad/tiempo).
        if (visitados.has(refId)) {
          continue;
        }

        // Límite de profundidad: 1.000 Productos distintos (Req 5.3, 5.4).
        if (visitados.size >= LIMITE_PROFUNDIDAD) {
          return { hayCiclo: true, tipo: "profundidad" };
        }
        visitados.add(refId);

        const resultado = explorar(refId, ruta.concat([refId]));
        if (resultado) {
          return resultado;
        }
      }

      return null;
    }

    // Semilla del recorrido: las referencias directas de las líneas del
    // contenedor. La ruta inicia en el contenedor.
    for (let i = 0; i < referenciasContenedor.length; i++) {
      const refId = referenciasContenedor[i];

      if (visitados.has(refId)) {
        continue;
      }
      if (visitados.size >= LIMITE_PROFUNDIDAD) {
        return { hayCiclo: true, tipo: "profundidad" };
      }
      visitados.add(refId);

      const resultado = explorar(refId, [idContenedor, refId]);
      if (resultado) {
        return resultado;
      }
    }

    return { hayCiclo: false };
  }

  // Publicación de la API en el espacio de nombres global.
  LP.productosOps = {
    NOMBRE_PARAMETRO_AUSENTE,
    NOMBRE_PRODUCTO_COMPONENTE_AUSENTE,
    UNIDAD_DE_REEMPLAZO,
    resolverDetalle,
    resolverPrecioUnitario,
    calcularContenedor,
    editarProducto,
    eliminarProducto,
    detectarCicloComposicion,
    validarLineasProducto,
  };
})(window);
