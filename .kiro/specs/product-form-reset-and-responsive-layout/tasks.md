# Implementation Plan: product-form-reset-and-responsive-layout

## Overview

El plan implementa dos mejoras ortogonales sobre la Pagina_Productos, con cambio mínimo y localizado:

1. **Reinicio del Formulario_De_Calculadora tras Guardado_Exitoso** (Requisito 1): una función privada `reiniciarFormulario()` en `src/productos.controller.js`, invocada al final de `guardar()` tras `renderListaProductos()`.
2. **Disposición responsiva** (Requisitos 2, 3, 4): envolver `#calculadora` y la Lista_De_Productos en un `div.row` con dos columnas Bootstrap (`col-12 col-lg-6`) en `index.html`, sin tocar ids ni lógica JS.

Las tareas siguen las convenciones del proyecto: JavaScript vanilla sobre `window.LP`, Scripts_Clasicos cargados en pruebas con `tests/helpers/cargarLP.js`, Vitest en una sola pasada (`--run`) con jsdom, fast-check para PBT, Bootstrap local, ejecución bajo `file://`, interfaz en español y moneda PEN. Las pruebas de propiedad y las unitarias/estructura se marcan como opcionales (`*`).

## Tasks

- [x] 1. Implementar el reinicio del formulario en el controlador de productos
  - [x] 1.1 Añadir la función privada `reiniciarFormulario()` en `crearProductosController`
    - En `src/productos.controller.js`, dentro de `crearProductosController`, agregar la función privada `reiniciarFormulario()` siguiendo el estilo de las demás (acceso al DOM vía el helper `$(id)` y guardas contra `null`).
    - (a) fijar `#producto-nombre` (`IDS.nombre`) en cadena vacía (`input.value = ""`), guardando contra `null`.
    - (b) invocar `editorLineas.setLineas([])` (solo si `editorLineas` existe) para dejar cero Lineas_De_Calculo en edición.
    - (c) limpiar el Area_De_Resultado `#resultado-calculo` (`IDS.resultado`) poniendo `textContent = ""`, guardando contra `null`.
    - No modificar validaciones, cálculo, persistencia ni mensajes.
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Invocar `reiniciarFormulario()` al final de `guardar()`
    - Añadir la llamada a `reiniciarFormulario()` como última instrucción de `guardar()`, después de `renderListaProductos()`.
    - No agregar guardas ni condiciones: el reinicio solo se alcanza cuando no hubo retorno temprano por Guardado_Rechazado, cubriendo Guardado_Exitoso normal y Persistencia_Fallida, y garantizando que el Producto ya esté en la lista antes de vaciar el formulario.
    - _Requirements: 1.4, 1.5, 1.6_

  - [ ]* 1.3 Escribir prueba de propiedad: Guardado_Exitoso deja el Estado_Inicial_En_Blanco
    - Archivo nuevo `tests/producto.reinicio.property.test.js` (jsdom, fast-check, `numRuns: 100`), cargando la lógica con `tests/helpers/cargarLP.js` y montando el DOM mínimo (`#producto-nombre`, `#lineas-container`, `#btn-agregar-linea`, `#btn-calcular`, `#resultado-calculo`, `#btn-guardar-producto`, `#lista-productos`).
    - Generadores `arbNombreValido` y `arbLineaValida`; ejercitar en dos modos de persistencia: escritura exitosa y `repository` que devuelve `{status:"failed"}` (Persistencia_Fallida). Verificar que tras `guardar()` el nombre es `""`, `editorLineas.getLineas().length === 0` y `#resultado-calculo` queda vacío.
    - **Property 1: Un Guardado_Exitoso deja el formulario en el Estado_Inicial_En_Blanco**
    - Etiquetar el test: "Feature: product-form-reset-and-responsive-layout, Property 1: ...".
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [ ]* 1.4 Escribir prueba de propiedad: Guardado_Rechazado conserva el formulario
    - En `tests/producto.reinicio.property.test.js`, generador `arbEntradaInvalida` (nombre vacío/solo espacios, cero líneas, cantidad fuera de rango, o parámetro inexistente). Capturar el estado del formulario antes de `guardar()` y verificar que nombre, líneas en edición y contenido del Area_De_Resultado permanecen idénticos.
    - **Property 2: Un Guardado_Rechazado conserva el formulario sin cambios**
    - Etiquetar: "Feature: product-form-reset-and-responsive-layout, Property 2: ...".
    - **Validates: Requirements 1.5**

  - [ ]* 1.5 Escribir prueba de propiedad: el Producto se agrega a la lista antes de reiniciar
    - En `tests/producto.reinicio.property.test.js`, con nombre y líneas válidos verificar que tras `guardar()` la Lista_De_Productos contiene el Producto guardado (mismo nombre y Precio_Total calculado) **y** el formulario queda en el Estado_Inicial_En_Blanco.
    - **Property 3: Un Guardado_Exitoso agrega el Producto a la lista antes de reiniciar**
    - Etiquetar: "Feature: product-form-reset-and-responsive-layout, Property 3: ...".
    - **Validates: Requirements 1.6**

  - [ ]* 1.6 Escribir pruebas unitarias por ejemplo del reinicio y sus casos límite
    - Archivo nuevo `tests/producto.reinicio.unit.test.js` (jsdom, `cargarLP.js`):
    - Persistencia_Fallida: con `repository` que devuelve `failed`, tras `guardar()` se muestra el mensaje exacto de "no persistente" y el formulario queda en el Estado_Inicial_En_Blanco.
    - Estado vacío del editor: tras el reinicio, `#lineas-container` contiene `.lp-lineas-vacias` con el texto exacto "No hay líneas agregadas.".
    - Degradación del reinicio: invocar `guardar()` con DOM incompleto (sin `#producto-nombre` o sin `#resultado-calculo`) no lanza.
    - Cada tipo de Guardado_Rechazado (nombre vacío, cero líneas, cantidad inválida, parámetro inexistente): verificar el mensaje exacto y que el formulario no se reinicia.
    - _Requirements: 1.2, 1.4, 1.5_

- [x] 2. Checkpoint - reinicio del formulario
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Aplicar la disposición responsiva de dos columnas en `index.html`
  - [x] 3.1 Envolver la Calculadora y la Lista_De_Productos en un `div.row` con dos columnas
    - En `index.html`, dentro de `#pagina-productos`, reemplazar la disposición apilada actual por un `div.row` con dos columnas `col-12 col-lg-6`.
    - Primera columna: la card `#calculadora` (contenido interno sin cambios). Segunda columna: `<h2>Productos guardados</h2>` + `#lista-productos` (sin cambios internos).
    - La Calculadora debe ir **primero** en el DOM (izquierda en escritorio, arriba en móvil y sin Bootstrap). Punto_De_Corte_Responsivo en el breakpoint `lg`.
    - Conservar todos los ids intactos (`#calculadora`, `#lista-productos`, `#producto-nombre`, `#resultado-calculo`, `#lineas-container`, etc.). No añadir CSS propio de layout en `styles/app.css`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.3_

  - [ ]* 3.2 Escribir pruebas de estructura del DOM del layout responsivo
    - Archivo nuevo `tests/layout.responsivo.test.js` (jsdom), cargando `index.html`:
    - Existe un `div.row` dentro de `#pagina-productos` con exactamente dos columnas.
    - La primera columna contiene `#calculadora` y la segunda contiene `#lista-productos` (Calculadora precede a la Lista en el orden del DOM).
    - Ambas columnas llevan las clases `col-12` y `col-lg-6`.
    - Se conservan los ids `#calculadora`, `#lista-productos`, `#producto-nombre`, `#resultado-calculo`, `#lineas-container`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.3_

- [x] 4. Verificar regresión de las suites existentes
  - [x] 4.1 Ejecutar la suite completa y confirmar que no hay regresiones
    - Ejecutar Vitest en una sola pasada (`--run`). Confirmar que `tests/lista.productos.test.js`, `tests/ventana.edicion.test.js`, `tests/calculadora.regression.test.js` y las demás suites permanecen verdes tras el cambio de `guardar()` y el reordenamiento del marcado en `index.html`.
    - Corregir cualquier ruptura provocada por los cambios (sin alterar ids ni lógica de dominio).
    - _Requirements: 4.3_

  - [ ]* 4.2 Verificación visual/manual del reflow responsivo
    - Tarea manual (no automatizable en jsdom). Abrir `index.html` bajo `file://` y verificar: en escritorio (≥ `lg`) Calculadora y Lista lado a lado sin desplazamiento horizontal; al reducir por debajo de `lg` se apilan con la Calculadora arriba y al aumentar vuelven a dos columnas; con el CSS de Bootstrap deshabilitado ambos bloques se apilan al 100% en orden del DOM, visibles y utilizables.
    - _Requirements: 2.3, 3.3, 3.4, 4.2_

- [x] 5. Checkpoint final - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas y verificación manual) y pueden omitirse para un MVP más rápido; las de implementación (1.1, 1.2, 3.1, 4.1) no.
- Cada tarea referencia los criterios de aceptación concretos que cubre para trazabilidad.
- Las tres pruebas de propiedad (una por propiedad de diseño) usan fast-check con mínimo 100 iteraciones sobre jsdom y se etiquetan con "Feature: product-form-reset-and-responsive-layout, Property N: ...".
- Los Requisitos 2/3/4 se cubren con pruebas de estructura del DOM (por ejemplo) y verificación visual/manual, ya que el reflow de CSS no es observable en jsdom.
- No se introducen ni modifican modelos de datos; se reutiliza `editorLineas.setLineas([])` y el resto de la lógica existente sin cambios.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "3.2"] },
    { "id": 2, "tasks": ["1.3", "1.6"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2"] }
  ]
}
```
