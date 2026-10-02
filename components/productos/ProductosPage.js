"use client";

// components/productos/ProductosPage.js — Página completa de Productos.
//
// Requisitos: 6.1, 6.2, 7.5, 7.6, 7.7

import { useContext, useState } from "react";
import { AppContext } from "../AppProvider.js";
import { useNotifier } from "../NotifierContext.js";
import Calculadora from "./Calculadora.js";
import ListaProductos from "./ListaProductos.js";
import VentanaDetalle from "./VentanaDetalle.js";
import VentanaEdicion from "./VentanaEdicion.js";
import { calcularContenedor, editarProducto, eliminarProducto } from "../../lib/productos.ops.js";
import { crearProducto } from "../../lib/models.js";

const CONFIRMAR_ELIMINAR =
  "¿Seguro que deseas eliminar este producto? Esta acción no se puede deshacer.";

export function ProductosPage() {
  const ctx = useContext(AppContext);
  const notifier = useNotifier();

  const [direccionOrden, setDireccionOrden] = useState("asc");
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalEdicion, setModalEdicion] = useState(null);

  if (!ctx) return null;
  const { parametros, productos, saveAll } = ctx;

  const notificar = (type, message) => {
    if (notifier) notifier.dispatch({ type, message });
  };

  const handleGuardarProducto = async (nombre, lineas) => {
    const { subtotales, total } = calcularContenedor(lineas, parametros, productos);
    const lineasConSubtotal = lineas.map((l, i) => ({
      ...l,
      subtotal: subtotales[i],
    }));
    const nuevo = crearProducto(nombre, lineasConSubtotal, total);
    const ok = await saveAll({ parametros, productos: [...productos, nuevo] });
    notificar(
      ok ? "info" : "error",
      ok ? "Producto guardado correctamente." : "No se pudo guardar el producto."
    );
  };

  const handleGuardarEdicion = async (productoId, lineas) => {
    const actualizados = editarProducto(productos, productoId, lineas, parametros);
    const ok = await saveAll({ parametros, productos: actualizados });
    notificar(
      ok ? "info" : "error",
      ok ? "Producto actualizado correctamente." : "No se pudo actualizar el producto."
    );
    if (ok) setModalEdicion(null);
  };

  const handleEliminar = async (productoId) => {
    if (typeof window !== "undefined" && !window.confirm(CONFIRMAR_ELIMINAR)) {
      return;
    }
    const actualizados = eliminarProducto(productos, productoId);
    const ok = await saveAll({ parametros, productos: actualizados });
    notificar(
      ok ? "info" : "error",
      ok ? "Producto eliminado correctamente." : "No se pudo eliminar el producto."
    );
  };

  return (
    <main className="container py-3 lp-pagina-productos">
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <Calculadora
            parametros={parametros}
            productos={productos}
            onGuardar={handleGuardarProducto}
          />
        </div>
        <div className="col-12 col-lg-6">
          <ListaProductos
            productos={productos}
            parametros={parametros}
            direccionOrden={direccionOrden}
            onToggleOrden={() =>
              setDireccionOrden((d) => (d === "asc" ? "desc" : "asc"))
            }
            onVerDetalle={setModalDetalle}
            onEditar={setModalEdicion}
            onEliminar={handleEliminar}
          />
        </div>
      </div>

      <VentanaDetalle
        producto={modalDetalle}
        parametros={parametros}
        productos={productos}
        onClose={() => setModalDetalle(null)}
      />

      <VentanaEdicion
        producto={modalEdicion}
        parametros={parametros}
        productos={productos}
        onGuardar={handleGuardarEdicion}
        onClose={() => setModalEdicion(null)}
      />
    </main>
  );
}

export default ProductosPage;
