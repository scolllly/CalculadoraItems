# Requirements Document

## Introduction

Esta funcionalidad amplía la Pagina_Productos de la Aplicacion Limpiapipas (calculadora de precios) para permitir consultar, editar y eliminar los Productos ya guardados desde la lista de Productos. Actualmente la lista de Productos solo muestra el nombre y el Precio_Total de cada Producto (Requisito 8.7 de la especificación base) y no ofrece ninguna acción sobre cada Producto.

Con esta funcionalidad, cada elemento de la lista de Productos guardados incorpora tres acciones:

1. **Ver detalle**: abre una Ventana_Detalle (pop-up/modal) que muestra cada Linea_De_Calculo con la que se creó el Producto (nombre del Parametro, Cantidad, Unidad y subtotal) además del Precio_Total.
2. **Editar**: abre una Ventana_Edicion (pop-up/modal) que contiene únicamente la sección de agregar y eliminar Lineas_De_Calculo (el mismo mecanismo de la Calculadora). El nombre del Producto se muestra pero no puede modificarse. Al guardar, se recalculan y persisten las Lineas_De_Calculo, sus subtotales y el Precio_Total.
3. **Eliminar**: elimina el Producto de la lista, previa confirmación explícita, y persiste el cambio.

Todos los cambios (ediciones y eliminaciones) se persisten en el Almacenamiento_Local mediante el mecanismo existente, de modo que se reflejan también al exportar la base de datos a un Archivo_De_Respaldo y al importarla nuevamente.

Esta funcionalidad respeta las restricciones de la Aplicacion base: HTML, CSS y JavaScript vanilla puro, sin servidor, sin framework, sin empaquetado, con Bootstrap alojado localmente, ejecución bajo el Protocolo_De_Archivo (`file://`) y carga de la lógica mediante Scripts_Clasicos sobre el espacio de nombres global `window.LP`. La interfaz está en español y la moneda es soles (PEN).

## Glossary

Los términos definidos en la especificación base (`limpiapipas-price-calculator`) se reutilizan sin cambios: **Aplicacion**, **Protocolo_De_Archivo**, **Scripts_Clasicos**, **Parametro**, **Precio_Unitario**, **Unidad**, **Producto**, **Linea_De_Calculo**, **Cantidad**, **Precio_Total**, **Almacenamiento_Local**, **Calculadora**, **Pagina_Productos**, **Pagina_Base_De_Datos** y **Archivo_De_Respaldo**.

Términos nuevos o refinados para esta funcionalidad:

- **Lista_De_Productos**: Componente de la Pagina_Productos que muestra los Productos guardados existentes, cada uno con su nombre, su Precio_Total en soles (PEN) y las acciones de Ver detalle, Editar y Eliminar.
- **Producto_Seleccionado**: El Producto sobre el que el usuario ejecuta una acción (Ver detalle, Editar o Eliminar) desde la Lista_De_Productos.
- **Ventana_Detalle**: Elemento emergente (pop-up/modal de Bootstrap) que muestra en modo de solo lectura el nombre del Producto_Seleccionado, cada una de sus Lineas_De_Calculo (nombre del Parametro, Cantidad, Unidad y subtotal) y su Precio_Total en soles (PEN).
- **Ventana_Edicion**: Elemento emergente (pop-up/modal de Bootstrap) que muestra el nombre del Producto_Seleccionado en modo de solo lectura y permite agregar y eliminar Lineas_De_Calculo, así como recalcular y guardar los cambios del Producto_Seleccionado.
- **Ver_Detalle**: Acción activada desde la Lista_De_Productos que abre la Ventana_Detalle.
- **Nombre_Parametro_Ausente**: Texto indicador que la Ventana_Detalle muestra en lugar del nombre del Parametro cuando una Linea_De_Calculo referencia un Parametro que ya no existe en la lista de Parametros o no tiene Parametro asociado. Este texto también aplica al mostrar subtotales de dichas Lineas_De_Calculo.

## Requirements

### Requisito 1: Acciones por Producto en la lista

**Historia de Usuario:** Como usuario, quiero que cada Producto guardado en la lista tenga botones de Ver detalle, Editar y Eliminar, para consultar y gestionar cada Producto directamente desde la Pagina_Productos.

#### Criterios de Aceptación

1. THE Lista_De_Productos SHALL mostrar, para cada Producto guardado, el nombre del Producto, su Precio_Total en soles (PEN) con exactamente 2 decimales, un botón Ver detalle, un botón Editar y un botón Eliminar.
2. WHILE la Lista_De_Productos no contiene ningún Producto, THE Lista_De_Productos SHALL mostrar una indicación de que no hay productos guardados y no mostrar botones de Ver detalle, Editar ni Eliminar.
3. WHEN el usuario presiona el botón Ver detalle de un Producto de la Lista_De_Productos, THE Aplicacion SHALL abrir la Ventana_Detalle para ese Producto como Producto_Seleccionado.
4. WHEN el usuario presiona el botón Editar de un Producto de la Lista_De_Productos, THE Aplicacion SHALL abrir la Ventana_Edicion para ese Producto como Producto_Seleccionado.
5. WHEN el usuario presiona el botón Eliminar de un Producto de la Lista_De_Productos, THE Aplicacion SHALL iniciar el flujo de eliminación del Requisito 4 para ese Producto como Producto_Seleccionado.

### Requisito 2: Ver detalle de un Producto

**Historia de Usuario:** Como usuario, quiero ver en una ventana emergente las líneas con las que se creó un Producto, para revisar su composición sin modificarlo.

#### Criterios de Aceptación

1. WHEN el usuario activa la acción Ver detalle sobre un Producto_Seleccionado de la Lista_De_Productos, THE Aplicacion SHALL abrir la Ventana_Detalle y mostrar el nombre del Producto_Seleccionado.
2. WHEN la Aplicacion abre la Ventana_Detalle de un Producto_Seleccionado, THE Ventana_Detalle SHALL mostrar, para cada Linea_De_Calculo del Producto_Seleccionado y en el mismo orden en que fueron creadas, el nombre del Parametro referenciado, la Cantidad, la Unidad del Parametro y el subtotal en soles (PEN) con exactamente 2 decimales.
3. WHEN la Aplicacion abre la Ventana_Detalle de un Producto_Seleccionado, THE Ventana_Detalle SHALL mostrar el Precio_Total del Producto_Seleccionado en soles (PEN) con exactamente 2 decimales.
4. IF una Linea_De_Calculo del Producto_Seleccionado referencia un Parametro que ya no existe en la lista de Parametros o no tiene Parametro asociado, THEN THE Ventana_Detalle SHALL mostrar el texto Nombre_Parametro_Ausente en lugar del nombre del Parametro, dejar la Unidad vacía y mostrar el subtotal de esa Linea_De_Calculo tal como fue almacenado en soles (PEN) con exactamente 2 decimales.
5. WHILE la Ventana_Detalle está abierta, THE Ventana_Detalle SHALL mostrar las Lineas_De_Calculo en modo de solo lectura, sin controles para agregar, eliminar ni modificar Lineas_De_Calculo.
6. WHEN el usuario cierra la Ventana_Detalle, THE Aplicacion SHALL conservar el Producto_Seleccionado sin cambios en la Lista_De_Productos y en el Almacenamiento_Local.
7. IF el Producto_Seleccionado no tiene ninguna Linea_De_Calculo, THEN THE Ventana_Detalle SHALL mostrar el nombre del Producto_Seleccionado, un mensaje indicando que el Producto no tiene Lineas_De_Calculo y su Precio_Total en soles (PEN) con exactamente 2 decimales.

### Requisito 3: Editar las líneas de un Producto

**Historia de Usuario:** Como usuario, quiero editar las líneas de un Producto guardado en una ventana emergente que contenga solo la sección de agregar y eliminar líneas, para corregir su composición sin poder cambiar su nombre.

#### Criterios de Aceptación

1. WHEN la Aplicacion abre la Ventana_Edicion de un Producto_Seleccionado, THE Ventana_Edicion SHALL mostrar el nombre del Producto_Seleccionado en modo de solo lectura, sin permitir su modificación.
2. WHEN la Aplicacion abre la Ventana_Edicion de un Producto_Seleccionado, THE Ventana_Edicion SHALL precargar una Linea_De_Calculo por cada Linea_De_Calculo del Producto_Seleccionado, con su Parametro seleccionado y su Cantidad.
3. THE Ventana_Edicion SHALL proporcionar la sección de agregar y eliminar Lineas_De_Calculo con el mismo comportamiento de la Calculadora descrito en el Requisito 4 de la especificación base (agregar línea, seleccionar Parametro, ingresar Cantidad, eliminar línea, indicación de estado sin líneas y visualización de la Unidad del Parametro seleccionado).
4. THE Ventana_Edicion SHALL proporcionar un control para guardar los cambios del Producto_Seleccionado y un control para cancelar la edición.
5. WHEN el usuario confirma el guardado en la Ventana_Edicion con al menos una Linea_De_Calculo válida y con todas sus Cantidades y Parametros válidos según los Requisitos 5.1 a 5.6 de la especificación base, THE Aplicacion SHALL recalcular el subtotal de cada Linea_De_Calculo y el Precio_Total del Producto_Seleccionado, conservar el nombre y el identificador originales del Producto_Seleccionado, actualizar el Producto_Seleccionado en la lista de Productos con las nuevas Lineas_De_Calculo, subtotales y Precio_Total, y persistir la lista de Productos actualizada en el Almacenamiento_Local.
6. IF el usuario confirma el guardado en la Ventana_Edicion sin ninguna Linea_De_Calculo, THEN THE Aplicacion SHALL rechazar el guardado, conservar los datos en edición y mostrar un mensaje que indique que se debe agregar al menos un parámetro.
7. IF el usuario confirma el guardado en la Ventana_Edicion y una o más Lineas_De_Calculo tienen una Cantidad que no es un número o que está fuera del rango de 0,01 a 999.999.999,99, THEN THE Aplicacion SHALL rechazar el guardado, conservar los datos en edición y mostrar un mensaje que indique que cada cantidad debe ser un número entre 0,01 y 999.999.999,99.
8. IF el usuario confirma el guardado en la Ventana_Edicion y una o más Lineas_De_Calculo no tienen un Parametro seleccionado, THEN THE Aplicacion SHALL rechazar el guardado, conservar los datos en edición y mostrar un mensaje que indique que cada línea debe tener un parámetro seleccionado.
9. WHEN el usuario cancela la edición en la Ventana_Edicion mediante el control de cancelar o cerrando la Ventana_Edicion sin confirmar el guardado, THE Aplicacion SHALL conservar el Producto_Seleccionado sin cambios en la lista de Productos y en el Almacenamiento_Local, y descartar las modificaciones en edición.

### Requisito 4: Eliminar un Producto

**Historia de Usuario:** Como usuario, quiero eliminar un Producto guardado desde la lista, para quitar los productos que ya no necesito.

#### Criterios de Aceptación

1. WHEN el usuario presiona el botón Eliminar de un Producto de la Lista_De_Productos, THE Aplicacion SHALL solicitar confirmación explícita antes de eliminar el Producto_Seleccionado.
2. WHEN el usuario confirma la eliminación del Producto_Seleccionado, THE Aplicacion SHALL quitar el Producto_Seleccionado de la lista de Productos, conservar los demás Productos sin cambios y persistir la lista de Productos resultante en el Almacenamiento_Local.
3. IF el usuario cancela la confirmación de eliminación, THEN THE Aplicacion SHALL conservar el Producto_Seleccionado sin cambios en la lista de Productos y en el Almacenamiento_Local.
4. WHEN la Aplicacion elimina el Producto_Seleccionado de la lista de Productos, THE Lista_De_Productos SHALL actualizar la vista para dejar de mostrar el Producto_Seleccionado.
5. IF tras confirmar la eliminación la operación de guardado en el Almacenamiento_Local falla porque el almacenamiento no está disponible o se supera su capacidad, THEN THE Aplicacion SHALL conservar la lista de Productos resultante en memoria de la sesión actual y mostrar un mensaje que indique que los cambios no se pudieron guardar de forma persistente.

### Requisito 5: Persistencia de ediciones y eliminaciones

**Historia de Usuario:** Como usuario, quiero que las ediciones y eliminaciones de Productos se guarden localmente, para conservar los cambios entre sesiones.

#### Criterios de Aceptación

1. WHEN el usuario guarda una edición de un Producto en la Ventana_Edicion, THE Aplicacion SHALL guardar la lista completa de Productos en el Almacenamiento_Local en formato JSON en un plazo máximo de 500 milisegundos.
2. WHEN el usuario confirma la eliminación de un Producto, THE Aplicacion SHALL guardar la lista completa de Productos en el Almacenamiento_Local en formato JSON en un plazo máximo de 500 milisegundos.
3. IF la operación de guardado en el Almacenamiento_Local falla porque el almacenamiento no está disponible o se supera su capacidad, THEN THE Aplicacion SHALL conservar la lista de Productos resultante en memoria de la sesión actual y mostrar un mensaje que indique que los cambios no se pudieron guardar de forma persistente.
4. WHEN la Aplicacion se carga en una nueva sesión, THE Aplicacion SHALL restaurar desde el Almacenamiento_Local la lista de Productos con las ediciones y eliminaciones previamente guardadas.

### Requisito 6: Reflejo en exportación e importación

**Historia de Usuario:** Como usuario, quiero que las ediciones y eliminaciones de Productos se reflejen al exportar e importar la base de datos, para respaldar y restaurar mi información actualizada.

#### Criterios de Aceptación

1. WHEN el usuario exporta la base de datos después de editar o eliminar Productos, THE Aplicacion SHALL incluir en el Archivo_De_Respaldo la lista de Productos con las Lineas_De_Calculo, Cantidades, subtotales y Precio_Total resultantes de las ediciones, y SHALL excluir del Archivo_De_Respaldo todos los Productos eliminados.
2. WHEN el usuario importa un Archivo_De_Respaldo que contiene una lista de Productos donde cada Producto incluye su identificador, sus Lineas_De_Calculo con Cantidades, subtotales y Precio_Total, THE Aplicacion SHALL mostrar en la Lista_De_Productos los Productos importados con las acciones de Ver detalle, Editar y Eliminar disponibles para cada uno.
3. WHEN el usuario abre la Ventana_Detalle o la Ventana_Edicion de un Producto importado, THE Aplicacion SHALL mostrar las Lineas_De_Calculo, Cantidades, subtotales y Precio_Total en soles (PEN) tal como se importaron, sin recalcular ni alterar los valores.
4. IF el usuario importa un archivo que no puede leerse o cuya estructura no contiene una lista de Productos válida, THEN THE Aplicacion SHALL rechazar la importación, mostrar un mensaje de error indicando que el archivo no es un Archivo_De_Respaldo válido, y conservar sin cambios los Productos existentes en la Lista_De_Productos.
