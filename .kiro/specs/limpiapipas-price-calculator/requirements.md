# Requirements Document

## Introduction

Esta funcionalidad describe una aplicación web local del lado del cliente, construida únicamente con HTML, CSS y JavaScript vanilla puro, que permite calcular el precio de nuevos productos elaborados con limpiapipas. La aplicación no utiliza servidor, ni framework, ni ningún paso de empaquetado o compilación (build). La aplicación utiliza Bootstrap alojado localmente (sin CDN) para el diseño y consiste, como mínimo, en un archivo `index.html`.

La aplicación se ejecuta abriendo el archivo `index.html` con doble clic en el navegador, es decir bajo el Protocolo_De_Archivo (`file://`), sin necesidad de levantar un servidor. Debido a que la aplicación se abre bajo el Protocolo_De_Archivo y sin empaquetado, la lógica JavaScript se carga mediante Scripts_Clasicos (etiquetas `<script src="...">` sin `type="module"`), que comparten su API a través de un espacio de nombres global en lugar de emplear `import`/`export` de Módulos ES resueltos por el navegador.

La aplicación tiene dos capacidades principales:
1. **Gestión de parámetros**: el usuario configura parámetros reutilizables, cada uno con un nombre, un precio unitario en soles (PEN) y una unidad de medida (por ejemplo, UND, MIN).
2. **Calculadora dinámica de productos**: el usuario define un nuevo producto, agrega varias líneas de parámetros con sus cantidades y obtiene un precio total al calcular.

La interfaz se organiza en tres páginas, cada una con su propio botón principal en una barra de navegación superior: la Pagina_Productos, la Pagina_Parametros y la Pagina_Base_De_Datos. La Pagina_Productos es la página principal (de inicio) que se muestra al cargar la aplicación; contiene la calculadora dinámica y la lista de Productos guardados. La Pagina_Parametros contiene la gestión de Parametros y la lista de Parametros guardados. La Pagina_Base_De_Datos permite exportar todos los datos guardados en el almacenamiento local a un archivo JSON y volver a importar ese archivo para restaurar los datos. El usuario alterna entre las tres páginas mediante los botones de la barra de navegación superior.

Tanto los parámetros como los productos se guardan localmente en formato JSON, de modo que la información persiste entre sesiones sin necesidad de un servidor.

## Glossary

- **Aplicacion**: La aplicación web local del lado del cliente, construida únicamente con HTML, CSS y JavaScript vanilla puro, compuesta como mínimo por `index.html`, que ejecuta toda la lógica en el navegador sin servidor, sin framework y sin ningún paso de empaquetado o compilación (build).
- **Protocolo_De_Archivo**: Modo de apertura de la Aplicacion en el navegador mediante el esquema `file://`, que se produce al abrir el archivo `index.html` con doble clic desde el sistema de archivos, sin levantar un servidor.
- **Scripts_Clasicos**: Mecanismo de carga de la lógica JavaScript de la Aplicacion mediante etiquetas `<script src="...">` sin `type="module"`, que comparten su API a través de un espacio de nombres global en lugar de emplear `import`/`export` de Módulos ES resueltos por el navegador, de modo que la Aplicacion funciona bajo el Protocolo_De_Archivo.
- **Parametro**: Elemento reutilizable de costeo definido por el usuario, compuesto por un nombre, un precio unitario en soles y una unidad de medida. Ejemplo: `Limpiapipas - 0.5 - UND`.
- **Precio_Unitario**: Valor numérico en soles (PEN) asociado a un Parametro, expresado con hasta dos decimales.
- **Unidad**: Etiqueta de medida asociada a un Parametro (por ejemplo, UND, MIN).
- **Producto**: Nuevo artículo definido por el usuario, compuesto por un nombre y una o más Lineas_De_Calculo, con un Precio_Total resultante.
- **Linea_De_Calculo**: Fila dentro de la calculadora que referencia un Parametro y una cantidad numérica.
- **Cantidad**: Valor numérico no negativo que indica cuántas unidades de un Parametro se usan en una Linea_De_Calculo.
- **Precio_Total**: Suma de los subtotales de todas las Lineas_De_Calculo de un Producto, donde cada subtotal es Cantidad multiplicada por Precio_Unitario.
- **Almacenamiento_Local**: Mecanismo de persistencia del navegador (localStorage) donde la Aplicacion guarda los datos en formato JSON.
- **Gestor_De_Parametros**: Componente de la Aplicacion responsable de crear, listar, editar y eliminar Parametros.
- **Calculadora**: Componente de la Aplicacion responsable de definir Productos, agregar Lineas_De_Calculo y calcular el Precio_Total.
- **Barra_De_Navegacion**: Barra ubicada en la parte superior de la Aplicacion que contiene tres botones principales, uno para la Pagina_Productos, otro para la Pagina_Parametros y otro para la Pagina_Base_De_Datos, y permite alternar entre las tres páginas.
- **Pagina_Productos**: Página principal (de inicio) de la Aplicacion que contiene la Calculadora y muestra la lista de Productos guardados.
- **Pagina_Parametros**: Página de la Aplicacion que contiene el Gestor_De_Parametros y muestra la lista de Parametros guardados.
- **Pagina_Base_De_Datos**: Página de la Aplicacion que permite exportar todos los datos guardados en el Almacenamiento_Local a un Archivo_De_Respaldo y volver a importar un Archivo_De_Respaldo para restaurar esos datos.
- **Archivo_De_Respaldo**: Archivo en formato JSON que la Aplicacion genera al exportar y acepta al importar, que contiene todos los datos guardados en el Almacenamiento_Local (la lista de Parametros y la lista de Productos) y un campo de versión para compatibilidad con las claves de almacenamiento versionadas (por ejemplo, `limpiapipas.parametros.v1` y `limpiapipas.productos.v1`).

## Requirements

### Requisito 1: Configuración de parámetros

**Historia de Usuario:** Como usuario, quiero configurar parámetros con nombre, precio unitario y unidad, para reutilizarlos al calcular el precio de mis productos.

#### Criterios de Aceptación

1. WHEN el usuario envía un nuevo parámetro cuyo nombre contiene entre 1 y 100 caracteres, cuyo Precio_Unitario es un número entre 0.00 y 999999999.99 en soles (PEN) con un máximo de 2 decimales, y cuya Unidad contiene entre 1 y 20 caracteres, THE Gestor_De_Parametros SHALL agregar el Parametro a la lista de parámetros.
2. IF el usuario envía un parámetro con el campo nombre vacío o con más de 100 caracteres, THEN THE Gestor_De_Parametros SHALL rechazar el registro y mostrar un mensaje que indique que el nombre debe contener entre 1 y 100 caracteres.
3. IF el usuario envía un parámetro con un nombre que coincide con el nombre de un Parametro ya existente en la lista de parámetros, THEN THE Gestor_De_Parametros SHALL rechazar el registro y mostrar un mensaje que indique que ya existe un parámetro con ese nombre.
4. IF el usuario envía un parámetro con un Precio_Unitario que no es un número, que es menor que 0.00, que es mayor que 999999999.99 o que tiene más de 2 decimales, THEN THE Gestor_De_Parametros SHALL rechazar el registro y mostrar un mensaje que indique que el precio unitario debe ser un número entre 0.00 y 999999999.99 con un máximo de 2 decimales.
5. IF el usuario envía un parámetro con el campo unidad vacío o con más de 20 caracteres, THEN THE Gestor_De_Parametros SHALL rechazar el registro y mostrar un mensaje que indique que la unidad debe contener entre 1 y 20 caracteres.
6. THE Gestor_De_Parametros SHALL mostrar la lista de Parametros existentes indicando nombre, Precio_Unitario en soles (PEN) y Unidad de cada uno.
7. WHILE la lista de parámetros no contiene ningún Parametro, THE Gestor_De_Parametros SHALL mostrar una indicación de que no hay parámetros configurados.

### Requisito 2: Edición y eliminación de parámetros

**Historia de Usuario:** Como usuario, quiero editar y eliminar parámetros existentes, para mantener actualizada mi lista de costos.

#### Criterios de Aceptación

1. WHEN el usuario confirma la edición de un Parametro existente en la lista de parámetros y todos los valores cumplen las reglas de validación del Requisito 1, THE Gestor_De_Parametros SHALL actualizar el nombre, el Precio_Unitario y la Unidad de ese Parametro con los nuevos valores y conservar el resto de los parámetros sin cambios.
2. WHEN el usuario confirma la eliminación de un Parametro existente en la lista de parámetros, THE Gestor_De_Parametros SHALL quitar ese Parametro de la lista de parámetros y conservar los demás parámetros sin cambios.
3. IF el usuario edita un Parametro con uno o más valores que no cumplen las reglas de validación del Requisito 1, THEN THE Gestor_De_Parametros SHALL rechazar la actualización, conservar los valores originales del Parametro sin cambios y mostrar un mensaje de validación que indique el campo inválido.
4. IF el usuario confirma la eliminación de un Parametro que está referenciado por una o más líneas de la calculadora, THEN THE Gestor_De_Parametros SHALL solicitar confirmación explícita antes de eliminarlo e indicar la cantidad de líneas afectadas, y al confirmarse la eliminación SHALL marcar cada línea de la calculadora que lo referenciaba como sin parámetro asociado.

### Requisito 3: Definición de un nuevo producto en la calculadora

**Historia de Usuario:** Como usuario, quiero definir un nuevo producto e ingresar su nombre, para identificar el artículo cuyo precio voy a calcular.

#### Criterios de Aceptación

1. THE Calculadora SHALL proporcionar un campo para ingresar el nombre del Producto que acepte entre 1 y 100 caracteres.
2. IF el usuario intenta calcular un Producto con el campo nombre vacío o que contenga únicamente espacios en blanco, THEN THE Calculadora SHALL rechazar el cálculo, conservar los datos ya ingresados y mostrar un mensaje que indique que el nombre del producto es obligatorio.
3. IF el usuario ingresa un nombre de Producto que excede los 100 caracteres, THEN THE Calculadora SHALL rechazar el cálculo, conservar los datos ya ingresados y mostrar un mensaje que indique que el nombre del producto supera la longitud máxima permitida.
4. WHEN el usuario ingresa un nombre de Producto con entre 1 y 100 caracteres visibles, THE Calculadora SHALL aceptar el nombre y habilitar el cálculo del precio.

### Requisito 4: Agregar líneas de parámetros a la calculadora

**Historia de Usuario:** Como usuario, quiero agregar varias líneas de parámetros con sus cantidades usando un botón, para componer el producto con los insumos que necesita.

#### Criterios de Aceptación

1. WHEN el usuario presiona el botón de agregar línea, THE Calculadora SHALL añadir al producto en edición una nueva Linea_De_Calculo con el Parametro sin seleccionar y la Cantidad vacía.
2. THE Calculadora SHALL permitir seleccionar el Parametro de una Linea_De_Calculo a partir de la lista de Parametros configurados.
3. THE Calculadora SHALL permitir ingresar en la Cantidad de una Linea_De_Calculo un valor numérico mayor o igual a 0,01 y menor o igual a 999.999.999,99, con hasta 2 decimales.
4. IF el usuario ingresa en la Cantidad de una Linea_De_Calculo un valor vacío, no numérico o fuera del rango permitido de 0,01 a 999.999.999,99, THEN THE Calculadora SHALL rechazar el valor, mostrar una indicación de error señalando que la Cantidad es inválida y conservar la Linea_De_Calculo en edición sin registrar el valor rechazado.
5. WHEN el usuario presiona el control de eliminar de una Linea_De_Calculo, THE Calculadora SHALL quitar esa Linea_De_Calculo del producto en edición.
6. WHILE el producto en edición no tiene ninguna Linea_De_Calculo, THE Calculadora SHALL mostrar una indicación de que no hay líneas agregadas.
7. WHILE una Linea_De_Calculo tiene un Parametro seleccionado, THE Calculadora SHALL mostrar la Unidad asociada a ese Parametro.

### Requisito 5: Cálculo del precio total

**Historia de Usuario:** Como usuario, quiero presionar un botón calcular para sumar los parámetros con sus cantidades, para obtener el precio total del nuevo producto.

#### Criterios de Aceptación

1. WHEN el usuario presiona el botón calcular con al menos una Linea_De_Calculo válida, THE Calculadora SHALL calcular el subtotal de cada Linea_De_Calculo como la Cantidad multiplicada por el Precio_Unitario del Parametro seleccionado, redondeado a 2 decimales mediante redondeo estándar (half-up).
2. WHEN el usuario presiona el botón calcular con al menos una Linea_De_Calculo válida, THE Calculadora SHALL calcular el Precio_Total como la suma de los subtotales de todas las Lineas_De_Calculo, redondeada a 2 decimales.
3. WHEN el usuario presiona el botón calcular con al menos una Linea_De_Calculo válida, THE Calculadora SHALL mostrar el subtotal de cada Linea_De_Calculo y el Precio_Total en soles (PEN) con 2 decimales.
4. IF el usuario presiona el botón calcular sin ninguna Linea_De_Calculo, THEN THE Calculadora SHALL rechazar el cálculo y mostrar un mensaje que indique que se debe agregar al menos un parámetro.
5. IF el usuario presiona el botón calcular y una o más Lineas_De_Calculo tienen una Cantidad que no es un número o que está fuera del rango de 0,01 a 999.999.999,99, THEN THE Calculadora SHALL rechazar el cálculo y mostrar un mensaje que indique que cada cantidad debe ser un número entre 0,01 y 999.999.999,99.
6. IF el usuario presiona el botón calcular y una o más Lineas_De_Calculo no tienen un Parametro seleccionado, THEN THE Calculadora SHALL rechazar el cálculo y mostrar un mensaje que indique que cada línea debe tener un parámetro seleccionado.

### Requisito 6: Persistencia local en JSON

**Historia de Usuario:** Como usuario, quiero que los parámetros y productos se guarden localmente en formato JSON, para conservar mi información entre sesiones.

#### Criterios de Aceptación

1. WHEN el usuario agrega, edita o elimina un Parametro, THE Aplicacion SHALL guardar la lista completa de Parametros en el Almacenamiento_Local en formato JSON en un plazo máximo de 500 milisegundos.
2. WHEN el usuario guarda un Producto calculado, THE Aplicacion SHALL guardar el Producto, incluyendo su nombre, sus Lineas_De_Calculo y su Precio_Total, en el Almacenamiento_Local en formato JSON en un plazo máximo de 500 milisegundos.
3. WHEN la Aplicacion se carga en el navegador, THE Aplicacion SHALL leer los Parametros y Productos guardados en el Almacenamiento_Local y mostrarlos en un plazo máximo de 2 segundos.
4. IF el Almacenamiento_Local no contiene datos previos, THEN THE Aplicacion SHALL iniciar con una lista de Parametros vacía y una lista de Productos vacía.
5. IF el contenido JSON del Almacenamiento_Local está corrupto o no se puede interpretar, THEN THE Aplicacion SHALL iniciar con listas vacías, conservar el contenido original sin sobrescribirlo y mostrar un mensaje que indique que los datos guardados no se pudieron cargar.
6. IF la operación de guardado en el Almacenamiento_Local falla porque el almacenamiento no está disponible o se supera su capacidad, THEN THE Aplicacion SHALL conservar los datos en memoria de la sesión actual y mostrar un mensaje que indique que los cambios no se pudieron guardar de forma persistente.

### Requisito 7: Interfaz con Bootstrap local

**Historia de Usuario:** Como usuario, quiero una interfaz simple basada en Bootstrap alojado localmente que se abra con doble clic en el navegador, para usar la aplicación sin conexión a internet, sin recursos externos y sin levantar un servidor.

#### Criterios de Aceptación

1. WHEN se carga la página de la Aplicacion, THE Aplicacion SHALL cargar y aplicar los estilos y componentes de Bootstrap exclusivamente desde archivos alojados localmente en el proyecto.
2. THE Aplicacion SHALL operar realizando cero solicitudes salientes a recursos de red externos (dominios distintos al origen local del proyecto) durante toda su ejecución.
3. WHEN el usuario abre el archivo `index.html` con doble clic bajo el Protocolo_De_Archivo, THE Aplicacion SHALL cargar toda la interfaz desde el archivo `index.html`, cargar la lógica JavaScript mediante Scripts_Clasicos y alternar entre la Pagina_Productos, la Pagina_Parametros y la Pagina_Base_De_Datos mediante conmutación de vistas accesible desde los botones de la Barra_De_Navegacion, sin realizar recargas de página ni solicitudes de red.
4. WHEN el usuario abre el archivo `index.html` con doble clic bajo el Protocolo_De_Archivo sin un servidor en ejecución, THE Aplicacion SHALL iniciar y quedar operativa sin depender de Módulos ES resueltos por el navegador (etiquetas `<script type="module">` con `import`/`export` en tiempo de ejecución).
5. IF alguno de los archivos locales de Bootstrap no puede cargarse, THEN THE Aplicacion SHALL continuar mostrando la Pagina_Productos, la Pagina_Parametros y la Pagina_Base_De_Datos en estado funcional y presentar una indicación visible de que los estilos no se cargaron.
6. WHERE la lógica JavaScript se carga mediante Scripts_Clasicos que comparten un único ámbito global, THE Aplicacion SHALL encapsular el cuerpo de cada archivo de `src/` de modo que sus identificadores internos no se declaren en el ámbito global, evitando colisiones de identificadores de nivel superior que aborten la carga de scripts e impidan el arranque.

### Requisito 8: Navegación y estructura de páginas

**Historia de Usuario:** Como usuario, quiero navegar entre una página de Productos, una página de Parámetros y una página de Base de datos mediante una barra de navegación superior, para acceder a cada capacidad de la aplicación de forma clara y separada.

#### Criterios de Aceptación

1. THE Aplicacion SHALL presentar una Barra_De_Navegacion en la parte superior con tres botones principales: un botón para la Pagina_Productos, un botón para la Pagina_Parametros y un botón para la Pagina_Base_De_Datos.
2. WHEN se carga la Aplicacion en el navegador, THE Aplicacion SHALL mostrar la Pagina_Productos como página de inicio predeterminada.
3. WHEN el usuario presiona el botón de Parámetros de la Barra_De_Navegacion, THE Aplicacion SHALL mostrar la Pagina_Parametros y ocultar la Pagina_Productos y la Pagina_Base_De_Datos.
4. WHEN el usuario presiona el botón de Productos de la Barra_De_Navegacion, THE Aplicacion SHALL mostrar la Pagina_Productos y ocultar la Pagina_Parametros y la Pagina_Base_De_Datos.
5. WHEN el usuario presiona el botón de Base de datos de la Barra_De_Navegacion, THE Aplicacion SHALL mostrar la Pagina_Base_De_Datos y ocultar la Pagina_Productos y la Pagina_Parametros.
6. THE Pagina_Parametros SHALL mostrar la lista de Parametros guardados existentes indicando nombre, Precio_Unitario en soles (PEN) y Unidad de cada uno.
7. THE Pagina_Productos SHALL mostrar la lista de Productos guardados existentes indicando el nombre y el Precio_Total en soles (PEN) de cada uno.

### Requisito 9: Exportación e importación de datos (Base de datos)

**Historia de Usuario:** Como usuario, quiero exportar todos mis datos a un archivo JSON y volver a importarlo desde la página de Base de datos, para respaldar mi información y restaurarla o trasladarla entre dispositivos.

#### Criterios de Aceptación

1. THE Pagina_Base_De_Datos SHALL proporcionar un botón Exportar que genere y descargue un Archivo_De_Respaldo en formato JSON que contenga todos los datos guardados en el Almacenamiento_Local, incluyendo la lista de Parametros y la lista de Productos.
2. WHEN el usuario presiona el botón Exportar, THE Aplicacion SHALL incluir en el Archivo_De_Respaldo un campo de versión y las colecciones de Parametros y Productos, de forma compatible con las claves de almacenamiento versionadas `limpiapipas.parametros.v1` y `limpiapipas.productos.v1`.
3. THE Pagina_Base_De_Datos SHALL proporcionar un control Importar que permita al usuario seleccionar y cargar un Archivo_De_Respaldo en formato JSON desde su dispositivo.
4. WHEN el usuario selecciona un Archivo_De_Respaldo para importar, THE Aplicacion SHALL solicitar confirmación explícita advirtiendo que la importación reemplazará los Parametros y Productos actuales del Almacenamiento_Local antes de aplicar los cambios.
5. WHEN el usuario confirma la importación de un Archivo_De_Respaldo cuyo contenido es JSON válido y cumple la estructura esperada con las colecciones de Parametros y Productos, THE Aplicacion SHALL reemplazar los Parametros y Productos actuales del Almacenamiento_Local con los datos importados y actualizar las vistas de la Aplicacion para usar los datos importados.
6. IF el usuario importa un archivo cuyo contenido no es JSON válido o no cumple la estructura esperada con las colecciones de Parametros y Productos, THEN THE Aplicacion SHALL rechazar la importación, conservar sin cambios los Parametros y Productos ya guardados en el Almacenamiento_Local y mostrar un mensaje que indique que el archivo es inválido.
7. IF el usuario cancela la confirmación de la importación, THEN THE Aplicacion SHALL conservar sin cambios los Parametros y Productos ya guardados en el Almacenamiento_Local.
