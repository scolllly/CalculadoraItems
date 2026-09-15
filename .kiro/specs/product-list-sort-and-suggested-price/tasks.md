# Implementation Plan: Ordenamiento por nombre y Precio_Sugerido

## Overview

Se amplía el `Controlador_De_Productos` (`src/productos.controller.js`) con dos
capacidades independientes (Req 1: ordenamiento por nombre; Req 2: Precio_Sugerido),
más el botón estático en `index.html` y el estilo del Badge_Sugerido en
`styles/app.css`. Todo el código nuevo vive dentro del IIFE existente
(`window.LP.productosController`), sin sintaxis de Módulos ES, reutilizando
`window.LP.currency.formatearPEN` y `window.LP.calculo.redondear2`.

El enfoque es incremental y guiado por pruebas: primero las funciones puras
(`normalizarNombre` + `Comparador_De_Nombres`, `ordenarProductos`,
`calcularPrecioSugerido`), luego el cableado del render y el DOM (botón, badge),
finalmente los estilos y la actualización de la suite existente. Se usa
**fast-check + Vitest** (jsdom ya configurado; `fast-check` ya está en
`devDependencies`), con mínimo 100 iteraciones por propiedad y etiqueta
`// Feature: product-list-sort-and-suggested-price, Property {n}: {texto}`.

Los cambios tocan únicamente: `src/productos.controller.js`, `index.html`,
`styles/app.css` y archivos de prueba bajo `tests/`.

**Cambios incrementales (delta) sobre el Precio_Sugerido ya implementado:** El grupo de
tareas original (1–14) está completo. Se añade el grupo 15 ("Cambios: Divisor 0.70 y
formato del Badge_Sugerido") que cubre únicamente dos cambios sobre la funcionalidad del
Precio_Sugerido: (a) el `Divisor_De_Sugerido` pasa de `0.6` a `0.7`; (b) se agrega el
helper puro `calcularPrecioRedondeado` (menor múltiplo de 5 mayor o igual al
Precio_Sugerido, inclusivo) y el `Badge_Sugerido` pasa a mostrar el texto compuesto
`"S/ <sugerido> -> S/ <redondeado>"`. La clase y los colores del badge (lila/blanco) no
cambian, por lo que **no hay tarea de CSS**.

## Tasks

- [x] 1. Preparar el entorno de pruebas
  - [x] 1.1 Verificar que fast-check está disponible como dependencia de desarrollo
    - Revisar `package.json`; `fast-check` ya figura en `devDependencies` (`^3.23.1`)
    - Si por algún motivo faltara, agregarlo con `npm install -D fast-check`
    - Ejecutar `npm test` (`vitest run`) una vez para confirmar que la suite base pasa antes de empezar
    - _Requirements: (habilitador de pruebas para todas las propiedades)_

- [x] 2. Comparador_De_Nombres: collator en español y normalización de nombres
  - [x] 2.1 Agregar el Comparador_De_Nombres y `normalizarNombre` a nivel de módulo
    - En `src/productos.controller.js`, dentro del IIFE, declarar
      `const colacionNombres = new Intl.Collator("es", { sensitivity: "base" });`
    - Implementar `normalizarNombre(nombre)` que devuelva `""` para `null`/`undefined`
      y `String(nombre)` en otro caso (sin recortar espacios)
    - _Requirements: 1.7, 1.8, 1.9_

  - [ ]* 2.2 Escribir prueba de propiedad de insensibilidad a caso/diacríticos
    - Archivo `tests/comparador.nombres.property.test.js`
    - **Property 4: Insensibilidad a mayúsculas/minúsculas y diacríticos**
    - **Validates: Requirements 1.7**
    - Etiqueta: `// Feature: product-list-sort-and-suggested-price, Property 4: ...`
    - `fc.assert(..., { numRuns: 100 })`; verificar `colacionNombres.compare(base, variante) === 0`

- [x] 3. ordenarProductos: ordenamiento no mutante por Nombre_Mostrado
  - [x] 3.1 Implementar `ordenarProductos(productos, direccion)`
    - En `src/productos.controller.js`, dentro del IIFE, no mutar la entrada
      (usar `.slice()`), partir en grupos de nombre vacío / no vacío conservando el
      índice original, ordenar los no vacíos con `colacionNombres.compare(...)`
      (invertir el signo para `descendente`) y desempatar por índice (estabilidad)
    - Anteponer los vacíos en `ascendente` y anexarlos en `descendente`
    - _Requirements: 1.5, 1.6, 1.9, 1.10, 1.11, 1.12_

  - [ ]* 3.2 Escribir prueba de propiedad de permutación y no mutación
    - Archivo `tests/ordenar.productos.property.test.js`
    - **Property 1: El ordenamiento es una permutación de la entrada (ambas direcciones) sin mutar la entrada**
    - **Validates: Requirements 1.5, 1.6**
    - Generar productos con `id` único; comparar multiconjuntos de ids y confirmar que la lista original no cambia

  - [ ]* 3.3 Escribir prueba de propiedad de orden ascendente no decreciente
    - Archivo `tests/ordenar.productos.property.test.js`
    - **Property 2: Orden ascendente no decreciente en la porción no vacía**
    - **Validates: Requirements 1.5**
    - Verificar `colacionNombres.compare(nombre_i, nombre_{i+1}) <= 0` en pares consecutivos no vacíos

  - [ ]* 3.4 Escribir prueba de propiedad de orden descendente no creciente
    - Archivo `tests/ordenar.productos.property.test.js`
    - **Property 3: Orden descendente no creciente en la porción no vacía**
    - **Validates: Requirements 1.6**
    - Verificar `colacionNombres.compare(nombre_i, nombre_{i+1}) >= 0` en pares consecutivos no vacíos

  - [ ]* 3.5 Escribir prueba de propiedad de colocación de nombres vacíos
    - Archivo `tests/ordenar.productos.property.test.js`
    - **Property 5: Colocación de los nombres vacíos según la dirección (`null`/`undefined` como `""`)**
    - **Validates: Requirements 1.9, 1.10, 1.11**
    - Ascendente: vacíos antes de todos los no vacíos; descendente: vacíos después

  - [ ]* 3.6 Escribir prueba de propiedad de estabilidad
    - Archivo `tests/ordenar.productos.property.test.js`
    - **Property 6: Estabilidad del ordenamiento para nombres equivalentes**
    - **Validates: Requirements 1.12**
    - Generar nombres deliberadamente equivalentes (misma base, distinta capitalización/diacríticos) y verificar que conservan el orden relativo por `id`, en ambas direcciones

- [x] 4. calcularPrecioSugerido: cálculo protegido del Precio_Sugerido
  - [x] 4.1 Implementar `DIVISOR_DE_SUGERIDO` y `calcularPrecioSugerido(precioTotal)`
    - En `src/productos.controller.js`, dentro del IIFE, declarar
      `const DIVISOR_DE_SUGERIDO = 0.6;`
    - Normalizar la base a `0` cuando `!Number.isFinite(precioTotal) || precioTotal < 0`,
      devolver `redondear2(base / DIVISOR_DE_SUGERIDO)` y volver a proteger contra `NaN` (-> `0`)
    - _Requirements: 2.2, 2.7, 2.8_

  - [ ]* 4.2 Escribir prueba de propiedad del cálculo del Precio_Sugerido
    - Archivo `tests/precio.sugerido.property.test.js`
    - **Property 7: `calcularPrecioSugerido(pt) === redondear2(pt / 0.60)` para `pt` finito `>= 0`**
    - **Validates: Requirements 2.2**
    - Generador de `fc.double` finito `>= 0` (incluye `0`)

  - [ ]* 4.3 Escribir prueba de propiedad de entrada inválida -> 0 sin lanzar
    - Archivo `tests/precio.sugerido.property.test.js`
    - **Property 10: Precio_Total inválido produce 0 sin interrumpir**
    - **Validates: Requirements 2.8**
    - Generador de `NaN`, `Infinity`, `-Infinity`, negativos y no numéricos; verificar retorno `0` y ausencia de excepción

- [x] 5. Checkpoint - Funciones puras verificadas
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. actualizarNombreAccesibleOrden y estado de dirección
  - [x] 6.1 Agregar `IDS.btnOrdenar`, el estado `direccionDeOrden` y `actualizarNombreAccesibleOrden()`
    - En `src/productos.controller.js`: añadir `btnOrdenar: "btn-ordenar-productos"` a `IDS`
    - Declarar `let direccionDeOrden = "ascendente";` junto a los demás estados del controlador (Req 1.2)
    - Implementar `actualizarNombreAccesibleOrden()` que fije `aria-label` y `title` del
      `#btn-ordenar-productos` describiendo la Direccion_De_Orden_Siguiente (el valor opuesto al actual),
      con guarda contra `null`
    - _Requirements: 1.2, 1.14_

- [x] 7. Cableado del Boton_De_Orden en init()
  - [x] 7.1 Cablear el click del Boton_De_Orden y fijar el Nombre_Accesible inicial
    - En `init()` de `src/productos.controller.js`, obtener `$(IDS.btnOrdenar)` (guarda contra `null`),
      registrar un `click` que alterne `direccionDeOrden` entre `ascendente`/`descendente`,
      llame a `actualizarNombreAccesibleOrden()` y a `renderListaProductos()`
    - Tras el cableado, invocar `actualizarNombreAccesibleOrden()` una vez para el Nombre_Accesible inicial
    - _Requirements: 1.3, 1.4, 1.14_

- [x] 8. Ordenar la Lista_De_Productos en renderListaProductos()
  - [x] 8.1 Renderizar desde una copia ordenada preservando el estado vacío
    - En `renderListaProductos()`, evaluar el estado vacío (Req 1.13) ANTES de ordenar, conservando
      el marcado existente (`p.text-muted.lp-productos-vacios`, "No hay productos guardados.")
    - Cuando hay productos, iterar sobre `ordenarProductos(getProductos().slice(), direccionDeOrden)`
      sin mutar el arreglo devuelto por `getProductos()`
    - _Requirements: 1.5, 1.6, 1.13_

- [x] 9. Badge_Sugerido en renderListaProductos()
  - [x] 9.1 Insertar el Badge_Sugerido a la derecha del badge del Precio_Total
    - Dentro del bucle de render de cada `<li>`, tras el badge verde existente (sin cambios, Req 2.6),
      crear `span.badge.rounded-pill.lp-producto-sugerido` con
      `formatearPEN(calcularPrecioSugerido(producto.precioTotal))` y agregarlo al bloque `info`
      después de `.lp-producto-precio`
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 9.2 Escribir prueba de propiedad del invariante de formato PEN del Badge_Sugerido
    - Archivo `tests/precio.sugerido.dom.property.test.js` (jsdom + controlador)
    - **Property 8: El texto del Badge_Sugerido = `formatearPEN(calcularPrecioSugerido(precioTotal))` y coincide con `/^S\/ -?\d+\.\d{2}$/`**
    - **Validates: Requirements 2.3, 2.7, 2.8**
    - Generar productos con `precioTotal` variado (incluye `0`, no finito y negativo); nunca `"S/ NaN"`

- [x] 10. Estilo del Badge_Sugerido
  - [x] 10.1 Añadir la clase `.lp-producto-sugerido` en styles/app.css
    - Agregar `.lp-producto-sugerido { background-color: #6f42c1; color: #fff; }`
    - _Requirements: 2.4, 2.5_

- [x] 11. Botón estático en index.html
  - [x] 11.1 Añadir el Boton_De_Orden junto al encabezado "Productos guardados"
    - En `index.html`, dentro de `#pagina-productos`, envolver el `<h2>Productos guardados</h2>` y el
      nuevo botón en un `div.d-flex.justify-content-between.align-items-center` (con `h5 mb-0` en el `<h2>`)
    - Añadir `<button type="button" id="btn-ordenar-productos" class="btn btn-outline-secondary btn-sm">Ordenar por nombre</button>`
      antes de `#lista-productos`
    - _Requirements: 1.1_

- [ ] 12. Pruebas DOM basadas en ejemplos (ordenamiento y badge)
  - [ ]* 12.1 Escribir prueba de propiedad de alternancia del Boton_De_Orden (DOM)
    - Archivo `tests/orden.suggerido.dom.test.js`
    - **Property 9: Alternancia por paridad de pulsaciones**
    - **Validates: Requirements 1.3, 1.4**
    - Con fast-check (numRuns 100): número par de clics deja `ascendente`, impar deja `descendente`

  - [ ]* 12.2 Escribir pruebas DOM de ejemplo del ordenamiento y accesibilidad
    - Archivo `tests/orden.suggerido.dom.test.js`
    - Req 1.1: tras `init`, existe `#btn-ordenar-productos`
    - Req 1.2: render inicial ascendente (orden de `data-id` de una lista conocida) y `aria-label` inicial describe `descendente`
    - Req 1.3/1.4: un clic reordena a descendente y actualiza `aria-label`; segundo clic vuelve a ascendente
    - Req 1.8: alfabeto español, p. ej. `["ñandú","nube","oso"]` -> `["nube","ñandú","oso"]`
    - Req 1.13: lista vacía conserva `.lp-productos-vacios` sin `li.lp-producto`
    - Req 1.14: `aria-label`/`title` describen la Direccion_De_Orden_Siguiente antes y después de un clic
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8, 1.13, 1.14_

  - [ ]* 12.3 Escribir pruebas DOM de ejemplo del Badge_Sugerido
    - Archivo `tests/orden.suggerido.dom.test.js`
    - Req 2.1/2.4/2.5: `span.lp-producto-sugerido` existe, con `badge rounded-pill lp-producto-sugerido`, y aparece DESPUÉS de `.lp-producto-precio` dentro de `info`
    - Req 2.6: el badge verde conserva `badge bg-success rounded-pill` y `textContent === formatearPEN(precioTotal)`
    - Req 2.7: producto con `precioTotal` 0 -> Badge_Sugerido `"S/ 0.00"`
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7_

- [x] 13. Actualizar la suite existente de la Lista_De_Productos
  - [x] 13.1 Revisar y ampliar tests/lista.productos.test.js
    - Documentar que el orden observado de `data-id` es consecuencia del ordenamiento ascendente (no del orden de inserción)
    - Añadir un caso cuyo orden de inserción difiera del alfabético para evitar falsa cobertura
    - Añadir aserciones para `.lp-producto-sugerido` análogas a las de `.lp-producto-precio`
      (patrón `/^S\/ -?\d+\.\d{2}$/` y valor `formatearPEN(calcularPrecioSugerido(...))`)
    - _Requirements: 1.5, 2.1, 2.3_

- [x] 14. Checkpoint final - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Cambios: Divisor 0.70 y formato del Badge_Sugerido
  - [x] 15.1 Cambiar el Divisor_De_Sugerido de 0.6 a 0.7
    - En `src/productos.controller.js`, dentro del IIFE, cambiar
      `const DIVISOR_DE_SUGERIDO = 0.6;` por `const DIVISOR_DE_SUGERIDO = 0.7;`
    - `calcularPrecioSugerido` no cambia en lo demás: sigue normalizando la base a `0`
      cuando `!Number.isFinite(precioTotal) || precioTotal < 0` y protegiendo el resultado
      de `redondear2` contra `NaN` (-> `0`)
    - _Requirements: 2.2_

  - [x] 15.2 Implementar el helper puro `calcularPrecioRedondeado(precioSugerido)`
    - En `src/productos.controller.js`, dentro del IIFE, declarar
      `const MULTIPLO_DE_REDONDEO = 5;`
    - Implementar `calcularPrecioRedondeado(precioSugerido)` que devuelva el menor múltiplo
      de 5 mayor o IGUAL al Precio_Sugerido: `Math.ceil(redondear2(precioSugerido / 5)) * 5`
    - Inclusivo: si `precioSugerido` ya es múltiplo exacto de 5 (p. ej. `15.00`) devuelve
      ese mismo valor (`15.00`), NO `20.00`. Usar `redondear2` sobre el cociente antes de
      `Math.ceil` neutraliza el error de punto flotante
    - Proteger la entrada: si `precioSugerido` no es finito o es negativo, devolver `0`
      (`0` es múltiplo de 5)
    - _Requirements: 2.3, 2.4_

  - [ ]* 15.3 Actualizar la prueba de propiedad del cálculo del Precio_Sugerido (divisor 0.70)
    - Archivo `tests/precio.sugerido.property.test.js`
    - **Property 7: `calcularPrecioSugerido(pt) === redondear2(pt / 0.70)` para `pt` finito `>= 0`**
    - **Validates: Requirements 2.2**
    - Actualizar el oráculo de `redondear2(pt / 0.60)` a `redondear2(pt / 0.70)`; mantener el
      generador de `fc.double` finito `>= 0` (incluye `0`) y `numRuns: 100`

  - [ ]* 15.4 Escribir prueba de propiedad de `calcularPrecioRedondeado`
    - Archivo `tests/precio.sugerido.property.test.js`
    - **Property 11: `calcularPrecioRedondeado(ps)` es múltiplo de 5, `>= ps`, `(res - 5) < ps`; inclusivo si `ps` es múltiplo de 5**
    - **Validates: Requirements 2.3, 2.4**
    - Etiqueta: `// Feature: product-list-sort-and-suggested-price, Property 11: ...`
    - `fc.assert(..., { numRuns: 100 })`; verificar `res % 5 === 0`, `res >= ps` y `res - 5 < ps`
    - Incluir un generador de múltiplos exactos de 5 (`fc.nat().map((k) => 5 * k)`) para
      ejercitar el caso inclusivo / de punto flotante (`ps` múltiplo de 5 -> `res === ps`)

  - [x] 15.5 Componer el texto del Badge_Sugerido con el Precio_Redondeado en renderListaProductos()
    - En `renderListaProductos()` de `src/productos.controller.js`, cambiar el
      `sugeridoEl.textContent` de `formatearPEN(calcularPrecioSugerido(producto.precioTotal))`
      al texto compuesto: calcular
      `const precioSugerido = calcularPrecioSugerido(producto.precioTotal);` y
      `const precioRedondeado = calcularPrecioRedondeado(precioSugerido);`, y asignar
      `sugeridoEl.textContent = formatearPEN(precioSugerido) + " -> " + formatearPEN(precioRedondeado);`
      (p. ej. `"S/ 14.30 -> S/ 15.00"`)
    - La clase del span NO cambia: sigue siendo exactamente `"badge rounded-pill lp-producto-sugerido"`
      (el CSS en `styles/app.css` permanece igual, colores lila/blanco intactos)
    - _Requirements: 2.5, 2.6, 2.7, 2.11, 2.12_

  - [ ]* 15.6 Actualizar la prueba de propiedad del formato compuesto del Badge_Sugerido
    - Archivo `tests/precio.sugerido.dom.property.test.js` (jsdom + controlador)
    - **Property 8: El texto del Badge_Sugerido = texto compuesto y coincide con `/^S\/ -?\d+\.\d{2} -> S\/ -?\d+\.\d{2}$/`; el monto derecho es múltiplo de 5**
    - **Validates: Requirements 2.5, 2.6, 2.7, 2.11, 2.12**
    - Actualizar la aserción del patrón de `/^S\/ -?\d+\.\d{2}$/` al patrón compuesto
      `/^S\/ -?\d+\.\d{2} -> S\/ -?\d+\.\d{2}$/`; verificar que el monto de la derecha es
      múltiplo de 5 y que los casos de `precioTotal` `0`/no finito/negativo muestran
      `"S/ 0.00 -> S/ 0.00"`; nunca `"S/ NaN"`

  - [ ]* 15.7 Actualizar las pruebas DOM de ejemplo del Badge_Sugerido (formato compuesto)
    - Archivo `tests/orden.suggerido.dom.test.js`
    - Actualizar las aserciones de `.lp-producto-sugerido` al nuevo formato compuesto:
      caso no múltiplo (`Precio_Sugerido = 14.30` -> `"S/ 14.30 -> S/ 15.00"`), caso ya
      múltiplo (`Precio_Sugerido = 15.00` -> `"S/ 15.00 -> S/ 15.00"`, no `"... -> S/ 20.00"`)
      y caso cero/inválido (`precioTotal` `0`/no finito/negativo -> `"S/ 0.00 -> S/ 0.00"`)
    - _Requirements: 2.5, 2.6, 2.7, 2.11, 2.12_

  - [ ]* 15.8 Actualizar la suite existente de la Lista_De_Productos (formato compuesto)
    - Archivo `tests/lista.productos.test.js`
    - Actualizar las aserciones de `.lp-producto-sugerido` para esperar el nuevo formato
      compuesto: patrón `/^S\/ -?\d+\.\d{2} -> S\/ -?\d+\.\d{2}$/` y valor
      `formatearPEN(calcularPrecioSugerido(...)) + " -> " + formatearPEN(calcularPrecioRedondeado(...))`;
      incluir el caso no múltiplo (`14.30 -> 15.00`), el caso ya múltiplo (`15.00 -> 15.00`)
      y el caso cero (`"S/ 0.00 -> S/ 0.00"`)
    - _Requirements: 2.5, 2.6, 2.7, 2.11, 2.12_

  - [x] 15.9 Checkpoint - Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las sub-tareas marcadas con `*` son opcionales (pruebas) y pueden omitirse para un MVP más rápido; el modelo NO las implementa automáticamente.
- Cada tarea referencia criterios de aceptación y/o propiedades de corrección específicas para trazabilidad.
- Las 11 propiedades de corrección del diseño se implementan cada una en una única prueba basada en propiedades (fast-check, mínimo 100 iteraciones, etiquetadas con `// Feature: product-list-sort-and-suggested-price, Property {n}: {texto}`).
- Las pruebas de ejemplo/DOM complementan las propiedades con escenarios observables concretos.
- Los checkpoints aseguran validación incremental (funciones puras primero, luego DOM/estilos, luego suite existente).
- El ordenamiento opera sobre una copia (`getProductos().slice()`), por lo que no altera el estado compartido ni el orden de persistencia.
- El grupo 15 es un cambio incremental sobre el Precio_Sugerido ya implementado (grupos 1–14, completos): cambia el `Divisor_De_Sugerido` a `0.7`, agrega el helper `calcularPrecioRedondeado` (Property 11) y compone el texto del `Badge_Sugerido` como `"S/ <sugerido> -> S/ <redondeado>"`. El CSS del badge no cambia (colores lila/blanco preservados), por lo que no hay tarea de CSS. El divisor (15.1), el nuevo helper (15.2) y el cambio del render (15.5) editan el mismo archivo (`src/productos.controller.js`), por lo que se secuencian en oleadas separadas (15.1 -> 15.2 -> 15.5); después las actualizaciones de pruebas (15.3, 15.4, 15.6, 15.7, 15.8) en paralelo y, por último, el checkpoint final (15.9).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "4.1", "10.1", "11.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "4.2", "4.3"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "6.1"] },
    { "id": 3, "tasks": ["7.1", "8.1"] },
    { "id": 4, "tasks": ["9.1"] },
    { "id": 5, "tasks": ["9.2", "12.1", "12.2", "12.3", "13.1"] },
    { "id": 6, "tasks": ["15.1"] },
    { "id": 7, "tasks": ["15.2"] },
    { "id": 8, "tasks": ["15.5"] },
    { "id": 9, "tasks": ["15.3", "15.4", "15.6", "15.7", "15.8"] }
  ]
}
```
