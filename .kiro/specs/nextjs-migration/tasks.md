# Implementation Plan: Next.js Migration (`nextjs-migration`)

## Overview

Migration of the Limpiapipas vanilla-JS SPA (IIFE modules, `localStorage`, `file://`) to a Next.js 14+ App Router project backed by Supabase for persistent, real-time data synchronization. Domain logic moves from `src/*.js` (IIFE/`window.LP`) to `lib/*.js` (ES modules). DOM controllers are replaced by React components. All existing tests are migrated to use `import` instead of the `cargarLP`/`cargarModulos` helper.

---

## Tasks

---

### 1. Mover archivos existentes a `old/` y crear estructura Next.js base

- [x] 1.1 Crear el directorio `old/` y mover `src/`, `styles/`, `tests/`, `vendor/`, `index.html`, `vitest.config.js` y el `package.json` original dentro de él
  - Rutas de origen: `src/`, `styles/`, `tests/`, `vendor/`, `index.html`, `vitest.config.js`, `package.json`
  - Destinos: `old/src/`, `old/styles/`, `old/tests/`, `old/vendor/`, `old/index.html`, `old/vitest.config.js`, `old/package.json`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 Crear el `package.json` de Next.js en la raíz del repositorio con las dependencias exactas pinadas
  - Archivo a crear: `package.json`
  - Dependencias de producción exactas: `next`, `react`, `react-dom`, `bootstrap`, `bootstrap-icons`, `@supabase/supabase-js`
  - Dependencias de desarrollo exactas: `vitest`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `fast-check`
  - Scripts: `"dev": "next dev"`, `"build": "next build"`, `"start": "next start"`, `"test": "vitest run"`
  - Campo `"type": "module"` para ES modules
  - _Requirements: 1.1, 1.3, 1.5, 1.8_

- [x] 1.3 Crear `next.config.js` en la raíz del repositorio
  - Configuración mínima para Next.js App Router en JavaScript
  - _Requirements: 1.1_

- [x] 1.4 Crear `vitest.config.js` en la raíz del repositorio con entorno jsdom y soporte React
  - Archivo a crear: `vitest.config.js`
  - Configuración: entorno `jsdom`, incluir `tests/**/*.test.js`, `setupFiles` apuntando a `tests/setup.js`, globals `false`
  - _Requirements: 1.8_

- [x] 1.5 Crear `tests/setup.js` con `@testing-library/jest-dom` matchers
  - Archivo a crear: `tests/setup.js`
  - Importar `@testing-library/jest-dom/vitest`
  - _Requirements: 1.8, 11.3_

- [x] 1.6 Crear el archivo de estilos propios en `styles/app.css` portando el CSS de `old/styles/`
  - Archivo a crear: `styles/app.css`
  - Debe contener las reglas de `.lp-vista`, `.lp-bootstrap-warning`, `.lp-accion-texto`, `.lp-sin-iconos`, `.lp-producto-sugerido` y cualquier otra regla del CSS original
  - _Requirements: 1.7_

- [x] 1.7 Crear la estructura de directorios vacíos del proyecto: `app/`, `app/api/data/`, `app/(pages)/productos/`, `app/(pages)/parametros/`, `app/(pages)/base-datos/`, `lib/`, `components/productos/`, `components/parametros/`, `components/base-datos/`, `tests/`
  - Crear un `.gitkeep` o archivo inicial en cada directorio para que git los registre
  - _Requirements: 1.1_

- [x] 1.8 Crear `.env.local.example` en la raíz del repositorio documentando las variables requeridas
  - Archivo a crear: `.env.local.example`
  - Contenido: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con comentarios de dónde obtenerlas
  - _Requirements: 1.10_

- [x] 1.9 Punto de verificación — confirmar estructura base
  - Verificar que `package.json`, `next.config.js`, `vitest.config.js`, `styles/app.css` y `tests/setup.js` existen en la raíz
  - _Requirements: 1.1, 1.8_

---

### 2. Módulos de dominio puro como ES modules (`lib/`)

- [x] 2.1 Crear `lib/calculo.js` portando `old/src/calculo.js` como ES module
  - Exportar con `export function`: `redondear2`, `subtotalLinea`, `precioTotal`, `calcularProducto`
  - Eliminar el patrón IIFE `(function(global){ ... })(window)` y toda referencia a `window`/`global`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.2 Crear `lib/currency.js` portando `old/src/currency.js` como ES module
  - Exportar con `export function`: `formatearPEN`; exportar también `redondearHalfUp2` si se usa en tests
  - Eliminar el patrón IIFE y referencias a `window`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.3 Crear `lib/validation.js` portando `old/src/validation.js` como ES module
  - Exportar con `export const`: `MENSAJES`, `VALIDO`
  - Exportar con `export function`: `validarNombreParametro`, `validarPrecioUnitario`, `validarUnidad`, `validarNombreProducto`, `validarCantidad`
  - Eliminar el patrón IIFE y referencias a `window`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.4 Crear `lib/models.js` portando `old/src/models.js` como ES module
  - Exportar con `export const`: `FUENTE_COMPONENTE`
  - Exportar con `export function`: `generarId`, `crearParametro`, `crearProducto`, `crearLinea`, `normalizarLinea`, `normalizarProducto`, `esCompuesto`
  - La función `generarId` debe detectar `globalThis.crypto` sin usar `window`
  - Eliminar el patrón IIFE y referencias a `window`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.5 Crear `lib/productos.ops.js` portando `old/src/productos.ops.js` como ES module
  - Importar desde `./models.js`, `./calculo.js`, `./validation.js`
  - Exportar con `export const`: `NOMBRE_PARAMETRO_AUSENTE`, `NOMBRE_PRODUCTO_COMPONENTE_AUSENTE`, `UNIDAD_DE_REEMPLAZO`
  - Exportar con `export function`: `resolverDetalle`, `resolverPrecioUnitario`, `calcularContenedor`, `editarProducto`, `eliminarProducto`, `validarLineasProducto`, `detectarCicloComposicion`
  - Reemplazar los accesos en tiempo de llamada `window.LP.models.*`, `window.LP.calculo.*`, `window.LP.validation.*` por los imports directos
  - Eliminar el patrón IIFE y referencias a `window`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.6 Crear `lib/backup.js` portando `old/src/backup.js` como ES module
  - Exportar con `export const`: `BACKUP_VERSION`
  - Exportar con `export function`: `serializarRespaldo`, `parsearRespaldo`
  - Eliminar el patrón IIFE y referencias a `window`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.7 Punto de verificación — confirmar que los módulos `lib/` son importables sin errores
  - Ejecutar `node --input-type=module` o un test mínimo que importe cada módulo
  - Ningún módulo debe referenciar `window`, `document` o `global` en su nivel superior
  - _Requirements: 2.4, 2.5_

---

### 3. Migración de tests de dominio puro

- [x] 3.1 Crear `tests/calculo.test.js` para los módulos de cálculo, portando las pruebas existentes que cubrían `calculo.js` desde tests de controllers/regresión
  - Importar directamente con `import { redondear2, subtotalLinea, precioTotal, calcularProducto } from '../lib/calculo.js'`
  - Cubrir: redondeo half-up, subtotal por línea, suma de subtotales, casos borde de punto flotante (0.005, 0.1*3)
  - _Requirements: 11.1, 11.4_

- [x] 3.2 Crear `tests/currency.test.js` migrando las pruebas de `formatearPEN`
  - Importar con `import { formatearPEN } from '../lib/currency.js'`
  - Cubrir: formato PEN, 2 decimales, casos 0, negativos, números con redondeo
  - _Requirements: 11.1, 11.4_

- [x] 3.3 Crear `tests/validation.test.js` migrando las pruebas de validación
  - Importar con `import { MENSAJES, validarNombreParametro, validarPrecioUnitario, validarUnidad, validarNombreProducto, validarCantidad } from '../lib/validation.js'`
  - Cubrir todos los validators: bordes, mensajes exactos, duplicados, rangos
  - _Requirements: 11.1, 11.4_

- [x] 3.4 Crear `tests/models.test.js` migrando las pruebas de modelos
  - Importar con `import { ... } from '../lib/models.js'`
  - Cubrir: `crearParametro`, `crearProducto`, `crearLinea`, `normalizarLinea`, `normalizarProducto`, `esCompuesto`, `FUENTE_COMPONENTE`
  - _Requirements: 11.1, 11.4_

- [x] 3.5 Migrar `old/tests/backup.roundtrip.property.test.js` a `tests/backup.roundtrip.property.test.js`
  - Reemplazar `cargarModulos([...])` + `window.LP.backup` por `import { serializarRespaldo, parsearRespaldo } from '../lib/backup.js'`
  - Reemplazar `LP.productosOps.editarProducto/eliminarProducto` por imports directos de `../lib/productos.ops.js`
  - Mantener los mismos generadores `fc` y las mismas propiedades (Property 10 round-trip, Property 8 Flag_Compuesto)
  - _Requirements: 11.1, 11.2, 11.4, 11.7_

- [x] 3.6 Migrar `old/tests/normalizador.producto.property.test.js` a `tests/normalizador.producto.property.test.js`
  - Reemplazar imports de cargarModulos por `import { normalizarProducto, normalizarLinea } from '../lib/models.js'`
  - Mantener la misma propiedad de idempotencia con `numRuns: 100`
  - _Requirements: 11.1, 11.2, 11.4, 12.1, 12.2, 12.3_

- [x] 3.7 Migrar `old/tests/cantidad.linea.producto.unit.test.js` a `tests/cantidad.linea.producto.unit.test.js`
  - Reemplazar `cargarModulos` por `import { validarLineasProducto } from '../lib/productos.ops.js'` y `import { FUENTE_COMPONENTE } from '../lib/models.js'`
  - Mantener todos los casos de prueba de conversión de cantidad cruda
  - _Requirements: 11.1, 11.4_

- [x] 3.8 Migrar los demás tests de dominio puro existentes en `old/tests/` que no dependan del DOM
  - Migrar: `cantidad.linea.producto.exploracion.property.test.js`, `cantidad.linea.producto.preservacion.property.test.js`
  - Reemplazar cada `cargarModulos([...])` por los imports ES directos correspondientes
  - _Requirements: 11.1, 11.2, 11.4_

- [x] 3.9 Punto de verificación — todos los tests de dominio puro deben pasar
  - Ejecutar `npm test -- tests/calculo.test.js tests/currency.test.js tests/validation.test.js tests/models.test.js tests/backup.roundtrip.property.test.js tests/normalizador.producto.property.test.js`
  - Confirmar código de salida 0 y 0 tests fallidos
  - _Requirements: 11.4_

---

### 4. Capa de acceso a Supabase (`lib/supabase.js` y `lib/db.js`)

- [x] 4.1 Crear `lib/supabase.js` con inicialización del cliente Supabase y validación de variables de entorno
  - Importar `createClient` de `@supabase/supabase-js`
  - Validar en tiempo de carga que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` están definidas; lanzar error descriptivo si alguna falta
  - Exportar `export function createSupabaseClient()` que devuelve un cliente inicializado
  - _Requirements: 3.1, 3.2_

- [x] 4.2 Crear `lib/db.js` con la función `getData(supabaseClient)`
  - Importar `normalizarProducto` de `./models.js`
  - Leer todos los registros de `params` y mapear a `Parametro[]` (snake_case → camelCase: `precio_unitario` → `precioUnitario`)
  - Leer todos los registros de `products`; para cada producto leer `product_rows` donde `product_id = producto.id`
  - Mapear `product_rows` a `LineaDeCalculo[]` (snake_case → camelCase: `parametro_id`, `fuente_de_componente`, `producto_componente_id`)
  - Aplicar `normalizarProducto` a cada Producto antes de devolverlo
  - Si Supabase devuelve error: lanzar `Error` con mensaje legible para el handler de la ruta
  - Retornar `{ parametros: Parametro[], productos: Producto[] }`
  - _Requirements: 3.3, 3.5_

- [x] 4.3 Crear en `lib/db.js` la función `putData(supabaseClient, { parametros, productos })`
  - Para cada `Parametro`: hacer upsert en `params` usando `id` como clave de conflicto (camelCase → snake_case)
  - Para cada `Producto`: hacer upsert en `products`; luego `DELETE FROM product_rows WHERE product_id = producto.id`; luego insertar las nuevas filas en `product_rows` (camelCase → snake_case)
  - Si Supabase devuelve error en cualquier operación: lanzar `Error` con mensaje legible
  - _Requirements: 3.4_

- [x] 4.4 Crear en `lib/db.js` la función `importBackup(supabaseClient, { parametros, productos })`
  - Igual que `putData` pero sin retornar datos; la UI la llama directamente desde `BaseDatosPage` y luego llama a `getData` para refrescar
  - _Requirements: 3.4, 8.4_

- [x] 4.5 Punto de verificación — confirmar que `lib/supabase.js` y `lib/db.js` se importan sin error en Node.js
  - Los módulos no deben referenciar APIs del navegador en el nivel superior
  - _Requirements: 3.1, 3.2_

---

### 5. Rutas de API Next.js (`app/api/data/route.js`)

- [x] 5.1 Crear `app/api/data/route.js` con el handler `GET`
  - Importar `createSupabaseClient` de `../../../lib/supabase.js` y `getData` de `../../../lib/db.js`
  - Llamar `getData(supabase)` y responder con `Response.json({ parametros, productos }, { status: 200 })`
  - Si `getData` lanza: registrar el error en el log del servidor (no exponer detalles al cliente) y responder `{ error: "Error al leer los datos." }` con status 500
  - Si las tablas están vacías (arrays vacíos): responder HTTP 200 con `{ parametros: [], productos: [] }`
  - _Requirements: 3.3, 3.5, 3.6_

- [x] 5.2 Agregar el handler `PUT` en `app/api/data/route.js`
  - Parsear el cuerpo JSON de la petición
  - Validar que `body.parametros` y `body.productos` son arrays; si no: responder `{ error: "Se requieren los campos parametros y productos como arreglos." }` con status 400
  - Llamar `putData(supabase, { parametros, productos })`
  - En éxito: responder `Response.json({}, { status: 200 })`
  - Si `putData` lanza: responder `{ error: "Error al guardar los datos." }` con status 500
  - _Requirements: 3.4, 3.7, 3.8_

- [x] 5.3 Punto de verificación — confirmar que la ruta no tiene errores de compilación
  - Ejecutar `next build` o importar la ruta en un test de Node.js básico
  - _Requirements: 3.3, 3.4_

---

### 6. Estado global del cliente y sincronización Realtime (`components/AppProvider.js`)

- [x] 6.1 Crear `components/AppProvider.js` con el `AppContext` de React y la carga inicial de datos
  - `"use client"` en la primera línea
  - Crear `AppContext` con `React.createContext`
  - Estado: `parametros`, `productos`, `loading`, `error`, `calculadoraLineas`
  - En `useEffect` de montaje: llamar `GET /api/data`; si la respuesta es exitosa: poblar `parametros` y `productos`; si falla o excede 10 segundos: fijar `error`; siempre: fijar `loading = false`
  - Mientras `loading === true`: no renderizar las listas de datos (exponer el estado en el contexto)
  - Si hay `error`: mostrar mensaje de error (exponer en contexto)
  - _Requirements: 4.1, 4.2, 4.6, 4.7_

- [x] 6.2 Agregar `saveAll({ parametros, productos })` al `AppProvider`
  - Actualización optimista: llamar `setParametros`/`setProductos` antes del PUT
  - Llamar `PUT /api/data` con la lista completa actualizada
  - Si falla (red o status no 2xx): revertir al estado previo; notificar error via contexto/notificaciones
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 6.3 Agregar suscripciones al Canal_Realtime en `AppProvider`
  - En `useEffect` de montaje (tras la carga inicial): suscribirse a los canales de `params`, `products` y `product_rows`
  - En cualquier evento `INSERT`, `UPDATE` o `DELETE` de cualquiera de las tres tablas: volver a llamar `GET /api/data` y reemplazar `parametros` y `productos` en el estado global
  - Aplicar `normalizarProducto` (importado de `lib/models.js`) a cada Producto al recibir eventos de `products`
  - En `useEffect` de desmontaje: cancelar todas las suscripciones
  - _Requirements: 3.9, 3.10, 3.11, 4.8_

- [x] 6.4 Exportar `AppProvider` como componente y `AppContext` como contexto; envolver la aplicación en `app/layout.js`
  - Crear `app/layout.js` como Server Component que importe Bootstrap CSS, bootstrap-icons CSS y `styles/app.css`
  - Renderizar `<html><body><AppProvider><NavBar />{children}</AppProvider></body></html>`
  - _Requirements: 1.6, 1.7, 4.1_

- [x] 6.5 Punto de verificación — confirmar que `AppProvider` se monta sin errores en jsdom
  - Crear `tests/AppProvider.smoke.test.js` con `render(<AppProvider />)` mockeando `fetch` y Supabase
  - Confirmar que no lanza durante el montaje
  - _Requirements: 4.1, 4.2_

---

### 7. Sistema de notificaciones (`components/NotifierContext.js` y `components/Notifier.js`)

- [x] 7.1 Crear `components/NotifierContext.js` con el contexto y reducer de notificaciones
  - `"use client"`
  - Crear `NotifierContext` con `React.createContext` y un `dispatch` que acepta `{ type: 'info'|'error', message }`
  - Exportar `NotifierContext` y el hook `useNotifier()` como atajo a `useContext(NotifierContext)`
  - _Requirements: 10.1_

- [x] 7.2 Crear `components/Notifier.js` que renderiza las alertas de Bootstrap
  - `"use client"`
  - Importar `useNotifier`
  - Renderizar un stack de alertas Bootstrap (`role="alert"`, `aria-live="polite"`) en la parte superior de la página
  - Alertas `info`: auto-desaparecen a los 5000 ms
  - Alertas `error`: permanecen hasta que el usuario cierra (botón dismiss)
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 7.3 Integrar `Notifier` en `app/layout.js` dentro del `AppProvider`
  - Agregar `<Notifier />` dentro del layout para que las notificaciones sean visibles en todas las páginas
  - _Requirements: 10.1_

---

### 8. Barra de navegación (`components/NavBar.js`)

- [x] 8.1 Crear `components/NavBar.js` con los tres ítems de navegación
  - `"use client"`
  - Usar `usePathname()` de Next.js para aplicar la clase `active` al ítem de la ruta actual
  - Usar `<Link>` de Next.js para los tres ítems: `/productos`, `/parametros`, `/base-datos`
  - Aplicar estilo visual activo al ítem correspondiente y removerlo de los demás
  - Importar Bootstrap JS bundle vía `useEffect` para soportar collapse/dropdown en mobile
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 8.2 Crear `app/(pages)/productos/page.js`, `app/(pages)/parametros/page.js` y `app/(pages)/base-datos/page.js` como páginas vacías iniciales
  - Cada archivo exporta un componente `default` simple con el nombre de la sección como placeholder
  - _Requirements: 9.1, 9.3_

- [x] 8.3 Crear `app/page.js` que redirige a `/productos`
  - Usar `redirect('/productos')` de `next/navigation`
  - _Requirements: 9.3_

---

### 9. Componentes de Productos

- [x] 9.1 Crear `components/productos/EditorDeLineas.js` — componente controlado de líneas de cálculo
  - `"use client"`
  - Props: `lineas: LineaEnEdicion[]`, `onChange(lineas)`, `parametros`, `productos`, `idProductoContenedor`
  - Renderizar una fila por línea con: `<select>` Fuente (Parámetro/Producto), `<select>` Componente (lista de Parametros o lista de Productos filtrada), `<input type="number">` Cantidad, `<span>` Unidad (derivada del componente seleccionado), botón Eliminar
  - Botón "Agregar línea" que llama a `onChange([...lineas, nuevaLineaVacía])`
  - Estado vacío: `"No hay líneas agregadas."` cuando `lineas.length === 0`
  - Excluir `idProductoContenedor` del selector de Productos
  - Para Fuente "Producto" con referencia colgante: mostrar `NOMBRE_PRODUCTO_COMPONENTE_AUSENTE`
  - _Requirements: 6.3, 7.9_

- [x] 9.2 Crear `components/productos/VentanaDetalle.js` — modal de solo lectura
  - `"use client"`
  - Props: `producto: Producto | null`, `parametros`, `productos`, `onClose()`
  - Renderizar modal Bootstrap (visible cuando `producto !== null`)
  - Título: `producto.nombre`
  - Cuerpo: llamar `resolverDetalle(producto, parametros, productos)` para resolver las líneas; renderizar cada línea con nombre del componente, cantidad, unidad y subtotal en PEN (con `formatearPEN`)
  - Para `ausente === true`: mostrar `NOMBRE_PARAMETRO_AUSENTE` o `NOMBRE_PRODUCTO_COMPONENTE_AUSENTE` sin unidad
  - Sin líneas: mostrar `"Este producto no tiene líneas de cálculo."`
  - Sin controles de edición (inputs, selects, botones de acción de líneas)
  - Pie: Precio_Total en PEN; botón Cerrar
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 9.3 Crear `components/productos/VentanaEdicion.js` — modal de edición de líneas
  - `"use client"`
  - Props: `producto: Producto | null`, `parametros`, `productos`, `onGuardar(productoId, lineasActualizadas)`, `onClose()`
  - Estado local: `lineas: LineaEnEdicion[]` inicializado con deep-copy de `producto.lineas` en `useEffect`
  - Nombre del Producto en solo lectura
  - Cuerpo: `<EditorDeLineas lineas={lineas} onChange={setLineas} parametros={parametros} productos={productos} idProductoContenedor={producto.id} />`
  - Al Guardar: validar (sin líneas → `MENSAJES.SIN_LINEAS`; cantidad inválida → `MENSAJES.CANTIDAD_INVALIDA`; sin parámetro → `MENSAJES.SIN_PARAMETRO`); si válido: llamar `onGuardar`; si inválido: mantener modal abierto con los datos en edición
  - _Requirements: 7.4, 7.5, 7.8, 7.9_

- [x] 9.4 Crear `components/productos/Calculadora.js` — formulario de cálculo y guardado
  - `"use client"`
  - Props: `parametros`, `productos`, `onGuardar(nombre, lineas)`
  - Estado local: `nombre: string`, `lineas: LineaEnEdicion[]`, `resultado: { subtotales, total } | null`
  - Al Calcular: validar nombre + líneas; si válido: llamar `calcularContenedor(lineas, parametros, productos)` y mostrar subtotales por línea y Precio_Total en PEN
  - Al Guardar: validar nombre + líneas + ciclos; si válido: llamar `crearProducto`, llamar `onGuardar`, reiniciar formulario (nombre='', lineas=[], resultado=null)
  - Usar los mensajes exactos de `validation.MENSAJES` y `MENSAJES.SIN_LINEAS`/`MENSAJES.SIN_PARAMETRO`/`MENSAJES.CANTIDAD_INVALIDA`
  - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11_

- [x] 9.5 Crear `components/productos/ListaProductos.js` — lista con pestañas compuestos/simples
  - `"use client"`
  - Props: `productos`, `parametros`, `direccionOrden`, `onToggleOrden`, `onVerDetalle(producto)`, `onEditar(producto)`, `onEliminar(productoId)`
  - Renderizar pestañas Bootstrap: Tab_Compuestos y Tab_Simples separando por `compuesto === true`
  - Ordenar cada grupo por nombre con `Intl.Collator('es', { sensitivity: 'base' })` según `direccionOrden`
  - Por cada Producto: nombre, badge Precio_Total en PEN, badge `Precio_Sugerido -> Precio_Redondeado`, tres botones de icono (Ver detalle, Editar, Eliminar)
  - Estado vacío global: `"No hay productos guardados."`; estado vacío por pestaña: mensajes diferenciados
  - Botón de orden con `aria-label` indicando la dirección siguiente
  - _Requirements: 6.1, 6.2, 6.12, 6.13, 6.14_

- [x] 9.6 Crear `components/productos/ProductosPage.js` — página completa de Productos
  - `"use client"`
  - Leer `parametros`, `productos`, `saveAll`, `calculadoraLineas`, `setCalculadoraLineas` de `AppContext`
  - Leer `dispatch` de `NotifierContext`
  - Estado local: `direccionOrden`, `modalDetalle: Producto | null`, `modalEdicion: Producto | null`
  - Layout de dos columnas en ≥1024px (Bootstrap `col-lg-6`) o una columna en <1024px
  - Composición: `<Calculadora>` en la columna izquierda, `<ListaProductos>` en la derecha
  - Handler `handleGuardarProducto(nombre, lineas)`: crear producto, `saveAll`, notificar éxito/fallo
  - Handler `handleGuardarEdicion(productoId, lineas)`: `editarProducto`, `saveAll`, notificar éxito/fallo, cerrar modal
  - Handler `handleEliminar(productoId)`: confirmar, `eliminarProducto`, `saveAll`, notificar éxito/fallo
  - _Requirements: 6.1, 6.2, 7.5, 7.6, 7.7_

- [x] 9.7 Conectar `ProductosPage` con la página `app/(pages)/productos/page.js`
  - Importar `<ProductosPage />` y renderizarlo
  - _Requirements: 9.1, 9.3_

---

### 10. Componentes de Parámetros (`components/parametros/ParametrosPage.js`)

- [x] 10.1 Crear `components/parametros/ParametrosPage.js` — página completa de Parámetros
  - `"use client"`
  - Leer `parametros`, `saveAll`, `calculadoraLineas`, `setCalculadoraLineas` de `AppContext`
  - Leer `dispatch` de `NotifierContext`
  - Estado local: `nombre`, `precioUnitario`, `unidad`, `idEnEdicion: string | null`
  - Renderizar formulario con campos nombre, precio unitario, unidad y botón guardar
  - Renderizar lista de Parámetros existentes con botones Editar y Eliminar por cada uno (nombre, precio en PEN, unidad)
  - Al enviar formulario: validar (`validarNombreParametro`, `validarPrecioUnitario`, `validarUnidad`); si válido: crear o actualizar Parámetro, `saveAll`, notificar, limpiar formulario
  - Al Editar: cargar valores en el formulario, fijar `idEnEdicion`
  - Al Eliminar sin referencias en `calculadoraLineas`: eliminar directamente, `saveAll`, notificar
  - Al Eliminar con referencias en `calculadoraLineas`: mostrar diálogo de confirmación con el número exacto de líneas afectadas; si confirma: fijar `parametroId = null` en esas líneas vía `setCalculadoraLineas`, eliminar Parámetro, `saveAll`
  - Mostrar mensajes exactos de `validation.MENSAJES` (NOMBRE_PARAMETRO_DUPLICADO, PRECIO_UNITARIO_INVALIDO, etc.)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

- [x] 10.2 Conectar `ParametrosPage` con la página `app/(pages)/parametros/page.js`
  - Importar `<ParametrosPage />` y renderizarlo
  - _Requirements: 9.1_

---

### 11. Componentes de Base de Datos (`components/base-datos/BaseDatosPage.js`)

- [x] 11.1 Crear `components/base-datos/BaseDatosPage.js` — página de exportar/importar
  - `"use client"`
  - Leer `parametros`, `productos`, `setParametros`, `setProductos` de `AppContext`
  - Leer `dispatch` de `NotifierContext`
  - Handler `handleExportar()`: llamar `serializarRespaldo(parametros, productos)`, crear `Blob`, `URL.createObjectURL`, disparar descarga con nombre `limpiapipas-respaldo.json`, revocar URL
  - Handler `handleImportar(file)`: `FileReader.readAsText` → llamar `parsearRespaldo`
    - Si `status !== "ok"`: `dispatch({ type: 'error', message: resultado.reason })`
    - Si `status === "ok"`: mostrar diálogo de confirmación
    - Si confirma: aplicar `normalizarProducto` a cada Producto importado; llamar `importBackup(supabase, { parametros, productos })` (upsert por `id`: si el `id` existe se actualiza, si no existe se inserta); llamar `getData(supabase)`; actualizar estado global con `setParametros`/`setProductos`; `dispatch({ type: 'info', message: 'Datos importados correctamente.' })`
    - Si falla la persistencia en Supabase: NO reemplazar el estado global por los datos importados (mantener el estado previo); `dispatch({ type: 'error', message: 'No se pudieron guardar los datos en Supabase.' })` como toast de error
    - Si cancela: cerrar diálogo sin cambios
  - Reiniciar el input de archivo tras cada importación
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 11.2 Conectar `BaseDatosPage` con la página `app/(pages)/base-datos/page.js`
  - Importar `<BaseDatosPage />` y renderizarlo
  - _Requirements: 9.1_

- [x] 11.3 Punto de verificación — confirmación de diálogos (Requirement 10.4)
  - Verificar que las acciones destructivas (eliminar Parámetro referenciado, eliminar Producto, importar respaldo) muestran diálogo de confirmación con descripción de la acción
  - _Requirements: 10.4_

---

### 12. Tests de rutas de API (`tests/api.test.js`)

- [x] 12.1 Crear `tests/api.test.js` con los tests de `GET /api/data` con tablas vacías
  - Mockear `lib/db.js` con `vi.mock('../lib/db.js')` para que `getData` devuelva `{ parametros: [], productos: [] }`
  - Verificar que la ruta responde HTTP 200 con `{ parametros: [], productos: [] }`
  - _Requirements: 3.5, 11.6_

- [x] 12.2 Agregar en `tests/api.test.js` el test de `PUT /api/data` con cuerpo válido
  - Mockear `putData` para que devuelva sin error
  - Enviar `{ parametros: [...], productos: [...] }` con arrays válidos
  - Verificar respuesta HTTP 200
  - _Requirements: 3.4, 11.6_

- [x] 12.3 Agregar en `tests/api.test.js` el test de `GET /api/data` con error de Supabase
  - Mockear `getData` para que lance un error
  - Verificar que la ruta responde HTTP 500 con campo `error`
  - _Requirements: 3.6, 11.6_

- [x] 12.4 Agregar en `tests/api.test.js` el test de `PUT /api/data` con cuerpo malformado
  - Enviar body sin el campo `parametros` o sin el campo `productos` como array
  - Verificar respuesta HTTP 400 con mensaje indicando los campos requeridos
  - _Requirements: 3.8, 11.6_

---

### 13. Tests de propiedad con fast-check (`tests/`)

- [x] 13.1 Crear `tests/backup.property.test.js` con Property 1 (round-trip backup completo)
  - Importar `serializarRespaldo`, `parsearRespaldo` de `../lib/backup.js`
  - Generadores: `fc.array(fc.record({ id: fc.uuid(), nombre: fc.string(), precioUnitario: fc.float(), unidad: fc.string() }))` para parametros; productos con campo opcional `compuesto: fc.option(fc.boolean())`
  - Propiedad: `parsearRespaldo(serializarRespaldo(params, prods)).status === 'ok'` y los campos son estructuralmente iguales incluyendo `compuesto`, `fuenteDeComponente`, `productoComponenteId`
  - `numRuns: 100`
  - Anotación: `Feature: nextjs-migration, Property 1: Backup serialization round-trip preserves all data`
  - _Requirements: 11.2, 11.7_

- [x] 13.2 Crear `tests/models.property.test.js` con Property 2 (idempotencia de normalizadores)
  - Importar `normalizarProducto`, `normalizarLinea` de `../lib/models.js`
  - Propiedad normalizarProducto: `normalizarProducto(normalizarProducto(p))` igual a `normalizarProducto(p)` para cualquier objeto con campo `compuesto` opcional
  - Propiedad normalizarLinea: `normalizarLinea(normalizarLinea(l))` igual a `normalizarLinea(l)`; el resultado siempre tiene `fuenteDeComponente` no-null y `productoComponenteId` null o string
  - `numRuns: 100` por propiedad
  - Anotación: `Feature: nextjs-migration, Property 2: Normalization functions are idempotent`
  - _Requirements: 11.2, 12.1, 12.2, 12.3_

- [x] 13.3 Crear `tests/partition.property.test.js` con Property 3 (partición total y exclusiva)
  - Importar la función de partición (extraída de `components/productos/ListaProductos.js` o como helper puro de `lib/productos.ops.js` si se exporta)
  - Generadores: `fc.array(fc.record({ compuesto: fc.option(fc.boolean()) }))`
  - Propiedad: `compuestos ∪ simples` contiene exactamente los mismos elementos que el input; cada `compuesto` tiene `compuesto === true`; cada `simple` tiene `compuesto !== true`
  - `numRuns: 100`
  - Anotación: `Feature: nextjs-migration, Property 3: Producto partition is total and exclusive`
  - _Requirements: 11.2_

- [x] 13.4 Crear `tests/currency.property.test.js` con Property 4 (formatearPEN 2 decimales siempre)
  - Importar `formatearPEN` de `../lib/currency.js`
  - Generadores: `fc.float({ noNaN: true, noDefaultInfinity: true })`
  - Propiedad: para todo número finito `n`, `formatearPEN(n)` comienza con `"S/ "` y la parte numérica contiene exactamente 2 dígitos después del separador decimal
  - `numRuns: 100`
  - Anotación: `Feature: nextjs-migration, Property 4: formatearPEN always produces exactly two decimal places`
  - _Requirements: 11.2_

- [x] 13.5 Crear `tests/validation.property.test.js` con Property 5 (rango válido de validarCantidad)
  - Importar `validarCantidad` de `../lib/validation.js`
  - Generadores en rango: `fc.integer({ min: 1, max: 99999999999 }).map(c => c / 100)`
  - Generadores fuera de rango: `fc.oneof(fc.constant(0), fc.integer({ min: 100000000000 }).map(c => c / 100))`
  - Propiedad en rango: `validarCantidad(n).valido === true`
  - Propiedad fuera de rango: `validarCantidad(n).valido === false` y `mensaje` no vacío
  - `numRuns: 100` por propiedad
  - Anotación: `Feature: nextjs-migration, Property 5: validarCantidad accepts exactly the valid domain range`
  - _Requirements: 11.2_

- [x] 13.6 Punto de verificación — todos los tests de propiedad pasan
  - Ejecutar `npm test -- tests/backup.property.test.js tests/models.property.test.js tests/partition.property.test.js tests/currency.property.test.js tests/validation.property.test.js`
  - Confirmar 0 tests fallidos
  - _Requirements: 11.2, 11.4_

---

### 14. Tests de integración y componentes React (`tests/`)

- [x] 14.1 Crear `tests/integration.test.js` con el test de integración Realtime
  - Mockear `lib/supabase.js` y `lib/db.js` con `vi.mock`
  - Simular upserts exitosos en `params` y `products`
  - Verificar que el handler del Canal_Realtime dispara una re-lectura de estado que refleja los datos insertados
  - _Requirements: 11.5_

- [x] 14.2 Crear `tests/ParametrosPage.test.js` con tests de comportamiento del formulario
  - Usar `@testing-library/react` para renderizar `<ParametrosPage>` con providers mockeados
  - Tests: enviar formulario con nombre duplicado → mensaje `NOMBRE_PARAMETRO_DUPLICADO`; con precio fuera de rango → `PRECIO_UNITARIO_INVALIDO`; con nombre vacío → `NOMBRE_PARAMETRO_LONGITUD`; con unidad vacía → `UNIDAD_LONGITUD`
  - Test: crear parámetro válido → aparece en la lista
  - Test: editar parámetro → carga valores en el formulario
  - Test: eliminar parámetro referenciado → muestra confirmación con número de líneas
  - _Requirements: 11.3_

- [x] 14.3 Crear `tests/Calculadora.test.js` con tests de comportamiento de la calculadora
  - Usar `@testing-library/react`
  - Tests: Calcular sin nombre → error `NOMBRE_PRODUCTO_OBLIGATORIO`; sin líneas → `SIN_LINEAS`; con cantidad inválida → `CANTIDAD_INVALIDA`; con parámetro sin seleccionar → `SIN_PARAMETRO`
  - Test: Calcular con datos válidos → muestra subtotales y Precio_Total en PEN
  - Test: Guardar producto válido → llama `onGuardar` y limpia el formulario (nombre='', líneas vacías, resultado oculto)
  - _Requirements: 11.3_

- [x] 14.4 Crear `tests/EditorDeLineas.test.js` con tests del editor de líneas React
  - Usar `@testing-library/react`
  - Tests: estado vacío → muestra `"No hay líneas agregadas."`; agregar línea → aparece una fila; eliminar línea → desaparece la fila; cambiar fuente de Parámetro a Producto → actualiza el selector de componente
  - Test: `idProductoContenedor` excluye el producto de la lista de componentes
  - _Requirements: 11.3_

- [x] 14.5 Crear `tests/VentanaDetalle.test.js` migrando `old/tests/ventana.detalle.test.js`
  - Usar `@testing-library/react` en lugar de `cargarModulos` + controladores DOM
  - Renderizar `<VentanaDetalle producto={...} parametros={...} productos={...} onClose={() => {}} />`
  - Tests de los mismos escenarios: líneas con parametros existentes, parametro ausente (`NOMBRE_PARAMETRO_AUSENTE`), producto componente ausente, sin líneas, solo lectura (sin inputs/selects/botones de edición)
  - _Requirements: 11.3_

- [x] 14.6 Crear `tests/VentanaEdicion.test.js` migrando `old/tests/ventana.edicion.test.js`
  - Usar `@testing-library/react`
  - Tests: apertura precarga líneas del producto (nombre en readonly, líneas con parametroId y cantidad); rechazo sin líneas → `SIN_LINEAS`; cantidad inválida → `CANTIDAD_INVALIDA`; sin parámetro → `SIN_PARAMETRO`; guardar válido → llama `onGuardar`; cancelar → no llama `onGuardar`
  - _Requirements: 11.3_

- [x] 14.7 Crear `tests/BaseDatosPage.test.js` migrando `old/tests/exportar.importar.integracion.test.js`
  - Usar `@testing-library/react`
  - Tests: exportar → dispara descarga; importar archivo válido → muestra confirmación; confirmar importación → actualiza estado; cancelar importación → no cambia estado; importar archivo inválido → muestra error de `parsearRespaldo.reason`
  - _Requirements: 11.3_

- [x] 14.8 Punto de verificación — todos los tests de componentes y de integración pasan
  - Ejecutar `npm test -- tests/integration.test.js tests/ParametrosPage.test.js tests/Calculadora.test.js tests/EditorDeLineas.test.js tests/VentanaDetalle.test.js tests/VentanaEdicion.test.js tests/BaseDatosPage.test.js`
  - Confirmar 0 tests fallidos
  - _Requirements: 11.3, 11.4, 11.5_

---

### 16. Orden de persistencia, validación de líneas y desreferenciación en cascada

- [ ] 16.1 Agregar en `lib/db.js` los helpers puros `ordenarProductosParaPersistir(productos)` y `filtrarLineasValidas(lineas)`
  - `ordenarProductosParaPersistir`: devuelve `[...simples, ...compuestos]` separando por `compuesto === true` (simples primero), sin mutar la entrada
  - `filtrarLineasValidas`: aplica la Validación_De_Linea_Por_Fuente — conserva las Lineas_De_Parametro (`fuenteDeComponente === 'Parámetro'`, incluida la ausencia interpretada como Parámetro) solo si `parametroId != null`, y las Lineas_De_Producto (`fuenteDeComponente === 'Producto'`) solo si `productoComponenteId != null`; descarta el resto
  - Exportar ambos helpers con `export function`
  - _Requirements: 3.4.1, 3.4.2_

- [ ] 16.2 Aplicar el Orden_De_Persistencia y la Validación_De_Linea_Por_Fuente en `putData`
  - Upsert de todos los Parametros primero
  - Recorrer los Productos usando `ordenarProductosParaPersistir(productos)` (simples antes que compuestos)
  - Antes de insertar las filas de `product_rows` de cada Producto, aplicar `filtrarLineasValidas(producto.lineas)`
  - _Requirements: 3.4, 3.4.1, 3.4.2, 8.4_

- [ ] 16.3 Agregar en `lib/productos.ops.js` el helper `eliminarParametroEnCascada(productos, parametroId)`
  - Devuelve una nueva lista de Productos donde se eliminan las Lineas_De_Parametro cuyo `parametroId` coincide; recalcula `precioTotal` (suma de subtotales restantes) y `compuesto` de cada Producto afectado; no muta la entrada
  - _Requirements: 5.12_

- [ ] 16.4 Agregar en `lib/productos.ops.js` el helper `eliminarProductoSimpleEnCascada(productos, id)`
  - Elimina el Producto con ese `id` y además elimina (no anula) toda Linea_De_Producto que lo referencie por `productoComponenteId` en los Productos restantes; recalcula `precioTotal` y `compuesto` de cada Producto afectado; no muta la entrada
  - _Requirements: 7.6.1_

- [ ] 16.5 Conectar la cascada al eliminar Parámetro en `ParametrosPage.handleEliminar`
  - Tras la confirmación, construir `productos` desreferenciados con `eliminarParametroEnCascada(productos, parametroId)` y persistirlos junto con `parametros` filtrados vía `saveAll`
  - Mantener la desreferenciación de `calculadoraLineas` existente
  - _Requirements: 5.10, 5.12_

- [ ] 16.6 Conectar la cascada al eliminar Producto en `ProductosPage.handleEliminar`
  - Si el Producto a eliminar es simple (`compuesto !== true`), usar `eliminarProductoSimpleEnCascada(productos, id)`; en otro caso, mantener `eliminarProducto(productos, id)`
  - Persistir el resultado vía `saveAll`
  - _Requirements: 7.6, 7.6.1_

- [ ] 16.7 Tests de los nuevos helpers
  - `tests` para `ordenarProductosParaPersistir` (simples antes que compuestos, no muta), `filtrarLineasValidas` (descarta líneas con referencia nula a su fuente), `eliminarParametroEnCascada` y `eliminarProductoSimpleEnCascada` (eliminan líneas y recalculan `precioTotal`/`compuesto`)
  - Test de integración: `putData` con un snapshot donde un compuesto aparece antes que sus componentes simples en el array no produce error de orden
  - _Requirements: 3.4.1, 3.4.2, 5.12, 7.6.1_

---

### 15. Verificación final

- [x] 15.1 Ejecutar la suite completa de tests y verificar código de salida 0
  - Ejecutar `npm test` (equivale a `vitest run`)
  - Confirmar que todas las suites pasan y el código de salida es 0 con 0 tests fallidos
  - _Requirements: 11.4_

- [x] 15.2 Verificar que `npm run dev` arranca correctamente
  - Ejecutar `npm run dev` y confirmar respuesta HTTP 200 en `http://localhost:3000` en menos de 30 segundos
  - Verificar sin mensajes de error en la salida estándar
  - _Requirements: 1.9_

- [x] 15.3 Verificar retrocompatibilidad de datos importados (Requirement 12)
  - Tomar un archivo de respaldo generado por la versión estática (con Productos sin campo `compuesto` y Lineas sin `fuenteDeComponente`)
  - Importarlo desde `BaseDatosPage` y verificar que el recuento de Productos y Parámetros coincide con el archivo original y que los campos definidos son idénticos tras aplicar los valores por defecto
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 15.4 Punto de verificación final — confirmar que el directorio `old/` puede eliminarse sin romper la aplicación Next.js
  - Verificar que ningún import en `lib/`, `components/`, `app/` o `tests/` referencia rutas bajo `old/`
  - Verificar que `npm test` y `npm run build` pasan sin el directorio `old/`
  - _Requirements: 1.4_

---

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia los Requisitos y criterios de aceptación específicos del documento `requirements.md`.
- Los checkpoints aseguran la validación incremental antes de avanzar a la siguiente fase.
- Los tests de propiedad (Property 1–5) validan invariantes universales sobre espacios de entrada amplios con fast-check.
- Los tests unitarios validan ejemplos concretos y casos borde.
- Al migrar cada test existente de `old/tests/` a `tests/`, el único cambio permitido es reemplazar el patrón `cargarModulos([...])`/`window.LP.X` por imports ES directos; todas las aserciones, inputs y resultados esperados permanecen idénticos.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["2.5", "2.6"] },
    { "id": 4, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 5, "tasks": ["3.5", "3.6", "3.7", "3.8"] },
    { "id": 6, "tasks": ["4.1"] },
    { "id": 7, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 8, "tasks": ["5.1", "5.2"] },
    { "id": 9, "tasks": ["6.1", "7.1"] },
    { "id": 10, "tasks": ["6.2", "6.3", "7.2"] },
    { "id": 11, "tasks": ["6.4", "7.3", "8.1", "8.2", "8.3"] },
    { "id": 12, "tasks": ["9.1", "9.2"] },
    { "id": 13, "tasks": ["9.3", "9.4", "9.5"] },
    { "id": 14, "tasks": ["9.6", "10.1", "11.1"] },
    { "id": 15, "tasks": ["9.7", "10.2", "11.2"] },
    { "id": 16, "tasks": ["12.1", "12.2", "12.3", "12.4"] },
    { "id": 17, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5"] },
    { "id": 18, "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5", "14.6", "14.7"] },
    { "id": 19, "tasks": ["15.1", "15.2", "15.3", "15.4"] }
  ]
}
```
