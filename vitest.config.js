// vitest.config.js — Configuración del runner de pruebas para el proyecto Next.js.
//
// Ejecuta las suites una sola vez (`vitest run`, sin modo watch) y usa el entorno
// `jsdom` para las pruebas de componentes React y módulos de dominio.
// El plugin de React habilita el soporte de JSX en los tests de componentes.

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Permitir sintaxis JSX dentro de archivos .js (los tests de componentes y
  // los componentes del proyecto usan .js con JSX).
  esbuild: {
    loader: "jsx",
    include: [/\.[jt]sx?$/],
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
  test: {
    // Entorno de navegador simulado para probar componentes React y módulos de dominio.
    environment: "jsdom",
    // Descubrir pruebas en la carpeta tests/.
    include: ["tests/**/*.test.js"],
    // Archivo de configuración de matchers de @testing-library/jest-dom.
    setupFiles: ["tests/setup.js"],
    // Sin globals: cada suite importa explícitamente desde "vitest".
    globals: false,
  },
});
