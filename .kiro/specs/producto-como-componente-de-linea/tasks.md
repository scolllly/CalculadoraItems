# Implementation Plan

## Overview

Este plan convierte el diseño en tareas de codificación incrementales para JavaScript vanilla puro (IIFE sobre `window.LP`, Scripts_Clasicos bajo `file://`, sin framework ni empaquetado). Se extienden únicamente los módulos existentes indicados por el diseño (`src/models.js`, `src/productos.ops.js`, `src/validation.js`, `src/backup.js`, `src/lineas.editor.js`, `src/productos.controller.js`); no se crean módulos nuevos y no se cambian claves de persistencia (`src/storage.js`, `src/repository.js` sin cambios).

La secuencia va de dominio puro (models → productos.ops → validation), luego compatibilidad de respaldo (backup), luego editor de líneas (DOM), y finalmente cableado en el controlador. Las pruebas de propiedad (`fast-check`, `numRuns: 100`) y de ejemplo (`vitest` + `jsdom`) se intercalan por incremento. Las 14 Correctness Properties del diseño se implementan en las suites que fija la Testing Strategy. Cada prueba se etiqueta con `// Feature: producto-como-componente-de-linea, Property N: ...`. Los tests de regresión listados en la Testing Strategy no deben romperse.

## Tasks

- [x] 1. Extender el modelo de dominio en `src/models.js`
  - Añadir la constante `FUENTE_COMPONENTE = { PARAMETRO: "Parámetro", PRODUCTO: "Producto" }`.
  - Modificar `crearProducto(nombre, lineas, precioTotal, unidad = "UND")` para persistir `unidad` en el objeto Producto, con "UND" al crear.
  - Modificar `crearLinea(parametroId = null, cantidad = null, fuenteDeComponente = FUENTE_COMPONENTE.PARAMETRO, productoComponenteId = null)` para producir por defecto una Linea_De_Parametro retrocompatible.
  - Añadir `normalizarLinea(linea)` que completa datos antiguos sin mutar la entrada: `fuenteDeComponente` ausente => "Parámetro", `productoComponenteId` ausente => null, conservando `parametroId`, `cantidad` y `subtotal`.
  - Ampliar la publicación a `LP.models = { generarId, crearParametro, crearProducto, crearLinea, normalizarLinea, FUENTE_COMPONENTE }` manteniendo el estilo IIFE existente.
  - _Requisitos: 1.2, 7.2, 7.7, 9.1_

  - [ ]* 1.1 Escribir pruebas de propiedad de models en `tests/models.componente.property.test.js`
    - **Property 1: La línea nueva es una Linea_De_Parametro por defecto** — _Valida: Requisitos 1.2_
    - **Property 2: El Producto nuevo tiene Unidad_De_Producto "UND"** — _Valida: Requisitos 9.1_
    - **Property 3: La normalización interpreta datos antiguos de forma retrocompatible** — _Valida: Requisitos 7.2, 7.7_
    - Usar `fast-check` con `numRuns: 100` y el helper `tests/helpers/cargarLP.js`; etiquetar cada test con `// Feature: producto-como-componente-de-linea, Property N: ...`.
    - _Requisitos: 1.2, 7.2, 7.7, 9.1_

- [x] 2. Añadir constantes y mensajes de validación en `src/validation.js`
  - Añadir a `MENSAJES`: `LINEA_SIN_PRODUCTO`, `CICLO_DIRECTO`, `CICLO_INDIRECTO`, `COMPOSICION_DEMASIADO_PROFUNDA`, `REFERENCIA_PRODUCTO_NO_DISPONIBLE` con los textos exactos del diseño.
  - Reutilizar sin cambios el validador numérico existente `validarCantidad` (rango 0,01 a 999.999.999,99, hasta 2 decimales).
  - Conservar la firma y publicación actuales del módulo.
  - _Requisitos: 4.1, 4.2, 5.1, 5.2, 5.4, 5.5, 6.4_

- [x] 3. Implementar resolución de precio y detalle en `src/productos.ops.js`
  - [x] 3.1 Añadir constantes y `resolverPrecioUnitario`
    - Añadir `NOMBRE_PRODUCTO_COMPONENTE_AUSENTE = "Producto no disponible"` y `UNIDAD_DE_REEMPLAZO = "UND"`.
    - Implementar `resolverPrecioUnitario(linea, parametros, productos)`: fuente "Parámetro" => `precioUnitario` del Parametro; fuente "Producto" => `precioTotal` vigente del Producto_Componente; devolver `{ ok:false, motivo }` si el componente no existe o carece de precio. Sin mutación.
    - _Requisitos: 3.1, 3.2, 7.3_

  - [ ]* 3.2 Escribir pruebas de propiedad de resolución de precio en `tests/productos.ops.componente.property.test.js`
    - **Property 6: El precio unitario se resuelve según la fuente de la línea** — _Valida: Requisitos 3.1, 7.3_
    - **Property 7: El precio unitario falla cuando el componente no es resoluble** — _Valida: Requisitos 3.2_
    - `fast-check`, `numRuns: 100`; etiquetar cada test con el comentario de feature/propiedad.
    - _Requisitos: 3.1, 3.2, 7.3_

  - [x] 3.3 Extender `resolverDetalle(producto, parametros, productos)`
    - Distinguir por fuente: Linea_De_Parametro mapea nombre/unidad del Parametro (ausente => `NOMBRE_PARAMETRO_AUSENTE`, unidad ""); Linea_De_Producto mapea nombre/unidad del Producto_Componente (ausente => `NOMBRE_PRODUCTO_COMPONENTE_AUSENTE`, unidad "").
    - Mostrar `subtotal` y `precioTotal` tal como fueron almacenados, sin recalcular.
    - Mantener el nuevo parámetro `productos` opcional con valor por defecto seguro para no romper las llamadas existentes.
    - _Requisitos: 2.6, 6.1, 6.2_

  - [ ]* 3.4 Escribir prueba de propiedad de detalle en `tests/productos.ops.componente.property.test.js`
    - **Property 11: El detalle marca componentes ausentes y preserva valores almacenados** — _Valida: Requisitos 2.6, 6.1, 6.2_
    - _Requisitos: 2.6, 6.1, 6.2_

- [x] 4. Implementar cálculo del contenedor y edición por fuente en `src/productos.ops.js`
  - [x] 4.1 Implementar `calcularContenedor(lineas, parametros, productos)`
    - Recalcular cada `subtotal_i = redondear2(cantidad_i * precioUnitario_i)` resolviendo el precio unitario por fuente vía `resolverPrecioUnitario`, y `total = redondear2(suma)`; contenedor sin líneas => `total === 0`.
    - Usar las utilidades de redondeo half-up existentes en `calculo.js`. Sin mutación.
    - _Requisitos: 3.3, 3.4, 3.5, 6.3_

  - [ ]* 4.2 Escribir prueba de propiedad de cálculo en `tests/productos.ops.componente.property.test.js`
    - **Property 8: El cálculo del contenedor es consistente con el redondeo half-up** — _Valida: Requisitos 3.3, 3.4, 3.5_
    - _Requisitos: 3.3, 3.4, 3.5_

  - [x] 4.3 Extender `editarProducto(productos, id, lineasProducto, parametros)`
    - Conservar `id`, `nombre` y `unidad` del Producto; recalcular subtotales y `precioTotal` con el precio unitario resuelto por fuente vía `calcularContenedor`. Sin mutación.
    - Mantener el nuevo parámetro `parametros`/`productos` opcional con valor por defecto seguro para preservar las llamadas de las suites existentes.
    - _Requisitos: 6.3, 8.1, 9.5_

  - [x] 4.4 Extender `eliminarProducto(productos, id)`
    - Quitar el Producto de `id`; para cada Linea_De_Producto de otros Productos que lo referenciaba, marcarla como referencia no resuelta conservando `Cantidad` y `subtotal` almacenado; conservar subtotales y `precioTotal` de los demás sin recalcular. Sin mutación.
    - _Requisitos: 8.2_

  - [ ]* 4.5 Escribir pruebas de propiedad de edición y eliminación en `tests/productos.ops.componente.property.test.js`
    - **Property 9: La edición conserva identidad y recalcula por fuente** — _Valida: Requisitos 6.3, 8.1, 9.5_
    - **Property 10: La eliminación preserva a los demás y deja referencias no resueltas** — _Valida: Requisitos 8.2_
    - _Requisitos: 6.3, 8.1, 8.2, 9.5_

- [x] 5. Implementar validación de líneas y detección de ciclos en `src/productos.ops.js`
  - [x] 5.1 Implementar `validarLineasProducto(lineas, productos, idEnEdicion)`
    - Acumular TODOS los errores por línea con `{ indice, tipo }` donde `tipo` ∈ `sin-producto` | `producto-inexistente` | `cantidad-invalida` (reutilizar `validation.validarCantidad`).
    - Devolver `{ valido:true }` cuando todas las Lineas_De_Producto presentes tienen componente existente y cantidad en rango; `{ valido:false, errores:[...] }` en caso contrario.
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 6.4_

  - [ ]* 5.2 Escribir prueba de propiedad de validación en `tests/productos.ops.componente.property.test.js`
    - **Property 12: La validación acumula todos los errores por línea** — _Valida: Requisitos 4.1, 4.2, 4.3, 4.4, 4.5_
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.3 Implementar `detectarCicloComposicion(idContenedor, lineas, productos)`
    - Recorrido transitivo en profundidad; detectar ciclo directo (línea que referencia a `idContenedor`) e indirecto (camino que regresa a `idContenedor`, con `secuencia`).
    - Límite de 1.000 Productos distintos => tipo `profundidad`; tope de 2.000 ms con `Date.now()` => tipo `tiempo`; referencia a Producto no resoluble => tipo `referencia-no-resoluble` con `productoId`. Devolver `{ hayCiclo:false }` si no hay ciclo.
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 5.4 Escribir prueba de propiedad de ciclos en `tests/productos.ops.componente.property.test.js`
    - **Property 13: La detección de ciclos identifica ciclos y referencias no resolubles** — _Valida: Requisitos 5.1, 5.2, 5.3, 5.5_
    - Generar grafos de composición como cadenas para forzar ciclos indirectos (`A→B→…→A`) y referencias colgantes.
    - _Requisitos: 5.1, 5.2, 5.3, 5.5_

  - [x] 5.5 Actualizar la publicación de `LP.productosOps`
    - Publicar `{ NOMBRE_PARAMETRO_AUSENTE, NOMBRE_PRODUCTO_COMPONENTE_AUSENTE, UNIDAD_DE_REEMPLAZO, resolverDetalle, resolverPrecioUnitario, calcularContenedor, editarProducto, eliminarProducto, detectarCicloComposicion, validarLineasProducto }`.
    - _Requisitos: 2.6, 3.1, 3.2, 4.1, 5.1, 6.1, 8.1, 8.2_

  - [ ]* 5.6 Escribir prueba de propiedad de orden/exclusión del listado en `tests/productos.ops.componente.property.test.js`
    - **Property 4: El listado de componentes está ordenado y excluye el contenedor** — _Valida: Requisitos 2.1, 2.3_
    - **Property 5: La Unidad de visualización usa la Unidad_De_Reemplazo sin mutar** — _Valida: Requisitos 1.4, 7.6_
    - Nota: si el ordenamiento/exclusión o la resolución de unidad se implementan como helpers puros expuestos, probarlos directamente; ubicar ambas propiedades en esta suite.
    - _Requisitos: 1.4, 2.1, 2.3, 7.6_

- [x] 6. Checkpoint de dominio puro
  - Ejecutar `npx vitest run` y asegurar que pasan las nuevas suites de propiedad y toda la regresión de `product-detail-edit-delete`. Ante dudas, consultar al usuario.

- [x] 7. Asegurar compatibilidad de respaldo en `src/backup.js`
  - Verificar que `serializarRespaldo`/`parsearRespaldo` mantienen su firma y que el round-trip preserva `fuenteDeComponente`, `productoComponenteId`, `unidad`, `cantidad` y `subtotal` (campos serializados por `JSON.stringify`); mantener versión `"1"`.
  - Asegurar que `parsearRespaldo` devuelve la lista de Productos tal cual, dejando la normalización de compatibilidad (fuente ausente => "Parámetro", `unidad` no inventada) para el importador que reutiliza `models.normalizarLinea`.
  - _Requisitos: 7.1, 7.4, 8.3, 8.7, 9.2, 9.3, 9.4_

  - [ ]* 7.1 Escribir prueba de propiedad de round-trip en `tests/backup.componente.roundtrip.property.test.js`
    - **Property 14: El respaldo preserva líneas de producto, referencias y unidad (round-trip)** — _Valida: Requisitos 7.1, 7.4, 8.3, 8.7, 9.2, 9.3, 9.4_
    - Extender la Property 10 de backup existente con `fuenteDeComponente`, `productoComponenteId` y `unidad`, incluyendo referencias colgantes; `fast-check`, `numRuns: 100`.
    - _Requisitos: 7.1, 7.4, 8.3, 8.7, 9.2, 9.3, 9.4_

- [x] 8. Extender el editor de líneas en `src/lineas.editor.js`
  - [x] 8.1 Ampliar la firma y el estado del editor
    - Extender `crearEditorDeLineas({ contenedor, getParametros, getProductos, getIdEnEdicion, botonAgregar })` con los accesores `getProductos` y `getIdEnEdicion`.
    - Incluir `fuenteDeComponente` y `productoComponenteId` en la forma de línea en edición; `setLineas` hace deep-copy normalizando datos antiguos vía `models.normalizarLinea`.
    - Guardar todos los accesos al DOM contra `null` (degradación segura bajo `file://`). Mantener la API `LP.lineasEditor = { crearEditorDeLineas }`.
    - _Requisitos: 1.2, 7.2_

  - [x] 8.2 Implementar el control de fuente y el render por fuente
    - Añadir por fila un `<select>` de fuente ("Parámetro"/"Producto") con valor inicial "Parámetro" al agregar.
    - Fuente "Parámetro": mostrar selector de Parametro, Cantidad y Unidad del parámetro (comportamiento actual).
    - Fuente "Producto": mostrar selector de Producto_Componente (Productos ordenados alfabéticamente por nombre, excluyendo el Producto de `getIdEnEdicion`), Cantidad, y Unidad de solo lectura = `Unidad_De_Producto` del componente o `UNIDAD_DE_REEMPLAZO` "UND" si no está definida. Sin productos disponibles => indicación "No hay productos disponibles" y línea sin componente.
    - _Requisitos: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 7.6_

  - [x] 8.3 Implementar cambio de fuente y selección de Producto_Componente
    - Al alternar Parámetro↔Producto: descartar la referencia previa (`parametroId`/`productoComponenteId` a null) y restablecer la Cantidad a "sin ingresar".
    - Registrar/reemplazar `productoComponenteId` al seleccionar un Producto_Componente.
    - Referencia colgante: si `productoComponenteId` no existe, mostrar `NOMBRE_PRODUCTO_COMPONENTE_AUSENTE` y dejar la línea sin componente válido, conservando su Cantidad y subtotal.
    - _Requisitos: 1.5, 1.6, 2.4, 2.5, 2.6, 8.6_

  - [ ]* 8.4 Escribir pruebas de ejemplo del editor en `tests/lineas.editor.componente.test.js`
    - Control de fuente con ambas opciones (1.1); render por fuente y unidad de reemplazo no editable (1.3, 1.4); reset de cantidad y descarte de referencia al cambiar de fuente (1.5, 1.6); lista de productos vacía (2.2); reemplazo/registro de `productoComponenteId` (2.4, 2.5); exclusión del contenedor en edición (2.3); referencia colgante mostrada como no resuelta con preservación (8.6); cantidad inválida conserva la última válida y muestra error (1.8).
    - Usar `vitest` + `jsdom` y el helper `tests/helpers/cargarLP.js`.
    - _Requisitos: 1.1, 1.3, 1.4, 1.5, 1.6, 1.8, 2.2, 2.3, 2.4, 2.5, 8.6_

- [x] 9. Cablear el controlador en `src/productos.controller.js`
  - [x] 9.1 Instanciar el editor con los nuevos accesores
    - Pasar `getProductos` y (en edición) `getIdEnEdicion` al crear el editor de líneas para excluir el propio Producto_Contenedor.
    - Al construir un Producto nuevo, usar `crearProducto(nombre, lineas, total)` fijando `unidad = "UND"`.
    - _Requisitos: 2.3, 9.1_

  - [x] 9.2 Integrar validación, detección de ciclos y recálculo en calcular/guardar/editar
    - En `calcular`/`guardar`/`guardarEdicion`: usar `validarLineasProducto` (acumular errores y señalar cada línea), luego `detectarCicloComposicion` antes de recalcular.
    - Ante error, invocar `notifier.error(...)` con el mensaje exacto de `validation.MENSAJES` (línea sin producto, ciclo directo/indirecto con secuencia, composición demasiado profunda, referencia no disponible) y conservar la edición sin cambios.
    - Recalcular con `productosOps.calcularContenedor` y persistir con `repository.saveProductos`; fallo de escritura => `MENSAJE_NO_PERSISTENTE` conservando el estado en memoria. Al editar, `editarProducto` conserva la `unidad` previa.
    - _Requisitos: 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.3, 6.4, 7.5, 8.1, 9.5_

  - [ ]* 9.3 Escribir pruebas de integración del controlador en `tests/productos.controller.componente.integracion.test.js`
    - Guardar/editar producto con líneas mixtas recalcula y persiste (6.3, 8.1); rechazo con mensaje exacto ante línea sin producto (4.1), ciclo directo (5.1) e indirecto (5.2); referencia no disponible al guardar (6.4); fallo de escritura simulado => `MENSAJE_NO_PERSISTENTE` y estado conservado (7.5).
    - Usar `vitest` + `jsdom` y el helper `tests/helpers/cargarLP.js`.
    - _Requisitos: 4.1, 5.1, 5.2, 6.3, 6.4, 7.5, 8.1_

- [x] 10. Checkpoint final
  - Ejecutar `npx vitest run` y asegurar que pasan todas las suites nuevas y que la regresión listada en la Testing Strategy (`tests/productos.ops.property.test.js`, `tests/backup.roundtrip.property.test.js`, `tests/calculadora.regression.test.js`, `tests/lineas.editor.test.js`, `tests/ventana.detalle.test.js`, `tests/ventana.edicion.test.js`, `tests/lista.productos.test.js`, `tests/eliminacion.test.js`, `tests/persistencia.integracion.test.js`, `tests/exportar.importar.integracion.test.js`, `tests/setup.smoke.test.js`) sigue pasando sin cambios de comportamiento. Ante dudas, consultar al usuario.

## Notes

- Las tareas marcadas con `*` son de pruebas (propiedad/ejemplo/integración) y pueden omitirse para un MVP más rápido; las tareas de implementación centrales nunca están marcadas como opcionales.
- Cada tarea referencia requisitos específicos para trazabilidad y, cuando corresponde, la propiedad del diseño que valida.
- Las 14 Correctness Properties se implementan una por sub-tarea, en las suites que fija la Testing Strategy: Prop 1-3 en `tests/models.componente.property.test.js`; Prop 4-13 en `tests/productos.ops.componente.property.test.js`; Prop 14 en `tests/backup.componente.roundtrip.property.test.js`.
- Todas las pruebas de propiedad usan `fast-check` con `numRuns: 100` y se etiquetan con `// Feature: producto-como-componente-de-linea, Property N: ...`.
- No se crean módulos nuevos ni se cambian claves de persistencia; `src/storage.js` y `src/repository.js` no se modifican. La compatibilidad de datos antiguos se logra vía `models.normalizarLinea`.
- Los checkpoints aseguran validación incremental y que la regresión no se rompa.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["1.1", "3.1", "7"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.1", "7.1"] },
    { "id": 3, "tasks": ["3.4", "4.2", "4.3", "4.4", "5.1", "5.3"] },
    { "id": 4, "tasks": ["4.5", "5.2", "5.4", "5.5"] },
    { "id": 5, "tasks": ["5.6", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] },
    { "id": 7, "tasks": ["8.4", "9.1"] },
    { "id": 8, "tasks": ["9.2"] },
    { "id": 9, "tasks": ["9.3"] }
  ]
}
```
