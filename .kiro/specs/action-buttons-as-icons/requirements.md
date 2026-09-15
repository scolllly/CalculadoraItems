# Requirements Document

## Introduction

Esta funcionalidad reemplaza los botones de acción de texto ("Ver detalle", "Editar", "Eliminar") por botones con iconos en la Lista_De_Productos (Pagina_Productos) y en la Lista_De_Parametros (Pagina_Parametros). El icono de papelera representa Eliminar, el lápiz representa Editar y el ojo representa Ver detalle. Los botones conservan sus colores actuales (variantes outline de Bootstrap) y su comportamiento existente.

El proyecto carga Bootstrap de forma local, sin CDN. Actualmente la carpeta `vendor/bootstrap` contiene únicamente `bootstrap.min.css` y `bootstrap.bundle.min.js`; los iconos de Bootstrap (Bootstrap Icons) NO están presentes en el proyecto. Por tanto, esta funcionalidad debe incorporar los recursos de Bootstrap Icons localmente (CSS y fuente/glifos) de forma coherente con el enfoque sin CDN, enlazarlos en `index.html` y degradar de forma segura si la fuente de iconos no se carga, manteniendo el nombre accesible de cada acción disponible para tecnologías de asistencia y para las pruebas existentes.

Las pruebas existentes seleccionan los botones por sus clases CSS (`lp-producto-detalle`, `lp-producto-editar`, `lp-producto-eliminar`) y por conteo, no por su texto visible. Los nombres de clase y el cableado de eventos deben preservarse.

## Glossary

- **Sistema_De_Iconos**: Conjunto de recursos de Bootstrap Icons (hoja de estilos CSS y archivo de fuente/glifos) alojado localmente en el proyecto, cargado sin CDN.
- **Pagina_Productos**: Vista renderizada bajo `#pagina-productos`, cuya lista de productos guardados la genera `src/productos.controller.js`.
- **Pagina_Parametros**: Vista renderizada bajo `#pagina-parametros`, cuya lista de parámetros guardados la genera `src/parametros.controller.js`.
- **Lista_De_Productos**: Lista de productos guardados renderizada por la función `renderListaProductos` en `src/productos.controller.js`.
- **Lista_De_Parametros**: Lista de parámetros guardados renderizada por la función `render` en `src/parametros.controller.js`.
- **Boton_Ver_Detalle**: Botón de acción de la Lista_De_Productos con la clase `lp-producto-detalle`, que invoca `abrirDetalle`.
- **Boton_Editar_Producto**: Botón de acción de la Lista_De_Productos con la clase `lp-producto-editar`, que invoca `abrirEdicion`.
- **Boton_Eliminar_Producto**: Botón de acción de la Lista_De_Productos con la clase `lp-producto-eliminar`, que invoca `confirmarYEliminar`.
- **Boton_Editar_Parametro**: Botón de acción de la Lista_De_Parametros que invoca `iniciarEdicion`.
- **Boton_Eliminar_Parametro**: Botón de acción de la Lista_De_Parametros que invoca `eliminar`.
- **Icono_Papelera**: Glifo de Bootstrap Icons de una papelera (por ejemplo `bi-trash`), que representa la acción Eliminar.
- **Icono_Lapiz**: Glifo de Bootstrap Icons de un lápiz (por ejemplo `bi-pencil`), que representa la acción Editar.
- **Icono_Ojo**: Glifo de Bootstrap Icons de un ojo (`bi-eye`), que representa la acción Ver detalle.
- **Nombre_Accesible**: Texto alternativo asociado a un botón de icono mediante los atributos `aria-label` y `title`, que expresa la acción ("Ver detalle", "Editar", "Eliminar") para tecnologías de asistencia y para las pruebas.
- **Color_De_Boton**: Variante de estilo de color de Bootstrap aplicada a cada botón: `btn-outline-secondary` (Ver detalle y Editar de parámetros), `btn-outline-primary` (Editar de productos) y `btn-outline-danger` (Eliminar).
- **Aviso_De_Estilos**: Elemento `#aviso-estilos` de `index.html` que se revela cuando los estilos de Bootstrap no se cargan (patrón de degradación existente de la aplicación).
- **Boton_De_Icono**: Referencia genérica a cualquier botón de acción que muestra únicamente un icono.

## Requirements

### Requirement 1: Disponibilidad local de los iconos de Bootstrap

**User Story:** Como usuario de la aplicación sin conexión a Internet, quiero que los iconos de las acciones se carguen desde archivos locales, para que la interfaz muestre los iconos sin depender de un CDN.

#### Acceptance Criteria

1. THE Sistema_De_Iconos SHALL residir en archivos alojados dentro del subdirectorio `vendor/bootstrap-icons` del proyecto.
2. THE Sistema_De_Iconos SHALL incluir la hoja de estilos de Bootstrap Icons y el archivo de fuente de iconos que dicha hoja de estilos referencia, ubicados ambos dentro del subdirectorio `vendor/bootstrap-icons`.
3. THE Sistema_De_Iconos SHALL referenciar el archivo de fuente desde la hoja de estilos mediante una ruta relativa local que se resuelva correctamente respecto a la ubicación de la hoja de estilos.
4. THE Sistema_De_Iconos SHALL cargarse mediante rutas relativas locales, sin referenciar ningún dominio externo ni CDN.
5. WHEN el documento `index.html` se carga mediante el esquema `file://`, THE Sistema_De_Iconos SHALL cargarse sin generar ninguna solicitud de red hacia un host externo.
6. WHEN el documento `index.html` se carga, THE Sistema_De_Iconos SHALL enlazarse mediante una etiqueta `link` de hoja de estilos ubicada antes del enlace a `styles/app.css` en el orden del documento.
7. WHEN un elemento de acción con una clase de icono de Bootstrap Icons se renderiza, THE Sistema_De_Iconos SHALL mostrar el glifo del icono correspondiente de forma visible en lugar de un carácter de reemplazo o un recuadro vacío.
8. IF la hoja de estilos o el archivo de fuente de los iconos no puede cargarse, THEN THE Sistema_De_Iconos SHALL permitir que el resto de la interfaz permanezca operativa sin bloquear la carga de la aplicación.

### Requirement 2: Botones de icono en la Lista_De_Productos

**User Story:** Como usuario que gestiona productos guardados, quiero que las acciones de cada producto se muestren como iconos, para identificar rápidamente cada acción mediante su símbolo.

#### Acceptance Criteria

1. WHEN la Lista_De_Productos renderiza el Boton_Ver_Detalle de un producto, THE Pagina_Productos SHALL mostrar dentro del botón un elemento con la clase de Bootstrap Icons `bi-eye` como contenido visible.
2. WHEN la Lista_De_Productos renderiza el Boton_Editar_Producto de un producto, THE Pagina_Productos SHALL mostrar dentro del botón un elemento con la clase de Bootstrap Icons `bi-pencil` como contenido visible.
3. WHEN la Lista_De_Productos renderiza el Boton_Eliminar_Producto de un producto, THE Pagina_Productos SHALL mostrar dentro del botón un elemento con la clase de Bootstrap Icons `bi-trash` como contenido visible.
4. WHEN la Lista_De_Productos renderiza las acciones de un producto, THE Pagina_Productos SHALL mostrar exactamente tres botones de acción por producto, conservando las clases `lp-producto-detalle`, `lp-producto-editar` y `lp-producto-eliminar` respectivamente.
5. WHEN la Lista_De_Productos renderiza los botones de acción, THE Pagina_Productos SHALL conservar el Color_De_Boton `btn-outline-secondary` en el Boton_Ver_Detalle, `btn-outline-primary` en el Boton_Editar_Producto y `btn-outline-danger` en el Boton_Eliminar_Producto.
6. WHEN la Lista_De_Productos renderiza un botón que solo contiene un icono, THE Pagina_Productos SHALL asignar a ese botón un Nombre_Accesible no vacío.
7. WHEN el usuario hace clic en el Boton_Ver_Detalle de un producto, THE Pagina_Productos SHALL invocar `abrirDetalle` con el identificador de ese producto.
8. WHEN el usuario hace clic en el Boton_Editar_Producto de un producto, THE Pagina_Productos SHALL invocar `abrirEdicion` con el identificador de ese producto.
9. WHEN el usuario hace clic en el Boton_Eliminar_Producto de un producto, THE Pagina_Productos SHALL invocar `confirmarYEliminar` con el identificador de ese producto.

### Requirement 3: Botones de icono en la Lista_De_Parametros

**User Story:** Como usuario que gestiona parámetros guardados, quiero que las acciones de cada parámetro se muestren como iconos, para identificar rápidamente cada acción mediante su símbolo.

#### Acceptance Criteria

1. WHEN la Lista_De_Parametros renderiza un parámetro, THE Boton_Editar_Parametro SHALL mostrar el Icono_Lapiz (`bi-pencil`) como contenido visible del botón.
2. WHEN la Lista_De_Parametros renderiza un parámetro, THE Boton_Eliminar_Parametro SHALL mostrar el Icono_Papelera (`bi-trash`) como contenido visible del botón.
3. WHEN la Lista_De_Parametros renderiza un parámetro, THE Lista_De_Parametros SHALL mostrar exactamente dos botones de acción dentro del grupo `btn-group btn-group-sm`, en este orden: primero el Boton_Editar_Parametro y después el Boton_Eliminar_Parametro, y THE Lista_De_Parametros SHALL NOT mostrar un botón de "Ver detalle" para el parámetro.
4. THE Boton_Editar_Parametro SHALL conservar el Color_De_Boton `btn-outline-secondary` y THE Boton_Eliminar_Parametro SHALL conservar el Color_De_Boton `btn-outline-danger`.
5. WHEN la Lista_De_Parametros renderiza un parámetro, THE Boton_Editar_Parametro SHALL exponer un Nombre_Accesible que identifique la acción de editar y THE Boton_Eliminar_Parametro SHALL exponer un Nombre_Accesible que identifique la acción de eliminar.
6. WHEN un usuario hace clic en el Boton_Editar_Parametro, THE Pagina_Parametros SHALL invocar `iniciarEdicion` con el identificador (`id`) del parámetro correspondiente.
7. WHEN un usuario hace clic en el Boton_Eliminar_Parametro, THE Pagina_Parametros SHALL invocar `eliminar` con el identificador (`id`) del parámetro correspondiente.

### Requirement 4: Nombre accesible de cada acción

**User Story:** Como usuario de tecnologías de asistencia, quiero que cada botón de icono exponga el nombre de su acción, para conocer la acción aunque el botón muestre solo un icono.

#### Acceptance Criteria

1. THE Boton_Ver_Detalle SHALL exponer un Nombre_Accesible cuyo valor sea exactamente la cadena "Ver detalle", sin caracteres iniciales ni finales adicionales (incluidos espacios en blanco).
2. THE Boton_Editar_Producto SHALL exponer un Nombre_Accesible cuyo valor sea exactamente la cadena "Editar", sin caracteres iniciales ni finales adicionales (incluidos espacios en blanco).
3. THE Boton_Eliminar_Producto SHALL exponer un Nombre_Accesible cuyo valor sea exactamente la cadena "Eliminar", sin caracteres iniciales ni finales adicionales (incluidos espacios en blanco).
4. THE Boton_Editar_Parametro SHALL exponer un Nombre_Accesible cuyo valor sea exactamente la cadena "Editar", sin caracteres iniciales ni finales adicionales (incluidos espacios en blanco).
5. THE Boton_Eliminar_Parametro SHALL exponer un Nombre_Accesible cuyo valor sea exactamente la cadena "Eliminar", sin caracteres iniciales ni finales adicionales (incluidos espacios en blanco).
6. WHERE un botón de icono expone su Nombre_Accesible mediante los atributos `aria-label` y `title`, THE Boton_De_Icono SHALL asignar a `aria-label` el valor exacto del nombre de la acción y asignar a `title` un valor idéntico al de `aria-label`.
7. WHEN se calcula el Nombre_Accesible de un botón de icono, THE Boton_De_Icono SHALL producir un nombre accesible computado igual al valor de `aria-label` y excluir cualquier texto derivado del glifo, marcando el elemento del glifo con `aria-hidden="true"`.
8. IF el Nombre_Accesible computado de un botón de icono está vacío, contiene únicamente espacios en blanco o no está presente, THEN THE Boton_De_Icono SHALL considerarse una no conformidad de accesibilidad.

### Requirement 5: Degradación segura cuando la fuente de iconos no está disponible

**User Story:** Como usuario cuyo navegador no puede cargar la fuente de iconos, quiero seguir pudiendo distinguir y usar las acciones, para no perder funcionalidad si el Sistema_De_Iconos falla.

#### Acceptance Criteria

1. IF el Sistema_De_Iconos no se carga en un máximo de 5 segundos desde el inicio de la carga de la página, THEN cada botón de acción SHALL responder a activación por ratón y por teclado y ejecutar su acción asociada.
2. IF el Sistema_De_Iconos no se carga en un máximo de 5 segundos desde el inicio de la carga de la página, THEN cada botón de acción SHALL conservar su Nombre_Accesible.
3. IF el Sistema_De_Iconos no se carga en un máximo de 5 segundos desde el inicio de la carga de la página, THEN cada botón de acción SHALL conservar su clase CSS y su Color_De_Boton.
4. IF el Sistema_De_Iconos no se carga en un máximo de 5 segundos desde el inicio de la carga de la página, THEN cada botón de acción SHALL mostrar una etiqueta de texto visible que identifique su acción.
5. WHILE el Sistema_De_Iconos no está disponible, THE Aviso_De_Estilos SHALL mantener su comportamiento de degradación existente sin ser suprimido por esta funcionalidad.
