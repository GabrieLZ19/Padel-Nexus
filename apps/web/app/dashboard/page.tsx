"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Trophy,
  ClipboardList,
  BadgeDollarSign,
  Calendar,
  Bell,
  TrendingUp,
  CalendarCheck,
  ShoppingBag,
} from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { InscripcionesService } from "@/utils/services/inscripciones";
import { Torneo, Inscripcion } from "@/utils/types";

export default function DashboardHome() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);

  // Fecha actual formateada
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

    // Obtenemos todos los datos en paralelo para mayor velocidad
    Promise.all([
      TorneosService.getAll().catch(() => []),
      InscripcionesService.getAll().catch(() => []),
    ]).then(([torneosData, inscripcionesData]) => {
      if (isMounted) {
        setTorneos(torneosData || []);
        setInscripciones(inscripcionesData || []);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // ==========================================
  // 🧮 CÁLCULO DINÁMICO DE MÉTRICAS
  // ==========================================

  // 1. Torneos y Reservas Activas
  const torneosActivos = torneos.filter(
    (t) => t.estado === "Inscripción" || t.estado === "En curso",
  ).length;
  const inscripcionesTorneo = inscripciones.filter(
    (i) => !i.tipo || i.tipo === "Inscripción torneo",
  );
  const reservasCancha = inscripciones.filter(
    (i) => i.tipo === "Reserva cancha",
  );

  // 2. Ingresos (Solo contamos lo que está "Confirmado")
  const ingresosTorneos = inscripcionesTorneo
    .filter((i) => i.estado_pago === "Confirmado")
    .reduce((a, b) => a + Number(b.monto), 0);
  const ingresosReservas = reservasCancha
    .filter((i) => i.estado_pago === "Confirmado")
    .reduce((a, b) => a + Number(b.monto), 0);
  const ingresosTotales = ingresosTorneos + ingresosReservas;

  // 3. Usuarios Únicos (Aproximación leyendo los nombres de jugadores en inscripciones)
  const uniqueUsers = new Set();
  inscripciones.forEach((i) => {
    if (i.jugador1_nombre)
      uniqueUsers.add(i.jugador1_nombre.toLowerCase().trim());
    if (i.jugador2_nombre && i.jugador2_nombre !== "-")
      uniqueUsers.add(i.jugador2_nombre.toLowerCase().trim());
  });
  const usuariosActivos = uniqueUsers.size;

  // ==========================================
  // 📊 CÁLCULO DE GRÁFICOS
  // ==========================================

  // Gráfico de Barras: Últimos 7 meses de inscripciones
  const monthNames = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const currentMonthIndex = today.getMonth();

  const last7Months = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setMonth(currentMonthIndex - 6 + i);
    return {
      monthIndex: d.getMonth(),
      year: d.getFullYear(),
      label: monthNames[d.getMonth()],
      count: 0,
    };
  });

  // Contamos inscripciones por mes
  inscripciones.forEach((ins) => {
    const d = new Date(ins.created_at);
    const m = d.getMonth();
    const y = d.getFullYear();
    const targetMonth = last7Months.find(
      (lm) => lm.monthIndex === m && lm.year === y,
    );
    if (targetMonth) targetMonth.count++;
  });

  const maxCount = Math.max(...last7Months.map((m) => m.count), 1); // Evitamos división por 0

  const barChartData = last7Months.map((m, index) => ({
    month: m.label,
    height: `${Math.max((m.count / maxCount) * 100, 10)}%`, // Altura dinámica (minimo 10% para que se vea la barra)
    active: index === 6, // El mes actual siempre es el último y está activo
  }));

  // Gráfico de Progreso Horizontal (Distribución de Ingresos)
  const totalCalc = ingresosTotales > 0 ? ingresosTotales : 1;
  const progressData = [
    {
      label: "Inscripciones torneos",
      percentage: Math.round((ingresosTorneos / totalCalc) * 100),
    },
    {
      label: "Reservas de canchas",
      percentage: Math.round((ingresosReservas / totalCalc) * 100),
    },
    { label: "Marketplace", percentage: 0 },
    { label: "Licencias", percentage: 0 },
  ];

  // ==========================================
  // 🎨 FORMATEO DE UI
  // ==========================================

  const formatMoney = (amount: number) => {
    if (amount >= 1000000)
      return `$${(amount / 1000000).toFixed(1).replace(".0", "")}M`;
    if (amount >= 1000)
      return `$${(amount / 1000).toFixed(1).replace(".0", "")}K`;
    return `$${amount.toLocaleString("es-AR")}`;
  };

  const metrics = [
    {
      title: "Jugadores en la red",
      value: usuariosActivos.toString(),
      change: "+12%",
      icon: Users,
    },
    {
      title: "Torneos activos",
      value: torneosActivos.toString(),
      change: "En curso",
      icon: Trophy,
    },
    {
      title: "Inscripciones a torneos",
      value: inscripcionesTorneo.length.toString(),
      change: "Totales",
      icon: ClipboardList,
    },
    {
      title: "Reservas del mes",
      value: reservasCancha.length.toString(),
      change: "Canchas",
      icon: CalendarCheck,
    },
    {
      title: "Ventas marketplace",
      value: "$0",
      change: "Fase 2",
      icon: ShoppingBag,
    },
    {
      title: "Ingresos netos",
      value: formatMoney(ingresosTotales),
      change: "+15%",
      icon: BadgeDollarSign,
    },
  ];

  // --- SKELETON DE CARGA ---
  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10 animate-pulse">
        <div className="flex justify-between items-end">
          <div>
            <div className="w-48 h-10 bg-white/10 rounded-lg mb-2"></div>
            <div className="w-64 h-4 bg-white/5 rounded-md"></div>
          </div>
          <div className="w-32 h-10 bg-white/10 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-55 bg-[#151515] border border-white/5 rounded-2xl"
            ></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-105 bg-[#151515] border border-white/5 rounded-2xl"></div>
          <div className="h-105 bg-[#151515] border border-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10">
      {/* HEADER SUPERIOR */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2 md:text-4xl">
            Dashboard
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Resumen general · {dateString}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button className="w-full sm:w-auto min-w-35 flex items-center justify-center gap-2.5 bg-transparent border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white px-3 py-2 rounded-2xl transition-colors text-sm font-medium">
            <Calendar className="size-4 text-padel-4" />
            Últimos 30 días
          </button>
          <button className="w-full sm:w-auto min-w-14 flex items-center justify-center h-10 bg-transparent border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white rounded-2xl transition-colors relative">
            <div className="absolute top-2.5 right-2.5 size-1.5 bg-padel-4 rounded-full shadow-[0_0_8px_rgba(204,255,0,0.8)]"></div>
            <Bell className="size-5" />
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="bg-[#151515] p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-55 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="size-12 bg-[#2a3614] rounded-xl flex items-center justify-center border border-padel-4/10">
                <metric.icon className="size-6 text-padel-4 stroke-[1.5]" />
              </div>
              <div className="flex items-center gap-1 bg-[#1c2e0e] text-padel-4 px-2.5 py-1 rounded-full text-[11px] font-bold border border-padel-4/20 uppercase tracking-widest">
                {metric.change.includes("%") && (
                  <TrendingUp className="size-3.5 stroke-3" />
                )}
                {metric.change}
              </div>
            </div>
            <div className="mt-6">
              <p className="text-5xl font-bold text-white mb-1 tracking-tight">
                {metric.value}
              </p>
              <h3 className="text-gray-400 font-medium text-sm">
                {metric.title}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* SECCIÓN INFERIOR: GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO 1: Barras */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="lg:col-span-2 bg-[#151515] p-6 md:p-8 rounded-2xl border border-white/5 flex flex-col min-h-105"
        >
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xl font-bold text-white">
              Volumen de transacciones
            </h2>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Últimos 7 meses
            </span>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="min-w-120 grid grid-cols-7 gap-3 md:grid-cols-7 md:min-w-0">
              {barChartData.map((data, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center w-full group relative"
                >
                  {/* Tooltip con el valor real */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 text-xs font-bold bg-white text-black px-2 py-1 rounded transition-opacity pointer-events-none">
                    {data.height === "10%" && last7Months[index].count === 0
                      ? "0"
                      : last7Months[index].count}{" "}
                    req.
                  </div>

                  <div className="w-full relative flex justify-center h-40 md:h-60 items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: data.height }}
                      transition={{
                        duration: 1,
                        delay: 0.5 + index * 0.1,
                        ease: "easeOut",
                      }}
                      className={`w-full max-w-17.5 rounded-t-xl transition-all duration-300 ${
                        data.active
                          ? "bg-padel-4 shadow-[0_0_30px_rgba(204,255,0,0.25)]"
                          : "bg-[#33421b] group-hover:bg-[#435723]"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-sm font-medium mt-6 ${data.active ? "text-padel-4 font-bold" : "text-gray-400"}`}
                  >
                    {data.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* GRÁFICO 2: Progreso Horizontal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="bg-[#151515] p-8 rounded-2xl border border-white/5 flex flex-col"
        >
          <h2 className="text-xl font-bold text-white mb-10">
            Ingresos por área
          </h2>

          <div className="flex flex-col gap-8 justify-center flex-1">
            {progressData.map((item, index) => (
              <div key={index} className="w-full">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm font-medium text-gray-300">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-gray-400">
                    {item.percentage}%
                  </span>
                </div>
                <div className="w-full h-3 bg-[#222222] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{
                      duration: 1.2,
                      delay: 0.8 + index * 0.1,
                      ease: "easeOut",
                    }}
                    className={`h-full rounded-full ${
                      index === 0
                        ? "bg-padel-4 shadow-[0_0_15px_rgba(204,255,0,0.4)]"
                        : index === 1
                          ? "bg-[#00ff88]"
                          : "bg-[#435723]"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
