# Implementation Plan: line-delete-button-as-icon

## Overview

Reemplazar el texto "Eliminar" del Boton_Eliminar_Linea de cada Fila_De_Linea por un Icono_Papelera de Bootstrap Icons (`bi-trash`), conservando el color `btn-outline-danger`, la clase de selección `lp-linea-eliminar` y el cableado del clic por `fila.dataset.indice` → `eliminarLinea`. El cambio está localizado en la función `construirFilaLinea` de `src/lineas.editor.js`, que es un componente compartido; por tanto aplica de forma idéntica al Formulario_Crear_Producto (Calculadora) y a la Ventana_Edicion (`#modal-edicion`), sin ramas por consumidor.

La funcionalidad reutiliza el Sistema_De_Iconos local ya incorporado por `action-buttons-as-icons` (recursos bajo `vendor/bootstrap-icons/` enlazados en `index.html`, sin CDN): no re-vendoriza recursos ni introduce hosts externos. Las utilidades de fallback en `styles/app.css` (`.lp-accion-texto`, `.lp-sin-iconos`) ya existen del trabajo previo, por lo que NO se añade ninguna tarea de CSS. El botón añade un glifo `<i class="bi bi-trash" aria-hidden="true">` y una Etiqueta_De_Texto_Fallback `<span class="visually-hidden lp-accion-texto">Eliminar línea</span>`, y fija `aria-label` = `title` = `"Eliminar línea"`.

El plan es incremental: primero se aplica el cambio de render (un único punto en `construirFilaLinea`), luego se añaden las pruebas de estructura DOM (opcionales) inmediatamente después, después un checkpoint, y finalmente la verificación de no regresión y la verificación manual en navegador. Las pruebas se ejecutan con Vitest + jsdom cargando los IIFE con `tests/helpers/cargarLP.js`; las aserciones son estructurales (presencia del `<i class="bi bi-trash">`, `aria-hidden`/`aria-label`/`title`, clases, conteo y cableado por `dataset.indice`), no de render visual de la fuente.

Lenguaje de implementación: JavaScript (el diseño usa el JS existente del proyecto; no hubo pseudocódigo, por lo que no se requiere selección de lenguaje).

## Tasks

- [x] 1. Botón de icono de papelera en el Editor_De_Lineas (`src/lineas.editor.js`)
  - [x] 1.1 Convertir el Boton_Eliminar_Linea en botón de icono dentro de `construirFilaLinea`
    - Añadir en el IIFE una constante única de acción `ACCION_ELIMINAR_LINEA = "Eliminar línea"` (una sola fuente de verdad) y un helper local `convertirEnBotonEliminarIcono(boton)` que: vacíe `textContent`, fije `aria-label` y `title` a `ACCION_ELIMINAR_LINEA`, y añada como hijos un `<i class="bi bi-trash" aria-hidden="true">` y un `<span class="visually-hidden lp-accion-texto">` con el texto de la acción
    - En el bloque "Columna: botón eliminar" de `construirFilaLinea`, tras crear `btnEliminar` con `type="button"` y `className = "btn btn-outline-danger btn-sm lp-linea-eliminar"`, invocar `convertirEnBotonEliminarIcono(btnEliminar)` en lugar de `btnEliminar.textContent = "Eliminar"` y del `setAttribute("aria-label", ...)` sueltos
    - Preservar el `addEventListener("click", ...)` que hace `eliminarLinea(Number(fila.dataset.indice))`, la columna `col-12 col-md-1`, exactamente un Boton_Eliminar_Linea por fila y la clase `lp-linea-eliminar`
    - Usar `document.createElement` + `setAttribute`/`textContent` (sin `innerHTML`); no tocar la guarda de índice existente en `eliminarLinea`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.6, 3.1, 3.2, 3.3, 3.4_

  - [ ]* 1.2 Escribir prueba de estructura DOM del glifo, clases, conteo y color
    - **Property 1: Cada botón de eliminar expone su Icono_Papelera oculto, sus clases y su color**
    - Nuevo archivo `tests/lineas.boton.icono.test.js` (patrón jsdom + `cargarModulos` de `tests/helpers/cargarLP.js`, como `tests/lineas.editor.test.js`); montar el contenedor, instanciar `crearEditorDeLineas`, agregar N líneas (usar `fast-check` para colecciones representativas) y renderizar
    - Aserciones: cada `.lp-linea` tiene exactamente un `.lp-linea-eliminar`; el botón contiene exactamente un `<i class="bi bi-trash">` con `aria-hidden="true"`; `classList` incluye `btn`, `btn-outline-danger`, `btn-sm`, `lp-linea-eliminar`
    - **Validates: Requirements 1.1, 1.2, 1.5, 2.1, 2.2, 2.3, 3.3**

  - [ ]* 1.3 Escribir prueba del Nombre_Accesible y la Etiqueta_De_Texto_Fallback
    - **Property 2: Cada botón de eliminar tiene un Nombre_Accesible exacto sin texto directo**
    - En `tests/lineas.boton.icono.test.js`: afirmar `aria-label === title === "Eliminar línea"`, longitud del `aria-label` en `[1, 100]` y sin espacios en los extremos; el botón no tiene un nodo de texto directo "Eliminar" (solo hijos `<i>` y `<span>`); existe `span.visually-hidden` (con `lp-accion-texto`) cuyo `textContent === "Eliminar línea"`
    - **Validates: Requirements 1.3, 1.4, 3.1, 3.2, 3.4, 3.5**

  - [ ]* 1.4 Escribir prueba de eliminación por índice y guarda de rango
    - **Property 3: El clic elimina exactamente la línea del índice y respeta la guarda de rango**
    - En `tests/lineas.boton.icono.test.js`: renderizar N líneas, disparar clic sobre el botón de una fila elegida y comprobar que `getLineas()` decrece en uno y elimina la línea correcta; para `dataset.indice` fuera de `[0, n-1]`, comprobar que la colección no cambia; en ningún caso el clic lanza
    - **Validates: Requirements 1.6, 2.4, 2.5**

  - [ ]* 1.5 Escribir prueba de degradación sin el Sistema_De_Iconos (jsdom)
    - **Property 4: Degradación conserva accesibilidad, clases y cableado sin el Sistema_De_Iconos**
    - En `tests/lineas.boton.icono.test.js` (jsdom no carga CSS ni fuentes): tras renderizar, cada botón conserva `lp-linea-eliminar` y `btn-outline-danger`, `aria-label`/`title` no vacío y `span.lp-accion-texto` con el texto de la acción; el elemento es un `<button>` nativo; el clic por `dataset.indice` sigue eliminando la línea correcta sin lanzar
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [ ]* 1.6 Escribir prueba de identidad estructural entre contextos
    - **Property 5: El botón de eliminar es idéntico en ambos contextos de uso**
    - En `tests/lineas.boton.icono.test.js`: como `construirFilaLinea` no recibe contexto, renderizar el editor una vez y afirmar la estructura del botón (clases, glifo `bi-trash` con `aria-hidden`, `aria-label`/`title` y Etiqueta_De_Texto_Fallback), equivalente al uso desde la Calculadora y la Ventana_Edicion
    - **Validates: Requirements 2.6**

- [x] 2. Checkpoint - Ejecutar la suite y asegurar que todo pasa
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 3. Verificar no regresión de las suites existentes
  - Ejecutar `tests/lineas.editor.test.js`, `tests/ventana.edicion.test.js` y `tests/persistencia.integracion.test.js` (seleccionan el botón por `.lp-linea-eliminar` y por conteo, y accionan el clic; no afirman `textContent`) y confirmar que permanecen en verde con el botón de icono, en especial los flujos que eliminan líneas en la Ventana_Edicion
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

- [ ] 4. Verificación manual en navegador (fuera de jsdom)
  - [ ]* 4.1 Verificar render visual, teclado, fallback y ausencia de red (MANUAL)
    - Abrir `index.html` con `file://`, agregar líneas en la Calculadora y en la Ventana_Edicion (`#modal-edicion`) y confirmar que el botón muestra el glifo de papelera en lugar de un recuadro vacío, de forma idéntica en ambos contextos (Req 1.1, 2.6)
    - Con foco en el botón, activar con Enter y Barra espaciadora y confirmar que se elimina la línea (semántica nativa de `<button>`; jsdom no sintetiza click desde keydown) (Req 4.2)
    - Renombrar temporalmente `vendor/bootstrap-icons/fonts/` y confirmar que la Etiqueta_De_Texto_Fallback queda visible y el botón sigue operativo (Req 4.5)
    - En DevTools → Network confirmar que no hay solicitudes a hosts externos al abrir con `file://` (enfoque sin CDN)
    - _Requirements: 1.1, 2.6, 4.2, 4.5_

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas y verificación manual) y no las implementa el agente de ejecución automáticamente.
- No hay tarea de CSS: las utilidades de fallback `.lp-accion-texto` y `.lp-sin-iconos` ya existen en `styles/app.css` (incorporadas por `action-buttons-as-icons`), y el `<link>` de Bootstrap Icons ya está presente en `index.html`. Esta funcionalidad no re-vendoriza ni enlaza recursos.
- El cambio de código es un único punto (bloque "Columna: botón eliminar" de `construirFilaLinea`); por eso todas las sub-tareas de prueba operan sobre el mismo artefacto y el mismo archivo de prueba nuevo.
- La tarea 4.1 es de verificación MANUAL en navegador: no es reproducible en jsdom (no renderiza fuentes ni sintetiza teclado→click) y por eso queda como opcional/manual.
- El Nombre_Accesible se satisface por construcción (`aria-label`/`title` + Etiqueta_De_Texto_Fallback siempre presentes), por lo que la condición de no conformidad (Req 3.5) no ocurre.
- Cada tarea referencia cláusulas de requisitos concretas para trazabilidad; las tareas de prueba referencian explícitamente las propiedades del diseño.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "3"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["1.6"] },
    { "id": 6, "tasks": ["4.1"] }
  ]
}
```
