# Requirements Document

## Introduction

Esta funcionalidad agrega al dominio de la aplicación Limpiapipas una clasificación automática de cada Producto como SIMPLE o COMPUESTO, y reorganiza la Lista_De_Productos guardados en dos pestañas (tabs) que separan ambos grupos.

Un Producto es COMPUESTO cuando al menos una de sus Lineas_De_Calculo es una Linea_De_Producto (es decir, `fuenteDeComponente === "Producto"`); en caso contrario es SIMPLE. La clasificación se representa con un Flag_Compuesto booleano que se asigna automáticamente al crear un Producto y al actualizarlo, y que NO se muestra en la interfaz de detalle ni de edición: es un campo interno usado únicamente para clasificar y separar los Productos en las pestañas.

La Lista_De_Productos se divide en el Tab_Compuestos ("Productos compuestos", icono `bi-boxes`) y el Tab_Simples ("Productos simples", icono `bi-box`). El Tab_Compuestos aparece seleccionado por defecto; el Tab_Simples es la segunda opción.

El código existente es JavaScript vanilla (Scripts_Clasicos bajo `file://`, sin módulos ES, espacio de nombres `window.LP`) e integra Bootstrap y Bootstrap Icons. La funcionalidad debe mantener la retrocompatibilidad con los Productos existentes que no tienen el Flag_Compuesto, tanto al cargarlos desde el Almacenamiento_Local como al importarlos desde un Archivo_De_Respaldo.

## Glossary

- **Producto**: Entidad de dominio creada por `LP.models.crearProducto`, con la forma `{ id, nombre, lineas, precioTotal, unidad }`, a la que esta funcionalidad añade el campo `compuesto`.
- **Linea_De_Calculo**: Elemento de `Producto.lineas` que aporta un subtotal. Puede ser una Linea_De_Parametro o una Linea_De_Producto según su `fuenteDeComponente`.
- **Linea_De_Producto**: Linea_De_Calculo cuyo `fuenteDeComponente === "Producto"` (referencia a un sub-Producto vía `productoComponenteId`).
- **Linea_De_Parametro**: Linea_De_Calculo cuyo `fuenteDeComponente === "Parámetro"` (o cuyo `fuenteDeComponente` está ausente, interpretado como "Parámetro" por retrocompatibilidad).
- **Fuente_De_Componente**: Campo `fuenteDeComponente` de una Linea_De_Calculo, con valores `"Parámetro"` o `"Producto"` (`LP.models.FUENTE_COMPONENTE`).
- **Flag_Compuesto**: Campo booleano `compuesto` del Producto. Vale `true` si el Producto es COMPUESTO y `false` si es SIMPLE.
- **Producto_Compuesto**: Producto cuyo Flag_Compuesto es `true`; tiene al menos una Linea_De_Producto.
- **Producto_Simple**: Producto cuyo Flag_Compuesto es `false`; no tiene ninguna Linea_De_Producto.
- **Clasificador_De_Producto**: Función pura que, dado un conjunto de Lineas_De_Calculo, determina el valor del Flag_Compuesto (`true` si existe al menos una Linea_De_Producto, `false` en caso contrario).
- **Normalizador_De_Producto**: Función pura que completa el Flag_Compuesto de un Producto cargado que no lo tiene registrado, derivándolo de sus Lineas_De_Calculo.
- **Lista_De_Productos**: Sección de la Pagina_Productos que muestra los Productos guardados, renderizada por `LP.productosController` sobre el contenedor `#lista-productos`.
- **Contenedor_De_Tabs**: Estructura de pestañas que separa la Lista_De_Productos en el Tab_Compuestos y el Tab_Simples.
- **Tab_Compuestos**: Pestaña rotulada "Productos compuestos" que usa el icono `bi-boxes` y muestra únicamente los Productos_Compuestos.
- **Tab_Simples**: Pestaña rotulada "Productos simples" que usa el icono `bi-box` y muestra únicamente los Productos_Simples.
- **Tab_Seleccionado_Por_Defecto**: Pestaña que aparece activa al renderizar inicialmente la Lista_De_Productos; corresponde al Tab_Compuestos.
- **Almacenamiento_Local**: Persistencia basada en `localStorage`, mediada por `LP.repository` y `LP.storage`.
- **Archivo_De_Respaldo**: Objeto JSON con `{ version, parametros, productos }` producido y consumido por `LP.backup`.

## Requirements

### Requirement 1: Clasificación automática al crear un Producto

**User Story:** Como usuario de la calculadora, quiero que cada Producto se marque automáticamente como simple o compuesto al crearlo, para que el sistema pueda separarlos sin que yo tenga que indicarlo.

#### Acceptance Criteria

1. WHEN un Producto es creado por `LP.models.crearProducto`, THE Sistema SHALL asignar al Producto un Flag_Compuesto derivado de sus Lineas_De_Calculo.
2. IF el Producto creado tiene al menos una Linea_De_Producto, THEN THE Sistema SHALL asignar el valor `true` al Flag_Compuesto.
3. IF el Producto creado no tiene ninguna Linea_De_Producto, THEN THE Sistema SHALL asignar el valor `false` al Flag_Compuesto.
4. THE Sistema SHALL conservar en el Producto creado los campos `id`, `nombre`, `lineas`, `precioTotal` y `unidad` con los mismos valores que produce el comportamiento actual.

### Requirement 2: Clasificación automática al actualizar un Producto

**User Story:** Como usuario que edita un Producto, quiero que su clasificación de simple o compuesto se recalcule al guardar los cambios, para que la clasificación siga reflejando las líneas actuales del Producto.

#### Acceptance Criteria

1. WHEN un Producto es actualizado por `LP.productosOps.editarProducto`, THE Sistema SHALL recalcular el Flag_Compuesto del Producto actualizado a partir de sus Lineas_De_Calculo resultantes.
2. IF el Producto actualizado tiene al menos una Linea_De_Producto, THEN THE Sistema SHALL asignar el valor `true` al Flag_Compuesto del Producto actualizado.
3. IF el Producto actualizado no tiene ninguna Linea_De_Producto, THEN THE Sistema SHALL asignar el valor `false` al Flag_Compuesto del Producto actualizado.
4. THE Sistema SHALL conservar el `id`, el `nombre` y la `unidad` del Producto actualizado con los mismos valores que produce el comportamiento actual de la edición.
5. THE Sistema SHALL conservar sin cambios los demás Productos de la lista y su orden al actualizar un Producto.

### Requirement 3: Regla del Clasificador_De_Producto

**User Story:** Como desarrollador, quiero una regla única y determinista para clasificar un Producto, para que la creación, la actualización y la normalización produzcan la misma clasificación ante las mismas líneas.

#### Acceptance Criteria

1. WHEN el Clasificador_De_Producto evalúa un conjunto de Lineas_De_Calculo que contiene al menos una Linea_De_Producto, THE Clasificador_De_Producto SHALL devolver `true`.
2. WHEN el Clasificador_De_Producto evalúa un conjunto de Lineas_De_Calculo sin ninguna Linea_De_Producto, THE Clasificador_De_Producto SHALL devolver `false`.
3. WHEN el Clasificador_De_Producto evalúa un conjunto vacío de Lineas_De_Calculo, THE Clasificador_De_Producto SHALL devolver `false`.
4. WHERE una Linea_De_Calculo no tiene `fuenteDeComponente` registrada, THE Clasificador_De_Producto SHALL interpretar esa línea como Linea_De_Parametro y no contarla como Linea_De_Producto.
5. THE Clasificador_De_Producto SHALL determinar el resultado únicamente a partir del `fuenteDeComponente` de cada Linea_De_Calculo, sin modificar las líneas evaluadas.

### Requirement 4: Retrocompatibilidad de Productos sin Flag_Compuesto

**User Story:** Como usuario con Productos guardados antes de esta funcionalidad, quiero que esos Productos reciban su clasificación de simple o compuesto al cargarse, para que aparezcan en la pestaña correcta sin necesidad de volver a editarlos.

#### Acceptance Criteria

1. WHEN el Normalizador_De_Producto procesa un Producto cuyo Flag_Compuesto está ausente, THE Sistema SHALL asignar al Producto un Flag_Compuesto derivado de sus Lineas_De_Calculo mediante el Clasificador_De_Producto.
2. WHERE un Producto ya tiene un Flag_Compuesto booleano registrado, THE Normalizador_De_Producto SHALL conservar ese valor sin recalcularlo.
3. THE Normalizador_De_Producto SHALL conservar los campos `id`, `nombre`, `lineas`, `precioTotal` y `unidad` del Producto procesado.
4. WHEN los Productos se cargan desde el Almacenamiento_Local al iniciar la aplicación, THE Sistema SHALL aplicar el Normalizador_De_Producto a cada Producto cargado.
5. WHEN un Archivo_De_Respaldo se importa correctamente, THE Sistema SHALL aplicar el Normalizador_De_Producto a cada Producto importado antes de mostrarlo en la Lista_De_Productos.

### Requirement 5: Persistencia y respaldo del Flag_Compuesto

**User Story:** Como usuario, quiero que la clasificación de mis Productos se guarde y se incluya en los respaldos, para que se conserve entre sesiones y al exportar e importar mis datos.

#### Acceptance Criteria

1. WHEN un Producto con Flag_Compuesto se persiste en el Almacenamiento_Local, THE Sistema SHALL conservar el valor del Flag_Compuesto en el Producto persistido.
2. WHEN un Archivo_De_Respaldo se serializa, THE Sistema SHALL incluir el Flag_Compuesto de cada Producto en el contenido serializado.
3. WHEN un Archivo_De_Respaldo con Productos que incluyen Flag_Compuesto es serializado y luego parseado, THE Sistema SHALL producir Productos cuyo Flag_Compuesto es igual al Flag_Compuesto original (propiedad de ida y vuelta).

### Requirement 6: Separación de la Lista_De_Productos en pestañas

**User Story:** Como usuario, quiero ver mis Productos separados en una pestaña de compuestos y otra de simples, para localizar más rápido el tipo de Producto que busco.

#### Acceptance Criteria

1. WHEN la Lista_De_Productos se renderiza con al menos un Producto guardado, THE Sistema SHALL mostrar un Contenedor_De_Tabs con el Tab_Compuestos y el Tab_Simples.
2. THE Sistema SHALL mostrar en el Tab_Compuestos únicamente los Productos cuyo Flag_Compuesto es `true`.
3. THE Sistema SHALL mostrar en el Tab_Simples únicamente los Productos cuyo Flag_Compuesto es `false`.
4. THE Sistema SHALL mostrar cada Producto dentro de su pestaña con el mismo nombre, Precio_Total en PEN, precios sugeridos y botones de acción (Ver detalle, Editar, Eliminar) que muestra la Lista_De_Productos actual.
5. WHEN el usuario ejecuta una acción que modifica la lista de Productos guardados (guardar, editar o eliminar), THE Sistema SHALL re-renderizar el Contenedor_De_Tabs reflejando la clasificación actualizada de los Productos.
6. WHILE la Lista_De_Productos ordena los Productos por nombre según la dirección de orden vigente, THE Sistema SHALL aplicar ese mismo orden a los Productos dentro de cada pestaña.

### Requirement 7: Selección por defecto y rótulos de las pestañas

**User Story:** Como usuario, quiero que al abrir la lista se muestre por defecto la pestaña de compuestos con iconos claros, para reconocer de inmediato cada tipo de Producto.

#### Acceptance Criteria

1. WHEN la Lista_De_Productos se renderiza inicialmente, THE Sistema SHALL mostrar el Tab_Compuestos como Tab_Seleccionado_Por_Defecto y el Tab_Simples como segunda opción no seleccionada.
2. THE Sistema SHALL rotular el Tab_Compuestos con el texto "Productos compuestos" y el icono `bi-boxes` de Bootstrap Icons.
3. THE Sistema SHALL rotular el Tab_Simples con el texto "Productos simples" y el icono `bi-box` de Bootstrap Icons.
4. WHEN el usuario selecciona una pestaña, THE Sistema SHALL mostrar los Productos de esa pestaña y ocultar los Productos de la otra pestaña.
5. THE Sistema SHALL presentar el Tab_Compuestos antes del Tab_Simples en el orden de las pestañas.

### Requirement 8: Estado vacío de las pestañas

**User Story:** Como usuario, quiero un mensaje claro cuando una pestaña no tiene Productos, para entender que no hay elementos de ese tipo en lugar de ver un área en blanco.

#### Acceptance Criteria

1. IF no hay ningún Producto guardado, THEN THE Sistema SHALL mostrar la indicación de estado vacío de la Lista_De_Productos que muestra el comportamiento actual.
2. IF el Tab_Compuestos no contiene ningún Producto_Compuesto mientras existe al menos un Producto guardado, THEN THE Sistema SHALL mostrar en el Tab_Compuestos una indicación de que no hay productos compuestos.
3. IF el Tab_Simples no contiene ningún Producto_Simple mientras existe al menos un Producto guardado, THEN THE Sistema SHALL mostrar en el Tab_Simples una indicación de que no hay productos simples.

### Requirement 9: Ocultamiento del Flag_Compuesto en la interfaz

**User Story:** Como usuario, no quiero ver ni editar el indicador interno de simple o compuesto en las ventanas de detalle y edición, para que la interfaz se mantenga simple y la clasificación siga siendo automática.

#### Acceptance Criteria

1. WHEN la Ventana_Detalle de un Producto se muestra, THE Sistema SHALL omitir el Flag_Compuesto de la información presentada.
2. WHEN la Ventana_Edicion de un Producto se muestra, THE Sistema SHALL omitir cualquier control que muestre o modifique el Flag_Compuesto.
3. THE Sistema SHALL derivar el Flag_Compuesto exclusivamente de las Lineas_De_Calculo del Producto, sin exponer un control para asignarlo manualmente.
