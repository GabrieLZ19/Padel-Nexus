"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Download,
  MapPin,
  Shield,
  Users,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { useIniciarChatDirecto } from "@/hooks/useIniciarChatDirecto";
import {
  FiscalPanelService,
  MOTIVOS_INFORME_LABELS,
  nombreSedeFiscal,
  type FiscalTorneo,
  type IncidenciaFiscal,
  type ParejaFiscal,
} from "@/utils/services/fiscal-panel";
import { generarActaFiscalPdf } from "@/utils/actaFiscalPdf";
import { generarInformePreliminarPdf } from "@/utils/informePreliminarPdf";
import type { Partido } from "@/utils/types";
import { etiquetaCategoria } from "@/utils/etiquetaCategoria";
import {
  esModalidadIndividual,
  formatFechaCalendario,
  labelModalidad,
  nombreJugadorVisible,
} from "@/utils/formatFecha";
import {
  agruparPartidosPorRonda,
  canchaAsignadaReal,
  etiquetaCanchaAsignada,
  etiquetaCruce,
  partidosDefinidosOrdenados,
  formatearResultadoSets,
} from "@/utils/fiscalPartidos";
import { TablaPosicionesZona } from "@/components/torneos/TablaPosicionesZona";
import {
  FapBracketDiagram,
  type FapMatrixMatch,
} from "@/components/torneos/FapBracketDiagram";
import PublicBracketView from "@/components/torneos/PublicBracketView";
import { esRondaDeZona } from "@/utils/rondasLlave";
import FeedbackModal, {
  type FeedbackModalProps,
} from "@/components/ui/FeedbackModal";

type TabId = "partidos" | "zonas" | "llaves" | "jugadores" | "informes";

const TABS: { id: TabId; label: string }[] = [
  { id: "partidos", label: "Programación y Resultados" },
  { id: "zonas", label: "Zonas y Posiciones" },
  { id: "llaves", label: "Cuadro / Llave" },
  { id: "jugadores", label: "Jugadores" },
  { id: "informes", label: "Informes" },
];

const PLAYOFF_RONDAS = new Set([
  "PRELIMINARES",
  "32AVOS",
  "16AVOS",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "FINAL",
  "LLAVE",
]);

function formatFecha(iso?: string | null) {
  if (!iso) return "Sin horario";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function estadoLicenciaClass(estado?: string | null) {
  if (estado === "Activa") return "text-brand-chartreuse";
  if (estado === "Pendiente") return "text-yellow-400";
  return "text-red-400";
}

export default function FiscalTorneoOperativoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { iniciarChatDirecto } = useIniciarChatDirecto();

  const [tab, setTab] = useState<TabId>("partidos");
  const [torneo, setTorneo] = useState<FiscalTorneo | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [parejas, setParejas] = useState<ParejaFiscal[]>([]);
  const [incidencias, setIncidencias] = useState<IncidenciaFiscal[]>([]);
  const [zonas, setZonas] = useState<any[]>([]);
  const [fapMatrixMatches, setFapMatrixMatches] = useState<FapMatrixMatch[]>([]);
  const [fapPairCount, setFapPairCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [descargandoGrillas, setDescargandoGrillas] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
  });

  const cargar = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    const torneoData = await FiscalPanelService.getTorneo(id);
    setTorneo(torneoData);

    const [p, j, i, z, m] = await Promise.all([
      FiscalPanelService.getPartidos(id).catch(() => [] as Partido[]),
      FiscalPanelService.getJugadores(id).catch(() => [] as ParejaFiscal[]),
      FiscalPanelService.getIncidencias(id),
      FiscalPanelService.getZonas(id).catch(() => []),
      FiscalPanelService.getLlaveMatriz(id).catch(() => null),
    ]);
    setPartidos(p);
    setParejas(j);
    setIncidencias(i);
    setZonas(z || []);
    if (m?.supported && m.matches?.length) {
      setFapMatrixMatches(m.matches as FapMatrixMatch[]);
      setFapPairCount(m.pairCount ?? null);
    } else {
      setFapMatrixMatches([]);
      setFapPairCount(null);
    }
  }, [id]);

  useEffect(() => {
    let mounted = true;
    const defer = setTimeout(() => {
      cargar()
        .catch((err: unknown) => {
          if (!mounted) return;
          const axiosMsg =
            typeof err === "object" &&
            err &&
            "response" in err &&
            typeof (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message === "string"
              ? (err as { response: { data: { message: string } } }).response.data
                  .message
              : null;
          const message =
            axiosMsg ||
            (err instanceof Error ? err.message : null) ||
            "No estás asignado a este torneo o falló la carga.";
          setLoadError(message);
          setTorneo(null);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(defer);
    };
  }, [cargar]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "informes") setTab("informes");
  }, []);

  const handlePdf = async () => {
    if (!id || !torneo) return;
    if (torneo.estado !== "Finalizado") {
      setFeedback({
        isOpen: true,
        title: "Acta disponible al cierre",
        description:
          "El acta consolidada se descarga cuando el torneo está Finalizado. Mientras está en curso usá los informes preliminares y las grillas por cancha.",
        type: "info",
        onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      });
      return;
    }
    setDescargando(true);
    try {
      const reporte = await FiscalPanelService.getReporte(id);
      generarActaFiscalPdf(reporte);
    } catch (error: unknown) {
      const axiosMsg =
        typeof error === "object" &&
        error &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data
              .message
          : null;
      setFeedback({
        isOpen: true,
        title: "No se pudo generar el PDF",
        description: axiosMsg || "Reintentá en unos segundos.",
        type: "error",
        onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      });
    } finally {
      setDescargando(false);
    }
  };

  const handleGrillasCancha = async () => {
    if (!torneo) return;
    setDescargandoGrillas(true);
    try {
      const { generarPdfGrillasPorCancha } = await import("@/utils/grillaPdf");
      generarPdfGrillasPorCancha(torneo, partidos);
    } catch {
      setFeedback({
        isOpen: true,
        title: "No se pudo generar la grilla",
        description: "Reintentá en unos segundos.",
        type: "error",
        onClose: () => setFeedback((p) => ({ ...p, isOpen: false })),
      });
    } finally {
      setDescargandoGrillas(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 py-8 md:px-10 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-white/10 rounded-lg" />
        <div className="h-40 bg-[#151515] border border-white/5 rounded-2xl" />
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <Shield className="size-10 text-gray-600 mx-auto" />
        <h1 className="text-xl font-extrabold text-white">No se pudo abrir el torneo</h1>
        <p className="text-sm text-gray-400">
          {loadError ||
            "No estás asignado a este torneo o hubo un error al cargar los datos."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/fiscal/torneos")}
          className="inline-flex items-center gap-2 bg-brand-chartreuse text-brand-black font-bold px-5 py-3 rounded-xl text-sm cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Volver a mis torneos
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 md:px-10 md:py-10 space-y-6">
      <button
        type="button"
        onClick={() => router.push("/dashboard/fiscal/torneos")}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer"
      >
        <ArrowLeft className="size-4" /> Volver a mis torneos
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-brand-chartreuse text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
            <Shield className="size-4" />
            {torneo.alcance || "Local"} ·{" "}
            {torneo.rol_torneo === "general" ? "Fiscal general" : "Fiscal auxiliar"}
          </p>
          <h1 className="text-3xl font-extrabold text-white">{torneo.nombre}</h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {formatFechaCalendario(torneo.fecha)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {nombreSedeFiscal(torneo)}
            </span>
            <span>{torneo.estado}</span>
            <span>{labelModalidad(torneo.modalidad)}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
          {torneo.rol_torneo !== "general" && torneo.fiscal_general?.usuario_id && (
            <button
              type="button"
              onClick={() => {
                if (torneo.fiscal_general?.usuario_id) {
                  iniciarChatDirecto(torneo.fiscal_general.usuario_id);
                }
              }}
              className="inline-flex h-11 items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold px-4 rounded-xl text-sm cursor-pointer border border-blue-500/30 whitespace-nowrap transition-colors"
              title={`Iniciar chat directo con el Fiscal General (${torneo.fiscal_general.nombre_completo})`}
            >
              <MessageSquare className="size-4 shrink-0" />
              Chat con Fiscal General
            </button>
          )}
          <button
            type="button"
            onClick={handleGrillasCancha}
            disabled={descargandoGrillas}
            className="inline-flex h-11 items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-5 rounded-xl text-sm cursor-pointer disabled:opacity-60 border border-white/10 whitespace-nowrap"
          >
            <Download className="size-4 shrink-0" />
            {descargandoGrillas ? "Generando…" : "Grillas por cancha"}
          </button>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={handlePdf}
              disabled={descargando || torneo.estado !== "Finalizado"}
              title={
                torneo.estado !== "Finalizado"
                  ? "Disponible cuando el torneo esté Finalizado"
                  : "Descargar acta consolidada"
              }
              className="inline-flex h-11 items-center justify-center gap-2 bg-brand-chartreuse text-brand-black font-bold px-5 rounded-xl text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Download className="size-4 shrink-0" />
              {descargando ? "Generando…" : "Acta consolidada PDF"}
            </button>
            {torneo.estado !== "Finalizado" && (
              <p className="text-[10px] text-gray-500 sm:text-center">
                Disponible al finalizar el torneo
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap transition-colors ${
              tab === item.id
                ? "bg-brand-chartreuse text-brand-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {item.id === "jugadores"
              ? `${item.label} (${contarJugadoresTab(parejas)})`
              : item.id === "partidos"
                ? `${item.label} (${partidosDefinidosOrdenados(partidos).length})`
                : item.id === "zonas"
                  ? `${item.label} (${zonas.length})`
                  : item.id === "llaves"
                    ? `${item.label}`
                    : `${item.label} (${incidencias.length})`}
          </button>
        ))}
      </div>

      {tab === "partidos" && (
        <TablaPartidos
          partidos={partidos}
          modalidad={torneo.modalidad}
          onAbrirJugador={(jugadorId) =>
            router.push(`/dashboard/fiscal/torneos/${id}/jugadores/${jugadorId}`)
          }
        />
      )}
      {tab === "zonas" && (
        <SeccionZonas
          zonas={zonas}
          partidos={partidos}
          alcance={torneo.alcance}
          torneoId={id}
          onSorteoResuelto={cargar}
          onAbrirJugador={(jugadorId) =>
            router.push(`/dashboard/fiscal/torneos/${id}/jugadores/${jugadorId}`)
          }
        />
      )}
      {tab === "llaves" && (
        <SeccionLlaves
          torneo={torneo}
          partidos={partidos}
          fapMatrixMatches={fapMatrixMatches}
          fapPairCount={fapPairCount}
        />
      )}
      {tab === "jugadores" && (
        <TablaJugadores
          parejas={parejas}
          modalidad={torneo.modalidad}
          onAbrirJugador={(jugadorId) =>
            router.push(`/dashboard/fiscal/torneos/${id}/jugadores/${jugadorId}`)
          }
        />
      )}
      {tab === "informes" && (
        <SeccionInformes
          torneoId={id}
          torneo={torneo}
          incidencias={incidencias}
          esGeneral={torneo.rol_torneo === "general"}
          onRefresh={cargar}
          onFeedback={setFeedback}
        />
      )}

      <FeedbackModal {...feedback} />
    </div>
  );
}

function ParejaCruceInteractiva({
  j1,
  j2,
  j1Id,
  j2Id,
  onAbrirJugador,
}: {
  j1?: string | null;
  j2?: string | null;
  j1Id?: string | null;
  j2Id?: string | null;
  onAbrirJugador: (id: string) => void;
}) {
  const nombre1 = nombreJugadorVisible(j1);
  const nombre2 = nombreJugadorVisible(j2);

  if (!nombre1 && !nombre2) {
    return <span className="text-gray-500 italic text-xs">A confirmar</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1 font-semibold text-white">
      {nombre1 ? (
        j1Id ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAbrirJugador(j1Id);
            }}
            title="Emitir informe / Ver ficha de fiscal"
            className="hover:text-brand-chartreuse hover:underline text-left cursor-pointer transition-colors"
          >
            {nombre1}
          </button>
        ) : (
          <span>{nombre1}</span>
        )
      ) : null}
      {nombre1 && nombre2 && <span className="text-gray-500 font-normal">/</span>}
      {nombre2 ? (
        j2Id ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAbrirJugador(j2Id);
            }}
            title="Emitir informe / Ver ficha de fiscal"
            className="hover:text-brand-chartreuse hover:underline text-left cursor-pointer transition-colors"
          >
            {nombre2}
          </button>
        ) : (
          <span>{nombre2}</span>
        )
      ) : null}
    </span>
  );
}

function TablaPartidos({
  partidos,
  modalidad,
  onAbrirJugador,
}: {
  partidos: Partido[];
  modalidad?: string | null;
  onAbrirJugador: (id: string) => void;
}) {
  const grupos = agruparPartidosPorRonda(partidos);
  const individual = esModalidadIndividual(modalidad);
  const cruceLabel = individual ? "Jugadores" : "Parejas";
  const pendientes = partidos.length - grupos.reduce((n, g) => n + g.partidos.length, 0);

  if (partidos.length === 0) {
    return (
      <div className="bg-[#151515] border border-white/5 rounded-2xl p-10 text-center text-gray-500 text-sm">
        Todavía no hay partidos de zona o llave en este torneo.
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="bg-[#151515] border border-white/5 rounded-2xl p-10 text-center text-gray-500 text-sm">
        Todavía no hay cruces definidos. Los partidos a la espera de rival no se muestran.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-400">
        <p>
          <span className="text-white font-bold">
            {grupos.reduce((n, g) => n + g.partidos.length, 0)}
          </span>{" "}
          partidos definidos
          {pendientes > 0 && (
            <span className="text-gray-500">
              {" "}
              · {pendientes} a definir ocultos
            </span>
          )}
        </p>
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
          Por ronda y n° de partido
        </span>
      </div>

      {grupos.map((grupo) => (
        <div
          key={grupo.ronda}
          className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-sm font-black text-white tracking-wide">
              {grupo.label}
            </h3>
            <span className="text-[10px] uppercase tracking-widest text-brand-chartreuse font-bold">
              {grupo.partidos.length}{" "}
              {grupo.partidos.length === 1 ? "partido" : "partidos"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                  <th className="px-4 py-3 w-14">#</th>
                  <th className="px-4 py-3">{cruceLabel}</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3">Cancha</th>
                  <th className="px-4 py-3">Horario</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {grupo.partidos.map((p) => {
                  const resultado = formatearResultadoSets(p);
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {p.orden || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <ParejaCruceInteractiva
                            j1={p.equipo_a_j1}
                            j2={p.equipo_a_j2}
                            j1Id={p.equipo_a_usuario_id}
                            j2Id={p.equipo_a_usuario2_id}
                            onAbrirJugador={onAbrirJugador}
                          />
                          <span className="text-gray-600 mx-1 text-xs font-black uppercase">
                            vs
                          </span>
                          <ParejaCruceInteractiva
                            j1={p.equipo_b_j1}
                            j2={p.equipo_b_j2}
                            j1Id={p.equipo_b_usuario_id}
                            j2Id={p.equipo_b_usuario2_id}
                            onAbrirJugador={onAbrirJugador}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {resultado ? (
                          <span className="font-mono font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-xs inline-block">
                            {resultado}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canchaAsignadaReal(p.cancha_asignada) ? (
                          <span className="text-gray-200">
                            {etiquetaCanchaAsignada(p.cancha_asignada)}
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-amber-400/90">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatFecha(p.fecha_partido)}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                          {p.estado_partido || "Programado"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function SeccionZonas({
  zonas,
  partidos,
  alcance,
  torneoId,
  onSorteoResuelto,
  onAbrirJugador,
}: {
  zonas: any[];
  partidos: Partido[];
  alcance?: string | null;
  torneoId?: string;
  onSorteoResuelto?: () => void;
  onAbrirJugador: (id: string) => void;
}) {
  if (!zonas || zonas.length === 0) {
    return (
      <div className="bg-[#151515] border border-white/5 rounded-2xl p-10 text-center text-gray-500 text-sm">
        No hay zonas configuradas en este torneo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-400">
          <span className="text-white font-bold">{zonas.length}</span>{" "}
          {zonas.length === 1 ? "zona" : "zonas"} de fase regular
        </p>
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20">
          Tablas de Posiciones y Cruces
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {zonas.map((z) => {
          const parejasFormatted = (z.grupo_parejas || []).map(
            (gp: any) => ({
              id: gp.inscripcion_id,
              jugador1_nombre: gp.inscripciones?.jugador1_nombre,
              jugador2_nombre: gp.inscripciones?.jugador2_nombre,
              club:
                gp.inscripciones?.perfiles?.clubes?.nombre ||
                gp.inscripciones?.perfiles?.lugar_residencia ||
                "Sin club",
              seed: gp.seed ?? undefined,
              cabezaDeSerie: gp.seed != null,
              descalificada: Boolean(gp.descalificada),
              usuario_id: gp.inscripciones?.usuario_id ?? null,
              usuario2_id: gp.inscripciones?.usuario2_id ?? null,
              denominacion_nacional:
                gp.inscripciones?.denominacion_nacional ?? null,
              provincia: gp.inscripciones?.provincia ?? null,
              letra_prioridad: gp.inscripciones?.letra_prioridad ?? null,
              sorteo_posicion: gp.sorteo_posicion ?? null,
              sorteo_motivo: gp.sorteo_motivo ?? null,
            }),
          );

          const partidosZona = partidos.filter((p) => {
            const r = String(p.ronda || "").trim().toLowerCase();
            const zName = String(z.nombre_grupo || "").trim().toLowerCase();
            return (
              r === zName ||
              r === `zona ${zName}` ||
              r === `zona_${zName}` ||
              r.replace(/\s+/g, "") === `zona${zName.replace(/\s+/g, "")}`
            );
          });

          return (
            <div key={z.id} className="space-y-4 bg-[#151515] border border-white/5 rounded-2xl p-5">
              <TablaPosicionesZona
                nombreZona={z.nombre_grupo}
                parejasInscritas={parejasFormatted}
                partidosZona={partidosZona}
                alcance={alcance}
                torneoId={torneoId}
                puedeResolverSorteo={true}
                onSorteoResuelto={onSorteoResuelto}
              />
              {partidosZona.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-3">
                    Partidos de la {z.nombre_grupo}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {partidosZona.map((p) => (
                      <MatchCardFiscal
                        key={p.id}
                        partido={p}
                        onAbrirJugador={onAbrirJugador}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCardFiscal({
  partido,
  onAbrirJugador,
}: {
  partido: Partido;
  onAbrirJugador: (id: string) => void;
}) {
  const score = formatearResultadoSets(partido);

  return (
    <div className="bg-[#111] border border-white/5 rounded-xl p-3.5 space-y-2 hover:border-white/15 transition-colors">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="font-mono font-bold text-gray-500">#{partido.orden || "—"}</span>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
          {partido.cancha_asignada ? etiquetaCanchaAsignada(partido.cancha_asignada) : "Cancha a definir"}
        </span>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <ParejaCruceInteractiva
            j1={partido.equipo_a_j1}
            j2={partido.equipo_a_j2}
            j1Id={partido.equipo_a_usuario_id}
            j2Id={partido.equipo_a_usuario2_id}
            onAbrirJugador={onAbrirJugador}
          />
          {partido.ganador && partido.equipo_a_id && partido.ganador === partido.equipo_a_id && (
            <span className="text-[10px] font-black uppercase text-brand-chartreuse tracking-widest bg-brand-chartreuse/10 px-1.5 py-0.5 rounded">
              Ganador
            </span>
          )}
        </div>
        <div className="text-gray-600 text-[10px] uppercase font-black">vs</div>
        <div className="flex items-center justify-between gap-2">
          <ParejaCruceInteractiva
            j1={partido.equipo_b_j1}
            j2={partido.equipo_b_j2}
            j1Id={partido.equipo_b_usuario_id}
            j2Id={partido.equipo_b_usuario2_id}
            onAbrirJugador={onAbrirJugador}
          />
          {partido.ganador && partido.equipo_b_id && partido.ganador === partido.equipo_b_id && (
            <span className="text-[10px] font-black uppercase text-brand-chartreuse tracking-widest bg-brand-chartreuse/10 px-1.5 py-0.5 rounded">
              Ganador
            </span>
          )}
        </div>
      </div>

      {score ? (
        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">Resultado:</span>
          <span className="font-mono text-xs font-bold text-brand-chartreuse bg-brand-chartreuse/10 px-2 py-0.5 rounded border border-brand-chartreuse/20">
            {score}
          </span>
        </div>
      ) : (
        <div className="pt-1.5 border-t border-white/5 text-[11px] text-gray-500">
          {partido.fecha_partido ? formatFecha(partido.fecha_partido) : "Horario a confirmar"}
        </div>
      )}
    </div>
  );
}

function SeccionLlaves({
  torneo,
  partidos,
  fapMatrixMatches,
  fapPairCount,
}: {
  torneo: FiscalTorneo;
  partidos: Partido[];
  fapMatrixMatches: FapMatrixMatch[];
  fapPairCount: number | null;
}) {
  const isEnCurso = (torneo.estado || "").toLowerCase() === "en curso";
  const isFinalizado = (torneo.estado || "").toLowerCase() === "finalizado";

  const playoffMatches = partidos.filter((p) =>
    PLAYOFF_RONDAS.has(String(p.ronda || "").toUpperCase().trim()),
  );

  if (fapMatrixMatches.length === 0 && playoffMatches.length === 0) {
    return (
      <div className="bg-[#151515] border border-white/5 rounded-2xl p-10 text-center text-gray-500 text-sm">
        Todavía no se ha generado la llave o cuadro eliminatorio para este torneo.
      </div>
    );
  }

  if (fapMatrixMatches.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-white tracking-wide">
              Cuadro eliminatorio oficial
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Matriz FAP {fapPairCount ? ` · ${fapPairCount} parejas` : ""}
              {isFinalizado ? " · Finalizado" : isEnCurso ? " · En curso" : " · Programado"}
            </p>
          </div>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden p-4 sm:p-6 overflow-x-auto">
          <FapBracketDiagram
            matches={fapMatrixMatches}
            inicioNumeracion={
              partidos.filter((p) => esRondaDeZona(p.ronda)).length + 1
            }
            partidos={playoffMatches}
            pairCount={fapPairCount ?? undefined}
            alcance={torneo.alcance}
            interactive={false}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden p-4 sm:p-6 overflow-x-auto">
        <PublicBracketView
          partidos={partidos}
          torneoId={torneo.id}
          isLive={isEnCurso}
          isFinished={isFinalizado}
          alcance={torneo.alcance}
        />
      </div>
    </div>
  );
}

function contarJugadoresTab(parejas: ParejaFiscal[]): number {
  return parejas.reduce((acc, par) => {
    const j1 = par.jugador1 ? 1 : 0;
    const j2 = esCompaneroReal(par.jugador2) ? 1 : 0;
    return acc + j1 + j2;
  }, 0);
}

function esCompaneroReal(jugador: ParejaFiscal["jugador2"]): boolean {
  if (!jugador) return false;
  return Boolean(
    jugador.id ||
      jugador.dni ||
      nombreJugadorVisible(jugador.nombre_completo) ||
      nombreJugadorVisible(jugador.nombre),
  );
}

function TablaJugadores({
  parejas,
  modalidad,
  onAbrirJugador,
}: {
  parejas: ParejaFiscal[];
  modalidad?: string | null;
  onAbrirJugador: (id: string) => void;
}) {
  const modalidadIndividual = esModalidadIndividual(modalidad);
  const hayParejasArmadas = parejas.some((par) => esCompaneroReal(par.jugador2));
  const individual = modalidadIndividual || !hayParejasArmadas;
  const totalJugadores = parejas.reduce((acc, par) => {
    const j1 = par.jugador1 ? 1 : 0;
    const j2 = esCompaneroReal(par.jugador2) ? 1 : 0;
    return acc + j1 + j2;
  }, 0);

  if (parejas.length === 0) {
    return (
      <div className="bg-[#151515] border border-white/5 rounded-2xl p-10 text-center text-gray-500 text-sm">
        No hay {individual ? "jugadores" : "parejas"} inscriptos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-400">
          <span className="text-white font-bold">{totalJugadores}</span>{" "}
          {totalJugadores === 1 ? "jugador" : "jugadores"}
          {!individual && (
            <>
              {" "}
              · <span className="text-white font-bold">{parejas.length}</span>{" "}
              {parejas.length === 1 ? "pareja" : "parejas"}
            </>
          )}
        </p>
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20">
          {modalidadIndividual || individual ? "Individual" : "Parejas"}
        </span>
      </div>

      <div className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                {!individual && <th className="px-4 py-3 w-16">#</th>}
                <th className="px-4 py-3">Jugador</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Carnet</th>
                {!individual && <th className="px-4 py-3">Compañero</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {individual
                ? aplanarJugadores(parejas).map((fila) => (
                    <tr
                      key={fila.key}
                      className={fila.jugador.id ? "hover:bg-white/5 cursor-pointer" : ""}
                      onClick={() => fila.jugador.id && onAbrirJugador(fila.jugador.id)}
                    >
                      <td className="px-4 py-3 font-bold text-white">
                        {fila.jugador.nombre_completo || "Jugador"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{fila.jugador.dni || "—"}</td>
                      <td className="px-4 py-3">{etiquetaCategoria(fila.jugador.categoria_padel) || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={estadoLicenciaClass(fila.jugador.licencia?.estado)}>
                          {fila.jugador.licencia?.estado || "Sin carnet"}
                        </span>
                        {fila.jugador.licencia?.nro_licencia
                          ? ` · ${fila.jugador.licencia.nro_licencia}`
                          : ""}
                      </td>
                    </tr>
                  ))
                : parejas.map((par, idx) => {
                    const j2 = esCompaneroReal(par.jugador2) ? par.jugador2 : null;
                    return (
                      <tr key={par.inscripcion_id} className="align-top">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <CeldaJugador
                          jugador={par.jugador1}
                          onAbrir={onAbrirJugador}
                        />
                        <td className="px-4 py-3 font-mono text-xs">
                          {par.jugador1?.dni || "—"}
                        </td>
                        <td className="px-4 py-3">{etiquetaCategoria(par.jugador1?.categoria_padel) || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={estadoLicenciaClass(par.jugador1?.licencia?.estado)}>
                            {par.jugador1?.licencia?.estado || "Sin carnet"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {j2 ? (
                            <button
                              type="button"
                              onClick={() => j2.id && onAbrirJugador(j2.id)}
                              className="text-left font-bold text-white hover:text-brand-chartreuse cursor-pointer"
                            >
                              {j2.nombre_completo}
                              <span className="block text-xs font-normal text-gray-500 font-mono">
                                DNI {j2.dni || "—"}
                              </span>
                            </button>
                          ) : (
                            <span className="text-gray-500 text-xs flex items-center gap-1.5">
                              <Users className="size-3.5" /> Sin compañero
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function aplanarJugadores(parejas: ParejaFiscal[]): {
  key: string;
  jugador: NonNullable<ParejaFiscal["jugador1"]>;
}[] {
  const list: { key: string; jugador: NonNullable<ParejaFiscal["jugador1"]> }[] = [];
  for (const par of parejas) {
    if (par.jugador1) {
      list.push({ key: `${par.inscripcion_id}-j1`, jugador: par.jugador1 });
    }
    if (esCompaneroReal(par.jugador2) && par.jugador2) {
      list.push({ key: `${par.inscripcion_id}-j2`, jugador: par.jugador2 });
    }
  }
  return list;
}

function CeldaJugador({
  jugador,
  onAbrir,
}: {
  jugador: ParejaFiscal["jugador1"];
  onAbrir: (id: string) => void;
}) {
  if (!jugador) {
    return <td className="px-4 py-3 text-gray-500">—</td>;
  }
  return (
    <td className="px-4 py-3">
      <button
        type="button"
        disabled={!jugador.id}
        onClick={() => jugador.id && onAbrir(jugador.id)}
        className="text-left font-bold text-white hover:text-brand-chartreuse disabled:hover:text-white cursor-pointer disabled:cursor-default"
      >
        {jugador.nombre_completo || "Jugador"}
      </button>
    </td>
  );
}

function SeccionInformes({
  torneoId,
  torneo,
  incidencias,
  esGeneral,
  onRefresh,
  onFeedback,
}: {
  torneoId: string;
  torneo: FiscalTorneo;
  incidencias: IncidenciaFiscal[];
  esGeneral: boolean;
  onRefresh: () => Promise<void>;
  onFeedback: (modal: FeedbackModalProps) => void;
}) {
  const [revisandoId, setRevisandoId] = useState<string | null>(null);
  const [decision, setDecision] = useState("");
  const [saving, setSaving] = useState(false);

  const handleRevisar = async (incidenciaId: string, estado: "aplicada" | "anulada") => {
    if (!decision.trim()) {
      onFeedback({
        isOpen: true,
        title: "Falta la decisión",
        description: "Indicá la decisión del Fiscal General.",
        type: "warning",
        onClose: () => onFeedback({ isOpen: false, title: "", description: "", type: "info", onClose: () => {} }),
      });
      return;
    }
    setSaving(true);
    try {
      await FiscalPanelService.revisarInforme(torneoId, incidenciaId, {
        estado,
        decision_general: decision.trim(),
      });
      setRevisandoId(null);
      setDecision("");
      await onRefresh();
      onFeedback({
        isOpen: true,
        title: estado === "aplicada" ? "Informe tomado" : "Informe anulado",
        description:
          "Quedó registrado internamente. No modifica el perfil público del jugador.",
        type: "success",
        onClose: () =>
          onFeedback({
            isOpen: false,
            title: "",
            description: "",
            type: "info",
            onClose: () => {},
          }),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo revisar.";
      onFeedback({
        isOpen: true,
        title: "Error",
        description: message,
        type: "error",
        onClose: () =>
          onFeedback({
            isOpen: false,
            title: "",
            description: "",
            type: "info",
            onClose: () => {},
          }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePdfInforme = async (inc: IncidenciaFiscal) => {
    if (!inc.jugador_id) return;
    try {
      const ficha = await FiscalPanelService.getJugador(inc.jugador_id);
      generarInformePreliminarPdf({
        torneo,
        jugador: ficha,
        informe: inc,
        fiscalNombre: inc.fiscales
          ? `${inc.fiscales.apellido}, ${inc.fiscales.nombre}`
          : "Fiscal",
      });
    } catch {
      onFeedback({
        isOpen: true,
        title: "No se pudo generar el PDF",
        description: "Reintentá en unos segundos.",
        type: "error",
        onClose: () =>
          onFeedback({
            isOpen: false,
            title: "",
            description: "",
            type: "info",
            onClose: () => {},
          }),
      });
    }
  };

  if (incidencias.length === 0) {
    return (
      <div className="bg-[#151515] border border-white/5 rounded-2xl p-10 text-center text-gray-500 text-sm space-y-2">
        <p>Todavía no hay informes preliminares en este torneo.</p>
        <p className="text-xs">
          Emítelos desde la ficha de un jugador (pestaña Jugadores).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Informes internos. El informe final de competencia se elabora fuera del
        sistema con estos preliminares.
        {esGeneral
          ? " Como Fiscal General podés aplicar o anular cada informe."
          : " Solo el Fiscal General puede cerrar decisiones."}
      </p>
      {incidencias.map((inc) => (
        <div
          key={inc.id}
          className="bg-[#151515] border border-white/5 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-brand-chartreuse font-bold">
                {inc.motivo_informe
                  ? MOTIVOS_INFORME_LABELS[inc.motivo_informe]
                  : inc.tipo}{" "}
                · {inc.estado}
              </p>
              <p className="text-white font-bold mt-1">{inc.descripcion}</p>
              <p className="text-sm text-gray-400 mt-2">
                Traza: {inc.motivo || "—"}
              </p>
              {inc.decision_general && (
                <p className="text-sm text-brand-chartreuse mt-2">
                  Decisión: {inc.decision_general}
                </p>
              )}
            </div>
            <AlertTriangle className="size-4 text-yellow-400 shrink-0" />
          </div>
          <p className="text-xs text-gray-500">
            {inc.perfiles
              ? `${inc.perfiles.apellido}, ${inc.perfiles.nombre} · DNI ${inc.perfiles.dni || "—"}`
              : "Sin jugador vinculado"}{" "}
            · {formatFecha(inc.created_at)}
            {inc.fiscales
              ? ` · Fiscal ${inc.fiscales.apellido}, ${inc.fiscales.nombre}`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handlePdfInforme(inc)}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 cursor-pointer"
            >
              Descargar PDF
            </button>
            {esGeneral && inc.estado === "registrada" && (
              <button
                type="button"
                onClick={() =>
                  setRevisandoId(revisandoId === inc.id ? null : inc.id)
                }
                className="text-xs font-bold px-3 py-2 rounded-lg bg-brand-chartreuse/15 text-brand-chartreuse border border-brand-chartreuse/30 cursor-pointer"
              >
                Revisar
              </button>
            )}
          </div>
          {esGeneral && revisandoId === inc.id && (
            <div className="space-y-2 border-t border-white/5 pt-3">
              <textarea
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                placeholder="Decisión del Fiscal General"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white min-h-20"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleRevisar(inc.id, "aplicada")}
                  className="bg-brand-chartreuse text-brand-black font-bold px-4 py-2 rounded-xl text-xs cursor-pointer disabled:opacity-60"
                >
                  Aplicar decisión
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleRevisar(inc.id, "anulada")}
                  className="bg-red-500/15 text-red-400 border border-red-500/20 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer disabled:opacity-60"
                >
                  Anular informe
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
