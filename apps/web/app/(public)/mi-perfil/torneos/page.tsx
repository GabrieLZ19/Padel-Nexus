"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PerfilService,
  type PanelJugador,
} from "@/utils/services/perfil";
import { etiquetaNivelYCategoria } from "@/utils/etiquetaCategoria";
import { InscripcionPagoActions } from "@/components/torneos/InscripcionPagoActions";
import { InscripcionBajaJugador } from "@/components/inscripciones/InscripcionBajaJugador";
import { inscripcionRequierePagoOnline } from "@/utils/inscripcionPago";

function pagoDe(inscripcion: PanelJugador["inscripciones"][number]) {
  if (inscripcion.sinCosto) return "Sin costo";
  return inscripcion.estadoPago || "Pendiente";
}

export default function MisTorneosPage() {
  const [panel, setPanel] = useState<PanelJugador | null>(null);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;
    PerfilService.getMiPanel()
      .then((data) => {
        if (activo) setPanel(data);
      })
      .catch(() => {
        if (activo) setError("No se pudieron cargar tus torneos.");
      });
    return () => {
      activo = false;
    };
  }, [recarga]);

  return (
    <main className="max-w-3xl mx-auto p-5 md:p-10 space-y-6">
      <Link
        href="/mi-perfil"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ChevronLeft className="size-4" /> Mi panel
      </Link>
      <header>
        <h1 className="text-3xl font-black text-brand-white">Mis torneos</h1>
        <p className="text-sm text-gray-400 mt-1">
          Inscripciones, estado del torneo y pago.
        </p>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!panel && !error ? (
        <p className="text-sm text-gray-500">Cargando tus inscripciones…</p>
      ) : null}
      {panel && panel.inscripciones.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no estás inscripto en un torneo.</p>
      ) : null}

      <ul className="space-y-3">
        {panel?.inscripciones.map((inscripcion) => {
          const pendientePago = inscripcionRequierePagoOnline({
            esGratis: inscripcion.esGratis,
            precioInscripcion: inscripcion.precioInscripcion,
            monto: inscripcion.monto,
            estadoPago: inscripcion.estadoPago,
          });
          return (
            <li
              key={inscripcion.id}
              className="rounded-2xl border border-white/10 bg-brand-card px-4 py-3 space-y-3"
            >
              <Link
                href={`/torneos/${inscripcion.torneoId}?vista=llaves`}
                className="flex items-center justify-between gap-3 hover:opacity-90"
              >
                <div className="min-w-0">
                  <p className="font-bold text-brand-white truncate">
                    {inscripcion.torneoNombre}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {etiquetaNivelYCategoria(
                      inscripcion.nivel,
                      inscripcion.categoria,
                    ) || "Sin categoría"}
                    {" · "}
                    {inscripcion.estadoTorneo || "Sin estado"}
                    {" · "}
                    {pagoDe(inscripcion)}
                    {inscripcion.sinCosto
                      ? ""
                      : ` · $${inscripcion.monto.toLocaleString("es-AR")}`}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-gray-500" />
              </Link>
              {pendientePago ? (
                <InscripcionPagoActions
                  inscripcionId={inscripcion.id}
                  monto={inscripcion.monto}
                  estadoPago={inscripcion.estadoPago}
                  esGratis={inscripcion.esGratis}
                  precioInscripcion={inscripcion.precioInscripcion}
                  compact
                />
              ) : null}
              <InscripcionBajaJugador
                inscripcionId={inscripcion.id}
                torneoNombre={inscripcion.torneoNombre}
                sinCosto={inscripcion.sinCosto}
                estadoPago={inscripcion.estadoPago}
                estadoTorneo={inscripcion.estadoTorneo}
                onBajaCompletada={() => setRecarga((n) => n + 1)}
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
