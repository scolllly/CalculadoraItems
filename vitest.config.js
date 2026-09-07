// vitest.config.js — Configuración del runner de pruebas.
//
// Ejecuta las suites una sola vez (`vitest run`, sin modo watch) y usa el entorno
// `jsdom` para las pruebas de controladores DOM, ya que los Scripts_Clasicos de
// `src/` acceden a `window`/`document` y publican su API en `window.LP`.
//
// La Aplicacion NO cambia su forma de carga: `index.html` sigue usando `<script>`
// clásico bajo file://. jsdom sólo existe para las pruebas.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Entorno de navegador simulado para poblar window.LP y probar controladores.
    environment: "jsdom",
    // Descubrir pruebas co-locadas en src/ y en una carpeta tests/ si se usa.
    include: ["src/**/*.test.js", "tests/**/*.test.js"],
    // Sin globals: cada suite importa explícitamente desde "vitest".
    globals: false,
  },
});
