# Bugfix Requirements Document

## Introduction

En la Calculadora de precios (Limpiapipas), al agregar una línea con Fuente_De_Componente "Producto" e ingresar una cantidad válida (por ejemplo 5 unidades) y pulsar "Calcular", el sistema rechaza la operación mostrando el mensaje "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99.", aunque la cantidad ingresada es perfectamente válida.

La causa raíz es una inconsistencia en cómo se convierte la cantidad antes de validarla según la Fuente_De_Componente de la línea:

- El editor de líneas (`lineas.editor.js`) guarda la cantidad como una cadena cruda tomada del input (`linea.cantidad = inputCant.value`), p. ej. `"5"`.
- Para las Lineas_De_Parametro, el controlador (`productos.controller.js`) convierte esa cadena a número con `aNumeroCantidad()` antes de llamar a `validarCantidad`, por lo que `"5"` → `5` y la validación pasa.
- Para las Lineas_De_Producto, la validación fluye por `productosOps.validarLineasProducto`, que invoca `validation.validarCantidad(origen.cantidad)` sobre la cadena cruda, sin convertirla. Como `validarCantidad` exige `typeof valor === 'number'`, la cadena `"5"` se rechaza y se emite el mensaje de cantidad inválida.

El impacto es que ninguna Linea_De_Producto puede calcularse ni guardarse desde la interfaz, pues su cantidad siempre llega como cadena y siempre es rechazada, bloqueando por completo el uso de productos como componentes.

## Bug Analysis

### Current Behavior (Defect)

Lo que ocurre actualmente cuando se dispara el bug: una cantidad válida en una Linea_De_Producto se rechaza porque se valida como cadena en lugar de como número.

1.1 WHEN una línea tiene Fuente_De_Componente "Producto" y su cantidad cruda es una cadena numérica válida (p. ej. "5") y se pulsa "Calcular" THEN el sistema rechaza el cálculo y muestra el mensaje "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99."

1.2 WHEN una línea tiene Fuente_De_Componente "Producto" y su cantidad cruda es una cadena numérica válida (p. ej. "5") y se pulsa "Guardar" THEN el sistema rechaza el guardado y muestra el mensaje "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99."

1.3 WHEN `productosOps.validarLineasProducto` valida la cantidad de una Linea_De_Producto THEN el sistema pasa el valor crudo (cadena) a `validation.validarCantidad`, que lo rechaza por no ser de tipo número, incluso cuando la cadena representa un número dentro del rango válido

### Expected Behavior (Correct)

Lo que debería ocurrir en su lugar: la cantidad de una Linea_De_Producto debe convertirse a número antes de validarse, con la misma semántica que las Lineas_De_Parametro.

2.1 WHEN una línea tiene Fuente_De_Componente "Producto" y su cantidad cruda es una cadena numérica válida (p. ej. "5") y se pulsa "Calcular" THEN el sistema SHALL aceptar la cantidad, calcular los subtotales y el precio total, y no mostrar el mensaje de cantidad inválida

2.2 WHEN una línea tiene Fuente_De_Componente "Producto" y su cantidad cruda es una cadena numérica válida (p. ej. "5") y se pulsa "Guardar" THEN el sistema SHALL aceptar la cantidad y persistir el Producto sin mostrar el mensaje de cantidad inválida

2.3 WHEN se valida la cantidad de una Linea_De_Producto cuya cantidad cruda es una cadena numérica fuera de rango o con más de 2 decimales (p. ej. "0", "-3", "1000000000", "1,5" con coma o "1.005") THEN el sistema SHALL mostrar el mensaje "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99."

2.4 WHEN se valida la cantidad de una Linea_De_Producto cuya cantidad cruda no representa un número (p. ej. "", "abc" o null) THEN el sistema SHALL mostrar el mensaje "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99."

### Unchanged Behavior (Regression Prevention)

Comportamiento existente que debe preservarse tras el arreglo.

3.1 WHEN una línea tiene Fuente_De_Componente "Parámetro" y una cantidad cruda válida THEN el sistema SHALL CONTINUE TO aceptar la cantidad y calcular/guardar correctamente

3.2 WHEN una línea tiene Fuente_De_Componente "Parámetro" y una cantidad cruda inválida (fuera de rango, con más de 2 decimales o no numérica) THEN el sistema SHALL CONTINUE TO mostrar el mensaje "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99."

3.3 WHEN una Linea_De_Producto no tiene Producto_Componente seleccionado o referencia un producto inexistente THEN el sistema SHALL CONTINUE TO mostrar el mensaje "Cada línea debe tener un producto seleccionado." (priorizando el problema estructural del producto sobre el de cantidad)

3.4 WHEN se validan las Lineas_De_Producto THEN el sistema SHALL CONTINUE TO acumular y priorizar los errores como hoy (sin-producto / producto-inexistente por encima de cantidad-invalida) y detectar Ciclos_De_Composicion sin cambios

3.5 WHEN `validation.validarCantidad` recibe un valor numérico THEN el sistema SHALL CONTINUE TO validar el rango 0,01 a 999.999.999,99 con un máximo de 2 decimales exactamente como hoy (la función pura de validación no cambia su contrato para entradas numéricas)

## Bug Condition and Property Specification

### Definiciones

- **F**: la función de validación actual — `productosOps.validarLineasProducto` (que valida la cantidad de una Linea_De_Producto pasando el valor crudo a `validation.validarCantidad`).
- **F'**: la función tras el arreglo — valida la cantidad de una Linea_De_Producto convirtiendo primero el valor crudo a número (con la misma semántica que `aNumeroCantidad`) antes de aplicar `validation.validarCantidad`.

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type LineaEnEdicion
  OUTPUT: boolean

  // Se dispara el bug cuando la línea es de fuente "Producto",
  // su cantidad cruda es una cadena que representa un número válido
  // (dentro de rango y con <= 2 decimales), y al validarse como
  // cadena es rechazada indebidamente.
  RETURN X.fuenteDeComponente = "Producto"
     AND (type_of(X.cantidad) = string)
     AND representaNumeroValido(X.cantidad)   // p. ej. "5", "0.01", "10.5"
END FUNCTION
```

### Property Specification (Fix Checking)

```pascal
// Property: Fix Checking — una cadena numérica válida en una Linea_De_Producto se acepta
FOR ALL X WHERE isBugCondition(X) DO
  result ← validarCantidadDeLinea'(X)
  ASSERT result.valido = true
END FOR
```

### Preservation Goal (Preservation Checking)

```pascal
// Property: Preservation Checking — el resto de entradas se comporta igual que antes
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

Esto garantiza que:
- Las Lineas_De_Parametro (cualquier cantidad) siguen validándose igual.
- Las Lineas_De_Producto con cantidades realmente inválidas (fuera de rango, con más de 2 decimales o no numéricas) siguen rechazándose con el mismo mensaje.
- La priorización de errores de producto sobre cantidad y la detección de ciclos no cambian.
- La función pura `validation.validarCantidad` conserva su contrato para entradas numéricas.
