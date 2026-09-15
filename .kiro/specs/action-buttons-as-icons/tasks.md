# Implementation Plan: action-buttons-as-icons

## Overview

Reemplazar los botones de acción de texto por Botones_De_Icono (ojo/lápiz/papelera) en la Lista_De_Productos (`src/productos.controller.js`) y en la Lista_De_Parametros (`src/parametros.controller.js`), vendorizando Bootstrap Icons localmente (sin CDN), enlazándolo en `index.html` y degradando de forma segura mediante una etiqueta de texto siempre presente para lectores de pantalla.

El plan es incremental: primero se vendoriza y enlaza el Sistema_De_Iconos, luego se decoran los botones en cada controlador (con su prueba de estructura DOM inmediatamente después), después se añaden los estilos y la sonda opcional, y finalmente se cierra con verificación de regresión y verificación manual en navegador. Las pruebas se ejecutan con Vitest + jsdom cargando los IIFE con `tests/helpers/cargarLP.js`; las aserciones son estructurales (presencia del `<i class="bi bi-*">`, `aria-label`/`title`/`aria-hidden`, clases, conteo y cableado), no de render visual de fuentes.

Lenguaje de implementación: JavaScript (el diseño usa el JS existente del proyecto; no hubo pseudocódigo, por lo que no se requiere selección de lenguaje).

## Tasks

- [x] 1. Vendorizar Bootstrap Icons localmente y enlazarlo en `index.html`
  - [x] 1.1 Colocar los archivos de Bootstrap Icons bajo `vendor/bootstrap-icons/`
    - Obtener una release fijada de Bootstrap Icons (p. ej. 1.11.x) y comprometer al repo `vendor/bootstrap-icons/bootstrap-icons.css` y `vendor/bootstrap-icons/fonts/bootstrap-icons.woff2` (más `bootstrap-icons.woff` como respaldo)
    - No modificar el CSS vendorizado: mantener la carpeta `fonts/` junto al CSS para que su `url("./fonts/bootstrap-icons.woff2")` relativa resuelva bajo `file://`
    - Verificar que la hoja vendorizada no contiene `http://`, `https://` ni `//cdn` (sin referencias externas)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Enlazar la hoja de iconos en el `<head>` de `index.html`
    - Añadir `<link rel="stylesheet" href="vendor/bootstrap-icons/bootstrap-icons.css">` con `href` relativo
    - Ubicarlo DESPUÉS de `vendor/bootstrap/bootstrap.min.css` y ANTES de `styles/app.css` en el orden del documento
    - _Requirements: 1.6, 1.4_

- [x] 2. Botones de icono en la Lista_De_Productos (`src/productos.controller.js`)
  - [x] 2.1 Añadir el helper `convertirEnBotonDeIcono` y aplicarlo a los tres botones
    - Definir `convertirEnBotonDeIcono(boton, claseIcono, accion)` en el IIFE: vacía `textContent`, fija `aria-label` y `title` al `accion` exacto, añade `<i class="bi {claseIcono}" aria-hidden="true">` y `<span class="lp-accion-texto visually-hidden">{accion}</span>`
    - En `renderListaProductos`, tras construir cada botón (conservando `type`, `className` y el cableado por `data-id`): aplicar a `btnDetalle` (`bi-eye`, "Ver detalle"), `btnEditar` (`bi-pencil`, "Editar"), `btnEliminar` (`bi-trash`, "Eliminar")
    - Preservar clases `btn`, `btn-outline-secondary`/`btn-outline-primary`/`btn-outline-danger`, `btn-sm`, `lp-producto-detalle`/`lp-producto-editar`/`lp-producto-eliminar`, el `btn-group` con `role="group"`, exactamente tres botones y los `addEventListener` a `abrirDetalle`/`abrirEdicion`/`confirmarYEliminar`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 4.1, 4.2, 4.3, 4.6, 4.7_

  - [ ]* 2.2 Escribir prueba de estructura DOM de los botones de productos
    - **Property 1: Cada botón de acción de productos expone su glifo, clase, color y cableado**
    - **Property 3: Todo botón de icono tiene un nombre accesible exacto con el glifo oculto**
    - **Property 4: El nombre accesible nunca es vacío**
    - Nuevo archivo `tests/botones.iconos.productos.test.js` (patrón jsdom + `cargarModulos`, como `tests/lista.productos.test.js`)
    - Aserciones: cada botón contiene hijo `<i class="bi bi-eye|bi-pencil|bi-trash">`; `aria-label === title ===` cadena exacta sin espacios; glifo con `aria-hidden="true"`; clases de color/selección preservadas; exactamente tres botones por producto; clic por `data-id` no lanza
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 4.1, 4.2, 4.3, 4.6, 4.7, 4.8**

- [x] 3. Botones de icono en la Lista_De_Parametros (`src/parametros.controller.js`)
  - [x] 3.1 Decorar los dos botones de parámetros con glifo + nombre accesible
    - Añadir un helper local `convertirEnBotonDeIcono` equivalente en el IIFE de parámetros (los controladores son IIFE independientes; no compartir estado)
    - En `render`, crear cada botón con `crearElemento` (solo `className`, sin `textContent`), fijar `type = "button"`, y decorar: `btnEditar` (`bi-pencil`, "Editar", `btn-outline-secondary`) y `btnEliminar` (`bi-trash`, "Eliminar", `btn-outline-danger`)
    - Preferir `document.createElement` + `setAttribute` sobre `innerHTML`; NO extender `crearElemento` (decorar tras crear)
    - Preservar el `btn-group btn-group-sm`, el orden (Editar → Eliminar), la ausencia de "Ver detalle", y el cableado a `iniciarEdicion(parametro.id)` / `eliminar(parametro.id)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 3.2 Escribir prueba de estructura DOM de los botones de parámetros
    - **Property 2: Cada botón de acción de parámetros expone su glifo, clase, color, orden y cableado**
    - **Property 3: Todo botón de icono tiene un nombre accesible exacto con el glifo oculto**
    - **Property 4: El nombre accesible nunca es vacío**
    - Nuevo archivo `tests/botones.iconos.parametros.test.js` (jsdom + `cargarLP`, montando `#form-parametro`, inputs y `#lista-parametros`, e inicializando con `initParametros`)
    - Aserciones: dos botones en orden [Editar, Eliminar] con glifos `bi-pencil`/`bi-trash` y colores `btn-outline-secondary`/`btn-outline-danger`; sin botón "Ver detalle"; `aria-label === title ===` "Editar"/"Eliminar" sin espacios; glifo `aria-hidden="true"`; clic invoca `iniciarEdicion`/`eliminar` con el `id` correcto (vía espías sobre el estado)
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.4, 4.5, 4.6, 4.7, 4.8**

- [x] 4. Checkpoint - Ejecutar la suite y asegurar que todo pasa
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Estilos de utilidad y fallback en `styles/app.css`
  - [x] 5.1 Añadir `.lp-accion-texto` y las reglas de fallback `.lp-sin-iconos`
    - Añadir `.lp-accion-texto { margin-left: 0.25rem; }`
    - Añadir reglas `.lp-sin-iconos .lp-accion-texto { ... }` que revelan la etiqueta de texto (anulan `visually-hidden`) y `.lp-sin-iconos .bi { display: none; }` para ocultar el glifo vacío
    - Ubicar tras el bloque existente, sin alterar el comportamiento de `#aviso-estilos` (`.lp-bootstrap-warning`)
    - _Requirements: 5.4, 5.5_

- [x] 6. Sonda opcional de disponibilidad de iconos en `src/app.js`
  - [x] 6.1 Añadir `iconosCargados()` y aplicar `lp-sin-iconos` (best-effort)
    - Definir `iconosCargados()` reutilizando el patrón de `bootstrapCargado()`: crear una sonda `<i class="bi bi-eye">`, leer `getComputedStyle(sonda, "::before").fontFamily` y comprobar `/bootstrap-icons/i`; ante duda o error, asumir cargado (no mostrar fallback incorrecto)
    - En `iniciarApp`, si `!iconosCargados()` añadir `document.body.classList.add("lp-sin-iconos")`, sin suprimir `revelarAvisoEstilos()`
    - Documentar en el JSDoc que es opcional/best-effort: detecta la aplicación de la hoja, no la decodificación real de la fuente bajo `file://`; la accesibilidad se satisface por construcción (aria-label/title + etiqueta oculta)
    - _Requirements: 5.4, 5.5, 1.8_

- [ ]* 7. Prueba de degradación sin la hoja de iconos (jsdom)
  - **Property 5: Degradación conserva accesibilidad y funcionalidad sin la hoja de iconos**
  - En `tests/botones.iconos.productos.test.js` y `tests/botones.iconos.parametros.test.js` (o un archivo dedicado), renderizar sin cargar CSS de iconos (jsdom no carga CSS) y afirmar: clases de color/selección preservadas, `aria-label`/`title` no vacío, `<span class="lp-accion-texto">` con el texto de acción presente, y clic por `data-id`/`id` no lanza
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 1.8**

- [ ]* 8. Verificar no regresión de las suites existentes
  - Ejecutar `tests/lista.productos.test.js` y `tests/eliminacion.test.js` (seleccionan por clase/conteo, no por `textContent`) y confirmar que permanecen en verde con los botones de icono
  - _Requirements: 2.4, 2.5, 3.3, 3.4_

- [ ] 9. Verificación manual en navegador (fuera de jsdom)
  - [ ]* 9.1 Verificar render visual, ausencia de red y orden del `<head>` (MANUAL)
    - Abrir `index.html` con `file://` y confirmar que se muestran los glifos ojo/lápiz/papelera en lugar de recuadros vacíos (Req 1.7)
    - En DevTools → Network confirmar que no hay solicitudes a hosts externos al abrir con `file://` (Req 1.5)
    - Confirmar en el HTML que el `<link>` de iconos precede a `styles/app.css` (Req 1.6)
    - Renombrar temporalmente `vendor/bootstrap-icons/fonts/` y confirmar que las etiquetas de texto quedan visibles y los botones siguen operativos (Req 5.4)
    - _Requirements: 1.5, 1.6, 1.7, 5.4_

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas y verificación manual) y no las implementa el agente de ejecución automáticamente.
- La tarea 9.1 es de verificación MANUAL en navegador: no es reproducible en jsdom (no renderiza fuentes ni carga CSS/HTML) y por eso queda como opcional/manual.
- Cada tarea referencia cláusulas de requisitos concretas para trazabilidad; las tareas de prueba referencian explícitamente las propiedades del diseño.
- El nombre accesible se satisface por construcción (aria-label/title + etiqueta oculta siempre presentes), por lo que la sonda de iconos (tarea 6.1) es una mejora oportunista.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "5.1", "6.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "7", "8"] },
    { "id": 3, "tasks": ["9.1"] }
  ]
}
```
