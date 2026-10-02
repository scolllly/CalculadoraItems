// app/layout.js — Layout raíz (Server Component).
//
// Importa los estilos globales (Bootstrap, bootstrap-icons y los propios) y
// envuelve la aplicación en el AppProvider con la barra de navegación.
//
// Requisitos: 1.6, 1.7, 4.1

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/app.css";

import AppProvider from "../components/AppProvider.js";
import NavBar from "../components/NavBar.js";
import NotifierProvider from "../components/NotifierContext.js";
import Notifier from "../components/Notifier.js";

export const metadata = {
  title: "Limpiapipas — Calculadora de precios",
  description:
    "Calculadora de precios Limpiapipas con persistencia en Supabase.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <NotifierProvider>
          <AppProvider>
            <Notifier />
            <NavBar />
            {children}
          </AppProvider>
        </NotifierProvider>
      </body>
    </html>
  );
}
