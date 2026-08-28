"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Users,
  User,
  Trophy,
  ShieldCheck,
  CreditCard,
  ChevronLeft,
} from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { Partido, Torneo } from "@/utils/types/index";
import InscripcionModal from "@/components/torneos/InscripcionModal";
import { useProfileStore } from "@/store/useProfileStore";
import { MatchCard } from "@/components/torneos/MatchCard";
import { TablaPosicionesZona } from "@/components/torneos/TablaPosicionesZona";
import PublicBracketView from "@/components/torneos/PublicBracketView";
import { esModalidadIndividual, labelModalidad } from "@/utils/formatFecha";
import {
  allChecksPassed,
  buildChecksElegibilidadJ1,
  isInscripcionTemporalmenteAbierta,
} from "@/utils/inscripcionElegibilidad";

export default function TorneoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const torneoId = params.id as string;

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [zonas, setZonas] = useState<any[]>([]);
  const [activeTabPublica, setActiveTabPublica] = useState<"zonas" | "llaves">(
    "zonas",
  );
  const [loading, setLoading] = useState(true);
  const [isInscripcionOpen, setIsInscripcionModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { profile } = useProfileStore();

  const isAlreadyEnrolled =
    profile &&
    torneo?.inscripciones?.some((ins) => ins.usuario_id === profile.id);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      TorneosService.getById(torneoId),
      TorneosService.getPartidos(torneoId),
      TorneosService.getZonas(torneoId).catch(() => []),
    ])
      .then(([torneoData, partidosData, zonasData]) => {
        if (isMounted) {
          setTorneo(torneoData);
          setPartidos(partidosData || []);
          setZonas(zonasData || []);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error al cargar la data:", error);
        if (isMounted) setLoading(false);
      });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const debouncedRefreshPartidos = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        TorneosService.getPartidos(torneoId).then(
          (p) => isMounted && setPartidos(p || []),
        );
        TorneosService.getZonas(torneoId).then(
          (z) => isMounted && setZonas(z || []),
        );
      }, 500);
    };

    const handleWebsocketTorneo = (e: any) => {
      const data = e.detail;
      if (data?.torneo_id === torneoId) {
        TorneosService.getById(torneoId).then((t) => isMounted && setTorneo(t));
        debouncedRefreshPartidos();
      }
    };

    const handleWebsocketPartido = (e: any) => {
      const data = e.detail;
      if (data?.torneo_id === torneoId) debouncedRefreshPartidos();
    };

    const handleWebsocketBracket = (e: any) => {
      const data = e.detail;
      if (data?.torneo_id === torneoId) {
        debouncedRefreshPartidos();
        if (data?.fase === "llaves_principales_generadas" && isMounted) {
          setActiveTabPublica("llaves");
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("torneo_actualizado", handleWebsocketTorneo);
      window.addEventListener("partido_actualizado", handleWebsocketPartido);
      window.addEventListener("bracket_actualizado", handleWebsocketBracket);
    }

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (typeof window !== "undefined") {
        window.removeEventListener("torneo_actualizado", handleWebsocketTorneo);
        window.removeEventListener(
          "partido_actualizado",
          handleWebsocketPartido,
        );
        window.removeEventListener(
          "bracket_actualizado",
          handleWebsocketBracket,
        );
      }
    };
  }, [torneoId, torneo?.estado, refreshKey]);

  const formatFecha = (fechaVal?: string | number | null) => {
    if (!fechaVal) return "Fecha a confirmar";
    const date = new Date(String(fechaVal));
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const handleInscripcion = () => {
    if (!profile) {
      router.push("/login");
      return;
    }
    if (isAlreadyEnrolled) {
      router.push("/mis-inscripciones");
      return;
    }
    const checks = buildChecksElegibilidadJ1(torneo!, profile);
    const failed = checks.find((c) => !c.passed);
    if (failed?.actionHref) {
      router.push(failed.actionHref);
      return;
    }
    setIsInscripcionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black text-brand-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 animate-pulse space-y-6">
          <div className="h-4 w-28 bg-white/5 rounded" />
          <div className="h-40 bg-brand-card rounded-2xl" />
          <div className="h-96 bg-brand-card rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="min-h-[calc(100vh-88px)] flex flex-col items-center justify-center text-center px-4 bg-brand-black">
        <Trophy className="size-14 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Torneo no encontrado
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          El torneo que buscás no existe o fue eliminado.
        </p>
        <button
          onClick={() => router.push("/torneos")}
          className="bg-white/10 hover:bg-white/15 text-white px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
        >
          Explorar torneos
        </button>
      </div>
    );
  }

  const estadoBase = (torneo.estado || "").toLowerCase().trim();
  const isEnCurso = estadoBase === "en curso";
  const isFinalizado = estadoBase === "finalizado";
  const isAbierto = estadoBase === "inscripción" || estadoBase === "borrador";
  const isCierreVencido = !isInscripcionTemporalmenteAbierta(torneo);
  const isIndividual = esModalidadIndividual(torneo.modalidad);
  const hasPremios = torneo.premio_1 || torneo.premio_2 || torneo.premio_3;
  const cuposActuales = torneo.cupos_actuales || 0;
  const cuposMaximos = torneo.cupos_maximos || 16;
  const isLleno = cuposActuales >= cuposMaximos;
  const cuposPct = Math.min(
    100,
    Math.round((cuposActuales / Math.max(cuposMaximos, 1)) * 100),
  );

  const elegibilidadChecks = profile
    ? buildChecksElegibilidadJ1(torneo, profile)
    : [];
  const isElegible = profile ? allChecksPassed(elegibilidadChecks) : true;
  const firstFailedCheck = elegibilidadChecks.find((c) => !c.passed);

  let btnText = "";
  let btnClass = "";
  let isDisabled = false;

  if (isAlreadyEnrolled) {
    btnText = "Ver mi inscripción";
    btnClass =
      "bg-white/10 text-white hover:bg-white/15 border border-white/15";
  } else if (!isAbierto || isCierreVencido) {
    btnText = "Inscripciones cerradas";
    btnClass =
      "bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed opacity-80";
    isDisabled = true;
  } else if (isLleno) {
    btnText = "Cupos agotados";
    btnClass =
      "bg-red-500/15 text-red-400 border border-red-500/20 cursor-not-allowed";
    isDisabled = true;
  } else if (!profile) {
    btnText = "Ingresar para inscribirte";
    btnClass = "bg-brand-chartreuse text-brand-black hover:opacity-95";
  } else if (!isElegible) {
    const needsCarnet = firstFailedCheck?.code === "carnet";
    const needsProfile =
      firstFailedCheck?.code === "edad" ||
      firstFailedCheck?.code === "rama" ||
      firstFailedCheck?.actionHref === "/mi-perfil/ajustes";
    btnText = needsCarnet
      ? "Requiere carnet FAP"
      : needsProfile
        ? "Completar perfil"
        : "Ver requisitos";
    btnClass =
      "bg-white/10 text-white hover:bg-white/15 border border-white/15";
  } else {
    btnText = isIndividual ? "Inscribirme" : "Inscribir mi pareja";
    btnClass = "bg-brand-chartreuse text-brand-black hover:opacity-95";
  }

  const showZonasTab = Boolean(zonas && zonas.length > 0);

  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        <button
          onClick={() => router.push("/torneos")}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm font-medium mb-5 cursor-pointer"
        >
          <ChevronLeft className="size-4" /> Torneos
        </button>

        {/* Hero compacto */}
        <header className="rounded-2xl border border-white/8 bg-[#0f0f0f] p-5 lg:p-7 mb-6 relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(203,254,1,0.08),transparent_60%)] pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-brand-chartreuse text-brand-black">
                  {torneo.nivel || "Cat."}
                  {torneo.categoria ? ` · ${torneo.categoria}` : ""}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 text-gray-400 border border-white/8">
                  {torneo.estado}
                </span>
                {torneo.rama ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 text-gray-400 border border-white/8">
                    {torneo.rama}
                  </span>
                ) : null}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {torneo.nombre}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-brand-chartreuse/80" />
                  {torneo.clubes?.nombre || torneo.lugar || "Sede a confirmar"}
                </span>
                <span className="inline-flex items-center gap-1.5 capitalize">
                  <Calendar className="size-3.5 text-brand-chartreuse/80" />
                  {formatFecha(torneo.fecha)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  {isIndividual ? (
                    <User className="size-3.5 text-brand-chartreuse/80" />
                  ) : (
                    <Users className="size-3.5 text-brand-chartreuse/80" />
                  )}
                  {cuposActuales}/{cuposMaximos}{" "}
                  {isIndividual ? "jugadores" : "parejas"}
                </span>
              </div>
            </div>

            <button
              onClick={handleInscripcion}
              disabled={isDisabled}
              className={`relative shrink-0 w-full lg:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${btnClass}`}
            >
              {btnText}
            </button>
          </div>
        </header>

        <div
          className={`grid grid-cols-1 gap-6 items-start ${
            isAbierto ? "lg:grid-cols-[1fr_300px]" : ""
          }`}
        >
          <div className="min-w-0 space-y-5">
            {isAbierto ? (
              <section className="rounded-2xl border border-white/8 bg-[#0f0f0f] p-5 lg:p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Cupos</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isIndividual ? "Jugadores" : "Parejas"} registradas
                    </p>
                  </div>
                  <span className="text-sm font-black text-brand-chartreuse tabular-nums">
                    {cuposActuales}/{cuposMaximos}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-5">
                  <div
                    className="h-full rounded-full bg-brand-chartreuse transition-all"
                    style={{ width: `${cuposPct}%` }}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Formato
                    </p>
                    <p className="text-sm text-white font-medium">
                      {labelModalidad(torneo.modalidad)} · {torneo.formato || "Eliminatoria"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Sede
                    </p>
                    <p className="text-sm text-white font-medium truncate">
                      {torneo.clubes?.nombre ||
                        torneo.lugar ||
                        "Sede a confirmar"}
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <>
                {showZonasTab ? (
                  <div className="flex p-1 rounded-xl bg-[#0f0f0f] border border-white/8 gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTabPublica("zonas")}
                      className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTabPublica === "zonas"
                          ? "bg-brand-chartreuse text-brand-black"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Grupos
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTabPublica("llaves")}
                      className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTabPublica === "llaves"
                          ? "bg-brand-chartreuse text-brand-black"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Cuadro
                    </button>
                  </div>
                ) : null}

                {activeTabPublica === "zonas" && showZonasTab ? (
                  <div className="space-y-6">
                    {zonas.map((z: any) => {
                      const partidosZona = partidos.filter(
                        (p) =>
                          p.ronda?.toUpperCase() ===
                          z.nombre_grupo?.toUpperCase(),
                      );
                      const parejasFormatted = (z.grupo_parejas || []).map(
                        (gp: any) => ({
                          id: gp.inscripcion_id,
                          jugador1_nombre: gp.inscripciones?.jugador1_nombre,
                          jugador2_nombre: gp.inscripciones?.jugador2_nombre,
                          club: gp.clubName || "Sin club asignado",
                          cabezaDeSerie: gp.cabezaDeSerie,
                          usuario_id: gp.inscripciones?.usuario_id ?? null,
                          usuario2_id: gp.inscripciones?.usuario2_id ?? null,
                          denominacion_nacional:
                            gp.inscripciones?.denominacion_nacional ?? null,
                        }),
                      );

                      return (
                        <div key={z.id} className="space-y-3">
                          <TablaPosicionesZona
                            nombreZona={z.nombre_grupo}
                            parejasInscritas={parejasFormatted}
                            partidosZona={partidosZona}
                            alcance={torneo.alcance}
                          />
                          {partidosZona.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {partidosZona.map((p) => (
                                <MatchCard
                                  key={p.id}
                                  partido={p}
                                  alcance={torneo.alcance}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <PublicBracketView
                    partidos={partidos}
                    torneoId={torneoId}
                    isLive={isEnCurso}
                    isFinished={isFinalizado}
                    alcance={torneo.alcance}
                  />
                )}
              </>
            )}
          </div>

          {isAbierto ? (
            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-brand-chartreuse/20 bg-[#0f0f0f] p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Inscripción
                </p>
                <p className="text-3xl font-black text-brand-chartreuse tabular-nums mb-4">
                  {Number(torneo.precio_inscripcion || 0) === 0
                    ? "Gratis"
                    : `$${Number(torneo.precio_inscripcion || 0).toLocaleString("es-AR")}`}
                </p>
                <ul className="space-y-2.5 mb-5 text-xs text-gray-400">
                  <li className="flex items-center gap-2">
                    {isIndividual ? (
                      <User className="size-3.5 text-brand-chartreuse shrink-0" />
                    ) : (
                      <Users className="size-3.5 text-brand-chartreuse shrink-0" />
                    )}
                    {isIndividual ? "Individual" : "Por pareja"}
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-brand-chartreuse shrink-0" />
                    {torneo.formato || "Eliminatoria"}
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="size-3.5 text-brand-chartreuse shrink-0" />
                    Pago validado por admin
                  </li>
                </ul>
                <button
                  onClick={handleInscripcion}
                  disabled={isDisabled}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${btnClass}`}
                >
                  {btnText}
                </button>
              </div>

              {hasPremios ? (
                <div className="rounded-2xl border border-white/8 bg-[#0f0f0f] p-5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Trophy className="size-4 text-brand-chartreuse" />
                    Premios
                  </h3>
                  <div className="space-y-3">
                    {torneo.premio_1 ? (
                      <div className="flex items-center gap-3 text-sm text-gray-300">
                        <span className="size-7 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-black flex items-center justify-center border border-amber-500/25">
                          1
                        </span>
                        {torneo.premio_1}
                      </div>
                    ) : null}
                    {torneo.premio_2 ? (
                      <div className="flex items-center gap-3 text-sm text-gray-300">
                        <span className="size-7 rounded-full bg-slate-400/15 text-slate-300 text-[11px] font-black flex items-center justify-center border border-slate-400/25">
                          2
                        </span>
                        {torneo.premio_2}
                      </div>
                    ) : null}
                    {torneo.premio_3 ? (
                      <div className="flex items-center gap-3 text-sm text-gray-300">
                        <span className="size-7 rounded-full bg-amber-700/15 text-amber-600 text-[11px] font-black flex items-center justify-center border border-amber-700/25">
                          3
                        </span>
                        {torneo.premio_3}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>

      {torneo ? (
        <InscripcionModal
          isOpen={isInscripcionOpen}
          onClose={() => {
            setIsInscripcionModalOpen(false);
            router.refresh();
            setRefreshKey((prev) => prev + 1);
          }}
          torneo={torneo}
        />
      ) : null}
    </div>
  );
}
