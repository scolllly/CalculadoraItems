# Requirements Document

## Introduction

Esta funcionalidad mejora la Pagina_Productos de la Aplicacion Limpiapipas (calculadora de precios) en dos aspectos de experiencia de uso, sin alterar la lógica de cálculo, validación ni persistencia existentes:

1. **Reinicio del formulario tras un guardado exitoso**: cuando el usuario guarda un Producto y el guardado se completa (aunque la persistencia en el Almacenamiento_Local falle, el Producto ya queda creado en la sesión), la Calculadora vuelve a su estado inicial en blanco: el campo de nombre queda vacío, las Lineas_De_Calculo en edición se reinician y el área de resultado se limpia. Así el usuario puede crear el siguiente Producto sin borrar manualmente los datos anteriores. El formulario NO se reinicia cuando el guardado se rechaza por validación (nombre inválido, sin líneas, cantidad o parámetro inválidos, o ciclo de composición), para que el usuario conserve y corrija los datos ingresados.

2. **Disposición responsiva de la Calculadora y la Lista_De_Productos**: en pantallas de escritorio, la Calculadora y la Lista_De_Productos se muestran lado a lado en dos columnas (Calculadora a la izquierda, Lista_De_Productos a la derecha) usando el sistema de rejilla responsiva de Bootstrap. En pantallas de dispositivo móvil, ambos bloques se apilan verticalmente, con la Calculadora arriba y la Lista_De_Productos debajo. La disposición degrada de forma segura cuando Bootstrap no se ha cargado.

Esta funcionalidad respeta las restricciones de la Aplicacion base: HTML, CSS y JavaScript vanilla puro, sin servidor, sin framework, sin empaquetado, con Bootstrap alojado localmente, ejecución bajo el Protocolo_De_Archivo (`file://`) y carga de la lógica mediante Scripts_Clasicos sobre el espacio de nombres global `window.LP`. La interfaz está en español y la moneda es soles (PEN).

## Glossary

Los términos definidos en la especificación base (`limpiapipas-price-calculator`) y en `product-detail-edit-delete` se reutilizan sin cambios: **Aplicacion**, **Protocolo_De_Archivo**, **Scripts_Clasicos**, **Parametro**, **Producto**, **Linea_De_Calculo**, **Cantidad**, **Precio_Total**, **Almacenamiento_Local**, **Calculadora**, **Pagina_Productos** y **Lista_De_Productos**.

Términos nuevos o refinados para esta funcionalidad:

- **Formulario_De_Calculadora**: Conjunto de controles de entrada de la Calculadora en la Pagina_Productos, compuesto por el campo de nombre del Producto, la sección de Lineas_De_Calculo en edición (con sus botones de agregar y eliminar) y el Area_De_Resultado.
- **Area_De_Resultado**: Región de la Calculadora donde se muestran los subtotales por Linea_De_Calculo y el Precio_Total en soles (PEN) tras un cálculo.
- **Estado_Inicial_En_Blanco**: Estado del Formulario_De_Calculadora en el que el campo de nombre está vacío, no hay ninguna Linea_De_Calculo en edición y el Area_De_Resultado no muestra subtotales ni Precio_Total.
- **Guardado_Exitoso**: Resultado de la acción de guardar un Producto en el que el Producto supera todas las validaciones y queda creado y agregado a la lista de Productos de la sesión, con independencia de si la escritura en el Almacenamiento_Local se completó o falló.
- **Guardado_Rechazado**: Resultado de la acción de guardar un Producto en el que una validación (nombre, existencia de al menos una Linea_De_Calculo, Cantidad, Parametro seleccionado o ausencia de ciclo de composición) impide crear el Producto.
- **Persistencia_Fallida**: Situación en la que un Guardado_Exitoso crea el Producto en la sesión pero la escritura en el Almacenamiento_Local no se completa de forma persistente.
- **Modo_Escritorio**: Presentación de la Pagina_Productos en anchos de ventana correspondientes a pantallas grandes, en la que la Calculadora y la Lista_De_Productos se muestran en dos columnas lado a lado.
- **Modo_Movil**: Presentación de la Pagina_Productos en anchos de ventana correspondientes a pantallas de dispositivo móvil, en la que la Calculadora y la Lista_De_Productos se apilan verticalmente.
- **Punto_De_Corte_Responsivo**: Ancho de ventana definido por el sistema de rejilla de Bootstrap a partir del cual la Pagina_Productos pasa de Modo_Movil a Modo_Escritorio.

## Requirements

### Requisito 1: Reinicio del formulario tras un guardado exitoso

**Historia de Usuario:** Como usuario, quiero que la Calculadora vuelva a quedar en blanco después de guardar un Producto correctamente, para poder crear el siguiente Producto sin tener que borrar manualmente los datos anteriores.

#### Criterios de Aceptación

1. WHEN el guardado de un Producto resulta en un Guardado_Exitoso, THE Calculadora SHALL fijar el campo de nombre del Producto en cadena vacía.
2. WHEN el guardado de un Producto resulta en un Guardado_Exitoso, THE Calculadora SHALL eliminar todas las Lineas_De_Calculo en edición, dejando la sección de Lineas_De_Calculo con cero líneas.
3. WHEN el guardado de un Producto resulta en un Guardado_Exitoso, THE Calculadora SHALL limpiar el Area_De_Resultado, dejándola con cero subtotales y sin Precio_Total.
4. WHEN el guardado de un Producto resulta en un Guardado_Exitoso bajo Persistencia_Fallida, THE Calculadora SHALL dejar el Formulario_De_Calculadora en el Estado_Inicial_En_Blanco y SHALL mostrar la indicación de que los cambios no se guardaron de forma persistente. (Nota: el Producto ya quedó creado en la sesión, por eso el formulario también se reinicia en este caso.)
5. IF el guardado de un Producto resulta en un Guardado_Rechazado, THEN THE Calculadora SHALL conservar el valor del campo de nombre, las Lineas_De_Calculo en edición y el contenido del Area_De_Resultado sin modificarlos.
6. WHEN el guardado de un Producto resulta en un Guardado_Exitoso, THE Calculadora SHALL agregar el Producto guardado a la Lista_De_Productos antes de dejar el Formulario_De_Calculadora en el Estado_Inicial_En_Blanco.

### Requisito 2: Disposición en dos columnas en Modo_Escritorio

**Historia de Usuario:** Como usuario de escritorio, quiero ver la Calculadora y la lista de productos guardados una al lado de la otra, para consultar los productos existentes mientras creo uno nuevo.

#### Criterios de Aceptación

1. WHILE el ancho de la ventana es igual o mayor al Punto_De_Corte_Responsivo, THE Pagina_Productos SHALL mostrar la Calculadora y la Lista_De_Productos simultáneamente en dos columnas.
2. WHILE la Pagina_Productos se muestra en Modo_Escritorio, THE Pagina_Productos SHALL ubicar la Calculadora en la columna izquierda y la Lista_De_Productos en la columna derecha.
3. WHILE la Pagina_Productos se muestra en Modo_Escritorio, THE Pagina_Productos SHALL mantener ambas columnas visibles dentro del ancho de la ventana sin requerir desplazamiento horizontal.
4. THE Pagina_Productos SHALL construir las dos columnas usando el sistema de rejilla responsiva de Bootstrap (contenedor de fila y columnas).

### Requisito 3: Disposición apilada en Modo_Movil

**Historia de Usuario:** Como usuario de dispositivo móvil, quiero ver la Calculadora encima de la lista de productos guardados, para usar cada bloque cómodamente en una pantalla angosta.

#### Criterios de Aceptación

1. WHILE el ancho de la ventana es menor al Punto_De_Corte_Responsivo, THE Pagina_Productos SHALL apilar la Calculadora y la Lista_De_Productos verticalmente en una sola columna, cada bloque ocupando el 100% del ancho disponible.
2. WHILE la Pagina_Productos se muestra en Modo_Movil, THE Pagina_Productos SHALL mostrar la Calculadora por encima de la Lista_De_Productos.
3. WHEN el ancho de la ventana se reduce por debajo del Punto_De_Corte_Responsivo, THE Pagina_Productos SHALL adoptar la disposición de Modo_Movil.
4. WHEN el ancho de la ventana aumenta hasta igualar o superar el Punto_De_Corte_Responsivo, THE Pagina_Productos SHALL adoptar la disposición de Modo_Escritorio.

### Requisito 4: Degradación segura sin Bootstrap

**Historia de Usuario:** Como usuario que abre la Aplicacion bajo el Protocolo_De_Archivo sin que Bootstrap se haya cargado, quiero que la Calculadora y la lista de productos sigan siendo legibles y utilizables, para no perder funcionalidad por un fallo de estilos.

#### Criterios de Aceptación

1. IF Bootstrap no se ha cargado, THEN THE Pagina_Productos SHALL mostrar la Calculadora y la Lista_De_Productos apiladas verticalmente en una sola columna, cada bloque ocupando el 100% del ancho del contenedor.
2. IF Bootstrap no se ha cargado, THEN THE Pagina_Productos SHALL mostrar todos los elementos de la Calculadora y la Lista_De_Productos dentro del área de la ventana sin recorte ni superposición.
3. IF Bootstrap no se ha cargado, THEN THE Pagina_Productos SHALL mantener operativos los controles interactivos de la Calculadora y la Lista_De_Productos, con el mismo resultado funcional que cuando Bootstrap está cargado.
