# Design Document

## Overview

Esta funcionalidad reemplaza el texto "Eliminar" del Boton_Eliminar_Linea de cada Fila_De_Linea por un Icono_Papelera de Bootstrap Icons (`bi-trash`), conservando el color actual (`btn-outline-danger`). El editor de líneas lo genera la función `construirFilaLinea` en `src/lineas.editor.js`, que se reutiliza sin ramificación por contexto tanto en el Formulario_Crear_Producto (Calculadora) como en la Ventana_Edicion (`#modal-edicion`); por tanto, el cambio aplica automáticamente e idénticamente a ambos contextos (Req 2.6). En el editor de líneas solo existe un botón de acción por línea, el Boton_Eliminar_Linea; no hay botón "Editar" por línea.

El diseño reutiliza el Sistema_De_Iconos local ya incorporado por la funcionalidad `action-buttons-as-icons` (recursos de Bootstrap Icons bajo `vendor/bootstrap-icons/` enlazados en `index.html`, sin CDN). Esta funcionalidad **no** re-vendoriza recursos ni introduce ningún host externo; solo consume el `<link>` de iconos ya presente. El botón expone un Nombre_Accesible para tecnologías de asistencia y degrada de forma segura si la fuente de iconos no está disponible: mantiene su cableado, sus clases, su color y una Etiqueta_De_Texto_Fallback con el nombre de la acción.

El cambio está restringido por dos invariantes que preservan la compatibilidad:

1. Las pruebas existentes (`tests/lineas.editor.test.js`, `tests/ventana.edicion.test.js`, `tests/persistencia.integracion.test.js`) seleccionan el botón por la clase `lp-linea-eliminar` y por conteo, y accionan el clic; **no** afirman sobre `textContent`. Por tanto, deben conservarse la clase `lp-linea-eliminar` y el cableado por `fila.dataset.indice`.
2. El cargador de pruebas (`tests/helpers/cargarLP.js`) evalúa los IIFE de `src/*.js` en jsdom; no carga `index.html` ni CSS, y jsdom no renderiza fuentes. Las aserciones deben basarse en la estructura del DOM (presencia de `<i class="bi bi-trash">`, atributos `aria-hidden`/`aria-label`/`title`, clases del botón), no en el render visual del glifo.

Requisitos cubiertos: 1, 2, 3 y 4.

### Investigación

- **Nombre exacto de la acción.** El código actual ya fija `aria-label = "Eliminar línea"`, y `requirements.md` define la Etiqueta_De_Texto_Fallback con el contenido "Eliminar línea" (Req 1.4). Se **conserva** "Eliminar línea" como cadena única de la acción, usada de forma consistente en `aria-label`, `title` y el texto de la etiqueta de fallback. Alinear a un genérico "Eliminar" sería un cambio innecesario que además perdería la desambiguación por línea; se descarta.
- **Reutilización del Sistema_De_Iconos.** La disposición local (`vendor/bootstrap-icons/bootstrap-icons.css` + `fonts/`) y el `<link>` en `index.html` ya fueron incorporados por `action-buttons-as-icons`. Esta funcionalidad depende de ese trabajo previo y no lo modifica. La clase de glifo empleada, `bi-trash`, es la misma que usa el botón "Eliminar" de productos y parámetros, de modo que el mapeo icono→acción es coherente en toda la aplicación.
- **Degradación bajo `file://`.** Detectar de forma fiable la ausencia específica del archivo de fuente bajo `file://` es no trivial. El diseño adopta el mismo enfoque pragmático que la funcionalidad hermana: una Etiqueta_De_Texto_Fallback siempre presente en el DOM para lectores de pantalla, más el `title`, y una regla CSS (`lp-sin-iconos`) que revela la etiqueta si la hoja de iconos no aplicó. La verificación visual real (fuente ausente) queda como prueba manual en navegador.

## Architecture

La funcionalidad toca un único artefacto de código (`src/lineas.editor.js`, función `construirFilaLinea`) y no introduce módulos nuevos ni cambia el grafo de dependencias de carga ni la API publicada en `window.LP.lineasEditor`. Reutiliza recursos y utilidades CSS ya existentes.

```mermaid
flowchart TD
  A["index.html (head)"] -->|link ya presente| B["vendor/bootstrap-icons/bootstrap-icons.css"]
  B -->|url('./fonts/*.woff2')| C["vendor/bootstrap-icons/fonts/*"]
  A --> D["styles/app.css (fallback .lp-accion-texto / .lp-sin-iconos)"]
  E["src/lineas.editor.js<br/>construirFilaLinea"] -->|crea Boton_Eliminar_Linea| F["btn ... lp-linea-eliminar"]
  F -->|append| G["i.bi.bi-trash aria-hidden"]
  F -->|append| H["span.visually-hidden 'Eliminar línea'"]
  F -. clases + aria-label/title .-> D
  I["Formulario_Crear_Producto (Calculadora)"] -->|reutiliza| E
  J["Ventana_Edicion (#modal-edicion)"] -->|reutiliza| E
```

Principios:

- **Sin CDN, sin re-vendoring.** Se consume el `<link>` de iconos ya presente; no se referencia ningún host externo ni se agregan recursos.
- **Un solo punto de cambio.** Solo se modifica el bloque "Columna: botón eliminar" de `construirFilaLinea`. Al ser el editor un componente compartido, el cambio es idéntico en la Calculadora y en la Ventana_Edicion (Req 2.6).
- **Degradación segura.** El acceso al DOM del render ya está guardado (`if (!contenedor) return;`). Si la fuente no carga, el botón sigue siendo interactivo, conserva clases/color y nombre accesible, y expone la Etiqueta_De_Texto_Fallback (Req 4).
- **Compatibilidad de pruebas.** Se preservan la clase `lp-linea-eliminar` y el cableado por `dataset.indice`; el glifo se añade como hijo `<i>`, sin usar `textContent` como fuente del nombre accesible.

## Components and Interfaces

### 1. Boton_Eliminar_Linea con icono en `construirFilaLinea` (Req 1, 2, 3)

Cambio localizado en el bloque "Columna: botón eliminar" de `construirFilaLinea` (`src/lineas.editor.js`). Hoy el botón se construye así:

```js
const btnEliminar = document.createElement("button");
btnEliminar.type = "button";
btnEliminar.className = "btn btn-outline-danger btn-sm lp-linea-eliminar";
btnEliminar.textContent = "Eliminar";
btnEliminar.setAttribute("aria-label", "Eliminar línea");
btnEliminar.addEventListener("click", () => {
  const idx = Number(fila.dataset.indice);
  eliminarLinea(idx);
});
```

Se reemplaza el `textContent` por un glifo hijo y una etiqueta de fallback, y se fija el `title` idéntico al `aria-label`, preservando `type`, `className` y el cableado por `dataset.indice`. Para evitar `innerHTML` y garantizar consistencia, se introduce un helper local dentro del IIFE:

```js
// Constante del nombre de la acción (una sola fuente de verdad).
const ACCION_ELIMINAR_LINEA = "Eliminar línea";

/**
 * Convierte el botón de eliminar en un Boton_Eliminar_Linea con icono:
 * vacía su texto directo, añade el Icono_Papelera (aria-hidden) y una
 * Etiqueta_De_Texto_Fallback visualmente oculta, y fija el Nombre_Accesible
 * exacto en aria-label y title (Req 1.1–1.4, 3.1–3.4).
 * @param {HTMLButtonElement} boton  Botón ya con sus clases/colores aplicados.
 */
function convertirEnBotonEliminarIcono(boton) {
  boton.textContent = "";                                 // sin texto directo (Req 1.3)
  boton.setAttribute("aria-label", ACCION_ELIMINAR_LINEA); // Nombre_Accesible (Req 3.1)
  boton.setAttribute("title", ACCION_ELIMINAR_LINEA);      // idéntico a aria-label (Req 3.2)

  const glifo = document.createElement("i");
  glifo.className = "bi bi-trash";                          // Icono_Papelera (Req 1.1)
  glifo.setAttribute("aria-hidden", "true");               // excluido del nombre (Req 1.2, 3.3)

  const etiqueta = document.createElement("span");
  etiqueta.className = "visually-hidden lp-accion-texto";  // fallback (Req 1.4, 4.5)
  etiqueta.textContent = ACCION_ELIMINAR_LINEA;

  boton.appendChild(glifo);
  boton.appendChild(etiqueta);
}
```

Aplicación en el bloque del botón (se conservan `type`, `className` y el `addEventListener` por `dataset.indice`):

```js
const btnEliminar = document.createElement("button");
btnEliminar.type = "button";
btnEliminar.className = "btn btn-outline-danger btn-sm lp-linea-eliminar"; // Req 1.5, 2.1, 2.2
convertirEnBotonEliminarIcono(btnEliminar);                                 // Req 1.1–1.4, 3.1–3.3
btnEliminar.addEventListener("click", () => {
  const idx = Number(fila.dataset.indice);                                  // Req 1.6, 2.4
  eliminarLinea(idx);
});
colBtn.appendChild(btnEliminar);
```

Se conservan: la columna `col-12 col-md-1`, exactamente un Boton_Eliminar_Linea por Fila_De_Linea (Req 2.3), y el cableado que invoca `eliminarLinea(Number(fila.dataset.indice))`.

### 2. Guarda de índice existente (Req 2.4, 2.5)

No requiere cambios. `eliminarLinea` ya acota el índice:

```js
function eliminarLinea(indice) {
  if (indice >= 0 && indice < lineas.length) {
    lineas.splice(indice, 1);
    render();
  }
}
```

Esto garantiza que un clic sobre un botón con `dataset.indice` fuera de `[0, n-1]` no elimina ninguna línea y deja la colección sin cambios (Req 2.5), y que un clic válido elimina exactamente una línea (Req 2.4). El diseño se apoya en esta guarda ya existente.

### 3. Idéntico en ambos contextos (Req 2.6)

`construirFilaLinea` es interno a `crearEditorDeLineas` y no recibe ningún parámetro de contexto que altere el botón de eliminar. Tanto el Formulario_Crear_Producto como la Ventana_Edicion crean su editor con `crearEditorDeLineas(...)` y usan el mismo `render`/`construirFilaLinea`. Por construcción, el Boton_Eliminar_Linea (glifo, clases, atributos y cableado) es idéntico en ambos contextos. No hay ramas por consumidor.

### 4. Nombre accesible (Req 3)

Para el Boton_Eliminar_Linea:

- `aria-label` = `title` = `"Eliminar línea"` (cadena de acción exacta, no vacía, sin espacios iniciales/finales, ≤ 100 caracteres) (Req 3.1, 3.2).
- El glifo `<i class="bi bi-trash">` lleva `aria-hidden="true"` y el botón no tiene texto directo (se vació `textContent`), de modo que el nombre accesible computado sea exactamente el `aria-label` (Req 3.3, 3.4).
- La Etiqueta_De_Texto_Fallback vive en un `<span class="visually-hidden lp-accion-texto">`; `visually-hidden` de Bootstrap la mantiene fuera del render visual pero disponible para lectores de pantalla, sin alterar el nombre accesible computado (que sigue determinado por `aria-label`). Al pasar siempre la cadena no vacía, la condición de no conformidad (Req 3.5) no ocurre por construcción.

### 5. `styles/app.css` — fallback (Req 4.5)

El fallback visual reutiliza el mismo mecanismo que la funcionalidad `action-buttons-as-icons`. Si esas reglas ya existen en `styles/app.css`, esta funcionalidad no las duplica; la clase `lp-accion-texto` del span de la línea queda cubierta por ellas. Si no existieran, se añadirían (después del `<link>` de iconos):

```css
/* Etiqueta de texto de la acción: oculta por defecto (el icono la sustituye)
   pero disponible para lectores de pantalla. */
.lp-accion-texto { margin-left: 0.25rem; }

/* Si los iconos no cargan, body lleva `lp-sin-iconos` (fijada por app.js):
   se revela la etiqueta y se oculta el glifo vacío. */
.lp-sin-iconos .lp-accion-texto {
  position: static; width: auto; height: auto;
  margin: 0; overflow: visible; clip: auto; white-space: normal;
}
.lp-sin-iconos .bi { display: none; }
```

Cuando `lp-sin-iconos` está activa, la Etiqueta_De_Texto_Fallback se muestra visualmente (Req 4.5) y el glifo vacío se oculta. Si Bootstrap CSS tampoco cargó, `visually-hidden` no aplica y la etiqueta queda visible de todos modos, degradando de forma aceptable.

## Data Models

Esta funcionalidad es un cambio exclusivamente de UI y **no introduce ningún modelo de datos persistido nuevo ni cambios de esquema**. No se modifican el modelo de Linea_De_Calculo (`{ parametroId, cantidad, subtotal, fuenteDeComponente, productoComponenteId }`), el modelo de Producto, el esquema de almacenamiento (localStorage) ni el formato de copia de seguridad. El cableado de eventos sigue apoyándose en `fila.dataset.indice`, que no cambia.

El único "modelo" que introduce esta funcionalidad es una estructura de vista/DOM efímera: el **Boton_Eliminar_Linea** con icono, generado en tiempo de render y no persistido.

### Boton_Eliminar_Linea (estructura de vista, no persistida)

```html
<button
  type="button"
  class="btn btn-outline-danger btn-sm lp-linea-eliminar"
  aria-label="Eliminar línea"
  title="Eliminar línea">
  <i class="bi bi-trash" aria-hidden="true"></i>
  <span class="visually-hidden lp-accion-texto">Eliminar línea</span>
</button>
```

Campos de la estructura de vista:

- **Clases del botón**: `btn`, `btn-outline-danger`, `btn-sm`, `lp-linea-eliminar`. Se preservan sin cambios (Req 1.5, 2.1, 2.2).
- **`aria-label` y `title`**: ambos fijados a `"Eliminar línea"`, sin espacios iniciales/finales (Req 3.1, 3.2).
- **Glifo hijo `<i class="bi bi-trash" aria-hidden="true">`**: aporta el Icono_Papelera y se excluye del nombre accesible (Req 1.1, 1.2, 3.3).
- **Etiqueta hija `<span class="visually-hidden lp-accion-texto">Eliminar línea</span>`**: Etiqueta_De_Texto_Fallback disponible para lectores de pantalla y visible cuando los iconos no cargan (Req 1.4, 4.5).

### Mapeo icono → acción → color

| Glifo | Acción | Color (variante Bootstrap) | Contexto |
| --- | --- | --- | --- |
| `bi-trash` | Eliminar línea | `btn-outline-danger` | Fila_De_Linea del Editor_De_Lineas (Req 1.1, 2.1) — Calculadora y Ventana_Edicion (Req 2.6) |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Estas propiedades se validan sobre la estructura del DOM producida por `construirFilaLinea`/`render` en jsdom (no sobre el render visual de la fuente, que queda fuera de jsdom). Se expresan como aserciones estructurales cuantificadas sobre colecciones de líneas representativas, siguiendo el patrón de pruebas ya establecido en el proyecto.

### Property 1: Cada botón de eliminar expone su Icono_Papelera oculto, sus clases y su color

*Para toda* colección de líneas renderizada por el Editor_De_Lineas, cada Fila_De_Linea contiene exactamente un Boton_Eliminar_Linea cuyas clases incluyen `btn`, `btn-outline-danger`, `btn-sm` y `lp-linea-eliminar`, y que contiene exactamente un hijo `<i>` con las clases `bi` y `bi-trash` y con `aria-hidden="true"`.

**Validates: Requirements 1.1, 1.2, 1.5, 2.1, 2.2, 2.3, 3.3**

### Property 2: Cada botón de eliminar tiene un Nombre_Accesible exacto sin texto directo

*Para toda* Fila_De_Linea renderizada, su Boton_Eliminar_Linea tiene `aria-label` igual a `title` e igual a `"Eliminar línea"` (sin espacios iniciales ni finales, con longitud entre 1 y 100 caracteres), no expone "Eliminar" como texto directo del botón fuera de la etiqueta de fallback, y contiene una Etiqueta_De_Texto_Fallback `<span class="visually-hidden">` cuyo texto es `"Eliminar línea"`.

**Validates: Requirements 1.3, 1.4, 3.1, 3.2, 3.4, 3.5**

### Property 3: El clic elimina exactamente la línea del índice y respeta la guarda de rango

*Para toda* colección de líneas y *para todo* índice objetivo, al disparar un clic sobre el Boton_Eliminar_Linea de la fila con ese `dataset.indice`: si el índice está en `[0, n-1]`, la colección resultante tiene exactamente una línea menos y se elimina precisamente la línea de ese índice; si el índice está fuera de rango, la colección permanece sin cambios. En ningún caso el clic lanza una excepción.

**Validates: Requirements 1.6, 2.4, 2.5**

### Property 4: Degradación conserva accesibilidad, clases y cableado sin el Sistema_De_Iconos

*Para toda* colección de líneas renderizada sin la hoja de estilos de iconos (estado nativo de jsdom, que no carga CSS ni fuentes), cada Boton_Eliminar_Linea conserva su clase `lp-linea-eliminar` y su color `btn-outline-danger`, su `aria-label`/`title` no vacío, y una Etiqueta_De_Texto_Fallback con el texto de la acción presente en el DOM; además, es un elemento `<button>` nativo (activable por ratón y teclado) y el clic sigue enrutando por `dataset.indice` hacia `eliminarLinea` sin lanzar.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 5: El botón de eliminar es idéntico en ambos contextos de uso

*Para toda* instancia del Editor_De_Lineas, con independencia de si se usa en el Formulario_Crear_Producto o en la Ventana_Edicion, el Boton_Eliminar_Linea renderizado por `construirFilaLinea` tiene la misma estructura (mismas clases, mismo glifo `bi-trash` con `aria-hidden`, mismos `aria-label`/`title` y misma Etiqueta_De_Texto_Fallback), porque `construirFilaLinea` no depende del contexto consumidor.

**Validates: Requirements 2.6**

## Error Handling

- **DOM ausente / parcial.** `render` ya retorna si falta el contenedor (`if (!contenedor) return;`). La creación del `<i>` y del `<span>` ocurre dentro del flujo de render existente, tras crear el botón; no se añaden accesos al DOM no guardados.
- **Sin `innerHTML`.** El glifo y la etiqueta se crean con `document.createElement` y `setAttribute`/`textContent`, evitando inyección y errores de parseo de HTML.
- **Índice fuera de rango.** La guarda existente en `eliminarLinea` (`indice >= 0 && indice < lineas.length`) evita mutaciones incorrectas; un `dataset.indice` inválido o `NaN` (por `Number(...)`) no elimina ninguna línea (Req 2.5).
- **Fuente/hoja de iconos no disponible.** No es un error de ejecución: el render no depende de la fuente. El Nombre_Accesible y la Etiqueta_De_Texto_Fallback están siempre presentes por construcción, así que la funcionalidad y la accesibilidad no se degradan (Req 4.1–4.5).

## Testing Strategy

No aplica el testing basado en propiedades (PBT) como marco formal aquí: el cambio es de renderizado de UI (composición de nodos DOM y atributos) sin funciones puras con un espacio de entradas amplio. Se sigue el enfoque de pruebas ya establecido en el proyecto (Vitest + jsdom, cargando los IIFE con `tests/helpers/cargarLP.js`), con aserciones sobre la estructura del DOM. Las "Correctness Properties" anteriores se expresan como aserciones estructurales verificables, iterando sobre colecciones representativas de líneas (incluyendo colecciones generadas con `fast-check`, ya presente en `tests/lineas.editor.test.js`), en lugar de depender del render visual de la fuente.

### Pruebas de regresión (deben seguir en verde)

- `tests/lineas.editor.test.js`, `tests/ventana.edicion.test.js` y `tests/persistencia.integracion.test.js` seleccionan el botón por `.lp-linea-eliminar` y accionan el clic; no afirman `textContent`. Con el icono + `aria-label` deben permanecer verdes. Se ejecutan como verificación de no regresión (especialmente los flujos que eliminan líneas en la Ventana_Edicion).

### Pruebas nuevas de estructura DOM (unitarias/generadas, jsdom)

Sobre `src/lineas.editor.js` (`crearEditorDeLineas` → `render`/`construirFilaLinea`):

- **Glifo, clases y conteo** — Property 1 (Req 1.1, 1.2, 1.5, 2.1–2.3, 3.3): tras renderizar una colección de líneas (generada), cada `.lp-linea` tiene exactamente un `.lp-linea-eliminar`; el botón contiene exactamente un `<i class="bi bi-trash">` con `aria-hidden="true"`; `classList` incluye `btn`, `btn-outline-danger`, `btn-sm`, `lp-linea-eliminar`.
- **Nombre accesible y fallback** — Property 2 (Req 1.3, 1.4, 3.1, 3.2, 3.4, 3.5): `aria-label === title === "Eliminar línea"`; longitud del `aria-label` en `[1, 100]` y sin espacios en los extremos; el botón no tiene un nodo de texto directo "Eliminar" (solo hijos `<i>` y `<span>`); existe `span.visually-hidden` con `textContent === "Eliminar línea"`.
- **Eliminación por índice y guarda de rango** — Property 3 (Req 1.6, 2.4, 2.5): renderizar N líneas, disparar clic sobre el botón de una fila elegida y comprobar que `getLineas()` decrece en uno y elimina la línea correcta; para índices fuera de rango, comprobar que la colección no cambia; el clic no lanza. (La guarda ya está cubierta parcialmente por las suites existentes; se refuerza aquí.)
- **Degradación** — Property 4 (Req 4.1, 4.3, 4.4, 4.5): en jsdom (sin hoja de iconos ni fuente), tras renderizar, cada botón conserva `lp-linea-eliminar` y `btn-outline-danger`, `aria-label`/`title` no vacío y `span.lp-accion-texto` con el texto; el elemento es un `<button>`; el clic elimina la línea correcta sin lanzar.
- **Identidad entre contextos** — Property 5 (Req 2.6): como `construirFilaLinea` no recibe contexto, basta un ejemplo que renderice el editor (equivalente al uso de ambos consumidores) y afirme la estructura del botón; complementado por las suites de la Ventana_Edicion que ya ejercitan el modal.

### Verificación fuera de jsdom (manual / navegador)

- **Render visual del glifo bajo `file://`** (Req 1.1): abrir `index.html`, agregar líneas y comprobar que el botón muestra el icono de papelera en lugar de un recuadro vacío, en la Calculadora y en la Ventana_Edicion (Req 2.6).
- **Activación por teclado** (Req 4.2): con foco en el botón, activar con Enter y Barra espaciadora y comprobar que se elimina la línea (semántica nativa de `<button>`; jsdom no sintetiza click desde keydown).
- **Fallback real de fuente** (Req 4.5): simular la ausencia de la fuente (renombrar temporalmente `vendor/bootstrap-icons/fonts/`) y comprobar que la Etiqueta_De_Texto_Fallback queda visible y el botón sigue operativo. No reproducible en jsdom (no renderiza fuentes); se documenta como manual.
- **Sin red externa** (Req: enfoque sin CDN): inspeccionar (DevTools → Network) que no hay solicitudes a hosts externos al abrir con `file://`.
