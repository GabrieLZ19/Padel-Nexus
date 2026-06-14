"use client";

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

export default function DashboardHome() {
  // Obtenemos la fecha actual
  const today = new Date();
  const dateFormatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);
  const dateString =
    dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  // Las 6 tarjetas exactas de la referencia
  const metrics = [
    { title: "Usuarios activos", value: "4.820", change: "+12%", icon: Users },
    { title: "Torneos activos", value: "48", change: "+5%", icon: Trophy },
    {
      title: "Inscripciones",
      value: "1.284",
      change: "+18%",
      icon: ClipboardList,
    },
    {
      title: "Reservas del mes",
      value: "932",
      change: "+9%",
      icon: CalendarCheck,
    },
    {
      title: "Ventas marketplace",
      value: "$2,4M",
      change: "+22%",
      icon: ShoppingBag,
    },
    {
      title: "Ingresos totales",
      value: "$5,8M",
      change: "+15%",
      icon: BadgeDollarSign,
    },
  ];

  const barChartData = [
    { month: "Ene", height: "35%" },
    { month: "Feb", height: "55%" },
    { month: "Mar", height: "45%" },
    { month: "Abr", height: "80%" },
    { month: "May", height: "65%" },
    { month: "Jun", height: "100%", active: true },
    { month: "Jul", height: "70%" },
  ];

  const progressData = [
    { label: "Inscripciones torneos", percentage: 78 },
    { label: "Reservas de canchas", percentage: 62 },
    { label: "Marketplace", percentage: 54 },
    { label: "Licencias", percentage: 38 },
  ];

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

      {/* TARJETAS DE MÉTRICAS (KPIs) - Ahora con grilla responsiva */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="bg-[#151515] p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-55"
          >
            <div className="flex items-start justify-between">
              <div className="size-12 bg-[#2a3614] rounded-xl flex items-center justify-center border border-padel-4/10">
                <metric.icon className="size-6 text-padel-4 stroke-[1.5]" />
              </div>
              <div className="flex items-center gap-1 bg-[#1c2e0e] text-padel-4 px-2.5 py-1 rounded-full text-xs font-bold border border-padel-4/20">
                <TrendingUp className="size-3.5 stroke-3" />
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
          <h2 className="text-xl font-bold text-white mb-10">
            Inscripciones por mes
          </h2>

          <div className="overflow-x-auto pb-4">
            <div className="min-w-120 grid grid-cols-7 gap-3 md:grid-cols-7 md:min-w-0">
              {barChartData.map((data, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center w-full group"
                >
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
                  <span className="text-sm text-gray-400 font-medium mt-6">
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
                    className={`h-full rounded-full ${index === 0 ? "bg-padel-4 shadow-[0_0_15px_rgba(204,255,0,0.4)]" : "bg-[#435723]"}`}
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
