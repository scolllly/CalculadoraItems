# Requirements Document

## Introduction

Migración completa de la aplicación web estática "Limpiapipas" (calculadora de precios en JavaScript vanilla con almacenamiento en `localStorage`) a un proyecto Next.js con persistencia en servidor mediante tablas relacionales `params`, `products` y `product_rows` en Supabase, con Realtime activado en las tres tablas para sincronizar el estado global automáticamente tras cada cambio. La migración preserva toda la funcionalidad existente —gestión de Parámetros, Productos y Base de Datos— convirtiendo los módulos de dominio puro a módulos ES estándar, reemplazando los controladores DOM por componentes React, y sustituyendo `localStorage` por rutas de API de Next.js que leen y escriben en las tablas `params` y `products`. Los tests unitarios y de propiedad existentes se adaptan al nuevo entorno de módulos.

---

## Glossary

- **Aplicacion**: el sistema Limpiapipas migrado a Next.js.
- **Parametro**: entidad de dominio `{ id, nombre, precioUnitario, unidad }`. Representa un insumo con precio unitario en PEN.
- **Producto**: entidad de dominio `{ id, nombre, lineas, precioTotal, unidad, compuesto }`. Representa un servicio calculado a partir de líneas.
- **Linea_De_Calculo**: elemento de un Producto `{ parametroId, cantidad, subtotal, fuenteDeComponente, productoComponenteId }`.
- **Linea_De_Parametro**: Linea_De_Calculo con `fuenteDeComponente === "Parámetro"`.
- **Linea_De_Producto**: Linea_De_Calculo con `fuenteDeComponente === "Producto"`.
- **Flag_Compuesto**: campo booleano `compuesto` del Producto; `true` si contiene al menos una Linea_De_Producto.
- **Precio_Total**: suma de los subtotales de las líneas, redondeada a 2 decimales con redondeo half-up.
- **Precio_Sugerido**: `redondear2(precioTotal / 0.70)`.
- **Precio_Redondeado**: menor múltiplo de 5 mayor o igual al Precio_Sugerido.
- **API_Route**: ruta de Next.js bajo `app/api/` o `pages/api/` que implementa los endpoints de lectura/escritura de las tablas relacionales.
- **Supabase_Client**: cliente de `@supabase/supabase-js` inicializado con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, usado para operaciones de base de datos y suscripción Realtime.
- **Tabla_Params**: tabla `params` en Supabase con columnas `id` (UUID PK), `nombre` (TEXT), `precio_unitario` (NUMERIC), `unidad` (TEXT). Tiene Realtime activado.
- **Tabla_Products**: tabla `products` en Supabase con columnas `id` (UUID PK), `nombre` (TEXT), `precio_total` (NUMERIC), `unidad` (TEXT), `compuesto` (BOOLEAN). Tiene Realtime activado. Las líneas de cada Producto se almacenan en `Tabla_Product_Rows`.
- **Tabla_Product_Rows**: tabla `product_rows` en Supabase con columnas `id` (UUID PK), `product_id` (UUID FK → `products.id` ON DELETE CASCADE), `parametro_id` (UUID NULLABLE FK → `params.id`), `cantidad` (NUMERIC), `subtotal` (NUMERIC), `fuente_de_componente` (TEXT: `'Parámetro'` o `'Producto'`), `producto_componente_id` (UUID NULLABLE FK → `products.id`). Cada fila representa una Linea_De_Calculo del Producto referenciado por `product_id`. Tiene Realtime activado.
- **Canal_Realtime**: suscripciones a los canales Realtime de `Tabla_Params`, `Tabla_Products` y `Tabla_Product_Rows` que escuchan eventos `INSERT`, `UPDATE` y `DELETE` para mantener el estado global sincronizado sin recargar la página.
- **Archivo_De_Respaldo**: archivo JSON descargable que contiene `{ version, parametros, productos }`, igual al formato existente.
- **Calculadora**: sección de la UI donde el usuario compone un Producto nuevo con su nombre y sus líneas.
- **Lista_De_Productos**: sección de la UI que muestra los Productos guardados con sus acciones.
- **Ventana_Detalle**: modal de solo lectura que muestra las líneas y el Precio_Total de un Producto.
- **Ventana_Edicion**: modal de edición de las líneas de un Producto existente.
- **Tab_Compuestos**: pestaña de la Lista_De_Productos que muestra los Productos con `compuesto === true`.
- **Tab_Simples**: pestaña de la Lista_De_Productos que muestra los Productos con `compuesto !== true`.
- **Modulo_De_Dominio**: módulo ES (`export`/`import`) que contiene lógica pura sin dependencias de UI ni de servidor.
- **Componente_React**: componente de React (`.tsx` o `.jsx`) que reemplaza a un controlador DOM del proyecto original.
- **Ciclo_De_Composicion**: referencia circular entre Productos que generaría un cálculo infinito.
- **PEN**: sol peruano; formato `"S/ X.XX"`.

---

## Requirements

### Requirement 1: Estructura del Proyecto Next.js

**User Story:** Como desarrollador, quiero que la aplicación exista como un proyecto Next.js autónomo en el directorio raíz del repositorio actual, para poder ejecutarla con `npm run dev` y desplegarla en cualquier entorno Node.js sin subdirectorios intermedios.

#### Acceptance Criteria

1. THE Sistema SHALL crear el proyecto Next.js con App Router directamente en el directorio raíz del repositorio (`c:\REPOSITORIOS\limpipipas\`), no en un subdirectorio separado, de modo que los archivos `next.config.js`, `package.json` de Next.js y los directorios `app/`, `lib/`, `components/` y `public/` queden en la raíz del repositorio.
2. BEFORE crear los archivos Next.js en la raíz, THE Sistema SHALL mover los archivos y directorios de la app estática que no forman parte de Next.js —concretamente `src/`, `styles/`, `tests/`, `vendor/`, `index.html`, `vitest.config.js` y el `package.json` original— a un directorio `old/` en la raíz del repositorio, de modo que queden accesibles como referencia durante la migración.
3. THE Sistema SHALL reemplazar el `package.json` de la raíz por el `package.json` generado por Next.js, quedando el `package.json` original preservado en `old/package.json`.
4. WHEN la migración haya sido verificada con todos los tests pasando, THE Sistema SHALL permitir eliminar el directorio `old/` sin que la aplicación Next.js deje de funcionar, dado que todos los módulos de dominio habrán sido migrados a `lib/` y todos los tests a `tests/` en la nueva estructura.
5. THE Sistema SHALL configurar JavaScript como lenguaje principal del proyecto migrado, sin archivos de configuración TypeScript (`tsconfig.json`), manteniendo la misma base de lenguaje que el proyecto original.
6. THE Sistema SHALL incluir `bootstrap` y `bootstrap-icons` como dependencias npm con versiones exactas fijadas en el nuevo `package.json`, e importarlos en el archivo de layout raíz de Next.js de modo que sus estilos estén disponibles en todas las páginas de la aplicación.
7. THE Sistema SHALL preservar los estilos propios del proyecto original importando el archivo de estilos equivalente en el layout raíz de Next.js, de forma que las clases `.lp-vista`, `.lp-bootstrap-warning`, `.lp-accion-texto`, `.lp-sin-iconos` y `.lp-producto-sugerido` estén disponibles globalmente y produzcan el mismo resultado visual que en el proyecto original.
8. THE Sistema SHALL configurar Vitest con jsdom como entorno de tests, de modo que el comando `npm test` ejecute la suite completa sin errores de configuración y finalice con código de salida 0 cuando todos los tests pasen.
9. WHEN el usuario ejecute `npm run dev`, THE Sistema SHALL iniciar el servidor de desarrollo Next.js en el puerto 3000, respondiendo con HTTP 200 en `http://localhost:3000` en un plazo máximo de 30 segundos desde el inicio del comando, sin mensajes de error en la salida estándar.
10. THE Sistema SHALL incluir el archivo `.env.local` con las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` requeridas para conectarse a Supabase, y documentar estas variables en un archivo `.env.local.example` en la raíz del proyecto.

---

### Requirement 2: Módulos de Dominio Puro como ES Modules

**User Story:** Como desarrollador, quiero que la lógica pura de la aplicación (cálculo, validación, modelos, operaciones sobre productos, respaldo) esté disponible como módulos ES estándar, para poder importarla tanto en componentes React como en los tests de Vitest.

#### Acceptance Criteria

1. THE Sistema SHALL convertir los siguientes archivos de IIFE a módulos ES con `export` nombrados: `calculo.js`, `currency.js`, `validation.js`, `models.js`, `productos.ops.js`, `backup.js`.
2. THE Sistema SHALL preservar todas las funciones y constantes exportadas públicamente por cada módulo: sus firmas, sus invariantes de dominio y sus colecciones de mensajes de error (por ejemplo `validation.MENSAJES`, `models.FUENTE_COMPONENTE`).
3. THE Sistema SHALL ubicar los módulos de dominio en un directorio `lib/` accesible mediante ruta relativa o alias configurado tanto desde componentes de cliente como desde rutas de API del servidor, sin errores de resolución en tiempo de compilación.
4. THE Sistema SHALL eliminar toda referencia a `window`, `document`, `navigator` y al patrón `(function(global){ ... })(window)` en el nivel superior de los módulos de dominio migrados.
5. WHEN un módulo de dominio sea importado en un test de Vitest, THE Sistema SHALL completar la importación sin lanzar excepciones.
6. IF una función exportada de un módulo de dominio recibe los mismos argumentos válidos que en la versión original, THEN THE Sistema SHALL devolver un resultado del mismo tipo y estructura que el producido por la versión original.

---

### Requirement 3: Capa de Persistencia — Supabase con Realtime

**User Story:** Como usuario, quiero que mis parámetros y productos se guarden de forma persistente en Supabase y que la aplicación refleje automáticamente cualquier cambio en tiempo real, para que los datos estén siempre sincronizados en la interfaz sin necesidad de recargar la página.

#### Acceptance Criteria

1. THE Sistema SHALL inicializar el Supabase_Client usando las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, disponible en componentes de cliente sin hardcodear credenciales.

2. IF las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no están definidas al iniciar el servidor, THEN THE Sistema SHALL lanzar un error descriptivo en tiempo de arranque que indique qué variable falta, impidiendo que la aplicación arranque con una configuración incompleta.

3. WHEN el servidor reciba una petición `GET /api/data`, THE Sistema SHALL leer todos los registros de `Tabla_Params` y `Tabla_Products` mediante el Supabase_Client; para cada Producto, THE Sistema SHALL leer las filas de `Tabla_Product_Rows` cuyo `product_id` coincida con el `id` del Producto (join o consulta secundaria) y reunirlas como array `lineas`, aplicar el Normalizador_De_Producto (`normalizarProducto`), y responder con HTTP 200 y cuerpo `{ parametros: Parametro[], productos: Producto[] }` con `Content-Type: application/json`, mapeando `precio_unitario` → `precioUnitario`, `precio_total` → `precioTotal`, `parametro_id` → `parametroId`, `fuente_de_componente` → `fuenteDeComponente`, `producto_componente_id` → `productoComponenteId`.

4. WHEN el servidor reciba una petición `PUT /api/data` con cuerpo JSON válido que contenga `parametros` y `productos` como arreglos, THE Sistema SHALL hacer upsert de cada elemento en `Tabla_Params` usando `id` como clave de conflicto; para cada Producto, THE Sistema SHALL hacer upsert del registro en `Tabla_Products` y luego eliminar todas las filas existentes de `Tabla_Product_Rows` con ese `product_id` e insertar las nuevas filas, respondiendo con HTTP 200 tras la operación exitosa.

5. IF `Tabla_Params`, `Tabla_Products` o `Tabla_Product_Rows` están vacías al procesar una petición `GET /api/data`, THEN THE Sistema SHALL responder con HTTP 200 y colecciones vacías `{ parametros: [], productos: [] }` sin lanzar error.

6. IF la operación de lectura en Supabase devuelve un error al procesar `GET /api/data`, THEN THE Sistema SHALL responder con HTTP 500 y un mensaje que indique fallo en la lectura, registrar el error en el log del servidor, y no exponer detalles del error al cliente.

7. IF la operación de upsert en Supabase devuelve un error al procesar `PUT /api/data`, THEN THE Sistema SHALL responder con HTTP 500 y un mensaje que indique fallo en la persistencia.

8. IF el cuerpo de una petición `PUT /api/data` no contiene `parametros` y `productos` como arreglos, THEN THE Sistema SHALL responder con HTTP 400 y un mensaje que indique los campos requeridos, sin intentar escribir en Supabase.

9. WHEN la aplicación se monte en el cliente, THE Sistema SHALL establecer suscripciones al Canal_Realtime para `Tabla_Params`, `Tabla_Products` y `Tabla_Product_Rows`, escuchando eventos `INSERT`, `UPDATE` y `DELETE`; al recibir cualquier evento en cualquiera de las tres tablas, THE Sistema SHALL re-leer el estado completo de las tres tablas y reemplazar el estado global en memoria, de modo que la UI refleje los cambios sin recargar la página.

10. WHEN el Canal_Realtime reciba eventos de `Tabla_Products`, THE Sistema SHALL aplicar el Normalizador_De_Producto a cada Producto antes de actualizar el estado global, de modo que el campo `compuesto` esté siempre derivado correctamente.

11. IF la suscripción al Canal_Realtime se desconecta, THEN THE Sistema SHALL intentar reconectarse automáticamente usando el mecanismo de reconexión del Supabase_Client sin intervención del usuario.

---

### Requirement 4: Estado Global del Cliente con Sincronización al Servidor

**User Story:** Como desarrollador, quiero que el estado de parámetros y productos se gestione en el cliente mediante React Context (o equivalente), sincronizándose con el servidor al cargar y al guardar, para que la UI refleje siempre los datos persistidos.

#### Acceptance Criteria

1. THE Sistema SHALL implementar un proveedor de estado global (`AppContext` o equivalente) que exponga `parametros`, `productos`, `setParametros` y `setProductos` a todos los componentes de la aplicación.
2. WHEN la aplicación se cargue por primera vez en el navegador, THE Sistema SHALL llamar a `GET /api/data`, poblar el estado global con el resultado y renderizar las vistas con los datos cargados en un plazo máximo de 10 segundos desde el inicio de la solicitud.
3. WHEN el usuario guarde, edite o elimine un Parámetro, THE Sistema SHALL actualizar el estado global en memoria antes de llamar a `PUT /api/data` con la lista completa actualizada de parámetros y productos.
4. WHEN el usuario guarde, edite o elimine un Producto, THE Sistema SHALL actualizar el estado global en memoria antes de llamar a `PUT /api/data` con la lista completa actualizada de parámetros y productos.
5. IF la llamada a `PUT /api/data` falla por error de red o respuesta con código de estado HTTP no 2xx, THEN THE Sistema SHALL revertir el estado global en memoria al valor previo a la operación y mostrar al usuario un mensaje de error indicando que el guardado persistente falló.
6. IF la llamada a `GET /api/data` no recibe respuesta exitosa en un plazo máximo de 10 segundos o devuelve una respuesta con código de estado HTTP no 2xx, THEN THE Sistema SHALL detener el indicador de carga y mostrar un mensaje de error indicando que los datos no pudieron cargarse, sin renderizar las listas de datos.
7. WHILE se está cargando el estado inicial desde el servidor, THE Sistema SHALL mostrar un indicador de carga visible y no renderizar las listas de datos.
8. WHEN el Canal_Realtime reciba un evento de `Tabla_Params`, `Tabla_Products` o `Tabla_Product_Rows`, THE Sistema SHALL re-leer el estado completo de las tres tablas mediante el Supabase_Client y reemplazar `parametros` y `productos` en el estado global, sin requerir una interacción adicional del usuario.

---

### Requirement 5: Componentes React — Gestión de Parámetros

**User Story:** Como usuario, quiero crear, editar y eliminar parámetros en la página de Parámetros, con la misma experiencia y validaciones que en la aplicación original.

#### Acceptance Criteria

1. THE Sistema SHALL implementar un componente `ParametrosPage` que renderice el formulario de Parámetros con los campos nombre, precio unitario y unidad, y la lista de todos los Parámetros existentes en el estado global.
2. WHEN el usuario envíe el formulario con datos válidos, THE Sistema SHALL crear un nuevo Parámetro mediante `models.crearParametro`, actualizar el estado global y persistir el cambio, dejando el formulario en su estado vacío inicial.
3. WHEN el usuario envíe el formulario con un nombre que, tras aplicar `trim`, coincida con el nombre (tras `trim`) de un Parámetro existente, THE Sistema SHALL mostrar el mensaje indicado por `validation.MENSAJES.NOMBRE_PARAMETRO_DUPLICADO` sin crear ni modificar ningún Parámetro.
4. IF el usuario envíe el formulario con nombre vacío o de más de 100 caracteres, THEN THE Sistema SHALL mostrar el mensaje indicado por `validation.MENSAJES.NOMBRE_PARAMETRO_LONGITUD` sin crear ni modificar ningún Parámetro.
5. IF el usuario envíe el formulario con precio fuera del rango 0.00–999 999 999.99 o con más de 2 decimales, THEN THE Sistema SHALL mostrar el mensaje indicado por `validation.MENSAJES.PRECIO_UNITARIO_INVALIDO` sin crear ni modificar ningún Parámetro.
6. IF el usuario envíe el formulario con unidad vacía o de más de 20 caracteres, THEN THE Sistema SHALL mostrar el mensaje indicado por `validation.MENSAJES.UNIDAD_LONGITUD` sin crear ni modificar ningún Parámetro.
7. WHEN el usuario pulse el botón Editar de un Parámetro, THE Sistema SHALL cargar los valores actuales de nombre, precio unitario y unidad de ese Parámetro en los campos del formulario, dejando el resto del estado global sin cambios.
8. WHEN el usuario envíe el formulario estando en modo edición con datos válidos, THE Sistema SHALL actualizar el Parámetro existente en el estado global, persistir el cambio y dejar el formulario en su estado vacío inicial.
9. WHEN el usuario pulse el botón Eliminar de un Parámetro referenciado por al menos una línea de la Calculadora activa, THE Sistema SHALL mostrar un diálogo de confirmación que indique el número exacto de líneas de la Calculadora activa que referencian ese Parámetro antes de proceder con ninguna eliminación.
10. WHEN el usuario confirme la eliminación de un Parámetro referenciado, THE Sistema SHALL asignar `parametroId = null` a cada línea de la Calculadora activa que referenciara ese Parámetro y eliminar el Parámetro del estado global, persistiendo ambos cambios.
11. WHEN el usuario pulse el botón Eliminar de un Parámetro no referenciado por ninguna línea de la Calculadora activa, THE Sistema SHALL eliminar el Parámetro del estado global y persistir el cambio sin mostrar diálogo de confirmación.

---

### Requirement 6: Componentes React — Calculadora y Lista de Productos

**User Story:** Como usuario, quiero calcular el precio de un nuevo producto ingresando líneas de cálculo con parámetros o productos como componentes, guardarlo y verlo en la lista, igual que en la aplicación original.

#### Acceptance Criteria

1. WHILE el ancho de la ventana es mayor o igual a 1024 px, THE Sistema SHALL mostrar `ProductosPage` con la Calculadora en la columna izquierda y la Lista_De_Productos en la columna derecha en una disposición de dos columnas.
2. WHILE el ancho de la ventana es menor a 1024 px, THE Sistema SHALL mostrar `ProductosPage` con la Calculadora apilada encima de la Lista_De_Productos en una sola columna.
3. THE Sistema SHALL implementar un componente `EditorDeLineas` que permita agregar y eliminar líneas, seleccionar la Fuente_De_Componente ("Parámetro" o "Producto"), el componente (Parámetro o Producto), y la cantidad.
4. WHEN el usuario pulse Calcular con un nombre de entre 1 y 100 caracteres y al menos una Línea_Válida, THE Sistema SHALL calcular los subtotales y el Precio_Total usando `productosOps.calcularContenedor` y mostrar el resultado.
5. WHEN el usuario pulse Calcular con el campo nombre vacío, THE Sistema SHALL mostrar un mensaje de error indicando que el nombre es obligatorio sin ejecutar el cálculo.
6. WHEN el usuario pulse Calcular sin líneas, THE Sistema SHALL mostrar el mensaje `"Se debe agregar al menos un parámetro."`.
7. WHEN el usuario pulse Calcular con una cantidad fuera del rango 0.01–999999999.99, THE Sistema SHALL mostrar `validation.MENSAJES.CANTIDAD_INVALIDA`.
8. WHEN el usuario pulse Calcular con una línea de Parámetro sin parámetro seleccionado, THE Sistema SHALL mostrar el mensaje `"Cada línea debe tener un parámetro seleccionado."`.
9. WHEN el usuario pulse Guardar con un nombre de entre 1 y 100 caracteres y al menos una Línea_Válida, THE Sistema SHALL crear el Producto con `models.crearProducto`, actualizar el estado global, persistir y reiniciar la Calculadora al estado vacío, donde el estado vacío es: campo nombre en blanco, lista de líneas vacía y área de resultado oculta.
10. WHEN el usuario pulse Guardar y la composición genere un Ciclo_De_Composicion directo (auto-referencia), THE Sistema SHALL mostrar `validation.MENSAJES.CICLO_DIRECTO` sin guardar.
11. WHEN el usuario pulse Guardar y la composición genere un Ciclo_De_Composicion indirecto, THE Sistema SHALL mostrar `validation.MENSAJES.CICLO_INDIRECTO` seguido de la secuencia de ids del ciclo sin guardar.
12. THE Sistema SHALL renderizar la Lista_De_Productos con dos pestañas: Tab_Compuestos y Tab_Simples, separando los Productos por Flag_Compuesto.
13. THE Sistema SHALL mostrar por cada Producto su nombre, el Precio_Total en PEN con dos decimales, el Precio_Sugerido y el Precio_Redondeado, y los tres botones de acción: Ver detalle, Editar, Eliminar.
14. WHEN el usuario pulse Boton_De_Orden, THE Sistema SHALL alternar la ordenación de la Lista_De_Productos entre ascendente y descendente por nombre, comenzando en ascendente como orden inicial.

---

### Requirement 7: Componentes React — Ventana_Detalle y Ventana_Edicion

**User Story:** Como usuario, quiero ver el detalle de un producto en un modal de solo lectura y poder editar sus líneas en otro modal, igual que en la aplicación original.

#### Acceptance Criteria

1. WHEN el usuario pulse Ver detalle, THE Sistema SHALL abrir la Ventana_Detalle mostrando el nombre del Producto, sus líneas resueltas con los campos nombre del componente, cantidad, unidad y subtotal en PEN con 2 decimales, y el Precio_Total calculado como la suma de los subtotales de todas las líneas, expresado en PEN con 2 decimales.
2. WHEN una línea del Producto referencia un Parámetro que ya no existe, THE Sistema SHALL mostrar el texto `productosOps.NOMBRE_PARAMETRO_AUSENTE` en el campo nombre del componente de esa línea en la Ventana_Detalle, y mostrar 0.00 como subtotal de dicha línea.
3. WHEN una Linea_De_Producto referencia un Producto que ya no existe, THE Sistema SHALL mostrar el texto `productosOps.NOMBRE_PRODUCTO_COMPONENTE_AUSENTE` en el campo nombre del componente de esa línea en la Ventana_Detalle, y mostrar 0.00 como subtotal de dicha línea.
4. WHEN el usuario pulse Editar, THE Sistema SHALL abrir la Ventana_Edicion con el nombre del Producto visible en solo lectura y cada línea precargada con sus valores actuales de componente, cantidad y unidad disponibles para editar.
5. WHEN el usuario guarde cambios en la Ventana_Edicion con datos válidos, THE Sistema SHALL invocar `productosOps.editarProducto` con los datos actualizados, intentar la persistencia, cerrar el modal y reflejar los cambios en la Lista_De_Productos.
6. WHEN el usuario pulse Eliminar y confirme la acción, THE Sistema SHALL invocar `productosOps.eliminarProducto`, intentar la persistencia y actualizar la Lista_De_Productos eliminando el Producto de la vista.
7. IF la persistencia falla al guardar un cambio de edición o eliminación, THEN THE Sistema SHALL aplicar el cambio en el estado en memoria, mantener la Lista_De_Productos actualizada en la sesión actual y mostrar un mensaje de aviso indicando que los cambios se aplicaron en la sesión pero no se pudieron guardar de forma persistente.
8. IF los datos ingresados en la Ventana_Edicion no son válidos al intentar guardar, THEN THE Sistema SHALL mantener el modal abierto, conservar los valores ingresados por el usuario y mostrar un mensaje de error indicando qué campos son inválidos.
9. WHEN el usuario pulse Editar y existan líneas que referencien componentes ausentes, THE Sistema SHALL precargar esas líneas en la Ventana_Edicion indicando que el componente referenciado no existe, permitiendo al usuario corregirlas o eliminarlas.

---

### Requirement 8: Componentes React — Base de Datos (Exportar/Importar)

**User Story:** Como usuario, quiero exportar todos mis datos como un archivo JSON e importar un respaldo anterior, con la misma experiencia que en la aplicación original.

#### Acceptance Criteria

1. THE Sistema SHALL implementar un componente `BaseDatosPage` con los controles de exportación e importación.
2. WHEN el usuario pulse Exportar, THE Sistema SHALL serializar el estado actual con `backup.serializarRespaldo` y descargar el resultado como un archivo con nombre `limpiapipas-respaldo.json` en el dispositivo del usuario.
3. WHEN el usuario seleccione un archivo y éste sea parseable como JSON por `backup.parsearRespaldo` con status `"ok"`, THE Sistema SHALL mostrar un diálogo de confirmación antes de aplicar el reemplazo de los datos actuales.
4. WHEN el usuario confirme la importación de un Archivo_De_Respaldo válido, THE Sistema SHALL aplicar el Normalizador_De_Producto a cada Producto importado y luego persistir los datos en Supabase mediante upsert por `id`: para cada Parámetro, hacer upsert en `Tabla_Params` usando `id` como clave de conflicto, de modo que si el `id` ya existe se actualicen sus datos y si no existe se inserte un nuevo registro; para cada Producto, hacer upsert del registro en `Tabla_Products` usando `id` como clave de conflicto y eliminar las filas existentes en `Tabla_Product_Rows` con ese `product_id` antes de insertar las filas nuevas; una vez completadas todas las operaciones exitosamente, THE Sistema SHALL re-leer el estado completo de las tres tablas y actualizar el estado global directamente, sin depender de la suscripción al Canal_Realtime para refrescar la UI.
5. WHEN el usuario cancele el diálogo de confirmación de importación, THE Sistema SHALL cerrar el diálogo y mantener el estado global sin cambios.
6. IF el archivo seleccionado para importar produce un resultado con `status !== "ok"` al ser procesado por `backup.parsearRespaldo`, THEN THE Sistema SHALL mostrar el mensaje de error contenido en el resultado de `parsearRespaldo` sin modificar el estado global.
7. IF la persistencia en Supabase falla en cualquier punto durante la importación (upsert de un Parámetro, upsert de un Producto, eliminación o inserción de filas en `Tabla_Product_Rows`), THEN THE Sistema SHALL mostrar una notificación de tipo error (toast) que indique explícitamente que falló el guardado de los datos en Supabase, y THE Sistema SHALL mantener el estado global sin reemplazarlo por los datos importados, de modo que la UI siga reflejando los datos previos a la importación.
8. WHEN la importación de un Archivo_De_Respaldo complete todos los upserts exitosamente, THE Sistema SHALL mostrar un mensaje informativo indicando que los datos se importaron correctamente, sin esperar ningún evento del Canal_Realtime.

---

### Requirement 9: Navegación SPA con Next.js

**User Story:** Como usuario, quiero navegar entre las tres secciones (Productos, Parámetros, Base de datos) sin recargar la página, con una barra de navegación superior igual a la original.

#### Acceptance Criteria

1. THE Sistema SHALL implementar la barra de navegación superior con los tres elementos de navegación (Productos, Parámetros, Base de datos) en el layout raíz de Next.js, visible en todas las páginas de la aplicación.
2. THE Sistema SHALL usar el enrutador de Next.js para alternar entre las tres secciones sin recargar la página completa, de modo que el DOM no se desmonte entre navegaciones.
3. WHEN el usuario cargue la aplicación por primera vez, THE Sistema SHALL mostrar la sección Productos como vista de inicio.
4. WHEN el usuario navegue a una sección, THE Sistema SHALL aplicar un estilo visual activo al elemento de navegación correspondiente y removerlo de los demás elementos.

---

### Requirement 10: Notificaciones de Usuario

**User Story:** Como usuario, quiero ver mensajes de confirmación y de error claros tras cada acción, igual que en la aplicación original.

#### Acceptance Criteria

1. THE Sistema SHALL implementar un sistema de notificaciones visible (toasts o alertas de Bootstrap) accesible desde cualquier componente de la aplicación, capaz de mostrar mensajes de tipo informativo y de tipo error de forma simultánea.
2. WHEN una operación sea exitosa (guardar, editar, eliminar), THE Sistema SHALL mostrar un mensaje de tipo informativo que desaparezca automáticamente transcurridos 5 segundos sin intervención del usuario.
3. WHEN una operación produzca un error no de validación (fallo de red, error de servidor), THE Sistema SHALL mostrar un mensaje de tipo error que permanezca visible hasta que el usuario lo cierre explícitamente.
4. WHEN se requiera confirmación antes de una acción destructiva (eliminar Parámetro, eliminar Producto, importar respaldo), THE Sistema SHALL mostrar un diálogo de confirmación que incluya una descripción de la acción y requiera una acción explícita del usuario para confirmar o cancelar.

---

### Requirement 11: Migración y Adaptación de Tests

**User Story:** Como desarrollador, quiero que todos los tests unitarios y de propiedad existentes se migren y pasen en el nuevo proyecto Next.js, para mantener la misma confianza en la corrección de la lógica de dominio.

#### Acceptance Criteria

1. THE Sistema SHALL migrar todos los tests de dominio puro (cálculo, validación, modelos, productos.ops, backup, currency) a tests de Vitest que importen los módulos ES directamente con `import`.
2. THE Sistema SHALL migrar los tests de propiedad existentes (fast-check) preservando todas las propiedades verificadas: round-trip de respaldo, idempotencia del normalizador, invariantes de la partición por Flag_Compuesto y clasificación compuesto/simple, con el mismo resultado de pasa/falla para los mismos inputs que en la versión original.
3. THE Sistema SHALL adaptar los tests de comportamiento de UI para que los componentes React sean testeables con `@testing-library/react` bajo jsdom, de modo que para los mismos inputs de usuario cada test produzca el mismo resultado de pasa/falla que el test original.
4. WHEN se ejecute `npm test` en modo de ejecución única (sin modo watch), THE Sistema SHALL correr toda la suite de tests y finalizar con código de salida 0 y 0 tests fallidos.
5. THE Sistema SHALL incluir al menos un test de integración que mockee el Supabase_Client para simular upserts exitosos en `Tabla_Params` y `Tabla_Products`, y verifique que el Canal_Realtime dispara la re-lectura del estado que refleja los datos insertados.
6. THE Sistema SHALL incluir tests de las rutas de API que verifiquen: (a) `GET /api/data` con `Tabla_Params`, `Tabla_Products` y `Tabla_Product_Rows` vacías devuelve HTTP 200 y colecciones vacías; (b) `PUT /api/data` con cuerpo válido devuelve HTTP 200; (c) `GET /api/data` con error de lectura de Supabase devuelve HTTP 500; (d) `PUT /api/data` con cuerpo malformado (sin `parametros` o `productos` como arreglos) devuelve HTTP 400.
7. THE Sistema SHALL incluir un test de propiedad que verifique que para todo par `(parametros, productos)` serializable, `parsearRespaldo(serializarRespaldo(parametros, productos))` devuelve un objeto con `status === "ok"`.

---

### Requirement 12: Retrocompatibilidad de Datos

**User Story:** Como usuario, quiero que mis datos guardados con la versión estática (localStorage) puedan importarse sin pérdida de información a la nueva versión Next.js, para no perder el trabajo acumulado.

#### Acceptance Criteria

1. THE Sistema SHALL aceptar Productos sin el campo `compuesto` aplicando el Normalizador_De_Producto para derivar el flag, de modo que el valor resultante de `compuesto` sea idéntico al que produciría `normalizarProducto` aplicado a ese Producto con sus líneas.
2. THE Sistema SHALL aceptar Lineas_De_Calculo sin el campo `fuenteDeComponente` interpretándolas como Lineas_De_Parametro asignándoles el valor por defecto `"Parámetro"`.
3. THE Sistema SHALL aceptar Lineas_De_Calculo sin el campo `productoComponenteId` asignándoles `null` por defecto.
4. WHEN el usuario importe un Archivo_De_Respaldo generado por la versión estática, THE Sistema SHALL parsearlo, normalizarlo y persistirlo de modo que el recuento de Productos y Parámetros resultante sea igual al del archivo importado y todos los campos definidos en el archivo sean idénticos en el estado resultante tras aplicar los valores por defecto de los criterios 1 al 3.

