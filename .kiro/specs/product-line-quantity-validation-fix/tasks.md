# Implementation Plan

- [x] 1. Escribir la prueba de exploración de la Bug_Condition (ANTES de implementar el arreglo)
  - **Property 1: Bug Condition** - La cantidad numérica válida en una Linea_De_Producto se acepta
  - **CRITICAL**: Esta prueba DEBE FALLAR sobre el código NO arreglado; el fallo confirma que el bug existe
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: Esta prueba codifica el comportamiento esperado; validará el arreglo cuando pase tras la implementación
  - **GOAL**: Exponer contraejemplos que demuestren la existencia del bug
  - **Scoped PBT Approach**: Enfoque property-based con Vitest (fast-check si está disponible; en su defecto, tabla de casos generados). Generar cadenas numéricas dentro del rango 0,01–999.999.999,99 con ≤ 2 decimales para una Linea_De_Producto con `productoComponenteId` existente
  - Construir una Linea_De_Producto con `fuenteDeComponente: "Producto"`, un `productoComponenteId` existente y `cantidad` como cadena numérica válida (isBugCondition(X) === true), e invocar `validarLineasProducto([X], productos, idEnEdicion)` sobre `window.LP`
  - Afirmar que el resultado NO contiene un error `{ indice, tipo: "cantidad-invalida" }` para esa línea (comportamiento esperado de Expected Behavior 2.1/2.2)
  - Incluir casos concretos deterministas para reproducibilidad: `cantidad: "5"`, `cantidad: "0.01"` (mínimo válido), `cantidad: "10.5"`
  - Añadir caso end-to-end: con cantidad `"5"`, `validarLineasEnEdicion` devuelve `{ valido: true }`
  - Ejecutar la prueba sobre el código NO arreglado con `vitest --run`
  - **EXPECTED OUTCOME**: La prueba FALLA (es correcto; prueba que el bug existe)
  - Documentar los contraejemplos hallados (p. ej. "validarLineasProducto reporta { tipo: 'cantidad-invalida' } para cantidad '5'") para entender la causa raíz
  - Marcar la tarea completa cuando la prueba esté escrita, ejecutada y el fallo documentado
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Escribir las pruebas de preservación basadas en propiedades (ANTES de implementar el arreglo)
  - **Property 2: Preservation** - Comportamiento inalterado para entradas que no cumplen la Bug_Condition
  - **IMPORTANT**: Seguir la metodología observation-first
  - Observar el comportamiento sobre el código NO arreglado para entradas donde isBugCondition(X) === false y registrar las salidas reales:
    - Lineas_De_Parametro (`fuenteDeComponente: "Parámetro"`, con o sin el campo): son ignoradas por `validarLineasProducto`
    - Lineas_De_Producto con cantidad realmente inválida: `"0"`, `"-3"`, `"1000000000"`, `"1.005"`, `""`, `"abc"`, `null` → producen `cantidad-invalida`
    - Linea_De_Producto sin `productoComponenteId` y con cantidad válida → reporta `sin-producto` (priorización de errores)
    - `detectarCicloComposicion` → resultado observado sobre grafos de composición
    - `validation.validarCantidad` con entradas numéricas (`5`, `0.009`, `1000000000`, `1.005`, bordes `0.01` y `999999999.99`, 2 vs. 3 decimales) → resultados observados
  - Escribir pruebas property-based con Vitest (fast-check si está disponible) que afirmen que, para toda entrada donde NOT isBugCondition(X), el resultado coincide con el comportamiento observado en el código original (`F(X) = F'(X)` de Preservation Requirements)
  - Ejecutar las pruebas sobre el código NO arreglado con `vitest --run`
  - **EXPECTED OUTCOME**: Las pruebas PASAN (confirma la línea base a preservar)
  - Marcar la tarea completa cuando las pruebas estén escritas, ejecutadas y pasando sobre el código no arreglado
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Arreglo para la validación de cantidad en Lineas_De_Producto

  - [x] 3.1 Implementar el arreglo en `validarLineasProducto`
    - En `src/productos.ops.js`, añadir un helper local que replique la semántica exacta de `aNumeroCantidad`: `number` → passthrough; no `string` (`null`, `undefined`, objeto) → `NaN`; `string` → `trim()`, cadena vacía → `NaN`, en otro caso `Number(recortado)` devolviendo el número si `Number.isFinite`, o `NaN`
    - En `validarLineasProducto`, convertir la cantidad cruda a número con ese helper antes de validar: `const cantidadNumerica = aNumeroCantidad(origen.cantidad);` y pasar `cantidadNumerica` a `validation.validarCantidad(...).valido`
    - No modificar `validation.validarCantidad` (su contrato de tipo numérico se conserva intacto)
    - No alterar el resto de `validarLineasProducto`: detección de `sin-producto` / `producto-inexistente`, acumulación de errores por índice, filtrado por Fuente_De_Componente y detección de ciclos permanecen sin cambios
    - _Bug_Condition: isBugCondition(X) = (X.fuenteDeComponente = "Producto") AND type_of(X.cantidad) = string AND representaNumeroValido(X.cantidad)_
    - _Expected_Behavior: expectedBehavior(result) = validarLineasProducto no reporta `cantidad-invalida` para X, permitiendo calcular y guardar_
    - _Preservation: Preservation Requirements del diseño (Lineas_De_Parametro, rechazo de cantidades inválidas, priorización de errores, ciclos, contrato de validarCantidad para números)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Verificar que la prueba de exploración de la Bug_Condition ahora pasa
    - **Property 1: Expected Behavior** - La cantidad numérica válida en una Linea_De_Producto se acepta
    - **IMPORTANT**: Re-ejecutar la MISMA prueba de la tarea 1; NO escribir una prueba nueva
    - La prueba de la tarea 1 codifica el comportamiento esperado; cuando pasa, confirma que el Expected Behavior se cumple
    - Ejecutar la prueba de exploración del paso 1 con `vitest --run`
    - **EXPECTED OUTCOME**: La prueba PASA (confirma que el bug está arreglado)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verificar que las pruebas de preservación siguen pasando
    - **Property 2: Preservation** - Comportamiento inalterado para entradas que no cumplen la Bug_Condition
    - **IMPORTANT**: Re-ejecutar las MISMAS pruebas de la tarea 2; NO escribir pruebas nuevas
    - Ejecutar las pruebas de preservación del paso 2 con `vitest --run`
    - **EXPECTED OUTCOME**: Las pruebas PASAN (confirma que no hay regresiones)
    - Confirmar que todas las pruebas siguen pasando tras el arreglo (sin regresiones)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Añadir pruebas unitarias e de integración (Testing Strategy)

  - [x] 4.1 Pruebas unitarias adicionales
    - `validarLineasProducto` acepta cadenas numéricas válidas (`"5"`, `"0.01"`, `"10.5"`) en Lineas_De_Producto (sin `cantidad-invalida`)
    - `validarLineasProducto` rechaza cadenas fuera de rango / con más de 2 decimales / no numéricas (`cantidad-invalida`)
    - `validarLineasProducto` ignora las Lineas_De_Parametro (con o sin `fuenteDeComponente`)
    - El helper de conversión local replica `aNumeroCantidad`: number passthrough, trim, cadena vacía → NaN, no-string → NaN, no finito → NaN
    - `validation.validarCantidad` mantiene su comportamiento para entradas numéricas (bordes `0.01` y `999999999.99`, 2 vs. 3 decimales)
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.5_

  - [x] 4.2 Pruebas de integración de los flujos
    - Flujo de Calculadora: agregar una Linea_De_Producto con componente válido y cantidad `"5"`, pulsar Calcular → subtotales y Precio_Total sin el mensaje de cantidad inválida
    - Flujo de Guardado: mismo escenario, pulsar Guardar → el Producto se persiste sin el mensaje
    - Flujo de Ventana_Edicion: editar un Producto con una Linea_De_Producto de cantidad `"5"` y guardar → se actualiza sin el mensaje
    - Mezcla de líneas: Producto con una Linea_De_Parametro y una Linea_De_Producto válidas → cálculo/guardado correctos; con una Linea_De_Producto inválida → se muestra el mensaje esperado
    - _Requirements: 2.1, 2.2, 3.1_

- [x] 5. Checkpoint - Asegurar que todas las pruebas pasan
  - Ejecutar la suite completa con `vitest --run` y asegurar que todas las pruebas pasan
  - Si surgen dudas o fallos inesperados, preguntar al usuario
