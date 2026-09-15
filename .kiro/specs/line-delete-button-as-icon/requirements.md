# Requirements Document

## Introduction

Esta funcionalidad reemplaza el texto del botón "Eliminar" de cada línea del editor de líneas de cálculo por un icono de papelera de Bootstrap Icons (`bi-trash`), conservando el color actual del botón (`btn-outline-danger`). El editor de líneas lo genera la función `construirFilaLinea` en `src/lineas.editor.js` y se reutiliza tanto en el formulario de creación de producto (Calculadora) como en la Ventana_Edicion de producto; por tanto, el cambio aplica automáticamente a ambos contextos. En el editor de líneas solo existe un botón de acción por línea, el Boton_Eliminar_Linea; no hay botón "Editar" por línea.

Las pruebas existentes seleccionan el botón por su clase CSS (`lp-linea-eliminar`) y por conteo, y el cableado del clic se realiza por el índice almacenado en `fila.dataset.indice` (que invoca `eliminarLinea`). Tanto la clase `lp-linea-eliminar` como el cableado por `dataset.indice` deben preservarse sin cambios.

El proyecto es una SPA estática que se carga mediante el esquema `file://`, sin paso de compilación y sin CDN. Los iconos de Bootstrap Icons se incorporan localmente bajo `vendor/bootstrap-icons/` y se enlazan en `index.html`, siguiendo el mismo enfoque de la funcionalidad `action-buttons-as-icons` (el enlace de la hoja de estilos de iconos ya está presente en `index.html`). Esta funcionalidad reutiliza ese Sistema_De_Iconos local, sin introducir ningún recurso externo. El botón de icono debe exponer un Nombre_Accesible para tecnologías de asistencia y degradar de forma segura si la fuente de iconos no está disponible.

Las aserciones de las pruebas se basan en la estructura del DOM (Vitest + jsdom cargando los IIFE con `tests/helpers/cargarLP.js`), no en el render visual de la fuente, que queda fuera de jsdom.

## Glossary

- **Sistema_De_Iconos**: Conjunto de recursos de Bootstrap Icons (hoja de estilos y archivo de fuente/glifos) alojado localmente bajo `vendor/bootstrap-icons/` y enlazado en `index.html`, cargado sin CDN. Incorporado por la funcionalidad `action-buttons-as-icons` y reutilizado por esta funcionalidad.
- **Editor_De_Lineas**: Componente reutilizable de edición de líneas de cálculo implementado en `src/lineas.editor.js`, que renderiza cada fila de línea mediante la función `construirFilaLinea`.
- **Fila_De_Linea**: Elemento del DOM que representa una línea de cálculo, construido por `construirFilaLinea`, cuyo índice se almacena en el atributo `dataset.indice`.
- **Boton_Eliminar_Linea**: Botón de acción de una Fila_De_Linea con la clase `lp-linea-eliminar`, cuyo clic invoca `eliminarLinea` con el índice de la fila.
- **Formulario_Crear_Producto**: Vista de la Calculadora que usa el Editor_De_Lineas para agregar líneas al crear un producto.
- **Ventana_Edicion**: Ventana modal de edición de producto (`#modal-edicion`) que usa el Editor_De_Lineas para modificar las líneas de un producto existente.
- **Icono_Papelera**: Glifo de Bootstrap Icons de una papelera con la clase `bi-trash`, que representa la acción Eliminar.
- **Nombre_Accesible**: Texto alternativo asociado al Boton_Eliminar_Linea mediante los atributos `aria-label` y `title`, que expresa la acción de eliminar para tecnologías de asistencia y para las pruebas.
- **Color_De_Boton**: Variante de estilo de color de Bootstrap aplicada al Boton_Eliminar_Linea: `btn-outline-danger`.
- **Etiqueta_De_Texto_Fallback**: Elemento de texto asociado al Boton_Eliminar_Linea que expresa el nombre de la acción y permanece disponible para tecnologías de asistencia y visible cuando el Sistema_De_Iconos no está disponible.

## Requirements

### Requirement 1: Icono de papelera en el botón de eliminar de la línea

**User Story:** Como usuario que edita las líneas de un producto, quiero que el botón de eliminar de cada línea se muestre como un icono de papelera, para identificar rápidamente la acción de eliminar mediante su símbolo.

#### Acceptance Criteria

1. WHEN el Editor_De_Lineas renderiza una Fila_De_Linea, THE Boton_Eliminar_Linea SHALL contener un único elemento Icono_Papelera con las clases de Bootstrap Icons `bi` y `bi-trash` como contenido visible.
2. WHEN el Editor_De_Lineas renderiza el Boton_Eliminar_Linea, THE Editor_De_Lineas SHALL asignar al elemento Icono_Papelera el atributo `aria-hidden` con valor `"true"`.
3. WHEN el Editor_De_Lineas renderiza el Boton_Eliminar_Linea, THE Boton_Eliminar_Linea SHALL NOT contener el texto "Eliminar" como texto directo visible del botón fuera de la Etiqueta_De_Texto_Fallback.
4. WHEN el Editor_De_Lineas renderiza el Boton_Eliminar_Linea, THE Boton_Eliminar_Linea SHALL contener una Etiqueta_De_Texto_Fallback, definida como un elemento `span` con la clase de Bootstrap `visually-hidden`, cuyo contenido de texto sea el nombre de la acción "Eliminar línea".
5. WHEN el Editor_De_Lineas renderiza el Boton_Eliminar_Linea, THE Boton_Eliminar_Linea SHALL conservar las clases `btn`, `btn-outline-danger`, `btn-sm` y `lp-linea-eliminar`.
6. WHEN el usuario activa el Boton_Eliminar_Linea mediante un clic, THE Editor_De_Lineas SHALL invocar la operación eliminarLinea con el índice obtenido de `fila.dataset.indice` convertido a número, eliminando la Fila_De_Linea correspondiente a ese índice.

### Requirement 2: Preservación del color, la clase y el cableado del botón

**User Story:** Como responsable del mantenimiento de la aplicación, quiero que el botón de eliminar de la línea conserve su color, su clase de selección y su comportamiento actuales, para que las pruebas existentes y la funcionalidad de eliminación sigan operando sin cambios.

#### Acceptance Criteria

1. WHEN el Editor_De_Lineas renderiza el Boton_Eliminar_Linea, THE Boton_Eliminar_Linea SHALL incluir el Color_De_Boton `btn-outline-danger` entre sus clases CSS.
2. WHEN el Editor_De_Lineas renderiza el Boton_Eliminar_Linea, THE Boton_Eliminar_Linea SHALL incluir simultáneamente las clases CSS `btn`, `btn-sm` y `lp-linea-eliminar`.
3. WHEN el Editor_De_Lineas renderiza una Fila_De_Linea, THE Editor_De_Lineas SHALL incluir exactamente un (1) Boton_Eliminar_Linea como descendiente de esa Fila_De_Linea.
4. WHEN el usuario dispara el evento de clic sobre el Boton_Eliminar_Linea de una Fila_De_Linea, THE Editor_De_Lineas SHALL invocar `eliminarLinea` exactamente una (1) vez pasando como argumento el valor numérico del atributo `dataset.indice` de esa Fila_De_Linea.
5. IF el evento de clic ocurre sobre un Boton_Eliminar_Linea cuya Fila_De_Linea tiene un `dataset.indice` fuera del rango `[0, cantidad_de_lineas - 1]`, THEN THE Editor_De_Lineas SHALL no eliminar ninguna línea y SHALL conservar sin cambios la colección de líneas en edición.
6. WHERE el Editor_De_Lineas se usa en el Formulario_Crear_Producto o en la Ventana_Edicion (`#modal-edicion`), THE Boton_Eliminar_Linea SHALL mostrar el Icono_Papelera de forma idéntica en ambos contextos.

### Requirement 3: Nombre accesible del botón de eliminar

**User Story:** Como usuario de tecnologías de asistencia, quiero que el botón de eliminar de la línea exponga el nombre de su acción, para conocer la acción aunque el botón muestre solo un icono.

#### Acceptance Criteria

1. WHEN el Editor_De_Lineas renderiza el Boton_Eliminar_Linea, THE Boton_Eliminar_Linea SHALL exponer un Nombre_Accesible mediante el atributo `aria-label` cuyo valor contenga al menos un carácter distinto de espacio en blanco y no exceda los 100 caracteres.
2. WHEN el Editor_De_Lineas renderiza el Boton_Eliminar_Linea, THE Boton_Eliminar_Linea SHALL asignar al atributo `title` un valor idéntico, carácter por carácter, al valor del atributo `aria-label`.
3. WHEN el Editor_De_Lineas renderiza el Boton_Eliminar_Linea, THE Boton_Eliminar_Linea SHALL marcar el glifo del icono con el atributo `aria-hidden` con valor `true`, de modo que el glifo quede excluido del cálculo del Nombre_Accesible.
4. WHEN se calcula el Nombre_Accesible del Boton_Eliminar_Linea, THE Boton_Eliminar_Linea SHALL producir un nombre accesible computado idéntico, carácter por carácter, al valor del atributo `aria-label`.
5. IF el Nombre_Accesible computado del Boton_Eliminar_Linea está vacío, contiene únicamente espacios en blanco o no está presente, THEN THE Boton_Eliminar_Linea SHALL exponer una indicación de no conformidad de accesibilidad verificable durante las pruebas de accesibilidad automatizadas y manuales.

### Requirement 4: Degradación segura cuando la fuente de iconos no está disponible

**User Story:** Como usuario cuyo navegador no puede cargar la fuente de iconos, quiero seguir pudiendo distinguir y usar la acción de eliminar de cada línea, para no perder funcionalidad si el Sistema_De_Iconos falla.

#### Acceptance Criteria

1. IF el Sistema_De_Iconos no se carga en un máximo de 5 segundos desde el inicio de la carga de la página, THEN THE Boton_Eliminar_Linea SHALL responder a la activación por ratón (evento de clic) invocando la función `eliminarLinea` sobre la línea asociada.
2. IF el Sistema_De_Iconos no se carga en un máximo de 5 segundos desde el inicio de la carga de la página, THEN THE Boton_Eliminar_Linea SHALL responder a la activación por teclado (foco mediante tabulación y activación con Enter o Barra espaciadora) invocando la función `eliminarLinea` sobre la línea asociada.
3. IF el Sistema_De_Iconos no se carga en un máximo de 5 segundos desde el inicio de la carga de la página, THEN THE Boton_Eliminar_Linea SHALL conservar su Nombre_Accesible, expuesto de forma no vacía a las tecnologías de asistencia.
4. IF el Sistema_De_Iconos no se carga en un máximo de 5 segundos desde el inicio de la carga de la página, THEN THE Boton_Eliminar_Linea SHALL conservar su clase `lp-linea-eliminar` y su Color_De_Boton `btn-outline-danger`.
5. IF el Sistema_De_Iconos no se carga en un máximo de 5 segundos desde el inicio de la carga de la página, THEN THE Boton_Eliminar_Linea SHALL mostrar visualmente la Etiqueta_De_Texto_Fallback (texto que en el estado nominal está oculto visualmente pero disponible para tecnologías de asistencia) de modo que su contenido, que identifica la acción de eliminar, sea perceptible en pantalla.
