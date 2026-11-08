"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Building2,
  Users,
  BadgeDollarSign,
  Shield,
  ArrowRight,
  Activity,
  TrendingUp,
  MapPin,
  Calendar,
  Landmark,
} from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { etiquetaNivelYCategoria } from "@/utils/etiquetaCategoria";
import { hrefDetalleTorneo } from "@/components/torneos/wizard/stepLocks";
import { InscripcionesService } from "@/utils/services/inscripciones";
import { ClubesService } from "@/utils/services/clubes";
import { Torneo, Inscripcion, Club } from "@/utils/types";
import {
  etiquetaActivos,
  etiquetaCategoriaInscripcion,
} from "@/utils/categoriaInscripcion";
import NotificationCenter from "@/components/notificaciones/NotificationCenter";

export default function DashboardProvincial() {
  const router = useRouter();
  const [provincialesTotal, setProvincialesTotal] = useState(0);
  const [provincialesActivos, setProvincialesActivos] = useState(0);
  const [clasificatoriosTotal, setClasificatoriosTotal] = useState(0);
  const [nacionalesTotal, setNacionalesTotal] = useState(0);
  const [ultimosProvinciales, setUltimosProvinciales] = useState<Torneo[]>([]);
  const [ultimosNacionales, setUltimosNacionales] = useState<Torneo[]>([]);
  const [indiceTorneo, setIndiceTorneo] = useState<
    Array<{
      id?: string;
      nivel?: string | null;
      categoria?: string | null;
      alcance?: string | null;
    }>
  >([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [pagosConfirmados, setPagosConfirmados] = useState(0);
  const [recaudacionConfirmada, setRecaudacionConfirmada] = useState(0);
  const [clubes, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const dateFormatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);
  const dateString =
    dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      TorneosService.getResumenTablero().catch(() => ({
        total: 0,
        activos: 0,
        porAlcance: {},
        ultimos: [] as Torneo[],
        provinciales_total: 0,
        provinciales_activos: 0,
        clasificatorios_total: 0,
        nacionales_total: 0,
        ultimos_provinciales: [] as Torneo[],
        ultimos_nacionales: [] as Torneo[],
        indice_torneo: [],
      })),
      InscripcionesService.getAll().catch(() => []),
      InscripcionesService.getResumen().catch(() => ({
        pendientes: 0,
        confirmadas: 0,
        rechazadas: 0,
        recaudacion: 0,
      })),
      ClubesService.getAll().catch(() => ({ data: [], total: 0 })),
    ]).then(([resumenTorneos, inscripcionesData, resumenPagos, clubesData]) => {
      if (isMounted) {
        setProvincialesTotal(resumenTorneos.provinciales_total ?? 0);
        setProvincialesActivos(resumenTorneos.provinciales_activos ?? 0);
        setClasificatoriosTotal(resumenTorneos.clasificatorios_total ?? 0);
        setNacionalesTotal(resumenTorneos.nacionales_total ?? 0);
        setUltimosProvinciales(resumenTorneos.ultimos_provinciales ?? []);
        setUltimosNacionales(resumenTorneos.ultimos_nacionales ?? []);
        setIndiceTorneo(resumenTorneos.indice_torneo ?? []);
        setInscripciones(inscripcionesData || []);
        setPagosConfirmados(resumenPagos.confirmadas);
        setRecaudacionConfirmada(resumenPagos.recaudacion);
        setClubs(clubesData?.data || []);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // ==========================================
  // CÁLCULO DE MÉTRICAS PROVINCIALES
  // ==========================================
  const jugadoresUnicos = new Set<string>();
  inscripciones.forEach((i) => {
    if (i.jugador1_nombre) jugadoresUnicos.add(i.jugador1_nombre.toLowerCase().trim());
    if (i.jugador2_nombre && i.jugador2_nombre !== "-")
      jugadoresUnicos.add(i.jugador2_nombre.toLowerCase().trim());
  });

  const formatMoney = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1).replace(".0", "")}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1).replace(".0", "")}K`;
    return `$${amount.toLocaleString("es-AR")}`;
  };

  const metrics = [
    {
      title: "Torneos Provinciales",
      value: provincialesTotal.toString(),
      change: etiquetaActivos(provincialesActivos),
      icon: Trophy,
      trendIcon: Activity,
      color: "bg-[#2a3614]",
      borderColor: "border-brand-chartreuse/10",
      iconColor: "text-brand-chartreuse",
    },
    {
      title: "Clasificatorios a Nacionales",
      value: clasificatoriosTotal.toString(),
      change: "Circuito",
      icon: TrendingUp,
      trendIcon: Trophy,
      color: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      iconColor: "text-amber-400",
    },
    {
      title: "Clubes Afiliados",
      value: clubes.length.toString(),
      change: "Red Provincial",
      icon: Building2,
      trendIcon: Building2,
      color: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      title: "Jugadores en Ranking",
      value: jugadoresUnicos.size.toString(),
      change: "Ranking Provincial",
      icon: Users,
      trendIcon: Users,
      color: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      title: "Parejas Inscritas",
      value: pagosConfirmados.toString(),
      change: "Confirmadas",
      icon: Shield,
      trendIcon: Shield,
      color: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      iconColor: "text-purple-400",
    },
    {
      title: "Recaudación Provincial",
      value: formatMoney(recaudacionConfirmada),
      change: "Consolidado",
      icon: BadgeDollarSign,
      trendIcon: TrendingUp,
      color: "bg-[#2a3614]",
      borderColor: "border-brand-chartreuse/10",
      iconColor: "text-brand-chartreuse",
    },
  ];

  // Distribución de inscripciones por categoría
  const torneoPorId = new Map(
    indiceTorneo
      .filter((torneo) => Boolean(torneo.id))
      .map((torneo) => [torneo.id as string, torneo]),
  );
  const categoriaCount: Record<string, number> = {};
  inscripciones.forEach((inscripcion) => {
    const torneo = torneoPorId.get(inscripcion.torneo_id);
    const cat = etiquetaCategoriaInscripcion({
      categoria: inscripcion.categoria,
      nivelTorneo: torneo?.nivel,
      categoriaTorneo: torneo?.categoria,
    });
    if (!cat) return;
    categoriaCount[cat] = (categoriaCount[cat] || 0) + 1;
  });
  const categoriasDistribucion = Object.entries(categoriaCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCategoria = Math.max(...categoriasDistribucion.map(([, c]) => c), 1);

  const [tabTorneos, setTabTorneos] = useState<"provinciales" | "nacionales">(
    "provinciales",
  );

  const ultimosTorneos =
    tabTorneos === "provinciales" ? ultimosProvinciales : ultimosNacionales;

  // --- SKELETON ---
  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10 animate-pulse">
        <div className="flex justify-between items-end">
          <div>
            <div className="w-72 h-10 bg-white/10 rounded-lg mb-2"></div>
            <div className="w-48 h-4 bg-white/5 rounded-md"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-[#151515] border border-white/5 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10">
      {/* HEADER INSTITUCIONAL PROVINCIAL */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Landmark className="size-5 text-white" />
            </div>
            <span className="text-xs font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
              Asociación Provincial
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1 md:text-4xl">
            Panel Provincial
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Gestión de competencias y red de clubes · {dateString}
          </p>
        </div>

        <div className="hidden md:block">
          <NotificationCenter />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {metrics.map((metric, index) => {
          const TrendIcon = metric.trendIcon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className="bg-[#151515] p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-44 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className={`size-12 ${metric.color} rounded-xl flex items-center justify-center border ${metric.borderColor}`}>
                  <metric.icon className={`size-6 ${metric.iconColor} stroke-[1.5]`} />
                </div>
                <div className="flex items-center gap-1.5 bg-blue-500/10 text-gray-300 px-3 py-1.5 rounded-full text-[11px] font-bold border border-blue-500/20 tracking-wide">
                  <TrendIcon className="size-3.5 text-blue-400" />
                  {metric.change}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-4xl font-bold text-white mb-1 tracking-tight">
                  {metric.value}
                </p>
                <h3 className="text-gray-400 font-medium text-sm">
                  {metric.title}
                </h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* SECCIÓN INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por Categoría */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-[#151515] p-6 md:p-8 rounded-2xl border border-white/5 flex flex-col"
        >
          <h2 className="text-xl font-bold text-white mb-8">
            Inscritos por Categoría
          </h2>
          <div className="flex flex-col gap-6 flex-1 justify-center">
            {categoriasDistribucion.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Sin datos de inscripciones aún.
              </p>
            ) : (
              categoriasDistribucion.map(([cat, count], index) => (
                <div key={cat} className="w-full">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium text-gray-300">{cat}</span>
                    <span className="text-sm font-black text-white">{count}</span>
                  </div>
                  <div className="w-full h-3 bg-brand-input rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max((count / maxCategoria) * 100, 8)}%` }}
                      transition={{ duration: 1.2, delay: 0.6 + index * 0.1, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        index === 0
                          ? "bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : index === 1
                            ? "bg-brand-chartreuse"
                            : index === 2
                              ? "bg-purple-400"
                              : "bg-[#435723]"
                      }`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Tabla de torneos recientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="lg:col-span-2 bg-[#151515] p-6 md:p-8 rounded-2xl border border-white/5 flex flex-col"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">
                Competencias Recientes
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {tabTorneos === "provinciales"
                  ? "Torneos provinciales y clasificatorios de tu jurisdicción"
                  : "Torneos nacionales del circuito (modo lectura)"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setTabTorneos("provinciales")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    tabTorneos === "provinciales"
                      ? "bg-blue-500 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Provinciales ({provincialesTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setTabTorneos("nacionales")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    tabTorneos === "nacionales"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Nacionales ({nacionalesTotal})
                </button>
              </div>
              <button
                onClick={() => router.push("/dashboard/torneos")}
                className="flex items-center gap-1.5 text-xs font-black text-blue-400 hover:opacity-80 transition-opacity cursor-pointer ml-1"
              >
                Ver todos <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>

          {ultimosTorneos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-10">
              <Trophy className="size-10 opacity-30 mb-3" />
              <p className="text-sm font-medium">
                {tabTorneos === "provinciales"
                  ? "No hay torneos provinciales creados aún."
                  : "No hay torneos nacionales disponibles."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    <th className="py-3 px-4">Competencia</th>
                    <th className="py-3 px-4">Sede</th>
                    <th className="py-3 px-4 text-center">Parejas</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {ultimosTorneos.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-white/2 transition-colors cursor-pointer"
                      onClick={() => router.push(hrefDetalleTorneo("/dashboard", t))}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white text-[13px]">{t.nombre}</p>
                          {t.alcance === "Nacional" ? (
                            <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              Nacional · Lectura
                            </span>
                          ) : (
                            <span className="rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                              {t.alcance || "Provincial"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {[(t as { rama?: string }).rama, etiquetaNivelYCategoria(t.nivel, t.categoria) || "General"].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-gray-300 font-medium text-[13px]">
                        {t.clubes?.nombre || "A confirmar"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-white font-black">{t.cupos_actuales || 0}</span>
                        <span className="text-gray-500 font-medium"> / {t.cupos_maximos || 32}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                          t.estado === "Inscripción"
                            ? "text-[#00ff88]"
                            : t.estado === "Programado"
                              ? "text-violet-400"
                              : t.estado === "En curso"
                                ? "text-[#ffb800]"
                                : t.estado === "Finalizado"
                                  ? "text-blue-400"
                                  : "text-gray-400"
                        }`}>
                          <span className={`size-1.5 rounded-full ${
                            t.estado === "Inscripción"
                              ? "bg-[#00ff88]"
                              : t.estado === "Programado"
                                ? "bg-violet-500"
                                : t.estado === "En curso"
                                  ? "bg-[#ffb800]"
                                  : t.estado === "Finalizado"
                                    ? "bg-blue-400"
                                    : "bg-gray-500"
                          }`} />
                          {t.estado || "Borrador"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* ACCIONES RÁPIDAS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <button
          onClick={() => router.push("/dashboard/torneos")}
          className="flex items-center gap-3 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 hover:border-blue-500/20 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Trophy className="size-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Crear Clasificatorio</p>
            <p className="text-[11px] text-gray-500">Nuevo torneo provincial o regional</p>
          </div>
        </button>
        <button
          onClick={() => router.push("/dashboard/clubes")}
          className="flex items-center gap-3 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 hover:border-brand-chartreuse/20 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="size-10 rounded-xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center text-brand-chartreuse group-hover:bg-brand-chartreuse group-hover:text-brand-black transition-all">
            <Building2 className="size-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Red de Clubes</p>
            <p className="text-[11px] text-gray-500">Gestionar sedes y clubes adheridos</p>
          </div>
        </button>
        <button
          onClick={() => router.push("/dashboard/jugadores")}
          className="flex items-center gap-3 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 hover:border-purple-500/20 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
            <Users className="size-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Ranking Provincial</p>
            <p className="text-[11px] text-gray-500">Posiciones y jugadores clasificados</p>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
