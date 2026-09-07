# Implementation Plan: Ver detalle, editar y eliminar Productos

## Overview

El plan implementa las tres acciones por Producto (Ver detalle, Editar, Eliminar) sobre la base vanilla existente, respetando la separación entre dominio puro y controladores DOM. Se avanza de forma incremental: primero se prepara el entorno de pruebas, luego el dominio puro nuevo (`productos.ops.js`), después el editor de líneas reutilizable (`lineas.editor.js`), a continuación el cableado de los modales y la Lista_De_Productos en `productos.controller.js`, y finalmente las pruebas de integración y round-trip. Cada paso construye sobre el anterior y termina cableando la funcionalidad en la Aplicacion, sin código huérfano.

El proyecto es JavaScript vanilla sin gestor de paquetes ni runner de pruebas (no existe `package.json` ni tests). El plan incluye una tarea de configuración de Vitest + fast-check ejecutados una sola vez (`--run`, sin modo watch), respetando que la Aplicacion siga cargándose como Scripts_Clasicos bajo `file://` (los módulos siguen publicando en `window.LP`; las pruebas importan los archivos y proveen un `window`/`document` mediante jsdom).

## Tasks

- [x] 1. Configurar el entorno de pruebas (Vitest + fast-check)
  - Crear `package.json` con dependencias de desarrollo: `vitest`, `fast-check` y `jsdom`.
  - Añadir un script de pruebas que ejecute una sola vez: `vitest run` (sin modo watch).
  - Configurar `vitest.config.js` con entorno `jsdom` para las pruebas de controladores DOM.
  - Crear un helper de carga que evalúe los Scripts_Clasicos de `src/` contra un `window` global (para poblar `window.LP`) reutilizable por las suites de pruebas.
  - No modificar la forma de carga de la Aplicacion en `index.html` (sigue siendo `<script>` clásico bajo `file://`).
  - _Requisitos: soporte de pruebas para 2.x, 3.x, 4.x, 6.1_

- [x] 2. Implementar el dominio puro de operaciones sobre Productos (`src/productos.ops.js`)
  - [x] 2.1 Crear el módulo `src/productos.ops.js` con la constante y `resolverDetalle`
    - Publicar `window.LP.productosOps` con el patrón IIFE `(function (global) { ... })(window)` como el resto del dominio.
    - Definir y exportar `NOMBRE_PARAMETRO_AUSENTE = "Parámetro no disponible"`.
    - Implementar `resolverDetalle(producto, parametros)`: mapear cada línea en orden a `{ nombreParametro, ausente, cantidad, unidad, subtotal }`, usando el nombre y la unidad del Parametro referenciado; si `parametroId` es null o el Parametro no existe, marcar `ausente = true`, `nombreParametro = NOMBRE_PARAMETRO_AUSENTE`, `unidad = ""`. Conservar el `subtotal` almacenado sin recalcular. Devolver `{ nombre, precioTotal, lineas }` con `precioTotal` igual al del Producto (sin recalcular). No mutar entradas.
    - _Requisitos: 2.2, 2.3, 2.4, 6.3_

  - [x]* 2.2 Escribir prueba de propiedad para `resolverDetalle` (orden/nombre/unidad/subtotal)
    - **Property 1: El detalle mapea líneas en orden con nombre, unidad y subtotal almacenado**
    - **Validates: Requisitos 2.2, 6.3**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 1`; `fast-check` con `numRuns: 100`.

  - [x]* 2.3 Escribir prueba de propiedad para `resolverDetalle` (Precio_Total preservado)
    - **Property 2: El detalle preserva el Precio_Total almacenado**
    - **Validates: Requisitos 2.3, 6.3**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 2`; `numRuns: 100`.

  - [x]* 2.4 Escribir prueba de propiedad para `resolverDetalle` (Parametro ausente)
    - **Property 3: Las líneas con Parametro ausente se marcan como Nombre_Parametro_Ausente**
    - **Validates: Requisitos 2.4**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 3`; `numRuns: 100`.

  - [x] 2.5 Implementar `editarProducto` y `eliminarProducto` en `src/productos.ops.js`
    - `editarProducto(productos, id, lineasProducto)`: devolver una NUEVA lista donde el Producto de `id` se reemplaza por una versión que conserva `id` y `nombre` originales, con las nuevas líneas, subtotales recalculados y `precioTotal` recalculado usando `calculo.calcularProducto` y `calculo.redondear2`. El resto de Productos se conserva sin cambios y en el mismo orden. Si el `id` no existe, devolver una copia sin cambios. Asumir líneas ya válidas (validadas en el controlador). No mutar entradas.
    - `eliminarProducto(productos, id)`: devolver una NUEVA lista sin el Producto de `id`, conservando el resto sin cambios y en el mismo orden; si el `id` no existe, devolver una copia sin cambios. No mutar entradas.
    - _Requisitos: 3.5, 4.2_

  - [x]* 2.6 Escribir prueba de propiedad para `editarProducto` (id y nombre)
    - **Property 4: La edición conserva el identificador y el nombre**
    - **Validates: Requisitos 3.5**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 4`; `numRuns: 100`.

  - [x]* 2.7 Escribir prueba de propiedad para `editarProducto` (subtotales y total consistentes)
    - **Property 5: La edición recalcula de forma consistente subtotales y Precio_Total**
    - **Validates: Requisitos 3.5**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 5`; `numRuns: 100`.

  - [x]* 2.8 Escribir prueba de propiedad para `editarProducto` (aislamiento y tamaño)
    - **Property 6: La edición no altera los demás Productos ni el tamaño de la lista**
    - **Validates: Requisitos 3.5**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 6`; `numRuns: 100`.

  - [x]* 2.9 Escribir prueba de propiedad para `eliminarProducto`
    - **Property 9: Eliminar quita exactamente el Producto y conserva el resto**
    - **Validates: Requisitos 4.2**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 9`; `numRuns: 100`.

- [x] 3. Checkpoint - Verificar el dominio puro
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implementar el editor de líneas reutilizable (`src/lineas.editor.js`)
  - [x] 4.1 Crear el módulo `src/lineas.editor.js` con `crearEditorDeLineas`
    - Publicar `window.LP.lineasEditor` con `crearEditorDeLineas({ contenedor, getParametros, botonAgregar })`.
    - Extraer de `productos.controller.js` la lógica de líneas hoy contenida en `agregarLinea`, `eliminarLinea`, `renderLineas`, `construirFilaLinea`, `actualizarUnidad` y `aNumeroCantidad`, sin cambiar su comportamiento (selector de Parametro, visualización de la Unidad, input de cantidad, botón eliminar, indicación de estado sin líneas).
    - Mantener el estado propio de líneas en edición e implementar: `render()`, `agregarLinea()`, `eliminarLinea(indice)`, `setLineas(lineas)` con **deep-copy** de la entrada, `getLineas()` que devuelve las líneas en edición (parametroId y cantidad cruda), `contarLineasQueReferencian(parametroId)` y `desreferenciarParametro(parametroId)`.
    - Si `botonAgregar` se provee, cablear su evento `click` a `agregarLinea`. Guardar todos los accesos al DOM contra `null` (degradación segura).
    - El editor NO valida ni calcula: solo captura entrada y expone `getLineas()`.
    - _Requisitos: 3.2, 3.3_

  - [x]* 4.2 Escribir prueba de propiedad para `setLineas`/`getLineas` (precarga)
    - **Property 7: Abrir la edición precarga exactamente las líneas del Producto**
    - **Validates: Requisitos 3.2**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 7`; `numRuns: 100` (con jsdom para el contenedor).

  - [x]* 4.3 Escribir prueba de propiedad para deep-copy (aislamiento del original)
    - **Property 8: Editar la copia no muta el Producto original (aislamiento al cancelar)**
    - **Validates: Requisitos 3.9**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 8`; `numRuns: 100`.

  - [x]* 4.4 Escribir pruebas de ejemplo (jsdom) para el editor de líneas
    - Agregar/eliminar líneas re-renderiza; estado sin líneas muestra la indicación de vacío; el selector refleja los Parametros vigentes y muestra la Unidad; ausencia de contenedor no lanza.
    - _Requisitos: 3.3_

- [x] 5. Integrar el editor de líneas en la Calculadora (`src/productos.controller.js`)
  - [x] 5.1 Reemplazar la lógica de líneas interna por una instancia del editor
    - Instanciar `lineasEditor.crearEditorDeLineas({ contenedor: #lineas-container, getParametros, botonAgregar: #btn-agregar-linea })` y usarla en `calcular`/`guardar` (leer líneas con `getLineas()`).
    - Delegar las funciones de módulo `contarLineasQueReferencian`/`desreferenciarParametro` (usadas por `parametros.controller.js`, Req 2.4 base) al editor de la Calculadora activa.
    - Conservar los MENSAJES existentes (`SIN_LINEAS`, `CANTIDAD_INVALIDA`, `SIN_PARAMETRO`) y el flujo de guardado actual sin regresiones.
    - _Requisitos: 3.3_

  - [x]* 5.2 Escribir pruebas de regresión (jsdom) de la Calculadora
    - Verificar que calcular/guardar siguen funcionando tras la extracción y que la desreferencia de Parametros de la Calculadora sigue operando.
    - _Requisitos: 3.3_

- [x] 6. Añadir el marcado de modales y los scripts nuevos en `index.html`
  - [x] 6.1 Añadir el marcado estático de los modales de Bootstrap y los `<script>`
    - Añadir `#modal-detalle` (título, cuerpo para líneas, pie con Precio_Total) y `#modal-edicion` (nombre en solo lectura, contenedor de líneas, botón "Agregar línea", botones "Guardar" y "Cancelar").
    - Añadir `<script src="src/productos.ops.js">` en el grupo de dominio puro (tras `calculo.js`/`validation.js`, antes de `backup.js`) y `<script src="src/lineas.editor.js">` en el grupo de UI, antes de `productos.controller.js`.
    - _Requisitos: 1.1, 2.1, 3.1, 3.4_

- [x] 7. Renderizar la Lista_De_Productos con las tres acciones (`src/productos.controller.js`)
  - [x] 7.1 Ampliar `renderListaProductos()` con nombre, Precio_Total y tres botones
    - Para cada Producto, renderizar nombre, `formatearPEN(precioTotal)` (2 decimales) y los botones Ver detalle, Editar y Eliminar, cada `<li>` con `data-id`.
    - Con lista vacía, mostrar la indicación de "no hay productos" y ningún botón.
    - Cablear cada botón con el `id` leído de `data-id` para invocar `abrirDetalle(id)`, `abrirEdicion(id)` y `confirmarYEliminar(id)`.
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x]* 7.2 Escribir pruebas (jsdom) de la Lista_De_Productos
    - Lista no vacía renderiza nombre, Precio_Total en PEN y los tres botones (Req 1.1); lista vacía muestra la indicación y ningún botón (Req 1.2); clic en cada acción invoca el flujo correcto con el `id` correcto (Req 1.3–1.5).
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 8. Implementar la Ventana_Detalle (`src/productos.controller.js`)
  - [x] 8.1 Implementar `abrirDetalle(id)` y el helper de control de modales
    - Localizar el Producto por `id` en `getProductos()`; llamar `productosOps.resolverDetalle(producto, getParametros())`.
    - Renderizar cada línea en orden: nombre del Parametro (o `NOMBRE_PARAMETRO_AUSENTE` con Unidad vacía si `ausente`), Cantidad, Unidad y subtotal con `formatearPEN`; renderizar el Precio_Total con `formatearPEN`.
    - Si el Producto no tiene líneas, mostrar nombre, mensaje "Este producto no tiene líneas de cálculo." y el Precio_Total.
    - Mostrar el modal sin controles de edición; implementar el helper de apertura/cierre que usa `new bootstrap.Modal(el).show()/.hide()` cuando `window.bootstrap && window.bootstrap.Modal` existe, y un fallback manual (alternar `d-none` + backdrop propio) en caso contrario. Cerrar no muta nada.
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x]* 8.2 Escribir pruebas (jsdom) de la Ventana_Detalle
    - Producto con líneas muestra nombre, líneas en orden y Precio_Total (Req 2.1–2.3); línea con Parametro ausente muestra el texto y Unidad vacía (Req 2.4); solo lectura sin controles de edición (Req 2.5); abrir/cerrar no persiste ni muta (Req 2.6); Producto sin líneas muestra el mensaje y el Precio_Total (Req 2.7); ausencia de la API de Bootstrap usa el fallback sin lanzar.
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 9. Implementar la Ventana_Edicion (`src/productos.controller.js`)
  - [x] 9.1 Implementar `abrirEdicion(id)` con instancia del editor y precarga
    - Localizar el Producto por `id`; guardar `id` y `nombre` originales; mostrar el nombre en solo lectura.
    - Crear o reutilizar una instancia de `lineasEditor` apuntando al contenedor del modal de edición y cargar `producto.lineas` con `setLineas()` (deep-copy).
    - Abrir el modal mediante el mismo helper de control (Bootstrap o fallback).
    - _Requisitos: 3.1, 3.2, 3.3, 3.4_

  - [x] 9.2 Implementar `guardarEdicion` con validación y persistencia
    - Validar en orden reutilizando los MENSAJES de la Calculadora: sin líneas → `SIN_LINEAS` (Req 3.6); cantidad no numérica o fuera de 0,01–999.999.999,99 vía `validation.validarCantidad` → `CANTIDAD_INVALIDA` (Req 3.7); línea sin Parametro seleccionado/existente → `SIN_PARAMETRO` (Req 3.8). Ante rechazo, conservar los datos en edición y no persistir.
    - Si todo es válido: construir `lineasProducto` (parametroId, cantidad numérica, subtotal); llamar `productosOps.editarProducto(getProductos(), id, lineasProducto)`; `repository.saveProductos(nueva)`; `setProductos(nueva)`; re-renderizar la lista; cerrar el modal.
    - Definir `MENSAJE_NO_PERSISTENTE = "Los cambios se aplicaron en esta sesión, pero no se pudieron guardar de forma persistente."`. Si `saveProductos` devuelve `status: "failed"`, aplicar `setProductos(nueva)` igualmente y mostrar `notifier.error(MENSAJE_NO_PERSISTENTE)`.
    - Cancelar o cerrar el modal descarta el estado del editor sin tocar `getProductos()` ni el Almacenamiento_Local.
    - _Requisitos: 3.5, 3.6, 3.7, 3.8, 3.9, 5.1, 5.3_

  - [x]* 9.3 Escribir pruebas (jsdom) de la Ventana_Edicion
    - Abrir precarga las líneas y muestra el nombre en solo lectura (Req 3.1, 3.2); rechazos con los mensajes exactos `SIN_LINEAS`/`CANTIDAD_INVALIDA`/`SIN_PARAMETRO` sin persistir y conservando datos (Req 3.6–3.8); guardar válido reemplaza por id, conserva id/nombre, persiste y cierra (Req 3.5); fallo de escritura conserva en memoria y muestra `MENSAJE_NO_PERSISTENTE` (Req 5.3); cancelar/cerrar descarta sin mutar (Req 3.9).
    - _Requisitos: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8, 3.9, 5.3_

- [x] 10. Implementar la eliminación con confirmación (`src/productos.controller.js`)
  - [x] 10.1 Implementar `confirmarYEliminar(id)`
    - Solicitar `notifier.confirmar(MENSAJE_CONFIRMAR_ELIMINACION)` antes de eliminar; si cancela, no hacer nada.
    - Si confirma: `nueva = productosOps.eliminarProducto(getProductos(), id)`; `repository.saveProductos(nueva)`; `setProductos(nueva)`; re-renderizar (deja de mostrar el Producto).
    - Si la escritura falla, aplicar `setProductos(nueva)` igualmente y mostrar `notifier.error(MENSAJE_NO_PERSISTENTE)`.
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 5.2, 5.3_

  - [x]* 10.2 Escribir pruebas (jsdom) de la eliminación
    - Se solicita confirmación antes de quitar (Req 4.1); confirmar quita la fila y persiste (Req 4.2, 4.4); cancelar no cambia nada (Req 4.3); fallo de escritura conserva en memoria y muestra `MENSAJE_NO_PERSISTENTE` (Req 4.5, 5.3).
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 5.3_

- [x] 11. Checkpoint - Verificar controladores y flujos de UI
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Pruebas de persistencia, round-trip de respaldo e integración
  - [x]* 12.1 Escribir prueba de propiedad del round-trip de respaldo
    - **Property 10: El respaldo preserva la lista de Productos (round-trip)**
    - **Validates: Requisitos 6.1**
    - Etiqueta: `Feature: product-detail-edit-delete, Property 10`; `numRuns: 100`; usar `backup.serializarRespaldo`/`backup.parsearRespaldo` sobre listas resultantes de ediciones/eliminaciones.

  - [x]* 12.2 Escribir pruebas de integración de persistencia y sesión
    - Guardar edición y confirmar eliminación invocan `repository.saveProductos` con la lista completa (Req 5.1, 5.2); round-trip de sesión con `repository.load()` restaura ediciones/eliminaciones (Req 5.4).
    - _Requisitos: 5.1, 5.2, 5.4_

  - [x]* 12.3 Escribir pruebas de integración de exportar/importar
    - Tras editar/eliminar, el respaldo incluye Productos actualizados y excluye los eliminados; importar los muestra con las tres acciones (Req 6.1, 6.2); detalle/edición de un Producto importado no recalcula (Req 6.3); importación inválida se rechaza, muestra error y conserva los Productos existentes (Req 6.4).
    - _Requisitos: 6.1, 6.2, 6.3, 6.4_

- [x] 13. Checkpoint final - Verificar toda la funcionalidad
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas) y pueden omitirse para un MVP más rápido; las tareas de implementación central nunca se marcan como opcionales.
- Cada tarea referencia requisitos específicos para trazabilidad.
- Los checkpoints garantizan validación incremental.
- Las pruebas de propiedad (fast-check, `numRuns >= 100`) validan las 10 propiedades universales del diseño; hay exactamente un test de propiedad por propiedad de diseño.
- Las pruebas por ejemplo/jsdom validan el cableado de controladores, los mensajes exactos y la degradación segura.
- `backup.js`, `basedatos.controller.js`, `repository.js` y `app.js` no se modifican: la exportación/importación y la restauración de sesión ya operan sobre el arreglo `productos` compartido.
- Los modales se controlan con `bootstrap.Modal` cuando está disponible, con un fallback manual (`d-none`) para tolerar la ausencia del bundle bajo `file://`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "2.5", "4.1"] },
    { "id": 2, "tasks": ["2.6", "2.7", "2.8", "2.9", "4.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "8.1"] },
    { "id": 6, "tasks": ["8.2", "9.1"] },
    { "id": 7, "tasks": ["9.2"] },
    { "id": 8, "tasks": ["9.3", "10.1"] },
    { "id": 9, "tasks": ["10.2", "12.1", "12.2", "12.3"] }
  ]
}
```
