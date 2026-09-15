# Design Document

## Overview

Esta funcionalidad sustituye los botones de acción de texto ("Ver detalle", "Editar", "Eliminar") por botones con iconos de Bootstrap Icons en la Lista_De_Productos (`src/productos.controller.js`) y en la Lista_De_Parametros (`src/parametros.controller.js`). El icono de ojo (`bi-eye`) representa Ver detalle, el lápiz (`bi-pencil`) Editar y la papelera (`bi-trash`) Eliminar. Los botones conservan sus colores (variantes `outline` de Bootstrap), sus clases CSS existentes y su cableado de eventos.

La aplicación es una SPA estática que se carga mediante `file://`, sin paso de compilación y sin CDN. Actualmente `vendor/bootstrap/` contiene solo `bootstrap.min.css` y `bootstrap.bundle.min.js`; Bootstrap Icons no está presente. Por tanto, esta funcionalidad incorpora los recursos de Bootstrap Icons localmente (hoja de estilos y archivo de fuente), los enlaza en `index.html` y degrada de forma segura si la fuente no se carga, manteniendo un nombre accesible disponible para tecnologías de asistencia y para las pruebas existentes.

El diseño está restringido por dos invariantes que preservan la compatibilidad:

1. Las pruebas existentes (`tests/lista.productos.test.js`, `tests/eliminacion.test.js`) seleccionan los botones por clase CSS (`lp-producto-detalle`, `lp-producto-editar`, `lp-producto-eliminar`) y por conteo, y NO afirman sobre `textContent`. Por tanto, deben conservarse todas las clases y el cableado por `data-id`.
2. El cargador de pruebas (`tests/helpers/cargarLP.js`) evalúa los IIFE de `src/*.js` en jsdom; no carga `index.html` ni CSS, y jsdom no renderiza fuentes. Las aserciones de iconos deben basarse en la estructura del DOM (presencia del `<i class="bi bi-*">`, atributos `aria-label`/`title`/`aria-hidden`), no en el render visual.

Requisitos cubiertos: 1, 2, 3, 4 y 5.

### Investigación

- **Distribución de Bootstrap Icons.** La distribución oficial (`font/` del paquete `bootstrap-icons`, p. ej. release 1.x) contiene `bootstrap-icons.css` y una subcarpeta `fonts/` con `bootstrap-icons.woff2` y `bootstrap-icons.woff`. La hoja de estilos referencia la fuente con rutas relativas del tipo `url("./fonts/bootstrap-icons.woff2")` (confirmado en [issue de twbs/bootstrap sobre rutas de fuentes de bootstrap-icons](https://github.com/twbs/bootstrap/issues/34830) y en múltiples reportes de la comunidad; contenido reformulado por cumplimiento de licencia). Esto implica que la carpeta `fonts/` debe colocarse junto al CSS para que la `url()` relativa resuelva correctamente bajo `file://`.
- **Detección de fallo de fuente bajo `file://`.** Detectar de forma fiable que específicamente la fuente de iconos no cargó es no trivial bajo `file://` (la API `document.fonts` puede comportarse de forma inconsistente y no hay eventos de red observables sin CORS/servidor). El diseño adopta un enfoque pragmático y honesto: una etiqueta de texto presente siempre en el DOM para lectores de pantalla, con degradación visual apoyada en el atributo `title` y en el patrón `#aviso-estilos` existente, sin intentar una detección frágil del evento de carga de la fuente.

## Architecture

La funcionalidad toca cuatro artefactos y no introduce módulos nuevos ni cambia el grafo de dependencias de carga:

```mermaid
flowchart TD
  A["index.html (head)"] -->|link antes de app.css| B["vendor/bootstrap-icons/bootstrap-icons.css"]
  B -->|url('./fonts/..woff2')| C["vendor/bootstrap-icons/fonts/*"]
  A --> D["styles/app.css (fallback + utilidades)"]
  E["src/productos.controller.js<br/>renderListaProductos"] -->|crea <i class='bi bi-*'>| F["Boton_De_Icono (productos)"]
  G["src/parametros.controller.js<br/>render"] -->|crea <i class='bi bi-*'>| H["Boton_De_Icono (parametros)"]
  F -. clases + aria-label/title .-> D
  H -. clases + aria-label/title .-> D
```

Principios:

- **Sin CDN, rutas relativas.** El `<link>` de iconos y la `url()` de la fuente usan rutas relativas locales; no se referencia ningún host externo (Req 1.4, 1.5).
- **Orden del `<head>`.** El `<link>` de iconos se ubica después de `bootstrap.min.css` y antes de `styles/app.css` (Req 1.6), de modo que `app.css` pueda sobrescribir estilos de icono cuando sea necesario.
- **Degradación segura.** Cada acceso al DOM en los controladores ya está guardado; los cambios mantienen esa disciplina. Si la fuente no carga, los botones siguen siendo interactivos, conservan clases/colores y nombre accesible, y exponen una etiqueta de texto para lectores de pantalla (Req 5).
- **Compatibilidad de pruebas.** Se preservan clases y cableado; el glifo se añade como hijo `<i>`, sin tocar `textContent` como fuente del nombre accesible.

## Components and Interfaces

### 1. Vendoring de Bootstrap Icons (Req 1)

**Disposición de archivos** (todo bajo `vendor/bootstrap-icons/`, coherente con el enfoque sin CDN):

```
vendor/
  bootstrap/
    bootstrap.min.css
    bootstrap.bundle.min.js
  bootstrap-icons/
    bootstrap-icons.css          # hoja de estilos oficial, sin modificar
    fonts/
      bootstrap-icons.woff2      # fuente principal (referenciada por el CSS)
      bootstrap-icons.woff       # fuente de respaldo (opcional pero recomendada)
```

- Se obtienen los archivos de una release fijada de Bootstrap Icons (por ejemplo 1.11.x) y se comprometen al repositorio (Req 1.1, 1.2).
- La `url()` del CSS oficial es relativa (`./fonts/bootstrap-icons.woff2`), por lo que colocar `fonts/` junto al CSS hace que resuelva correctamente bajo `file://` sin editar el CSS vendorizado (Req 1.3). No se debe aplanar la estructura ni renombrar la carpeta `fonts/`.
- Regla de verificación: la hoja de estilos vendorizada no debe contener ninguna referencia a `http://`, `https://` ni `//cdn` (Req 1.4).

**Enlace en `index.html`** (dentro de `<head>`), respetando el orden exigido (Req 1.6):

```html
<!-- Bootstrap alojado localmente (sin CDN) -->
<link rel="stylesheet" href="vendor/bootstrap/bootstrap.min.css">
<!-- Iconos de Bootstrap alojados localmente (sin CDN) - Req 1 -->
<link rel="stylesheet" href="vendor/bootstrap-icons/bootstrap-icons.css">
<!-- Estilos propios -->
<link rel="stylesheet" href="styles/app.css">
```

El `href` es relativo (Req 1.4, 1.5). El resto de la interfaz permanece operativa aunque el CSS o la fuente de iconos fallen, porque ni el arranque de la app ni el render de las listas dependen de la disponibilidad de la fuente (Req 1.8).

### 2. Botones de icono en la Lista_De_Productos (Req 2, 4)

Cambio localizado en `renderListaProductos` de `src/productos.controller.js`. Hoy cada botón se construye así:

```js
const btnDetalle = document.createElement("button");
btnDetalle.type = "button";
btnDetalle.className = "btn btn-outline-secondary btn-sm lp-producto-detalle";
btnDetalle.textContent = "Ver detalle";
```

Se reemplaza el `textContent` por un glifo hijo y atributos accesibles, preservando clases y cableado. Se introduce un helper local para evitar repetición y garantizar consistencia:

```js
/**
 * Convierte un botón en un Boton_De_Icono: le añade un glifo <i> de Bootstrap
 * Icons (aria-hidden) y una etiqueta de texto visualmente oculta, y fija el
 * Nombre_Accesible exacto en aria-label y title (Req 2, 4, 5).
 * @param {HTMLButtonElement} boton  Botón ya con sus clases/colores aplicados.
 * @param {string} claseIcono        Clase del glifo, p. ej. "bi-eye".
 * @param {string} accion            Nombre exacto de la acción, p. ej. "Ver detalle".
 */
function convertirEnBotonDeIcono(boton, claseIcono, accion) {
  boton.textContent = "";                       // sin texto directo (evita nombre duplicado)
  boton.setAttribute("aria-label", accion);     // Nombre_Accesible (Req 4.6)
  boton.setAttribute("title", accion);          // idéntico a aria-label (Req 4.6)

  const glifo = document.createElement("i");
  glifo.className = "bi " + claseIcono;          // p. ej. "bi bi-eye" (Req 2.1)
  glifo.setAttribute("aria-hidden", "true");     // el glifo no aporta nombre (Req 4.7)

  const etiqueta = document.createElement("span");
  etiqueta.className = "lp-accion-texto visually-hidden"; // fallback (Req 5.4)
  etiqueta.textContent = accion;

  boton.appendChild(glifo);
  boton.appendChild(etiqueta);
}
```

Aplicación por botón (se conservan `className`, `type` y los `addEventListener` actuales por `data-id`):

- `btnDetalle`: `convertirEnBotonDeIcono(btnDetalle, "bi-eye", "Ver detalle")` — clase `btn btn-outline-secondary btn-sm lp-producto-detalle` (Req 2.1, 2.5, 4.1).
- `btnEditar`: `convertirEnBotonDeIcono(btnEditar, "bi-pencil", "Editar")` — clase `btn btn-outline-primary btn-sm lp-producto-editar` (Req 2.2, 2.5, 4.2).
- `btnEliminar`: `convertirEnBotonDeIcono(btnEliminar, "bi-trash", "Eliminar")` — clase `btn btn-outline-danger btn-sm lp-producto-eliminar` (Req 2.3, 2.5, 4.3).

Se conservan: el contenedor `btn-group` con `role="group"`, exactamente tres botones por producto (Req 2.4), y el cableado que invoca `abrirDetalle`/`abrirEdicion`/`confirmarYEliminar` con el `data-id` del `<li>` (Req 2.7–2.9).

### 3. Botones de icono en la Lista_De_Parametros (Req 3, 4)

Cambio localizado en la función `render` de `src/parametros.controller.js`. Hoy los botones se crean con el helper `crearElemento`, que solo admite `className` y `textContent`:

```js
const btnEditar = crearElemento("button", {
  className: "btn btn-outline-secondary",
  textContent: "Editar",
});
```

`crearElemento` no soporta hijos ni atributos arbitrarios. Para añadir el glifo y las etiquetas accesibles de forma segura (sin `innerHTML`), se compone el botón tras crearlo, reutilizando la misma lógica que en productos. Como los dos controladores son IIFE independientes sobre `window.LP`, se define un helper equivalente local en `parametros.controller.js` (no se comparte estado entre módulos):

```js
// Crear el botón con crearElemento (para conservar className) y luego decorarlo.
const btnEditar = crearElemento("button", { className: "btn btn-outline-secondary" });
btnEditar.type = "button";
convertirEnBotonDeIcono(btnEditar, "bi-pencil", "Editar");   // Req 3.1, 4.4
btnEditar.addEventListener("click", () => iniciarEdicion(parametro.id)); // Req 3.6

const btnEliminar = crearElemento("button", { className: "btn btn-outline-danger" });
btnEliminar.type = "button";
convertirEnBotonDeIcono(btnEliminar, "bi-trash", "Eliminar"); // Req 3.2, 4.5
btnEliminar.addEventListener("click", () => eliminar(parametro.id)); // Req 3.7
```

Se prefiere crear un elemento `<i>` y usar `setAttribute` para `aria-label`/`title` en lugar de `innerHTML`, por seguridad (evita inyección) y claridad.

Se conservan: el contenedor `btn-group btn-group-sm`, el orden (primero Editar, luego Eliminar), la ausencia de un botón "Ver detalle" para parámetros (Req 3.3), los colores `btn-outline-secondary`/`btn-outline-danger` (Req 3.4) y el cableado (Req 3.6, 3.7).

> Nota de implementación: `crearElemento` puede dejarse intacto (se decora el botón después) o extenderse para aceptar un `attrs`/`children` opcional. El diseño recomienda no ampliar `crearElemento` para minimizar el radio de cambio; basta con decorar el botón tras crearlo.

### 4. Nombre accesible (Req 4)

Para cada Boton_De_Icono:

- `aria-label` = `title` = cadena exacta de la acción ("Ver detalle" / "Editar" / "Eliminar"), sin espacios iniciales ni finales (Req 4.1–4.6).
- El glifo `<i>` lleva `aria-hidden="true"` y el botón no tiene texto directo (se vació `textContent`), de modo que el nombre accesible computado sea exactamente el `aria-label` (Req 4.7).
- La etiqueta de texto de fallback vive en un `<span class="lp-accion-texto visually-hidden">`. La clase `visually-hidden` de Bootstrap la mantiene fuera del render visual pero disponible para lectores de pantalla; no altera el nombre accesible computado del botón, que sigue determinado por `aria-label` (Req 4.7). Si `aria-label` estuviera vacío o solo con espacios, se consideraría una no conformidad de accesibilidad (Req 4.8) — evitado por construcción al pasar siempre la cadena de acción no vacía.

### 5. `styles/app.css` — utilidades y fallback (Req 5)

Se añaden estilos propios (después del `<link>` de iconos por el orden del `<head>`):

```css
/* Etiqueta de texto de cada acción: oculta por defecto (los iconos la sustituyen
   visualmente) pero disponible para lectores de pantalla. Fallback visible cuando
   los iconos no están disponibles (Req 5.4). */
.lp-accion-texto {
  margin-left: 0.25rem;
}

/* Si los iconos de Bootstrap no se cargan, el <body> lleva la clase
   `lp-sin-iconos` (fijada por app.js). En ese caso mostramos la etiqueta de texto
   y ocultamos el glifo vacío para no dejar un recuadro sin significado. */
.lp-sin-iconos .lp-accion-texto {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
.lp-sin-iconos .bi {
  display: none;
}
```

La clase `visually-hidden` (de Bootstrap) mantiene la etiqueta accesible sin mostrarla; cuando `lp-sin-iconos` está activa, la etiqueta se revela y el glifo vacío se oculta. Si Bootstrap CSS tampoco cargó, `visually-hidden` no aplica y la etiqueta queda visible de todos modos, lo que degrada de forma aceptable (el texto se ve). El `#aviso-estilos` conserva su comportamiento actual y no es suprimido por esta funcionalidad (Req 5.5).

### 6. Detección de disponibilidad de iconos (Req 5) — opcional y honesta

Para activar el fallback visible (Req 5.4) sin una detección frágil del evento de carga de fuente, `src/app.js` puede fijar `document.body.classList.add("lp-sin-iconos")` cuando no logre confirmar que la hoja de iconos aplicó, reutilizando el mismo enfoque de sonda que ya usa `bootstrapCargado()`:

```js
/** ¿Se aplicó la hoja de estilos de Bootstrap Icons? Sonda con una clase `bi`. */
function iconosCargados() {
  if (typeof document === "undefined" || !document.body ||
      typeof window.getComputedStyle !== "function") return true;
  let sonda = null;
  try {
    sonda = document.createElement("i");
    sonda.className = "bi bi-eye";
    sonda.setAttribute("aria-hidden", "true");
    sonda.style.position = "absolute";
    document.body.appendChild(sonda);
    // bootstrap-icons.css fija font-family: "bootstrap-icons" en .bi::before.
    const antes = window.getComputedStyle(sonda, "::before");
    const familia = antes && antes.fontFamily ? antes.fontFamily : "";
    return /bootstrap-icons/i.test(familia);
  } catch { return true; }
  finally { if (sonda && sonda.remove) { try { sonda.remove(); } catch {} } }
}
```

**Limitación documentada honestamente:** esta sonda detecta si la *hoja de estilos* `bootstrap-icons.css` se aplicó (la regla `font-family`), no si el *archivo de fuente* `.woff2` se decodificó realmente. Bajo `file://`, confirmar la decodificación efectiva de la fuente es poco fiable. Por ello el fallback primario es la etiqueta de texto siempre presente para lectores de pantalla más el `title`; la clase `lp-sin-iconos` es una mejora oportunista para el caso en que falte la hoja de estilos. Esta detección es opcional respecto de los criterios de accesibilidad, que se satisfacen por construcción (aria-label/title y etiqueta oculta siempre presentes). La verificación visual real requiere prueba manual en navegador.

## Data Models

Esta funcionalidad es un cambio exclusivamente de UI y **no introduce ningún modelo de datos persistido nuevo ni cambios de esquema**. No se modifican los modelos de dominio de Producto ni de Parametro, ni el esquema de almacenamiento (localStorage), ni el formato de copia de seguridad (backup). El cableado de eventos sigue apoyándose en los identificadores existentes (`data-id` en productos, `id` en parámetros), que no cambian.

El único "modelo" que introduce esta funcionalidad es una estructura de vista/DOM efímera: el **Boton_De_Icono**, generado en tiempo de render y no persistido.

### Boton_De_Icono (estructura de vista, no persistida)

Un `<button>` que conserva sus clases y cableado existentes y que se compone de un glifo de icono más una etiqueta de texto de fallback:

```html
<button
  type="button"
  class="btn btn-outline-{color} btn-sm {clase-lp}"   <!-- clase-lp solo en productos -->
  aria-label="{accion}"
  title="{accion}">
  <i class="bi bi-{eye|pencil|trash}" aria-hidden="true"></i>
  <span class="lp-accion-texto visually-hidden">{accion}</span>
</button>
```

Campos de la estructura de vista:

- **Clases del botón**: `btn`, `btn-outline-*` (color), `btn-sm`, y en productos la clase de selección `lp-producto-*` (Req 2.5, 3.4). Se preservan sin cambios.
- **`aria-label` y `title`**: ambos fijados a la cadena de acción exacta ("Ver detalle" | "Editar" | "Eliminar"), sin espacios iniciales ni finales (Req 4.1–4.6).
- **Glifo hijo `<i class="bi bi-{eye|pencil|trash}" aria-hidden="true">`**: aporta el icono visual y se excluye del nombre accesible (Req 2.1–2.3, 3.1–3.2, 4.7).
- **Etiqueta hija `<span class="lp-accion-texto visually-hidden">`**: texto de fallback con el nombre de la acción, disponible para lectores de pantalla y visible cuando los iconos no cargan (Req 5.4).

### Mapeo icono → acción → color

| Glifo | Acción | Color (variante Bootstrap) | Contexto |
| --- | --- | --- | --- |
| `bi-eye` | Ver detalle | `btn-outline-secondary` | Productos (Req 2.1, 2.5) |
| `bi-pencil` | Editar | `btn-outline-primary` (productos) / `btn-outline-secondary` (parámetros) | Productos (Req 2.2, 2.5) y Parámetros (Req 3.1, 3.4) |
| `bi-trash` | Eliminar | `btn-outline-danger` | Productos (Req 2.3) y Parámetros (Req 3.2, 3.4) |

No se ven afectados los modelos de dominio de producto/parámetro, el esquema de almacenamiento ni el formato de copia de seguridad.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Estas propiedades se validan sobre la estructura del DOM producida por los controladores en jsdom (no sobre el render visual de la fuente, que queda fuera de jsdom).

### Property 1: Cada botón de acción de productos expone su glifo, clase, color y cableado

*Para toda* lista de Productos renderizada por `renderListaProductos`, cada `<li>` de producto contiene exactamente tres botones cuyas clases son `lp-producto-detalle` (con `btn-outline-secondary` y un hijo `<i class="bi bi-eye">`), `lp-producto-editar` (con `btn-outline-primary` y un hijo `<i class="bi bi-pencil">`) y `lp-producto-eliminar` (con `btn-outline-danger` y un hijo `<i class="bi bi-trash">`), y el `data-id` del `<li>` es el id del producto correspondiente.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9**

### Property 2: Cada botón de acción de parámetros expone su glifo, clase, color, orden y cableado

*Para todo* Parametro renderizado por `render`, su `btn-group btn-group-sm` contiene exactamente dos botones en orden [Editar, Eliminar], donde Editar tiene `btn-outline-secondary` y un hijo `<i class="bi bi-pencil">` y Eliminar tiene `btn-outline-danger` y un hijo `<i class="bi bi-trash">`, y no existe ningún botón de "Ver detalle" para el parámetro.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6, 3.7**

### Property 3: Todo botón de icono tiene un nombre accesible exacto con el glifo oculto

*Para todo* Boton_De_Icono renderizado (en productos o parámetros), su `aria-label` es igual a su `title` y es igual a la cadena de acción exacta correspondiente ("Ver detalle", "Editar" o "Eliminar") sin espacios iniciales ni finales, y su glifo `<i>` tiene `aria-hidden="true"`.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

### Property 4: El nombre accesible nunca es vacío

*Para todo* Boton_De_Icono renderizado, el valor de `aria-label` no es la cadena vacía ni contiene únicamente espacios en blanco.

**Validates: Requirements 4.8, 2.6, 3.5**

### Property 5: Degradación conserva accesibilidad y funcionalidad sin la hoja de iconos

*Para toda* lista renderizada, si se omite o elimina la hoja de estilos de iconos (simulado no cargándola en jsdom), cada botón de acción conserva su clase CSS de color (`btn-outline-*`), su clase de selección (`lp-*` en productos), su `aria-label`/`title` no vacío y una etiqueta de texto con el nombre de la acción presente en el DOM, y el clic sobre el botón no lanza y sigue enrutando por `data-id`/`id`.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 1.8**

## Error Handling

- **DOM ausente / parcial.** Los controladores ya guardan cada acceso al DOM contra `null` (`renderListaProductos` retorna si falta `#lista-productos`; `render` retorna si falta `#lista-parametros`). Los cambios mantienen esa disciplina: la creación del `<i>` y del `<span>` solo ocurre tras crear el botón, dentro del flujo de render existente.
- **Sin `innerHTML`.** El glifo y la etiqueta se crean con `document.createElement` y `setAttribute`/`textContent`, evitando inyección y errores de parseo de HTML.
- **Fuente/hoja de iconos no disponible.** No es un error de ejecución: el render no depende de la fuente. Si `iconosCargados()` no puede confirmar la aplicación de la hoja (o falla), asume "cargado" para no mostrar un fallback incorrecto; el nombre accesible y la etiqueta de texto están siempre presentes por construcción, así que la funcionalidad y la accesibilidad no se degradan (Req 1.8, 5.1–5.4).
- **`#aviso-estilos`.** Se mantiene el comportamiento existente de `app.js`; esta funcionalidad no lo suprime (Req 5.5).

## Testing Strategy

No aplica el testing basado en propiedades (PBT) como marco formal aquí: los cambios son de renderizado de UI (composición de nodos DOM y atributos) sin funciones puras con un espacio de entradas amplio. Se sigue el enfoque de pruebas ya establecido en el proyecto (Vitest + jsdom, cargando los IIFE con `tests/helpers/cargarLP.js`), con aserciones sobre la estructura del DOM. Las "Correctness Properties" anteriores se expresan como aserciones estructurales verificables, iterando sobre conjuntos representativos de productos/parámetros, en lugar de generadores aleatorios.

### Pruebas de regresión (deben seguir en verde)

- `tests/lista.productos.test.js` y `tests/eliminacion.test.js` seleccionan por clase y conteo y no afirman `textContent`; con iconos + `aria-label` deben permanecer verdes. Se ejecutan como verificación de no regresión.

### Pruebas nuevas de estructura DOM (unitarias, jsdom)

Productos (`src/productos.controller.js`):

- Cada botón contiene un hijo `<i>` con las clases `bi` y la clase específica (`bi-eye`/`bi-pencil`/`bi-trash`) — Property 1 (Req 2.1–2.3).
- Se conservan clases de color y de selección y hay exactamente tres botones por producto — Property 1 (Req 2.4, 2.5).
- `aria-label === title ===` cadena exacta, sin espacios; glifo con `aria-hidden="true"` — Property 3, 4 (Req 4.1–4.3, 4.6, 4.7).
- El clic sigue enrutando por `data-id` y no lanza (reafirma el cableado ya cubierto) — Property 1 (Req 2.7–2.9).

Parámetros (`src/parametros.controller.js`):

- Dos botones en orden [Editar, Eliminar], con glifos `bi-pencil`/`bi-trash`, colores `btn-outline-secondary`/`btn-outline-danger`, y sin botón de "Ver detalle" — Property 2 (Req 3.1–3.4).
- `aria-label === title ===` "Editar"/"Eliminar", sin espacios; glifo `aria-hidden="true"` — Property 3, 4 (Req 4.4, 4.5, 4.7).
- El clic invoca `iniciarEdicion`/`eliminar` con el `id` correcto (verificable con espías/stubs sobre el estado, como en las suites existentes) — Property 2 (Req 3.6, 3.7).

Degradación (simulada en jsdom, sin cargar la hoja de iconos):

- Tras renderizar, cada botón conserva sus clases de color/selección, su `aria-label`/`title` no vacío y un `<span class="lp-accion-texto">` con el texto de la acción; el clic no lanza — Property 5 (Req 5.1–5.4).

### Verificación fuera de jsdom (manual / navegador)

- **Render visual del glifo bajo `file://`** (Req 1.7): abrir `index.html` con `file://` y comprobar que se muestran los iconos ojo/lápiz/papelera en lugar de recuadros vacíos.
- **Sin red externa** (Req 1.5): inspeccionar que no hay solicitudes a hosts externos (DevTools → Network) al abrir con `file://`.
- **Orden del `<head>`** (Req 1.6): verificar en el HTML servido que el `<link>` de iconos precede a `styles/app.css`.
- **Fallback real de fuente** (Req 5.4): simular la ausencia de la fuente (renombrar temporalmente `fonts/`) y comprobar que las etiquetas de texto quedan visibles y los botones siguen operativos. Esta verificación no es reproducible en jsdom porque no renderiza fuentes; se documenta como manual.
