import Link from "next/link";
import { ChevronRight, MapPin, Trophy } from "lucide-react";
import type { PanelJugador } from "@/utils/services/perfil";
import { ZONA_HORARIA_ARGENTINA } from "@/utils/fechaArgentina";

function fechaHora(iso: string | null) {
  if (!iso) return { dia: "Sin fecha", hora: "" };
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return { dia: "Sin fecha", hora: "" };
  return {
    dia: instante.toLocaleDateString("es-AR", {
      timeZone: ZONA_HORARIA_ARGENTINA,
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
    hora: instante.toLocaleTimeString("es-AR", {
      timeZone: ZONA_HORARIA_ARGENTINA,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function PanelJugadorResumen({ panel }: { panel: PanelJugador | null }) {
  if (!panel) return null;
  const partido = panel.proximoPartido;
  const cuando = fechaHora(partido?.fecha || null);

  return (
    <section className="relative z-10 space-y-3">
      {partido ? (
        <Link
          href={`/torneos/${partido.torneoId}?vista=llaves`}
          className="block rounded-3xl border border-brand-chartreuse/30 bg-brand-card p-4 md:p-5 hover:border-brand-chartreuse/60 transition-colors"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-chartreuse">
            Próximo partido
          </p>
          <p className="mt-1 text-xl md:text-2xl font-black text-brand-white">
            {cuando.hora || "Horario a confirmar"}
            {partido.cancha ? ` · ${partido.cancha}` : ""}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {cuando.dia}
            {partido.ronda ? ` · ${partido.ronda}` : ""} · {partido.torneoNombre}
          </p>
          <p className="mt-2 text-sm text-brand-white">vs {partido.rival}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-chartreuse">
            Ver llave <ChevronRight className="size-4" />
          </span>
        </Link>
      ) : (
        <div className="rounded-3xl border border-brand-white/10 bg-brand-card p-4 text-sm text-gray-400">
          No tenés un partido pendiente.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {panel.ranking ? (
          <p className="inline-flex items-center gap-2 rounded-2xl border border-brand-white/10 bg-brand-card px-3 py-2 text-brand-white">
            <Trophy className="size-4 text-brand-chartreuse" />
            {panel.ranking.puesto}.º en {panel.ranking.categoria}
            <span className="text-gray-500">
              {panel.ranking.puntos} pts · {panel.ranking.alcance}
            </span>
          </p>
        ) : null}
        {panel.resultados.slice(0, 3).map((resultado) => (
          <p
            key={resultado.id}
            className="inline-flex items-center gap-2 text-gray-400"
          >
            <MapPin className="size-3.5 shrink-0" />
            <span>
              {resultado.gano ? "Ganaste" : "Perdiste"} {resultado.marcador} vs{" "}
              {resultado.rival}
            </span>
          </p>
        ))}
      </div>
    </section>
  );
}
