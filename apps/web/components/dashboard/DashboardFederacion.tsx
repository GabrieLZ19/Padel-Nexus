"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Trophy,
  MapPin,
  Shield,
  BadgeDollarSign,
  Users,
  Scale,
  Plus,
  ArrowRight,
  Activity,
  Building2,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { LicenciasService } from "@/utils/services/licencias";
import { ClubesService } from "@/utils/services/clubes";
import { InscripcionesService } from "@/utils/services/inscripciones";
import { Torneo, Inscripcion, Club } from "@/utils/types";
import { FAP_ESTADOS_PAGO, FAP_ESTADOS_TORNEO } from "@/utils/constants/fap";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";
import NotificationCenter from "@/components/notificaciones/NotificationCenter";

export default function DashboardFederacion() {
  const router = useRouter();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [clubes, setClubs] = useState<Club[]>([]);
  const [licenciasTotal, setLicenciasTotal] = useState(0);
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
      TorneosService.getAll().catch(() => []),
      InscripcionesService.getAll().catch(() => []),
      ClubesService.getAll().catch(() => ({ data: [], total: 0 })),
      LicenciasService.getAll().catch(() => []),
    ]).then(([torneosData, inscripcionesData, clubesData, licenciasData]) => {
      if (isMounted) {
        setTorneos(torneosData || []);
        setInscripciones(inscripcionesData || []);
        setClubs(clubesData?.data || []);
        setLicenciasTotal(Array.isArray(licenciasData) ? licenciasData.length : 0);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // ==========================================
  // CÁLCULO DE MÉTRICAS NACIONALES
  // ==========================================
  const torneosNacionales = torneos.filter((t) => t.alcance === "Nacional");
  const torneosActivos = torneos.filter(
    (t) =>
      (t.estado || "").toLowerCase() === FAP_ESTADOS_TORNEO.INSCRIPCION.toLowerCase() ||
      (t.estado || "").toLowerCase() === FAP_ESTADOS_TORNEO.EN_CURSO.toLowerCase(),
  );

  const provinciasConClub = new Set(clubes.map((c) => (c as any).provincia).filter(Boolean));
  const asociacionesActivas = provinciasConClub.size;

  const inscripcionesConfirmadas = inscripciones.filter(
    (i) => i.estado_pago === FAP_ESTADOS_PAGO.CONFIRMADO,
  );
  const recaudacionTotal = inscripcionesConfirmadas.reduce(
    (acc, i) => acc + Number(i.monto),
    0,
  );
  const recaudacionPendiente = inscripciones
    .filter((i) => i.estado_pago === FAP_ESTADOS_PAGO.PENDIENTE)
    .reduce((a, b) => a + Number(b.monto), 0);

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
      title: "Torneos Nacionales",
      value: torneosNacionales.length.toString(),
      change: `${torneosActivos.length} activos`,
      icon: Trophy,
      trendIcon: Activity,
      color: "bg-[#2a3614]",
      borderColor: "border-brand-chartreuse/10",
      iconColor: "text-brand-chartreuse",
    },
    {
      title: "Provincias con Cobertura",
      value: asociacionesActivas.toString(),
      change: `De ${PROVINCIAS_ARG.length} totales`,
      icon: MapPin,
      trendIcon: Building2,
      color: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      title: "Licencias Federativas",
      value: licenciasTotal.toString(),
      change: "Emitidas",
      icon: Shield,
      trendIcon: Shield,
      color: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      iconColor: "text-purple-400",
    },
    {
      title: "Jugadores Federados",
      value: jugadoresUnicos.size.toString(),
      change: "En competencias",
      icon: Users,
      trendIcon: Users,
      color: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      title: "Clubes Registrados",
      value: clubes.length.toString(),
      change: "Red Nacional",
      icon: Building2,
      trendIcon: TrendingUp,
      color: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      iconColor: "text-amber-400",
    },
    {
      title: "Recaudación Nacional",
      value: formatMoney(recaudacionTotal),
      change: `${formatMoney(recaudacionPendiente)} pendiente`,
      icon: BadgeDollarSign,
      trendIcon: TrendingUp,
      color: "bg-[#2a3614]",
      borderColor: "border-brand-chartreuse/10",
      iconColor: "text-brand-chartreuse",
    },
  ];

  // Distribución de torneos por alcance
  const torneosPorAlcance = [
    { label: "Nacionales", count: torneos.filter((t) => t.alcance === "Nacional").length },
    { label: "Provinciales", count: torneos.filter((t) => t.alcance === "Provincial").length },
    { label: "Regionales", count: torneos.filter((t) => t.alcance === "Regional").length },
    { label: "Locales", count: torneos.filter((t) => t.alcance === "Local").length },
  ];
  const maxTorneos = Math.max(...torneosPorAlcance.map((t) => t.count), 1);

  // Últimos torneos (tabla de monitoreo)
  const ultimosTorneos = [...torneos]
    .sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime())
    .slice(0, 5);

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
      {/* HEADER INSTITUCIONAL */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-brand-chartreuse flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.2)]">
              <Scale className="size-5 text-brand-black" />
            </div>
            <span className="text-xs font-black text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
              Federación Nacional
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1 md:text-4xl">
            Panel de Federación
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Supervisión del ecosistema nacional · {dateString}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => router.push("/dashboard/torneos")}
            className="flex items-center justify-center gap-2 bg-brand-chartreuse hover:opacity-90 text-brand-black px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] text-sm cursor-pointer"
          >
            <Plus className="size-4" /> Nuevo Torneo Nacional
          </button>
          <div className="hidden md:block">
            <NotificationCenter />
          </div>
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
                <div className="flex items-center gap-1.5 bg-[#1c2e0e] text-gray-300 px-3 py-1.5 rounded-full text-[11px] font-bold border border-brand-chartreuse/20 tracking-wide">
                  <TrendIcon className="size-3.5 text-brand-chartreuse" />
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
        {/* Distribución por alcance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-[#151515] p-6 md:p-8 rounded-2xl border border-white/5 flex flex-col"
        >
          <h2 className="text-xl font-bold text-white mb-8">
            Torneos por Alcance
          </h2>
          <div className="flex flex-col gap-6 flex-1 justify-center">
            {torneosPorAlcance.map((item, index) => (
              <div key={index} className="w-full">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-gray-300">{item.label}</span>
                  <span className="text-sm font-black text-white">{item.count}</span>
                </div>
                <div className="w-full h-3 bg-brand-input rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max((item.count / maxTorneos) * 100, 5)}%` }}
                    transition={{ duration: 1.2, delay: 0.6 + index * 0.1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      index === 0
                        ? "bg-brand-chartreuse shadow-[0_0_15px_rgba(204,255,0,0.4)]"
                        : index === 1
                          ? "bg-blue-400"
                          : index === 2
                            ? "bg-purple-400"
                            : "bg-[#435723]"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Monitoreo de últimos torneos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="lg:col-span-2 bg-[#151515] p-6 md:p-8 rounded-2xl border border-white/5 flex flex-col"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              Últimos Torneos Creados
            </h2>
            <button
              onClick={() => router.push("/dashboard/torneos")}
              className="flex items-center gap-1.5 text-xs font-black text-brand-chartreuse hover:opacity-80 transition-opacity cursor-pointer"
            >
              Ver todos <ArrowRight className="size-3.5" />
            </button>
          </div>

          {ultimosTorneos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-10">
              <Trophy className="size-10 opacity-30 mb-3" />
              <p className="text-sm font-medium">No hay torneos creados aún.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    <th className="py-3 px-4">Torneo</th>
                    <th className="py-3 px-4">Alcance</th>
                    <th className="py-3 px-4">Sede</th>
                    <th className="py-3 px-4 text-center">Inscritos</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {ultimosTorneos.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-white/2 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/torneos/${t.id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white text-[13px]">{t.nombre}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {(t as any).rama || ""}{(t as any).rama ? " · " : ""}{t.categoria || "General"} · {t.nivel || "-"}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          t.alcance === "Nacional"
                            ? "bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20"
                            : t.alcance === "Provincial"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-white/5 text-gray-400 border border-white/10"
                        }`}>
                          {t.alcance || "Local"}
                        </span>
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
                            : t.estado === "En curso"
                              ? "text-[#ffb800]"
                              : t.estado === "Finalizado"
                                ? "text-blue-400"
                                : "text-gray-400"
                        }`}>
                          <span className={`size-1.5 rounded-full ${
                            t.estado === "Inscripción"
                              ? "bg-[#00ff88]"
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
          className="flex items-center gap-3 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 hover:border-brand-chartreuse/20 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="size-10 rounded-xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center text-brand-chartreuse group-hover:bg-brand-chartreuse group-hover:text-brand-black transition-all">
            <Trophy className="size-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Gestionar Torneos</p>
            <p className="text-[11px] text-gray-500">Crear, editar y supervisar competencias</p>
          </div>
        </button>
        <button
          onClick={() => router.push("/dashboard/jugadores")}
          className="flex items-center gap-3 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 hover:border-purple-500/20 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
            <Shield className="size-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Licencias y Jugadores</p>
            <p className="text-[11px] text-gray-500">Emitir, auditar y gestionar licencias FAP</p>
          </div>
        </button>
        <button
          onClick={() => router.push("/dashboard/clubes")}
          className="flex items-center gap-3 bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 hover:border-blue-500/20 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Building2 className="size-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Red de Clubes</p>
            <p className="text-[11px] text-gray-500">Supervisar clubes afiliados en todo el país</p>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
