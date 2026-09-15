# Requirements Document

## Introduction

Esta funcionalidad amplía la Lista_De_Productos de la Pagina_Productos con dos capacidades independientes:

1. **Ordenamiento por nombre**: un control (botón) que ordena los Productos mostrados por su Nombre_Mostrado, alternando la Direccion_De_Orden entre ascendente y descendente en cada pulsación.
2. **Precio sugerido**: junto al monto del Precio_Total de cada Producto, se muestra un badge de color lila con texto blanco que contiene dos montos separados por " -> ": a la izquierda el Precio_Sugerido (calculado dividiendo el Precio_Total entre el Divisor_De_Sugerido (constante 0.70), redondeado a 2 decimales y formateado en PEN) y a la derecha el Precio_Redondeado (el menor múltiplo de 5 mayor o igual al Precio_Sugerido, formateado en PEN). Ejemplo: "S/ 14.30 -> S/ 15.00".

Ambas capacidades operan sobre la Lista_De_Productos ya renderizada por `renderListaProductos()` en `src/productos.controller.js`, reutilizando el formateo de moneda (`window.LP.currency.formatearPEN`) y el redondeo half-up (`window.LP.calculo.redondear2`) existentes.

## Glossary

- **Pagina_Productos**: Vista donde se listan los Productos guardados y se opera la Calculadora.
- **Lista_De_Productos**: Conjunto de Productos guardados renderizados como una lista en el contenedor `#lista-productos`.
- **Producto**: Entidad con `id`, `nombre`, `lineas` y `precioTotal`.
- **Nombre_Mostrado**: Texto del nombre del Producto que se presenta al usuario (contenido de `span.lp-producto-nombre`, igual a `producto.nombre`).
- **Precio_Total**: Monto total del Producto (`producto.precioTotal`), mostrado en el badge verde `badge bg-success rounded-pill lp-producto-precio` formateado en PEN.
- **Precio_Sugerido**: Monto calculado como `redondear2(Precio_Total / Divisor_De_Sugerido)`, formateado en PEN.
- **Divisor_De_Sugerido**: Constante numérica igual a `0.70` usada para calcular el Precio_Sugerido.
- **Precio_Redondeado**: Menor múltiplo de 5 mayor o igual al Precio_Sugerido, calculado como `ceil(Precio_Sugerido / 5) * 5`, formateado en PEN. Cuando el Precio_Sugerido ya es un múltiplo exacto de 5, el Precio_Redondeado es ese mismo valor.
- **Boton_De_Orden**: Control de interfaz que, al pulsarse, ordena la Lista_De_Productos por Nombre_Mostrado y alterna la Direccion_De_Orden.
- **Direccion_De_Orden**: Estado de ordenamiento de la Lista_De_Productos; toma el valor `ascendente` o `descendente`.
- **Orden_Ascendente**: Ordenamiento de la A a la Z según comparación local en español.
- **Orden_Descendente**: Ordenamiento de la Z a la A según comparación local en español.
- **Comparador_De_Nombres**: Función de comparación de Nombres_Mostrados sensible a la configuración regional española (locale `es`) y no sensible a mayúsculas/minúsculas ni a diacríticos (sensibilidad base), que ordena correctamente letras acentuadas (por ejemplo `á`, `é`) y la letra `ñ` según el alfabeto español.
- **Nombre_Accesible**: Texto expuesto a las tecnologías de asistencia que describe un control de interfaz.
- **Direccion_De_Orden_Siguiente**: Direccion_De_Orden que resultará de la próxima pulsación del Boton_De_Orden (el valor opuesto a la Direccion_De_Orden actual).
- **Badge_Sugerido**: Elemento visual (badge tipo píldora) de color lila con texto blanco que contiene el Precio_Sugerido y el Precio_Redondeado separados por " -> ".
- **Controlador_De_Productos**: Módulo `src/productos.controller.js` que renderiza la Lista_De_Productos mediante `renderListaProductos()`.
- **formatearPEN**: Función `window.LP.currency.formatearPEN` que formatea un número finito como `"S/ <valor con 2 decimales>"`.
- **redondear2**: Función `window.LP.calculo.redondear2` que redondea un número a 2 decimales mediante redondeo half-up.

## Requirements

### Requirement 1: Ordenamiento de la Lista_De_Productos por nombre

**User Story:** Como usuario de la Pagina_Productos, quiero ordenar la lista de productos por su nombre alternando entre ascendente y descendente, para localizar productos con mayor facilidad.

#### Acceptance Criteria

1. THE Controlador_De_Productos SHALL mostrar un Boton_De_Orden asociado a la Lista_De_Productos.
2. WHEN la Pagina_Productos se renderiza por primera vez, THE Controlador_De_Productos SHALL fijar la Direccion_De_Orden en `ascendente`.
3. WHEN el usuario pulsa el Boton_De_Orden WHILE la Direccion_De_Orden es `ascendente`, THE Controlador_De_Productos SHALL cambiar la Direccion_De_Orden a `descendente`.
4. WHEN el usuario pulsa el Boton_De_Orden WHILE la Direccion_De_Orden es `descendente`, THE Controlador_De_Productos SHALL cambiar la Direccion_De_Orden a `ascendente`.
5. WHILE la Direccion_De_Orden es `ascendente`, THE Controlador_De_Productos SHALL renderizar la Lista_De_Productos ordenada por Nombre_Mostrado en Orden_Ascendente usando el Comparador_De_Nombres.
6. WHILE la Direccion_De_Orden es `descendente`, THE Controlador_De_Productos SHALL renderizar la Lista_De_Productos ordenada por Nombre_Mostrado en Orden_Descendente usando el Comparador_De_Nombres.
7. THE Comparador_De_Nombres SHALL comparar los Nombres_Mostrados de forma no sensible a mayúsculas/minúsculas y no sensible a diacríticos, según la configuración regional española (locale `es`).
8. THE Comparador_De_Nombres SHALL ordenar las letras acentuadas y la letra `ñ` en la posición que les corresponde en el alfabeto español.
9. IF el Nombre_Mostrado de un Producto es nulo o ausente, THEN THE Controlador_De_Productos SHALL tratar dicho Nombre_Mostrado como una cadena vacía a efectos de comparación.
10. WHILE la Direccion_De_Orden es `ascendente`, THE Controlador_De_Productos SHALL ubicar los Productos con Nombre_Mostrado igual a cadena vacía al inicio de la Lista_De_Productos.
11. WHILE la Direccion_De_Orden es `descendente`, THE Controlador_De_Productos SHALL ubicar los Productos con Nombre_Mostrado igual a cadena vacía al final de la Lista_De_Productos.
12. WHEN dos Productos tienen Nombres_Mostrados equivalentes según el Comparador_De_Nombres, THE Controlador_De_Productos SHALL conservar el orden relativo previo de esos Productos (ordenamiento estable).
13. IF la Lista_De_Productos no contiene Productos, THEN THE Controlador_De_Productos SHALL mostrar la indicación de estado vacío existente sin renderizar la lista.
14. THE Boton_De_Orden SHALL exponer un Nombre_Accesible que describa la Direccion_De_Orden_Siguiente que se aplicará al pulsarlo.

### Requirement 2: Precio_Sugerido junto al Precio_Total

**User Story:** Como usuario de la Pagina_Productos, quiero ver un precio sugerido junto al costo total de cada producto, para conocer un precio de referencia sin calcularlo manualmente.

#### Acceptance Criteria

1. WHEN el Controlador_De_Productos renderiza un Producto en la Lista_De_Productos, THE Controlador_De_Productos SHALL mostrar el Badge_Sugerido a la derecha del monto del Precio_Total.
2. THE Controlador_De_Productos SHALL calcular el Precio_Sugerido como `redondear2(Precio_Total / Divisor_De_Sugerido)`, con Divisor_De_Sugerido igual a `0.70`.
3. THE Controlador_De_Productos SHALL calcular el Precio_Redondeado como `ceil(Precio_Sugerido / 5) * 5`.
4. WHEN el Precio_Sugerido ya es un múltiplo exacto de 5, THE Controlador_De_Productos SHALL fijar el Precio_Redondeado igual al Precio_Sugerido.
5. THE Controlador_De_Productos SHALL formatear el Precio_Sugerido mediante formatearPEN.
6. THE Controlador_De_Productos SHALL formatear el Precio_Redondeado mediante formatearPEN.
7. THE Controlador_De_Productos SHALL componer el contenido del Badge_Sugerido como el Precio_Sugerido formateado, seguido del separador ` -> `, seguido del Precio_Redondeado formateado (por ejemplo `"S/ 14.30 -> S/ 15.00"`).
8. THE Controlador_De_Productos SHALL envolver el contenido del Badge_Sugerido en un Badge_Sugerido de color lila con texto blanco.
9. THE Badge_Sugerido SHALL usar un estilo de badge tipo píldora equivalente al del badge del Precio_Total, difiriendo únicamente en el color (lila en lugar de verde).
10. THE Controlador_De_Productos SHALL seguir mostrando el Precio_Total en su badge verde existente sin alteración de su formato PEN.
11. IF el Precio_Total de un Producto es `0`, THEN THE Controlador_De_Productos SHALL mostrar el Precio_Sugerido como `formatearPEN(0)` y el Precio_Redondeado como `formatearPEN(0)`, de modo que el Badge_Sugerido muestre `"S/ 0.00 -> S/ 0.00"`.
12. IF el Precio_Total de un Producto no es un número finito o es negativo, THEN THE Controlador_De_Productos SHALL tratar el Precio_Total como `0`, mostrando el Badge_Sugerido como `"S/ 0.00 -> S/ 0.00"`, y completar el renderizado de la Lista_De_Productos sin interrumpirlo.
