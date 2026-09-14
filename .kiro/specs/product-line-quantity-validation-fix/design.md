# Corrección de validación de cantidad en Lineas_De_Producto — Diseño de arreglo

## Overview

Al agregar una Linea_De_Producto (Fuente_De_Componente "Producto") en la Calculadora o en la Ventana_Edicion e ingresar una cantidad válida (p. ej. `5`), el sistema la rechaza con el mensaje "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99.", bloqueando por completo el cálculo y el guardado de productos que usan otros productos como componentes.

La causa raíz es una inconsistencia de conversión: el editor de líneas (`lineas.editor.js`) guarda la cantidad como la cadena cruda del input (p. ej. `"5"`). Para las Lineas_De_Parametro, el controlador convierte esa cadena a número con `aNumeroCantidad()` antes de validar, por lo que `"5"` → `5` y pasa. Para las Lineas_De_Producto, la validación fluye por `productosOps.validarLineasProducto`, que pasa el valor crudo (la cadena) directamente a `validation.validarCantidad`. Como `validarCantidad` exige `typeof valor === 'number'`, la cadena `"5"` se rechaza siempre.

La estrategia del arreglo es puntual y mínima: dentro de `validarLineasProducto`, convertir la cantidad cruda de cada Linea_De_Producto a número con la misma semántica que `aNumeroCantidad` antes de invocar `validation.validarCantidad`. Esto alinea la validación de las Lineas_De_Producto con la de las Lineas_De_Parametro, sin tocar la función pura de validación ni ninguna otra ruta. Como `aNumeroCantidad` hoy es un closure privado del controlador y no está disponible en `productos.ops.js`, el arreglo replica su semántica exacta dentro del módulo de operaciones (o mediante un helper local equivalente), preservando el comportamiento en cada frontera.

## Glossary

- **Bug_Condition (C)**: La condición que dispara el bug: una Linea_De_Producto cuya cantidad cruda es una cadena que representa un número válido (dentro de rango, hasta 2 decimales) y que, al validarse como cadena, es rechazada indebidamente.
- **Property (P)**: El comportamiento deseado cuando se cumple la Bug_Condition: la cantidad se acepta (validación `valido: true`), permitiendo calcular y guardar.
- **Preservation**: El comportamiento existente que NO debe cambiar: validación de Lineas_De_Parametro, rechazo de cantidades realmente inválidas en Lineas_De_Producto, priorización de errores (sin-producto / producto-inexistente por encima de cantidad-invalida), detección de Ciclos_De_Composicion y el contrato de `validation.validarCantidad` para entradas numéricas.
- **validarLineasProducto**: La función en `src/productos.ops.js` que valida las Lineas_De_Producto de un Producto_Contenedor, acumulando errores por índice (`sin-producto`, `producto-inexistente`, `cantidad-invalida`).
- **validarCantidad**: La función pura en `src/validation.js` que valida que un valor sea un número entre 0,01 y 999.999.999,99 con un máximo de 2 decimales. Exige `typeof valor === 'number'`.
- **aNumeroCantidad**: El helper (closure privado en `src/productos.controller.js`) que convierte la cantidad cruda (cadena del input o número) a número: pasa los números tal cual; recorta las cadenas, rechaza la cadena vacía y usa `Number()`; devuelve `NaN` cuando no es convertible o no es finito.
- **fuenteDeComponente**: Propiedad de la línea que determina si es Linea_De_Parametro ("Parámetro") o Linea_De_Producto ("Producto"). Una línea sin este campo se interpreta como Linea_De_Parametro (retrocompatibilidad).
- **cantidad cruda**: El valor `linea.cantidad` tal como lo captura el editor: una cadena del input (p. ej. `"5"`), `null` (sin ingresar), o eventualmente un número.

## Bug Details

### Bug Condition

El bug se manifiesta cuando una línea tiene Fuente_De_Componente "Producto" y su cantidad cruda es una cadena que representa un número válido (dentro del rango 0,01–999.999.999,99 y con como máximo 2 decimales), p. ej. `"5"`, `"0.01"`, `"10.5"`. `validarLineasProducto` pasa esa cadena a `validation.validarCantidad`, que la rechaza porque `esNumeroConDecimales` exige `typeof valor === 'number'`. El resultado es un error `cantidad-invalida` para una cantidad perfectamente válida.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type LineaEnEdicion { fuenteDeComponente, cantidad, productoComponenteId, ... }
  OUTPUT: boolean

  RETURN X.fuenteDeComponente = "Producto"
         AND type_of(X.cantidad) = string
         AND representaNumeroValido(X.cantidad)
         // representaNumeroValido: la cadena, convertida con la semántica de
         // aNumeroCantidad, produce un número finito en [0.01, 999999999.99]
         // con <= 2 decimales.
END FUNCTION
```

### Examples

- Línea de Producto con cantidad `"5"` → **Esperado**: aceptada (`valido: true`). **Actual**: rechazada con "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99.".
- Línea de Producto con cantidad `"0.01"` (mínimo válido) → **Esperado**: aceptada. **Actual**: rechazada.
- Línea de Producto con cantidad `"10.5"` → **Esperado**: aceptada. **Actual**: rechazada.
- Línea de Producto con cantidad `"1000000000"` (fuera de rango) → **Esperado**: rechazada. **Actual**: rechazada (mismo resultado, pero por el motivo equivocado: rechazo por tipo, no por rango).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Las Lineas_De_Parametro (cualquier cantidad, válida o inválida) se siguen validando exactamente como hoy vía el controlador (`aNumeroCantidad` + `validarCantidad`).
- Las Lineas_De_Producto con cantidades realmente inválidas (fuera de rango, con más de 2 decimales, o no numéricas como `""`, `"abc"`, `null`) se siguen rechazando con el mismo mensaje "Cada cantidad debe ser un número entre 0,01 y 999.999.999,99.".
- La priorización de errores en `validarLineasEnEdicion` (sin-producto / producto-inexistente por encima de cantidad-invalida) permanece sin cambios.
- La detección de Ciclos_De_Composicion (`detectarCicloComposicion`) y el orden/acumulación de errores por índice no cambian.
- La función pura `validation.validarCantidad` conserva su contrato para entradas numéricas: valida el rango 0,01–999.999.999,99 con máximo 2 decimales y sigue rechazando entradas que no sean `number`.

**Scope:**
Todas las entradas que NO cumplan la Bug_Condition deben quedar completamente inalteradas por el arreglo. Esto incluye:
- Todas las Lineas_De_Parametro.
- Las Lineas_De_Producto con cantidad numéricamente inválida o no representable como número.
- Las llamadas directas a `validation.validarCantidad` con valores numéricos.

**Nota:** El comportamiento correcto esperado (aceptar cadenas numéricas válidas en Lineas_De_Producto) se define en la sección Correctness Properties (Property 1).

## Hypothesized Root Cause

Con base en el análisis del código, la causa está confirmada, no meramente hipotética:

1. **Conversión ausente antes de validar (causa raíz confirmada)**: En `src/productos.ops.js`, `validarLineasProducto` (~línea 555) invoca `validation.validarCantidad(origen.cantidad)` sobre el valor crudo. Cuando la línea proviene del editor, `origen.cantidad` es una cadena (p. ej. `"5"`).

2. **Contrato estricto de tipo en la función pura**: En `src/validation.js`, `esNumeroConDecimales` retorna `false` de inmediato si `typeof valor !== 'number'`, por lo que `validarCantidad("5")` devuelve `{ valido: false }`. Este contrato es correcto y NO debe cambiarse.

3. **Inconsistencia entre rutas de validación**: Para las Lineas_De_Parametro, `validarLineasEnEdicion` (en `productos.controller.js`) convierte con `aNumeroCantidad(linea.cantidad)` antes de `validarCantidad`; para las Lineas_De_Producto, delega en `validarLineasProducto`, que no convierte. Esa asimetría es el defecto.

4. **Alcance del helper de conversión**: `aNumeroCantidad` es un closure privado dentro de `crearProductosController` y no está expuesto a `productos.ops.js`, por lo que el arreglo debe replicar su semántica exacta en el módulo de operaciones para no divergir del comportamiento de las Lineas_De_Parametro.

## Correctness Properties

Property 1: Bug Condition - La cantidad numérica válida en una Linea_De_Producto se acepta

_For any_ entrada donde se cumple la Bug_Condition (isBugCondition devuelve true) — es decir, una Linea_De_Producto cuya cantidad cruda es una cadena que representa un número dentro del rango 0,01–999.999.999,99 con hasta 2 decimales — la función arreglada `validarLineasProducto` SHALL no reportar el error `cantidad-invalida` para esa línea (la cantidad se acepta), permitiendo que el cálculo y el guardado prosigan sin mostrar el mensaje de cantidad inválida.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Comportamiento inalterado para entradas que no cumplen la Bug_Condition

_For any_ entrada donde NO se cumple la Bug_Condition (isBugCondition devuelve false), la función arreglada SHALL producir exactamente el mismo resultado que la función original, preservando: la validación de las Lineas_De_Parametro; el rechazo de las Lineas_De_Producto con cantidad realmente inválida (fuera de rango, con más de 2 decimales o no numérica) con el mismo mensaje; la priorización de errores (sin-producto / producto-inexistente por encima de cantidad-invalida); la detección de Ciclos_De_Composicion; y el contrato de `validation.validarCantidad` para entradas numéricas.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Asumiendo que el análisis de causa raíz es correcto:

**Archivo**: `src/productos.ops.js`

**Función**: `validarLineasProducto`

**Cambios específicos**:

1. **Convertir la cantidad cruda antes de validar**: En el bloque que hoy hace
   `validation.validarCantidad(origen.cantidad)`, convertir primero `origen.cantidad`
   a número con la semántica de `aNumeroCantidad` y validar el número resultante.
   ```
   const cantidadNumerica = aNumeroCantidad(origen.cantidad);
   const cantidadOk =
     validation && typeof validation.validarCantidad === "function"
       ? validation.validarCantidad(cantidadNumerica).valido
       : false;
   ```
   Con `aNumeroCantidad("5") = 5`, `validarCantidad(5).valido === true`; con
   `aNumeroCantidad("") = NaN` o `aNumeroCantidad("abc") = NaN`,
   `validarCantidad(NaN).valido === false` (se mantiene el rechazo correcto).

2. **Replicar la semántica exacta de `aNumeroCantidad`**: Como el helper del controlador
   es un closure privado, añadir un helper local equivalente en `productos.ops.js` con
   idéntico comportamiento:
   - `number` → se devuelve tal cual.
   - No `string` (p. ej. `null`, `undefined`, objeto) → `NaN`.
   - `string`: se hace `trim()`; cadena vacía → `NaN`; en otro caso `Number(recortado)`,
     devolviendo el número si `Number.isFinite`, o `NaN` si no.
   Esto garantiza paridad con la ruta de las Lineas_De_Parametro y evita divergencias
   (p. ej. no aceptar sufijos ni notaciones que `Number` no acepte).

3. **No modificar `validation.validarCantidad`**: El contrato de tipo numérico se conserva
   intacto; la corrección ocurre exclusivamente en la conversión previa dentro de
   `validarLineasProducto`.

4. **No alterar el resto de `validarLineasProducto`**: La detección de `sin-producto` /
   `producto-inexistente`, la acumulación de errores por índice y el filtrado por
   Fuente_De_Componente permanecen sin cambios; solo cambia el argumento pasado a
   `validarCantidad`.

5. **Evaluar la reutilización opcional (no requerida)**: Si en el futuro se desea una
   única fuente de verdad para la conversión, se podría extraer `aNumeroCantidad` a un
   módulo compartido; no es necesario para este arreglo y se evita para mantener el
   cambio mínimo y de bajo riesgo.

## Testing Strategy

### Validation Approach

La estrategia sigue dos fases: primero, exponer contraejemplos que demuestren el bug sobre el código NO arreglado; luego, verificar que el arreglo funciona y que preserva el comportamiento existente. Se ejecutan con Vitest (el proyecto ya usa `vitest`), invocando las funciones puras (`validarLineasProducto`, `validarCantidad`) directamente sobre `window.LP`.

### Exploratory Bug Condition Checking

**Goal**: Exponer contraejemplos que demuestren el bug ANTES de implementar el arreglo. Confirmar o refutar el análisis de causa raíz. Si se refuta, re-hipotetizar.

**Test Plan**: Escribir pruebas que construyan una Linea_De_Producto con `fuenteDeComponente: "Producto"`, un `productoComponenteId` existente y una cantidad cruda como cadena numérica válida, y afirmar que `validarLineasProducto` NO reporta `cantidad-invalida`. Ejecutar sobre el código NO arreglado para observar el fallo y confirmar la causa.

**Test Cases**:
1. **Cantidad "5" en Linea_De_Producto**: componente existente + `cantidad: "5"` → no debe haber error `cantidad-invalida` (fallará en el código no arreglado).
2. **Cantidad mínima "0.01"**: componente existente + `cantidad: "0.01"` → sin `cantidad-invalida` (fallará en el código no arreglado).
3. **Cantidad decimal "10.5"**: componente existente + `cantidad: "10.5"` → sin `cantidad-invalida` (fallará en el código no arreglado).
4. **Flujo end-to-end de Calculadora/Edición**: con cantidad `"5"`, `validarLineasEnEdicion` devuelve `{ valido: true }` (puede fallar en el código no arreglado).

**Expected Counterexamples**:
- `validarLineasProducto` reporta `{ indice, tipo: "cantidad-invalida" }` para `cantidad: "5"`.
- Posibles causas: se pasa la cadena cruda a `validarCantidad`; `validarCantidad` exige `number`; falta conversión previa. (Confirmado por lectura del código.)

### Fix Checking

**Goal**: Verificar que, para toda entrada que cumple la Bug_Condition, la función arreglada produce el comportamiento esperado (acepta la cantidad).

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := validarLineasProducto_fixed([X], productos, idEnEdicion)
  ASSERT NOT contieneError(result, indiceDe(X), "cantidad-invalida")
END FOR
```

### Preservation Checking

**Goal**: Verificar que, para toda entrada que NO cumple la Bug_Condition, la función arreglada produce el mismo resultado que la original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT validarLineasProducto_original(X, ...) = validarLineasProducto_fixed(X, ...)
END FOR
```

**Testing Approach**: Se recomienda testing basado en propiedades (fast-check, si está disponible; en su defecto, tablas de casos generados) para la verificación de preservación porque:
- Genera muchos casos automáticamente sobre el dominio de entrada.
- Captura casos límite que las pruebas unitarias manuales podrían omitir.
- Da garantías fuertes de que el comportamiento no cambia para las entradas no buggy.

**Test Plan**: Observar el comportamiento sobre el código NO arreglado para Lineas_De_Parametro y para Lineas_De_Producto con cantidades inválidas y con problemas de producto; luego escribir pruebas que capturen ese comportamiento y verificar que se conserva tras el arreglo.

**Test Cases**:
1. **Preservación de Lineas_De_Parametro**: líneas con `fuenteDeComponente: "Parámetro"` no son validadas por `validarLineasProducto` ni antes ni después del arreglo (se ignoran).
2. **Preservación de cantidad inválida en Linea_De_Producto**: `cantidad: "0"`, `"-3"`, `"1000000000"`, `"1.005"`, `""`, `"abc"`, `null` → siguen produciendo `cantidad-invalida`.
3. **Preservación de priorización de errores**: una Linea_De_Producto sin `productoComponenteId` y con cantidad válida sigue reportando `sin-producto` (y en el controlador se prioriza el mensaje de producto).
4. **Preservación de ciclos**: `detectarCicloComposicion` se comporta igual (el arreglo no lo toca).
5. **Preservación del contrato de `validarCantidad`**: para entradas numéricas (`5`, `0.009`, `1000000000`, `1.005`) los resultados de `validation.validarCantidad` son idénticos a los actuales.

### Unit Tests

- `validarLineasProducto` acepta cadenas numéricas válidas (`"5"`, `"0.01"`, `"10.5"`) en Lineas_De_Producto (no reporta `cantidad-invalida`).
- `validarLineasProducto` rechaza cadenas fuera de rango / con más de 2 decimales / no numéricas en Lineas_De_Producto (`cantidad-invalida`).
- `validarLineasProducto` ignora las Lineas_De_Parametro (con o sin `fuenteDeComponente`).
- El helper de conversión local replica `aNumeroCantidad`: number passthrough, trim, cadena vacía → NaN, no-string → NaN, no finito → NaN.
- `validation.validarCantidad` mantiene su comportamiento para entradas numéricas (casos de borde 0,01 y 999.999.999,99, y 2 vs. 3 decimales).

### Property-Based Tests

- Para cadenas numéricas generadas dentro de rango con ≤ 2 decimales en Lineas_De_Producto: `validarLineasProducto` nunca reporta `cantidad-invalida` (Property 1).
- Para entradas que NO cumplen la Bug_Condition (Lineas_De_Parametro arbitrarias, y Lineas_De_Producto con cantidades inválidas o no numéricas): el resultado del código arreglado coincide con el original (Property 2).
- Para valores numéricos arbitrarios pasados a `validarCantidad`: el resultado es idéntico antes y después del arreglo.

### Integration Tests

- Flujo de Calculadora: agregar una Linea_De_Producto con componente válido y cantidad `"5"`, pulsar Calcular → se muestran subtotales y Precio_Total, sin el mensaje de cantidad inválida.
- Flujo de Guardado: mismo escenario, pulsar Guardar → el Producto se persiste sin el mensaje de cantidad inválida.
- Flujo de Ventana_Edicion: editar un Producto con una Linea_De_Producto de cantidad `"5"` y guardar → se actualiza sin el mensaje de cantidad inválida.
- Mezcla de líneas: Producto con una Linea_De_Parametro y una Linea_De_Producto, ambas con cantidades válidas → cálculo y guardado correctos; y con una Linea_De_Producto de cantidad inválida → se muestra el mensaje esperado.
