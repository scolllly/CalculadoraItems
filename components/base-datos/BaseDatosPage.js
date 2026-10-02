"use client";

// components/base-datos/BaseDatosPage.js — Exportar/importar respaldos.
//
// Requisitos: 8.1–8.8

import { useContext, useRef, useState } from "react";
import { AppContext } from "../AppProvider.js";
import { useNotifier } from "../NotifierContext.js";
import { serializarRespaldo, parsearRespaldo } from "../../lib/backup.js";
import { importBackup, getData } from "../../lib/db.js";
import { normalizarProducto } from "../../lib/models.js";

const NOMBRE_ARCHIVO = "limpiapipas-respaldo.json";

export function BaseDatosPage() {
  const ctx = useContext(AppContext);
  const notifier = useNotifier();
  const inputRef = useRef(null);
  const [pendiente, setPendiente] = useState(null);

  if (!ctx) return null;
  const { parametros, productos, setParametros, setProductos, supabase } = ctx;

  const notificar = (type, message) => {
    if (notifier) notifier.dispatch({ type, message });
  };

  const reiniciarInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleExportar = () => {
    const texto = serializarRespaldo(parametros, productos);
    const blob = new Blob([texto], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = NOMBRE_ARCHIVO;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleArchivo = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const lector = new FileReader();
    lector.onload = () => {
      const resultado = parsearRespaldo(String(lector.result));
      if (resultado.status !== "ok") {
        notificar("error", resultado.reason);
        reiniciarInput();
        return;
      }
      // Mantener en pendiente hasta confirmación.
      setPendiente({
        parametros: resultado.parametros,
        productos: resultado.productos.map(normalizarProducto),
      });
    };
    lector.onerror = () => {
      notificar("error", "No se pudo leer el archivo.");
      reiniciarInput();
    };
    lector.readAsText(file);
  };

  const confirmarImportacion = async () => {
    if (!pendiente) return;
    try {
      if (supabase) {
        // Persistir en Supabase mediante upsert por `id`: si el id existe se
        // actualiza, si no existe se inserta. Solo tras guardar correctamente
        // se re-lee y reemplaza el estado global.
        await importBackup(supabase, pendiente);
        const datos = await getData(supabase);
        setParametros(datos.parametros);
        setProductos(datos.productos);
      } else {
        // Sin cliente Supabase: aplicar solo en memoria.
        setParametros(pendiente.parametros);
        setProductos(pendiente.productos);
      }
      notificar("info", "Datos importados correctamente.");
    } catch (err) {
      // Falló el guardado en Supabase: no se reemplaza el estado global por los
      // datos importados; la UI sigue reflejando los datos previos (Req 8.7).
      notificar("error", "No se pudieron guardar los datos en Supabase.");
    } finally {
      setPendiente(null);
      reiniciarInput();
    }
  };

  const cancelarImportacion = () => {
    setPendiente(null);
    reiniciarInput();
  };

  return (
    <main className="container py-3 lp-pagina-basedatos">
      <h2 className="h5">Base de datos</h2>

      <div className="d-flex flex-column gap-3" style={{ maxWidth: "480px" }}>
        <div>
          <button
            type="button"
            className="btn btn-primary lp-exportar"
            onClick={handleExportar}
          >
            Exportar respaldo
          </button>
        </div>

        <div>
          <label className="form-label" htmlFor="lp-importar-archivo">
            Importar respaldo
          </label>
          <input
            id="lp-importar-archivo"
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="form-control lp-importar"
            onChange={handleArchivo}
          />
        </div>
      </div>

      {pendiente && (
        <div
          className="modal d-block lp-confirmar-importacion"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar importación</h5>
              </div>
              <div className="modal-body">
                <p>
                  Se importarán {pendiente.parametros.length} parámetro(s) y{" "}
                  {pendiente.productos.length} producto(s). Esto reemplazará los
                  datos actuales. ¿Deseas continuar?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary lp-importar-cancelar"
                  onClick={cancelarImportacion}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary lp-importar-confirmar"
                  onClick={confirmarImportacion}
                >
                  Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default BaseDatosPage;
