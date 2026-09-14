# Requirements Document

## Introduction

Esta funcionalidad amplía la creación y edición de Productos de la Aplicacion Limpiapipas (calculadora de precios) para permitir que una Linea_De_Calculo referencie, como fuente de su componente, no solo un Parametro (comportamiento actual) sino también otro Producto ya guardado. Cuando una línea referencia un Producto, el Precio_Total vigente de ese Producto actúa como precio unitario del componente y se multiplica por la Cantidad para obtener el subtotal de la línea.

Hoy una Linea_De_Calculo tiene la forma `{ parametroId, cantidad, subtotal }` y el selector de línea solo permite elegir un Parametro, mostrando su Unidad e ingresando una Cantidad. Con esta funcionalidad, el selector de línea incorpora una elección previa de Fuente_De_Componente ("Parámetro" o "Producto") y, según la fuente elegida, permite seleccionar un Parametro o un Producto_Componente.

La funcionalidad debe:

1. Extender el selector de línea de la Calculadora y de la Ventana_Edicion para elegir entre Parámetro y Producto como fuente del componente.
2. Calcular el subtotal de una línea de tipo Producto usando el Precio_Total vigente del Producto_Componente como precio unitario.
3. Prevenir ciclos de composición: un Producto no puede componerse de sí mismo de forma directa ni indirecta.
4. Definir el comportamiento cuando un Producto_Componente referenciado se elimina o cambia de Precio_Total.
5. Mantener sin cambios funcionales las operaciones existentes de editar, eliminar, exportar (Archivo_De_Respaldo) e importar/subir la base de datos.
6. Mantener la compatibilidad con los datos existentes (Productos y Lineas_De_Calculo creados con el formato actual, que solo referencian Parametros).
7. Registrar en cada Producto un atributo de Unidad persistido que, al crear un Producto, siempre vale "UND".

Esta funcionalidad respeta las restricciones de la Aplicacion base: HTML, CSS y JavaScript vanilla puro, sin servidor, sin framework, sin empaquetado, con Bootstrap alojado localmente, ejecución bajo el Protocolo_De_Archivo (`file://`) y carga de la lógica mediante Scripts_Clasicos sobre el espacio de nombres global `window.LP`. La interfaz está en español y la moneda es soles (PEN).

## Glossary

Los términos definidos en las especificaciones base (`limpiapipas-price-calculator` y `product-detail-edit-delete`) se reutilizan sin cambios: **Aplicacion**, **Protocolo_De_Archivo**, **Scripts_Clasicos**, **Parametro**, **Precio_Unitario**, **Unidad**, **Producto**, **Linea_De_Calculo**, **Cantidad**, **Precio_Total**, **Almacenamiento_Local**, **Calculadora**, **Pagina_Productos**, **Pagina_Base_De_Datos**, **Archivo_De_Respaldo**, **Lista_De_Productos**, **Producto_Seleccionado**, **Ventana_Detalle**, **Ventana_Edicion** y **Nombre_Parametro_Ausente**.

Términos nuevos o refinados para esta funcionalidad:

- **Selector_De_Linea**: Componente de la interfaz que, para una Linea_De_Calculo en edición, permite elegir su Fuente_De_Componente y, según esa elección, seleccionar el Parametro o el Producto_Componente, ingresar la Cantidad y ver la Unidad correspondiente. Es reutilizado por la Calculadora y por la Ventana_Edicion.
- **Fuente_De_Componente**: Atributo de una Linea_De_Calculo que indica el origen de su componente. Toma uno de dos valores: "Parámetro" (la línea referencia un Parametro) o "Producto" (la línea referencia un Producto_Componente).
- **Linea_De_Parametro**: Linea_De_Calculo cuya Fuente_De_Componente es "Parámetro"; referencia un Parametro mediante `parametroId` y usa el Precio_Unitario del Parametro como precio unitario.
- **Linea_De_Producto**: Linea_De_Calculo cuya Fuente_De_Componente es "Producto"; referencia un Producto_Componente mediante `productoComponenteId` y usa el Precio_Total vigente del Producto_Componente como precio unitario.
- **Producto_Componente**: Producto ya guardado que es referenciado por una Linea_De_Producto como componente de otro Producto.
- **Producto_Contenedor**: Producto que se está creando o editando y que contiene una o más Lineas_De_Producto.
- **Precio_Unitario_De_Componente**: Precio unitario usado para calcular el subtotal de una Linea_De_Calculo. Para una Linea_De_Parametro es el Precio_Unitario del Parametro; para una Linea_De_Producto es el Precio_Total vigente del Producto_Componente.
- **Unidad_De_Producto**: Atributo de Unidad propio de un Producto, persistido en el Almacenamiento_Local y en el Archivo_De_Respaldo. Al crear un Producto nuevo, su Unidad_De_Producto siempre vale "UND".
- **Ciclo_De_Composicion**: Situación en la que un Producto se compondría de sí mismo de forma directa (una Linea_De_Producto que referencia al propio Producto_Contenedor) o indirecta (una cadena de Lineas_De_Producto que, siguiendo las referencias entre Productos, regresa al Producto_Contenedor).
- **Nombre_Producto_Componente_Ausente**: Texto indicador que la Ventana_Detalle y el Selector_De_Linea muestran en lugar del nombre del Producto_Componente cuando una Linea_De_Producto referencia un Producto que ya no existe en la lista de Productos.
- **Unidad_De_Reemplazo**: Valor de Unidad "UND" que el Selector_De_Linea usa únicamente para mostrar una Linea_De_Producto cuyo Producto_Componente referenciado no tiene una Unidad_De_Producto definida. Es un valor de visualización que no modifica ni persiste el Producto_Componente.

## Requirements

### Requisito 1: Elección de la fuente del componente en el Selector_De_Linea

**Historia de Usuario:** Como usuario, quiero elegir si una línea toma su componente de un Parámetro o de un Producto ya guardado, para componer un Producto a partir de parámetros y de otros productos.

#### Criterios de Aceptación

1. WHEN el usuario agrega una Linea_De_Calculo en el Selector_De_Linea, THE Selector_De_Linea SHALL mostrar un control para elegir la Fuente_De_Componente entre los valores "Parámetro" y "Producto".
2. WHEN el usuario agrega una Linea_De_Calculo en el Selector_De_Linea, THE Selector_De_Linea SHALL establecer "Parámetro" como Fuente_De_Componente inicial de la Linea_De_Calculo.
3. WHILE la Fuente_De_Componente de una Linea_De_Calculo es "Parámetro", THE Selector_De_Linea SHALL mostrar el control de selección de Parametro, el control de ingreso de Cantidad y la Unidad del Parametro seleccionado.
4. WHILE la Fuente_De_Componente de una Linea_De_Calculo es "Producto", THE Selector_De_Linea SHALL mostrar el control de selección de Producto_Componente, el control de ingreso de Cantidad y, como Unidad de la línea, la Unidad_De_Producto del Producto_Componente referenciado si está definida, o la Unidad_De_Reemplazo "UND" si no lo está, sin permitir que el usuario la modifique.
5. WHEN el usuario cambia la Fuente_De_Componente de una Linea_De_Calculo de "Parámetro" a "Producto", THE Selector_De_Linea SHALL descartar el Parametro seleccionado en esa Linea_De_Calculo, dejar el Producto_Componente sin seleccionar y restablecer la Cantidad a un valor sin ingresar.
6. WHEN el usuario cambia la Fuente_De_Componente de una Linea_De_Calculo de "Producto" a "Parámetro", THE Selector_De_Linea SHALL descartar el Producto_Componente seleccionado en esa Linea_De_Calculo, dejar el Parametro sin seleccionar y restablecer la Cantidad a un valor sin ingresar.
7. WHEN el usuario ingresa la Cantidad de una Linea_De_Calculo, THE Selector_De_Linea SHALL aceptar únicamente un valor numérico mayor que 0 y menor o igual a 999.999.999,99 con hasta 2 decimales.
8. IF el usuario ingresa una Cantidad no numérica, menor o igual a 0, o mayor que 999.999.999,99, THEN THE Selector_De_Linea SHALL rechazar el valor ingresado, conservar la última Cantidad válida de la Linea_De_Calculo y mostrar una indicación de error señalando que la Cantidad es inválida.

### Requisito 2: Selección de un Producto_Componente en una línea

**Historia de Usuario:** Como usuario, quiero seleccionar un Producto ya guardado como componente de una línea, para reutilizar productos previamente construidos dentro de otro producto.

#### Criterios de Aceptación

1. WHILE la Fuente_De_Componente de una Linea_De_Calculo es "Producto", THE Selector_De_Linea SHALL ofrecer para selección los Productos guardados en orden alfabético ascendente por nombre, mostrando el nombre de cada Producto.
2. IF la Fuente_De_Componente de una Linea_De_Calculo es "Producto" y no existe ningún Producto disponible para seleccionar, THEN THE Selector_De_Linea SHALL mostrar una indicación de que no hay productos disponibles y dejar la Linea_De_Producto sin Producto_Componente seleccionado.
3. WHILE el usuario edita un Producto_Contenedor existente, THE Selector_De_Linea SHALL excluir de los Productos ofrecidos como Producto_Componente al propio Producto_Contenedor.
4. WHEN el usuario selecciona un Producto_Componente en una Linea_De_Producto que ya tenía un Producto_Componente referenciado, THE Selector_De_Linea SHALL reemplazar la referencia anterior por el identificador del Producto_Componente recién seleccionado.
5. WHEN el usuario selecciona un Producto_Componente en una Linea_De_Producto sin referencia previa, THE Selector_De_Linea SHALL registrar en esa Linea_De_Calculo la referencia al identificador del Producto_Componente seleccionado.
6. IF una Linea_De_Producto referencia un Producto_Componente que ya no existe en la lista de Productos, THEN THE Selector_De_Linea SHALL mostrar el texto Nombre_Producto_Componente_Ausente y dejar la Linea_De_Producto sin un Producto_Componente válido seleccionado.

### Requisito 3: Cálculo del subtotal de una Linea_De_Producto

**Historia de Usuario:** Como usuario, quiero que el subtotal de una línea de tipo Producto use el precio total del producto seleccionado, para que el costo del componente refleje el precio del producto reutilizado.

#### Criterios de Aceptación

1. WHEN la Aplicacion calcula el subtotal de una Linea_De_Producto que referencia un Producto_Componente existente con Precio_Total definido, THE Aplicacion SHALL usar el Precio_Total vigente de ese Producto_Componente como Precio_Unitario_De_Componente.
2. IF la Aplicacion calcula el subtotal de una Linea_De_Producto cuyo Producto_Componente no existe o carece de Precio_Total, THEN THE Aplicacion SHALL rechazar el cálculo del subtotal de esa línea, conservar sin cambios los datos en edición y mostrar una indicación de error señalando que el producto referenciado no está disponible.
3. WHEN la Aplicacion calcula el subtotal de una Linea_De_Producto, THE Aplicacion SHALL calcular el subtotal como el producto de la Cantidad por el Precio_Unitario_De_Componente, expresando el resultado con exactamente 2 decimales mediante redondeo half-up.
4. WHEN la Aplicacion calcula el Precio_Total de un Producto_Contenedor, THE Aplicacion SHALL sumar los subtotales de todas sus Lineas_De_Calculo, tanto Lineas_De_Parametro como Lineas_De_Producto, expresando la suma con exactamente 2 decimales mediante redondeo half-up.
5. WHEN la Aplicacion calcula el Precio_Total de un Producto_Contenedor que no contiene ninguna Linea_De_Calculo, THE Aplicacion SHALL establecer el Precio_Total en 0,00.

### Requisito 4: Validación de una Linea_De_Producto al calcular y guardar

**Historia de Usuario:** Como usuario, quiero que la aplicación valide las líneas de tipo Producto antes de calcular o guardar, para evitar productos con componentes incompletos o inválidos.

#### Criterios de Aceptación

1. IF el usuario solicita calcular o guardar un Producto_Contenedor y una o más Lineas_De_Producto no tienen un Producto_Componente seleccionado, THEN THE Aplicacion SHALL rechazar la operación, conservar sin cambios todos los datos en edición y mostrar un mensaje que indique que cada línea debe tener un producto seleccionado.
2. IF el usuario solicita calcular o guardar un Producto_Contenedor y una o más Lineas_De_Producto referencian un Producto_Componente que ya no existe en la lista de Productos, THEN THE Aplicacion SHALL rechazar la operación, conservar sin cambios todos los datos en edición y mostrar un mensaje que indique que cada línea debe tener un producto seleccionado.
3. IF el usuario solicita calcular o guardar un Producto_Contenedor y una o más Lineas_De_Producto tienen una Cantidad que no es un número o que está fuera del rango de 0,01 a 999.999.999,99, THEN THE Aplicacion SHALL rechazar la operación, conservar sin cambios todos los datos en edición y mostrar un mensaje que indique que cada cantidad debe ser un número entre 0,01 y 999.999.999,99.
4. WHEN el usuario solicita calcular o guardar un Producto_Contenedor en el que todas las Lineas_De_Producto presentes (si las hay) tienen un Producto_Componente seleccionado que existe en la lista de Productos y una Cantidad numérica dentro del rango de 0,01 a 999.999.999,99, THE Aplicacion SHALL ejecutar la operación solicitada de calcular o guardar.
5. IF el usuario solicita calcular o guardar un Producto_Contenedor y dos o más Lineas_De_Producto presentan simultáneamente cualquier combinación de los errores descritos en los criterios 1, 2 y 3, THEN THE Aplicacion SHALL rechazar la operación, conservar sin cambios todos los datos en edición e indicar cada una de las Lineas_De_Producto que presentan un error.

### Requisito 5: Prevención de ciclos de composición

**Historia de Usuario:** Como usuario, quiero que la aplicación impida que un producto se componga de sí mismo directa o indirectamente, para evitar composiciones circulares imposibles de calcular.

#### Criterios de Aceptación

1. IF el usuario intenta seleccionar como Producto_Componente de una Linea_De_Producto al propio Producto_Contenedor en edición, THEN THE Aplicacion SHALL rechazar la selección, conservar sin cambios los datos en edición y mostrar un mensaje que indique que un producto no puede contenerse a sí mismo.
2. IF el usuario solicita guardar un Producto_Contenedor cuyas Lineas_De_Producto producirían un Ciclo_De_Composicion de forma indirecta a través de las referencias entre Productos, THEN THE Aplicacion SHALL rechazar el guardado, conservar sin cambios los datos en edición y mostrar un mensaje que indique que la composición generaría una referencia circular entre productos, identificando la secuencia de Productos que forman el ciclo.
3. WHEN la Aplicacion evalúa si un Producto_Contenedor generaría un Ciclo_De_Composicion, THE Aplicacion SHALL recorrer de forma transitiva las Lineas_De_Producto de los Productos referenciados, hasta una profundidad máxima de 1.000 Productos distintos, y detectar cualquier referencia que regrese al Producto_Contenedor, completando la evaluación en 2 segundos o menos.
4. IF durante el recorrido transitivo la Aplicacion alcanza el límite de 1.000 Productos distintos sin completar la evaluación, THEN THE Aplicacion SHALL rechazar el guardado, conservar sin cambios los datos en edición y mostrar un mensaje que indique que la composición es demasiado profunda para verificarse.
5. IF durante el recorrido transitivo la Aplicacion referencia un Producto que no puede resolverse o cargarse, THEN THE Aplicacion SHALL rechazar el guardado, conservar sin cambios los datos en edición y mostrar un mensaje que indique que existe una referencia a un producto no disponible.

### Requisito 6: Producto_Componente eliminado o con Precio_Total cambiado

**Historia de Usuario:** Como usuario, quiero saber cómo se comporta un producto contenedor cuando un producto componente se elimina o cambia de precio, para entender el estado de mis productos.

#### Criterios de Aceptación

1. WHEN la Aplicacion abre la Ventana_Detalle de un Producto_Contenedor que tiene una Linea_De_Producto cuyo Producto_Componente ya no existe en la lista de Productos, THE Ventana_Detalle SHALL mostrar el texto Nombre_Producto_Componente_Ausente en lugar del nombre del Producto_Componente, dejar la Unidad vacía y mostrar el subtotal de esa Linea_De_Producto tal como fue almacenado en soles (PEN) con exactamente 2 decimales.
2. WHEN la Aplicacion abre la Ventana_Detalle de un Producto_Contenedor, THE Ventana_Detalle SHALL mostrar para cada Linea_De_Producto el subtotal y el Precio_Total del Producto_Contenedor tal como fueron almacenados, sin recalcularlos a partir del Precio_Total vigente del Producto_Componente.
3. WHEN el usuario guarda un Producto_Contenedor en la Ventana_Edicion o en la Calculadora y todos sus Productos_Componente referenciados existen, THE Aplicacion SHALL recalcular el subtotal de cada Linea_De_Producto usando el Precio_Total vigente del Producto_Componente en ese momento, expresando cada subtotal con exactamente 2 decimales mediante redondeo half-up, y actualizar el Precio_Total del Producto_Contenedor con el resultado.
4. IF el usuario guarda un Producto_Contenedor que tiene una Linea_De_Producto cuyo Producto_Componente ya no existe en la lista de Productos, THEN THE Aplicacion SHALL rechazar el guardado, conservar sin cambios los datos en edición y mostrar un mensaje que indique que existe una línea que referencia un producto no disponible.

### Requisito 7: Persistencia y compatibilidad de las Lineas_De_Producto

**Historia de Usuario:** Como usuario, quiero que las líneas de tipo Producto se guarden y se restauren junto con el resto de mis datos, y que mis productos existentes sigan funcionando, para no perder información al adoptar la nueva funcionalidad.

#### Criterios de Aceptación

1. WHEN la Aplicacion guarda un Producto_Contenedor en el Almacenamiento_Local, THE Aplicacion SHALL persistir por cada Linea_De_Producto su Fuente_De_Componente, la referencia al Producto_Componente, la Cantidad y el subtotal almacenado.
2. WHEN la Aplicacion carga desde el Almacenamiento_Local una Linea_De_Calculo que no incluye una Fuente_De_Componente registrada, THE Aplicacion SHALL interpretar esa Linea_De_Calculo como una Linea_De_Parametro.
3. WHEN la Aplicacion carga desde el Almacenamiento_Local una Linea_De_Calculo que referencia un Parametro mediante `parametroId`, THE Aplicacion SHALL mostrar y calcular esa Linea_De_Calculo como una Linea_De_Parametro con el mismo comportamiento previo a esta funcionalidad.
4. WHEN la Aplicacion guarda y luego restaura un conjunto de Productos que contiene Lineas_De_Producto y Lineas_De_Parametro, THE Aplicacion SHALL restaurar cada Linea_De_Calculo con la misma Fuente_De_Componente, referencia, Cantidad y subtotal que tenía antes de guardar.
5. IF la Aplicacion no puede escribir en el Almacenamiento_Local al guardar un Producto_Contenedor, THEN THE Aplicacion SHALL conservar sin cambios los datos en edición y mostrar un mensaje de error indicando que no se pudo guardar.
6. WHEN el Selector_De_Linea muestra una Linea_De_Producto cuyo Producto_Componente referenciado no tiene una Unidad_De_Producto definida, THE Selector_De_Linea SHALL mostrar la Unidad_De_Reemplazo "UND" como Unidad de esa línea sin modificar ni persistir el Producto_Componente.
7. WHEN la Aplicacion carga desde el Almacenamiento_Local o restaura desde un Archivo_De_Respaldo un Producto que no tiene una Unidad_De_Producto definida, THE Aplicacion SHALL mantener el Producto sin una Unidad_De_Producto definida y no inventar ni persistir un valor de Unidad para ese Producto.

### Requisito 8: Preservación de las operaciones existentes

**Historia de Usuario:** Como usuario, quiero que las funciones actuales de editar, eliminar, exportar y subir la base de datos sigan funcionando, para conservar mi flujo de trabajo tras agregar líneas de tipo Producto.

#### Criterios de Aceptación

1. WHEN el usuario edita un Producto_Contenedor que contiene Lineas_De_Producto y Lineas_De_Parametro, THE Aplicacion SHALL conservar el identificador y el nombre originales del Producto_Contenedor y actualizar sus Lineas_De_Calculo, subtotales y Precio_Total según las líneas en edición.
2. WHEN el usuario elimina un Producto que es referenciado como Producto_Componente por una o más Lineas_De_Producto de otros Productos, THE Aplicacion SHALL quitar el Producto de la lista de Productos, marcar como referencia no resuelta cada Linea_De_Producto que lo referenciaba conservando su Cantidad y su subtotal almacenado sin cambios, y mantener los subtotales y el Precio_Total almacenados de los demás Productos sin recalcular.
3. WHEN el usuario exporta la base de datos, THE Aplicacion SHALL incluir en el Archivo_De_Respaldo cada Linea_De_Producto con su Fuente_De_Componente, la referencia al Producto_Componente, la Cantidad y el subtotal almacenado.
4. WHEN el usuario importa un Archivo_De_Respaldo que contiene Productos con Lineas_De_Producto, THE Aplicacion SHALL restaurar cada Linea_De_Producto con su Fuente_De_Componente, la referencia al Producto_Componente, la Cantidad y el subtotal, y mostrar los Productos importados en la Lista_De_Productos con las acciones de Ver detalle, Editar y Eliminar disponibles.
5. IF el usuario importa un archivo que no puede leerse o cuya estructura no contiene una lista de Productos válida, THEN THE Aplicacion SHALL rechazar la importación, mostrar un mensaje de error indicando que el archivo no es un Archivo_De_Respaldo válido, y conservar sin cambios los Productos existentes en la Lista_De_Productos.
6. IF el usuario abre en modo Editar un Producto_Contenedor que contiene una Linea_De_Producto cuya referencia al Producto_Componente no corresponde a ningún Producto existente en la Lista_De_Productos, THEN THE Aplicacion SHALL mostrar esa Linea_De_Producto como referencia no resuelta, conservar su Cantidad y su subtotal almacenado sin recalcular, y permitir que el usuario la reasigne a un Producto existente o la elimine antes de guardar.
7. IF el usuario importa un Archivo_De_Respaldo en el que una Linea_De_Producto referencia un Producto_Componente que no está presente en la lista de Productos del mismo archivo, THEN THE Aplicacion SHALL restaurar el resto de los Productos, marcar esa Linea_De_Producto como referencia no resuelta conservando su Cantidad y su subtotal, y mostrar un mensaje de error indicando que existen referencias de Producto_Componente no resueltas.

### Requisito 9: Unidad del Producto persistida

**Historia de Usuario:** Como usuario, quiero que cada producto guarde su propia unidad, para que su unidad se conserve al guardarlo, exportarlo e importarlo.

#### Criterios de Aceptación

1. WHEN el usuario crea un Producto nuevo, THE Aplicacion SHALL establecer su Unidad_De_Producto en "UND".
2. WHEN la Aplicacion guarda un Producto en el Almacenamiento_Local, THE Aplicacion SHALL persistir la Unidad_De_Producto del Producto.
3. WHEN el usuario exporta la base de datos, THE Aplicacion SHALL incluir en el Archivo_De_Respaldo la Unidad_De_Producto de cada Producto.
4. WHEN la Aplicacion importa o carga un Producto que ya tiene una Unidad_De_Producto definida, THE Aplicacion SHALL conservar esa Unidad_De_Producto sin cambios.
5. WHEN el usuario edita un Producto existente, THE Aplicacion SHALL conservar la Unidad_De_Producto previamente almacenada del Producto.
