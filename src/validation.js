// @ts-check
/**
 * Reglas de validación (funciones puras) de la Aplicacion.
 *
 * Cada función devuelve un ValidationResult con el mensaje EXACTO exigido por
 * el criterio de aceptación asociado (Requisitos 1.2–1.5, 3.2, 3.3, 3.4,
 * 4.3, 4.4, 5.5, 5.6). No dependen del DOM ni de localStorage.
 *
 * @typedef {Object} ValidationResult
 * @property {boolean} valido
 * @property {string} [mensaje]
 *
 * @typedef {Object} Parametro
 * @property {string} id
 * @property {string} nombre
 * @property {number} precioUnitario
 * @property {string} unidad
 */

(function (global) {
  "use strict";
  const LP = (global.LP = global.LP || {});

  // Mensajes exactos exigidos por los criterios de aceptación.
  const MENSAJES = {
    NOMBRE_PARAMETRO_LONGITUD:
      'El nombre debe contener entre 1 y 100 caracteres.',
    NOMBRE_PARAMETRO_DUPLICADO:
      'Ya existe un parámetro con ese nombre.',
    PRECIO_UNITARIO_INVALIDO:
      'El precio unitario debe ser un número entre 0.00 y 999999999.99 con un máximo de 2 decimales.',
    UNIDAD_LONGITUD:
      'La unidad debe contener entre 1 y 20 caracteres.',
    NOMBRE_PRODUCTO_OBLIGATORIO:
      'El nombre del producto es obligatorio.',
    NOMBRE_PRODUCTO_LONGITUD:
      'El nombre del producto supera la longitud máxima permitida.',
    CANTIDAD_INVALIDA:
      'Cada cantidad debe ser un número entre 0,01 y 999.999.999,99.',
    LINEA_SIN_PRODUCTO:
      'Cada línea debe tener un producto seleccionado.',
    CICLO_DIRECTO:
      'Un producto no puede contenerse a sí mismo.',
    CICLO_INDIRECTO:
      'La composición generaría una referencia circular entre productos.',
    COMPOSICION_DEMASIADO_PROFUNDA:
      'La composición es demasiado profunda para verificarse.',
    REFERENCIA_PRODUCTO_NO_DISPONIBLE:
      'Existe una referencia a un producto no disponible.',
  };

  const PRECIO_MAX = 999999999.99;
  const PRECIO_MIN = 0.0;
  const CANTIDAD_MAX = 999999999.99;
  const CANTIDAD_MIN = 0.01;

  const VALIDO = Object.freeze({ valido: true });

  /**
   * Determina si un valor es un número finito con, como máximo, `maxDecimales`
   * decimales. Se apoya en la representación decimal para evitar los errores de
   * punto flotante al contar decimales.
   * @param {unknown} valor
   * @param {number} maxDecimales
   * @returns {boolean}
   */
  function esNumeroConDecimales(valor, maxDecimales) {
    if (typeof valor !== 'number') return false;
    if (!Number.isFinite(valor)) return false;
    // Contar decimales a partir de la representación en base 10.
    const texto = String(valor);
    if (texto.includes('e') || texto.includes('E')) {
      // Notación exponencial: normalizar para contar decimales reales.
      const [, fraccion = ''] = valor.toFixed(20).replace(/0+$/, '').split('.');
      return fraccion.length <= maxDecimales;
    }
    const punto = texto.indexOf('.');
    if (punto === -1) return true;
    const decimales = texto.length - punto - 1;
    return decimales <= maxDecimales;
  }

  /**
   * Valida el nombre de un Parametro: entre 1 y 100 caracteres tras recortar
   * espacios y único (comparación tras trim) respecto a los parámetros
   * existentes, ignorando el parámetro que se está editando.
   * @param {string} nombre
   * @param {Parametro[]} [existentes]
   * @param {string} [idEnEdicion]
   * @returns {ValidationResult}
   */
  function validarNombreParametro(nombre, existentes = [], idEnEdicion) {
    const recortado = typeof nombre === 'string' ? nombre.trim() : '';
    if (recortado.length < 1 || recortado.length > 100) {
      return { valido: false, mensaje: MENSAJES.NOMBRE_PARAMETRO_LONGITUD };
    }
    const lista = Array.isArray(existentes) ? existentes : [];
    const duplicado = lista.some(
      (p) =>
        p &&
        p.id !== idEnEdicion &&
        typeof p.nombre === 'string' &&
        p.nombre.trim() === recortado
    );
    if (duplicado) {
      return { valido: false, mensaje: MENSAJES.NOMBRE_PARAMETRO_DUPLICADO };
    }
    return { valido: true };
  }

  /**
   * Valida el Precio_Unitario: número entre 0.00 y 999999999.99 con un máximo de
   * 2 decimales.
   * @param {unknown} valor
   * @returns {ValidationResult}
   */
  function validarPrecioUnitario(valor) {
    if (
      !esNumeroConDecimales(valor, 2) ||
      /** @type {number} */ (valor) < PRECIO_MIN ||
      /** @type {number} */ (valor) > PRECIO_MAX
    ) {
      return { valido: false, mensaje: MENSAJES.PRECIO_UNITARIO_INVALIDO };
    }
    return { valido: true };
  }

  /**
   * Valida la Unidad: entre 1 y 20 caracteres.
   * @param {string} unidad
   * @returns {ValidationResult}
   */
  function validarUnidad(unidad) {
    const texto = typeof unidad === 'string' ? unidad : '';
    if (texto.length < 1 || texto.length > 20) {
      return { valido: false, mensaje: MENSAJES.UNIDAD_LONGITUD };
    }
    return { valido: true };
  }

  /**
   * Valida el nombre de un Producto: entre 1 y 100 caracteres tras recortar
   * espacios (no puede estar vacío ni contener únicamente espacios). Distingue
   * entre "obligatorio" (vacío/solo espacios) y "longitud máxima" (más de 100).
   * @param {string} nombre
   * @returns {ValidationResult}
   */
  function validarNombreProducto(nombre) {
    const recortado = typeof nombre === 'string' ? nombre.trim() : '';
    if (recortado.length < 1) {
      return { valido: false, mensaje: MENSAJES.NOMBRE_PRODUCTO_OBLIGATORIO };
    }
    if (recortado.length > 100) {
      return { valido: false, mensaje: MENSAJES.NOMBRE_PRODUCTO_LONGITUD };
    }
    return { valido: true };
  }

  /**
   * Valida la Cantidad de una Linea_De_Calculo: número entre 0.01 y
   * 999999999.99 con un máximo de 2 decimales.
   * @param {unknown} valor
   * @returns {ValidationResult}
   */
  function validarCantidad(valor) {
    if (
      !esNumeroConDecimales(valor, 2) ||
      /** @type {number} */ (valor) < CANTIDAD_MIN ||
      /** @type {number} */ (valor) > CANTIDAD_MAX
    ) {
      return { valido: false, mensaje: MENSAJES.CANTIDAD_INVALIDA };
    }
    return { valido: true };
  }

    // Publicación en el espacio de nombres global window.LP (carga vía <script>
    // clásico bajo file://). No se usa sintaxis de módulos ES.
    LP.validation = {
      MENSAJES,
      VALIDO,
      validarNombreParametro,
      validarPrecioUnitario,
      validarUnidad,
      validarNombreProducto,
      validarCantidad,
    };
})(window);
