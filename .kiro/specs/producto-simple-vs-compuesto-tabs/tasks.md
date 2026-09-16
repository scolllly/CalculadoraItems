# Implementation Plan: Producto simple vs compuesto (pestañas)

## Overview

Este plan convierte el diseño en pasos de codificación incrementales sobre el
proyecto Limpiapipas (JavaScript vanilla, Scripts_Clasicos bajo `file://`, sin
módulos ES, espacio de nombres `window.LP`, Bootstrap + Bootstrap Icons, pruebas
con Vitest + jsdom + fast-check).

El orden sigue el flujo del diseño: primero la lógica pura (Clasificador_De_Producto
y su uso en crear/editar/normalizar), luego la persistencia y el respaldo (solo
comentarios, sin cambios de comportamiento), después el render en pestañas
(Contenedor_De_Tabs) con sus estados vacíos y su fallback manual de conmutación, y
finalmente la aplicación del Normalizador al cargar e importar. Cada paso se apoya
en el anterior y termina cableado a lo que ya existe, sin código huérfano.

Las pruebas de propiedad (fast-check) cubren las 9 correctness properties del
diseño (una prueba por propiedad, etiquetadas
`Feature: producto-simple-vs-compuesto-tabs, Property N`). Las pruebas de ejemplo
en jsdom cubren el render de tabs, iconos, rótulos, selección por defecto, toggle,
estados vacíos y el ocultamiento del flag. Las pruebas de integración cubren la
normalización al cargar/importar. Se contempla además la regresión de los tests
existentes.

## Tasks

- [x] 1. Implementar el Clasificador_De_Producto (`models.esCompuesto`)
  - En `src/models.js`, añadir la función pura `esCompuesto(lineas)` que devuelve
    `true` si existe al menos una Linea_De_Producto
    (`fuenteDeComponente === FUENTE_COMPONENTE.PRODUCTO`) y `false` en caso
    contrario
  - Tratar `null`/`undefined`/no-array como conjunto vacío → `false`
  - Interpretar una línea sin `fuenteDeComponente` como Linea_De_Parametro (no
    cuenta como Linea_De_Producto)
  - No mutar las líneas evaluadas
  - Publicar `esCompuesto` en `window.LP.models` junto al resto de fábricas
  - Comentarios y nombres en español, con referencias a los requisitos
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x]* 1.1 Escribir prueba de propiedad de la regla del Clasificador
    - Archivo nuevo `tests/clasificador.compuesto.property.test.js`
    - **Feature: producto-simple-vs-compuesto-tabs, Property 1: Regla del Clasificador_De_Producto**
    - Generar líneas con `fuenteDeComponente` en `{ "Parámetro", "Producto", ausente }` (incluir listas vacías); afirmar `esCompuesto` ⇔ existe al menos una línea de Producto
    - `numRuns` mínimo 100; cargar módulos con `tests/helpers/cargarLP.js`
    - _Requisitos: 3.1, 3.2, 3.4_

  - [x]* 1.2 Escribir prueba de propiedad de determinismo e inmutabilidad del Clasificador
    - En `tests/clasificador.compuesto.property.test.js`
    - **Feature: producto-simple-vs-compuesto-tabs, Property 2: El Clasificador es determinista y no muta sus entradas**
    - Afirmar que dos evaluaciones consecutivas devuelven el mismo resultado y que la lista (y sus objetos) permanece profundamente igual (snapshot antes/después)
    - _Requisitos: 3.5_

- [x] 2. Derivar el Flag_Compuesto al crear un Producto (`models.crearProducto`)
  - En `src/models.js`, ampliar `crearProducto(nombre, lineas, precioTotal, unidad="UND")` para incluir el campo `compuesto: esCompuesto(lineas)`
  - Conservar `id`, `nombre`, `lineas`, `precioTotal` y `unidad` con los mismos valores que hoy
  - _Requisitos: 1.1, 1.2, 1.3, 1.4_

  - [x]* 2.1 Escribir prueba de propiedad de creación (deriva y preserva)
    - En `tests/clasificador.compuesto.property.test.js`
    - **Feature: producto-simple-vs-compuesto-tabs, Property 3: Crear deriva el flag y preserva los demás campos**
    - Afirmar `compuesto === esCompuesto(lineas)`, conservación de `nombre`/`lineas`/`precioTotal`/`unidad`, e `id` string no vacío
    - _Requisitos: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Recalcular el Flag_Compuesto al editar (`productosOps.editarProducto`)
  - En `src/productos.ops.js`, ampliar el objeto `editado` para incluir `compuesto: LP.models.esCompuesto(lineas)` recalculado desde las líneas resultantes
  - Acceder a `LP.models.esCompuesto` en tiempo de llamada con fallback seguro (mismo patrón que `FUENTE_COMPONENTE`), sin depender del orden de los IIFE
  - Conservar `id`, `nombre` y `unidad` del Producto editado como hoy; no alterar los demás Productos ni el orden
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 3.1 Escribir prueba de propiedad de edición (recalcula desde líneas resultantes)
    - Ampliar `tests/productos.ops.property.test.js`
    - **Feature: producto-simple-vs-compuesto-tabs, Property 4: Editar recalcula el flag desde las líneas resultantes**
    - Afirmar `compuesto === esCompuesto(lineasResultantes)` y conservación de `id`/`nombre`/`unidad`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4_

  - [x]* 3.2 Escribir prueba de propiedad de no-alteración de los demás Productos ni del orden
    - Ampliar `tests/productos.ops.property.test.js` (la Property 5 ya existe; añadir/asegurar la aserción del nuevo campo)
    - **Feature: producto-simple-vs-compuesto-tabs, Property 5: Editar no altera los demás Productos ni el orden**
    - Afirmar mismo tamaño, mismo orden de `id`s y Productos no editados sin cambios
    - _Requisitos: 2.5_

- [x] 4. Implementar el Normalizador_De_Producto (`models.normalizarProducto`)
  - En `src/models.js`, añadir la función pura `normalizarProducto(producto)` que devuelve una copia con el Flag_Compuesto garantizado
  - Si `compuesto` ya es booleano, conservarlo sin recalcular (idempotencia); en otro caso derivarlo con `esCompuesto(lineas)`
  - Conservar `id`, `nombre`, `lineas`, `precioTotal` y `unidad`; no mutar la entrada; operar sobre objeto vacío defensivo si recibe `null`/`undefined`
  - Publicar `normalizarProducto` en `window.LP.models`
  - _Requisitos: 4.1, 4.2, 4.3_

  - [x]* 4.1 Escribir prueba de propiedad del Normalizador (deriva ausente, conserva booleano, idempotente)
    - Archivo nuevo `tests/normalizador.producto.property.test.js`
    - **Feature: producto-simple-vs-compuesto-tabs, Property 6: El Normalizador deriva el flag ausente y es idempotente**
    - Generar Productos con `compuesto` en `{ true, false, ausente, null }`; afirmar derivación cuando no es booleano, conservación cuando lo es, preservación de campos e idempotencia (`normalizar(normalizar(p)) ≡ normalizar(p)`)
    - _Requisitos: 4.1, 4.2, 4.3_

- [x] 5. Checkpoint - Núcleo puro
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Confirmar y documentar la persistencia y el respaldo del Flag_Compuesto
  - [x] 6.1 Actualizar comentarios de persistencia (localStorage)
    - En `src/repository.js` y/o `src/storage.js`, actualizar comentarios para documentar que `compuesto` es un campo plano del Producto que se persiste y se lee sin cambios vía `JSON.stringify`/`JSON.parse` (sin cambios de comportamiento)
    - _Requisitos: 5.1_

  - [x] 6.2 Actualizar comentarios de respaldo (backup)
    - En `src/backup.js`, actualizar los comentarios de `serializarRespaldo`/`parsearRespaldo` para mencionar `compuesto` entre los campos planos preservados en el roundtrip (sin cambios de estructura ni de firma)
    - _Requisitos: 5.2, 5.3_

  - [x]* 6.3 Escribir prueba de propiedad de roundtrip en Almacenamiento_Local
    - Añadir a `tests/persistencia.integracion.test.js` (o archivo nuevo con `localStorage` de jsdom)
    - **Feature: producto-simple-vs-compuesto-tabs, Property 7: El flag persiste en el Almacenamiento_Local (roundtrip)**
    - Generar Productos con `compuesto` booleano arbitrario; afirmar que `saveProductos`→`load` preserva `compuesto` y el orden
    - _Requisitos: 5.1_

  - [x]* 6.4 Ampliar prueba de propiedad de roundtrip del respaldo para el flag
    - Ampliar `tests/backup.roundtrip.property.test.js` (generadores incluyen ahora `compuesto` booleano)
    - **Feature: producto-simple-vs-compuesto-tabs, Property 8: El flag sobrevive el roundtrip del respaldo**
    - Afirmar que `parsearRespaldo(serializarRespaldo(parametros, productos))` es `ok` y preserva `compuesto` en el mismo orden
    - _Requisitos: 5.2, 5.3_

- [x] 7. Implementar el helper de partición por flag para el render
  - [x] 7.1 Extraer/crear el helper puro de partición
    - En `src/productos.controller.js`, implementar la partición que separa la lista en compuestos (`compuesto === true`) y simples (`!producto.compuesto`), preservando el orden relativo de entrada dentro de cada grupo, sin perder ni duplicar Productos
    - Mantenerlo aislado y testeable (función pura reutilizable por el render)
    - _Requisitos: 6.2, 6.3, 6.6_

  - [x]* 7.2 Escribir prueba de propiedad de la partición
    - Archivo nuevo `tests/particion.tabs.property.test.js`
    - **Feature: producto-simple-vs-compuesto-tabs, Property 9: La partición separa por flag preservando la pertenencia y el orden**
    - Afirmar exactitud de cada grupo (compuestos = `compuesto === true`, simples = resto), sin pérdidas ni duplicados, y preservación del orden relativo
    - _Requisitos: 6.2, 6.3, 6.6_

- [ ] 8. Implementar el Contenedor_De_Tabs en `renderListaProductos`
  - [x] 8.1 Extraer el helper de tarjeta `construirItemProducto(producto)`
    - En `src/productos.controller.js`, extraer la construcción del `<li>` actual (nombre, badge de Precio_Total en PEN, precios sugeridos/Badge_Sugerido y botones Ver detalle / Editar / Eliminar cableados por `data-id`) en un helper reutilizable, sin cambiar la tarjeta actual
    - _Requisitos: 6.4_

  - [x] 8.2 Construir dinámicamente la estructura de pestañas y paneles
    - En `renderListaProductos`, construir dentro de `#lista-productos` (vaciado en cada render) el `ul.nav.nav-tabs` (role=tablist) con Tab_Compuestos y Tab_Simples, y el `div.tab-content` con los dos `tab-pane`
    - Usar el helper de partición (tarea 7) y aplicar `ordenarProductos(lista, direccionDeOrden)` a cada pestaña; renderizar cada Producto con `construirItemProducto`
    - Conservar el chequeo previo de estado vacío global ("No hay productos guardados.", clase `lp-productos-vacios`) antes de construir los tabs
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [-] 8.3 Aplicar selección por defecto, rótulos e iconos
    - Tab_Compuestos primero y activo (`active`/`show` en pestaña y panel), rotulado "Productos compuestos" con `<i class="bi bi-boxes">`
    - Tab_Simples segundo y no activo, rotulado "Productos simples" con `<i class="bi bi-box">`
    - _Requisitos: 7.1, 7.2, 7.3, 7.5_

  - [-] 8.4 Implementar estados vacíos por pestaña
    - Con al menos un Producto guardado pero Tab_Compuestos vacío → mensaje "No hay productos compuestos." en su panel
    - Con al menos un Producto guardado pero Tab_Simples vacío → mensaje "No hay productos simples." en su panel
    - _Requisitos: 8.2, 8.3_

  - [-] 8.5 Implementar la conmutación de pestañas con fallback manual
    - Implementar `activarTab(boton, panel)` y cablear un listener de `click` por botón que alterne `active`/`aria-selected` en los botones y `show`/`active` (y `d-none` como respaldo) en los paneles
    - Funcionar con y sin la API de Bootstrap JS (patrón de fallback de modales); al reconstruir en cada render no acumular listeners sobre nodos viejos
    - _Requisitos: 7.4_

  - [ ]* 8.6 Escribir pruebas de ejemplo del render de tabs (jsdom)
    - Ampliar `tests/lista.productos.test.js`
    - Con productos existen dos pestañas y dos paneles (6.1); cada tarjeta conserva nombre, badges y los tres botones con `data-id` (6.4); Tab_Compuestos primero y activo, Tab_Simples segundo no activo (7.1, 7.5); rótulos e iconos `bi-boxes`/`bi-box` (7.2, 7.3); clic en pestaña alterna paneles con y sin Bootstrap (7.4); estados vacíos por panel y estado vacío global (8.1, 8.2, 8.3)
    - _Requisitos: 6.1, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3_

  - [ ]* 8.7 Escribir pruebas de ejemplo de re-render tras acciones (jsdom)
    - Ampliar `tests/lista.productos.test.js`
    - Editar un Producto para volverlo compuesto y verificar que aparece en Tab_Compuestos tras el re-render; caso análogo al eliminar
    - _Requisitos: 6.5_

- [~] 9. Checkpoint - Render de pestañas
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Garantizar el ocultamiento del Flag_Compuesto en detalle y edición
  - Verificar que `abrirDetalle`/`resolverDetalle` no leen ni muestran `compuesto` y que `abrirEdicion`/`guardarEdicion` no exponen ningún control del flag; ajustar solo si algo lo expusiera
  - Confirmar que el flag se deriva exclusivamente de las líneas, sin control manual
  - _Requisitos: 9.1, 9.2, 9.3_

  - [ ]* 10.1 Escribir pruebas de ejemplo de ocultamiento del flag (jsdom)
    - Ampliar `tests/ventana.detalle.test.js` (el detalle no muestra el flag) y `tests/ventana.edicion.test.js` (la edición no expone ningún control del flag)
    - _Requisitos: 9.1, 9.2, 9.3_

- [x] 11. Aplicar el Normalizador al cargar (`app.js`)
  - En `src/app.js` (`iniciarApp`), tras `repository.load()`, mapear `productos = productos.map(LP.models.normalizarProducto)` antes de fijarlos en el estado en memoria
  - Aplicar de forma defensiva (solo si `LP.models.normalizarProducto` existe); no lanzar si no está disponible
  - _Requisitos: 4.4_

- [x] 12. Aplicar el Normalizador al importar (`basedatos.controller.js`)
  - En `src/basedatos.controller.js` (`aplicarReemplazo`), mapear la lista de productos importada con `normalizarProducto` antes de `setProductos`/`replaceAll`, de modo que el flag quede también persistido
  - Degradar de forma segura si `normalizarProducto` no está disponible
  - _Requisitos: 4.5_

  - [x]* 12.1 Escribir pruebas de integración de normalización al cargar/importar (jsdom)
    - Ampliar `tests/persistencia.integracion.test.js` (precargar productos sin `compuesto`, iniciar y verificar que quedan clasificados y persistidos) y `tests/exportar.importar.integracion.test.js` (importar productos sin `compuesto` y verificar clasificación y persistencia)
    - _Requisitos: 4.4, 4.5_

- [x] 13. Actualizar pruebas de regresión existentes por el nuevo campo `compuesto`
  - [x] 13.1 Ajustar comparaciones `toEqual` de Productos completos
    - En `tests/productos.ops.property.test.js` y demás tests que comparan Productos completos, contemplar el nuevo campo `compuesto` (o compararlo explícitamente) para que sigan pasando
    - _Requisitos: 1.4, 2.4_

  - [ ]* 13.2 Añadir aserción de referencia colgante en `eliminarProducto`
    - En `tests/eliminacion.test.js`, verificar como aserción adicional que un contenedor con una Linea_De_Producto colgante (`productoComponenteId === null`, `fuenteDeComponente === "Producto"`) conserva `compuesto === true` tras eliminar el sub-producto
    - _Requisitos: 3.5, 5.1_

- [~] 14. Checkpoint final - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas) y pueden omitirse para un MVP más rápido; las tareas de implementación nunca se marcan como opcionales.
- Cada tarea referencia sub-requisitos concretos para trazabilidad.
- Los checkpoints aseguran validación incremental.
- Las pruebas de propiedad validan las 9 correctness properties del diseño (una prueba por propiedad, `numRuns` mínimo 100, cargando módulos con `tests/helpers/cargarLP.js`).
- Las pruebas de ejemplo (jsdom) y de integración validan render de tabs, ocultamiento del flag y normalización al cargar/importar.
- Se mantiene el estilo del proyecto: JavaScript vanilla, `window.LP`, comentarios y nombres en español.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["1.1", "1.2", "2", "4"] },
    { "id": 2, "tasks": ["2.1", "3", "4.1", "6.1", "6.2"] },
    { "id": 3, "tasks": ["3.1", "3.2", "6.3", "6.4", "7.1", "11", "12"] },
    { "id": 4, "tasks": ["7.2", "8.1", "10", "12.1", "13.1"] },
    { "id": 5, "tasks": ["8.2"] },
    { "id": 6, "tasks": ["8.3", "8.4", "8.5"] },
    { "id": 7, "tasks": ["8.6", "8.7", "10.1", "13.2"] }
  ]
}
```
