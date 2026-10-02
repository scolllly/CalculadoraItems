"use client";

// components/NavBar.js — Barra de navegación con tres secciones.
//
// Marca el ítem activo según la ruta actual y carga el bundle JS de Bootstrap
// para habilitar el colapso en mobile.
//
// Requisitos: 9.1, 9.2, 9.4

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/productos", etiqueta: "Productos" },
  { href: "/parametros", etiqueta: "Parámetros" },
  { href: "/base-datos", etiqueta: "Base de datos" },
];

export function NavBar() {
  const pathname = usePathname();

  // Cargar el bundle JS de Bootstrap para soportar collapse/dropdown en mobile.
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js").catch(() => {});
  }, []);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <Link className="navbar-brand" href="/productos">
          Limpiapipas
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#lp-navbar"
          aria-controls="lp-navbar"
          aria-expanded="false"
          aria-label="Alternar navegación"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="lp-navbar">
          <ul className="navbar-nav">
            {ITEMS.map((item) => {
              const activo =
                pathname === item.href ||
                (pathname && pathname.startsWith(item.href + "/"));
              return (
                <li className="nav-item" key={item.href}>
                  <Link
                    className={"nav-link" + (activo ? " active" : "")}
                    aria-current={activo ? "page" : undefined}
                    href={item.href}
                  >
                    {item.etiqueta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
