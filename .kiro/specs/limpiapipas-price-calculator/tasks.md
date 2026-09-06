# Implementation Plan: Calculadora de precios Limpiapipas

## Overview

Este plan describe el TRABAJO PENDIENTE de migración y limpieza para alinear el código existente con el diseño actualizado. Todos los archivos de `src/` ya existen y son funcionalmente correctos, PERO usan sintaxis de Módulos ES (`import`/`export`), lo que impide que la Aplicacion arranque al abrir `index.html` con doble clic bajo el Protocolo_De_Archivo (`file://`), ya que el navegador bloquea la resolución de Módulos ES por `fetch` en ese esquema.

El objetivo es migrar cada archivo de `src/` para que se cargue como **Script_Clasico** (`<script src="...">` sin `type="module"`), publique su API en el espacio de nombres global `window.LP` y consuma sus dependencias desde ese mismo namespace, SIN `import`/`export`. Adicionalmente, se eliminan los artefactos de build y pruebas automatizadas que ya no aplican bajo la restricción de "app vanilla pura, sin build, sin servidor y sin pruebas automatizadas".

La migración NO cambia firmas ni comportamiento de las funciones: solo el mecanismo de exposición (publicar en `window.LP`) y de consumo (leer de `window.LP`). Las tareas se ordenan de abajo hacia arriba respetando dependencias: primero la limpieza, luego el dominio puro, la persistencia, la infraestructura de UI, los controladores, `app.js`, la actualización de `index.html` y finalmente la verificación manual de integración.

## Tasks

- [x] 1. Limpieza de artefactos obsoletos de build y pruebas
  - [x] 1.1 Eliminar configuración de build y pruebas automatizadas
    - Eliminar `vitest.config.js` (configuración de Vitest): la Aplicacion no usa pruebas automatizadas.
    - Eliminar la carpeta `tests/` completa, incluido su archivo `.gitkeep`.
    - Eliminar `package.json` y `package-lock.json`: no hay dependencias de npm ni scripts de build; el `"type": "module"` de `package.json` es incompatible con la carga por Scripts_Clasicos.
    - Eliminar la carpeta `node_modules/` (dependencias de desarrollo como vitest, fast-check y jsdom ya no se necesitan).
    - Justificación: la Aplicacion se abre con doble clic sobre `index.html` bajo `file://`, sin servidor, sin ningún paso de empaquetado o compilación (build) y sin pruebas automatizadas; los archivos anteriores solo tenían sentido en un flujo con Módulos ES y tooling de pruebas.
    - _Requirements: 7.2, 7.4_

- [x] 2. Migración del dominio puro al espacio de nombres global
  - [x] 2.1 Migrar `src/currency.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` (p. ej. `LP.currency.formatearPEN`) inicializando `window.LP = window.LP || {}`.
    - Conservar sin cambios la firma y el comportamiento de `formatearPEN(n)` (`"S/ 1234.50"` con exactamente 2 decimales).
    - _Requirements: 5.3, 7.4_

  - [x] 2.2 Migrar `src/calculo.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` (p. ej. `LP.calculo`).
    - Consumir dependencias (p. ej. `LP.currency` si aplica) desde el namespace global, no por `import`.
    - Conservar sin cambios `redondear2`, `subtotalLinea`, `precioTotal` y `calcularProducto`.
    - _Requirements: 5.1, 5.2, 7.4_

  - [x] 2.3 Migrar `src/validation.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` (p. ej. `LP.validation`).
    - Conservar sin cambios `validarNombreParametro`, `validarPrecioUnitario`, `validarUnidad`, `validarNombreProducto` y `validarCantidad`, incluidos los mensajes exactos exigidos por los criterios de aceptación.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 4.3, 4.4, 5.5, 5.6, 7.4_

  - [x] 2.4 Migrar `src/models.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` (p. ej. `LP.models`).
    - Conservar sin cambios `crearParametro`, `crearProducto`, `crearLinea` y `generarId`.
    - _Requirements: 1.1, 3.1, 4.1, 7.4_

  - [x] 2.5 Migrar `src/backup.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` (p. ej. `LP.backup`).
    - Conservar sin cambios `BACKUP_VERSION`, `serializarRespaldo` y `parsearRespaldo` (incluida la validación de estructura sin lanzar excepciones).
    - _Requirements: 9.1, 9.2, 9.6, 7.4_

- [x] 3. Migración de la capa de persistencia al espacio de nombres global
  - [x] 3.1 Migrar `src/storage.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` (p. ej. `LP.storage`).
    - Conservar sin cambios `readJSON` y `writeJSON` con sus resultados tipados (`ReadResult`/`WriteResult`) y la captura de excepciones sin propagarlas.
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 7.4_

  - [x] 3.2 Migrar `src/repository.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` (p. ej. `LP.repository`).
    - Consumir `LP.storage` desde el namespace global en lugar de `import`.
    - Conservar sin cambios las claves versionadas (`limpiapipas.parametros.v1`, `limpiapipas.productos.v1`) y las funciones `load`, `saveParametros`, `saveProductos` y `replaceAll`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.5, 7.4_

- [x] 4. Checkpoint - Verificar dominio y persistencia migrados
  - Tras actualizar `index.html` para cargar los archivos ya migrados (dominio + persistencia) como Scripts_Clasicos, abrir `index.html` con doble clic bajo `file://` y comprobar en la consola del navegador que `window.LP` expone `LP.currency`, `LP.calculo`, `LP.validation`, `LP.models`, `LP.backup`, `LP.storage` y `LP.repository`, y que responden a llamadas de prueba manuales sin errores de módulos. Confirmar que no hay errores en consola y preguntar al usuario si surgen dudas antes de continuar.

- [x] 5. Migración de la infraestructura de UI al espacio de nombres global
  - [x] 5.1 Migrar `src/notifier.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` (p. ej. `LP.notifier`).
    - Conservar sin cambios `info`, `error` y `confirmar`.
    - _Requirements: 2.4, 6.5, 6.6, 9.4, 7.4_

  - [x] 5.2 Migrar `src/router.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` (p. ej. `LP.router`).
    - Conservar sin cambios `mostrar(vista)` (mostrar una sección y ocultar las otras dos, sin recargas ni red) y `vistaInicial()` (mostrar `productos`).
    - _Requirements: 7.3, 8.2, 8.3, 8.4, 8.5, 7.4_

- [x] 6. Migración de los controladores al espacio de nombres global
  - [x] 6.1 Migrar `src/parametros.controller.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` y consumir `LP.validation`, `LP.models`, `LP.repository` y `LP.notifier` desde el namespace global.
    - Conservar sin cambios el comportamiento de crear/editar/eliminar Parametros, la indicación de estado vacío, la confirmación de eliminación de un Parametro referenciado (indicando líneas afectadas y desreferenciándolas) y la persistencia tras cada cambio.
    - _Requirements: 1.1, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 8.6, 7.4_

  - [x] 6.2 Migrar `src/productos.controller.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` y consumir `LP.validation`, `LP.models`, `LP.calculo`, `LP.currency`, `LP.repository` y `LP.notifier` desde el namespace global.
    - Conservar sin cambios el manejo del nombre del producto, agregar/eliminar líneas, el selector de Parametro por línea con su Unidad, el cálculo con subtotales y Precio_Total formateados en PEN, el guardado y la renderización de la lista de Productos.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.7, 7.4_

  - [x] 6.3 Migrar `src/basedatos.controller.js` a `window.LP`
    - Quitar `export`/`import`; publicar la API en `window.LP` y consumir `LP.backup`, `LP.repository` y `LP.notifier` desde el namespace global.
    - Conservar sin cambios los flujos de exportación (`Blob`, `URL.createObjectURL`, descarga, `URL.revokeObjectURL`) e importación (`FileReader`, parseo, confirmación de reemplazo, `replaceAll` y refresco de vistas; sin alterar el almacenamiento ante archivo inválido o cancelación).
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 7.4_

- [x] 7. Migración del arranque en `src/app.js`
  - [x] 7.1 Migrar `src/app.js` a `window.LP`
    - Quitar todos los `import`; consumir las APIs (`LP.repository`, `LP.router`, `LP.notifier` y los controladores) desde `window.LP`.
    - Conservar sin cambios el arranque: invocar `LP.repository.load()` manejando listas vacías y JSON corrupto (mensaje de carga fallida), inicializar el enrutador mostrando la Pagina_Productos, renderizar las listas iniciales de Parametros y Productos, cablear los botones de la Barra_De_Navegacion y los controladores, y detectar el fallo de carga del CSS de Bootstrap mostrando una indicación visible.
    - Mantener el auto-arranque en `DOMContentLoaded`.
    - _Requirements: 6.3, 6.4, 6.5, 7.4, 7.5, 8.1, 8.2_

- [x] 8. Actualización de `index.html` a Scripts_Clasicos
  - [x] 8.1 Reemplazar la carga por Módulos ES por Scripts_Clasicos ordenados por dependencias
    - Eliminar `<script type="module" src="src/app.js">` y sustituirlo por etiquetas `<script src="...">` clásicas (sin `type="module"`) que carguen todos los archivos de `src/` en el ORDEN de dependencias correcto: dominio puro (`currency.js`, `calculo.js`, `validation.js`, `models.js`, `backup.js`) → persistencia (`storage.js`, `repository.js`) → infraestructura de UI (`notifier.js`, `router.js`) → controladores (`parametros.controller.js`, `productos.controller.js`, `basedatos.controller.js`) → `app.js`.
    - Mantener los enlaces locales de Bootstrap (`vendor/bootstrap/bootstrap.min.css`, `vendor/bootstrap/bootstrap.bundle.min.js`) y de `styles/app.css`.
    - Conservar sin cambios la estructura de la Barra_De_Navegacion y las tres secciones de vista ya existentes.
    - _Requirements: 7.1, 7.3, 7.4, 8.1_

- [x] 9. Verificación final de integración (manual)
  - [x] 9.1 Verificar el arranque bajo `file://` sin Módulos ES
    - Abrir `index.html` con doble clic bajo el Protocolo_De_Archivo (`file://`) y comprobar que la Aplicacion arranca y queda operativa sin servidor y sin errores de resolución de módulos, mostrando la Pagina_Productos y ambas listas.
    - Verificar en la consola que no hay errores de carga de scripts y que las APIs están disponibles en `window.LP`.
    - Comprobar que las tres vistas conmutan desde la Barra_De_Navegacion (Productos, Parámetros, Base de datos) sin recargas.
    - Ejercitar los flujos principales: crear Parametros, agregar líneas y calcular el Precio_Total, guardar un Producto, y exportar e importar el Archivo_De_Respaldo.
    - Verificar que Bootstrap carga desde rutas locales de `vendor/bootstrap/` y que en la pestaña de red no hay solicitudes salientes a recursos externos.
    - _Requirements: 6.3, 7.1, 7.2, 7.3, 7.4, 8.2, 8.3, 8.4, 8.5, 9.1, 9.5_

  - [x] 9.2 Checkpoint final
    - Confirmar mediante la verificación manual anterior que la Aplicacion arranca con doble clic bajo `file://` y funciona sin Módulos ES. Preguntar al usuario si surgen dudas antes de dar por completada la migración.

- [x] 10. Corrección: encapsular cada archivo de `src/` en una IIFE para evitar colisiones de identificadores globales
  - Envolver el cuerpo de cada archivo de `src/` (currency.js, validation.js, models.js, backup.js, storage.js, repository.js, notifier.js, router.js, parametros.controller.js, productos.controller.js, basedatos.controller.js, app.js) en una IIFE (`(function () { ... })();`), siguiendo el patrón que ya usa `calculo.js`, de modo que los identificadores internos queden privados y solo se publique la API en `window.LP`.
  - Eliminar las colisiones de identificadores de nivel superior detectadas: `MENSAJES` (validation.js y productos.controller.js), `IDS` (parametros.controller.js y productos.controller.js), y los alias de `productos.controller.js` que repiten `validarNombreProducto`, `validarCantidad`, `formatearPEN`, `crearProducto`, `crearLinea` y `saveProductos`.
  - Consumir las dependencias leyéndolas de `window.LP.*` dentro de la IIFE; no declarar nada en el ámbito global salvo la asignación a `window.LP`.
  - Verificar que al abrir `index.html` bajo `file://` no aparece `SyntaxError: Identifier has already been declared` en la consola y que los botones de la Barra_De_Navegacion (Productos, Parámetros, Base de datos) conmutan las vistas.
  - _Requirements: 7.3, 7.4, 8.1, 8.3, 8.4, 8.5_

## Notes

- Todas las tareas son de MIGRACIÓN/limpieza sobre código existente, no de creación desde cero: los archivos de `src/` ya existen y son funcionalmente correctos; solo cambia el mecanismo de exposición (`window.LP`) y consumo de dependencias (sin `import`/`export`).
- La migración NO cambia firmas ni comportamiento de las funciones; conserva los mismos requisitos que cada componente ya cubría, añadiendo la trazabilidad al Requisito 7.4 (arranque sin Módulos ES bajo `file://`).
- La Aplicacion se abre con doble clic sobre `index.html` bajo el Protocolo_De_Archivo (`file://`), sin servidor y sin build tooling.
- No hay pruebas automatizadas ni dependencias de desarrollo; la verificación es manual abriendo `index.html` en el navegador.
- Los checkpoints validan de forma incremental antes de continuar.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "3.1"] },
    { "id": 2, "tasks": ["3.2", "5.1", "5.2"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 4, "tasks": ["7.1"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["10"] }
  ]
}
```
