"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarCheck,
  ClipboardList,
  Landmark,
  Scale,
  ShoppingBag,
  Trophy,
  Users,
} from "lucide-react";
import NotificationCenter from "@/components/notificaciones/NotificationCenter";
import {
  CrmDashboardService,
  type CrmMetricas,
} from "@/utils/services/crm-dashboard";

const METRICAS_VACIAS: CrmMetricas = {
  federaciones: 0,
  asociaciones: 0,
  clubes: 0,
  jugadores: 0,
  torneos_activos: 0,
  torneos_finalizados: 0,
  torneos_borrador: 0,
  inscripciones_total: 0,
  inscripciones_pagadas: 0,
  inscripciones_pendientes: 0,
  reservas_mes: 0,
  ventas_marketplace: 0,
  ventas_marketplace_count: 0,
  ingresos_netos: 0,
  ingresos_pendientes: 0,
};

function formatMoney(amount: number) {
  if (amount >= 1000000)
    return `$${(amount / 1000000).toFixed(1).replace(".0", "")}M`;
  if (amount >= 1000)
    return `$${(amount / 1000).toFixed(1).replace(".0", "")}K`;
  return `$${amount.toLocaleString("es-AR")}`;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

interface RedItem {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
}

export default function DashboardSuperadmin() {
  const router = useRouter();
  const [metricas, setMetricas] = useState<CrmMetricas>(METRICAS_VACIAS);
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
    let mounted = true;
    CrmDashboardService.getMetricas()
      .then((data) => {
        if (mounted && data) setMetricas(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const red: RedItem[] = [
    {
      label: "Federaciones",
      value: metricas.federaciones,
      href: "/dashboard/federaciones",
      icon: Scale,
    },
    {
      label: "Asociaciones",
      value: metricas.asociaciones,
      href: "/dashboard/asociaciones",
      icon: Landmark,
    },
    {
      label: "Clubes",
      value: metricas.clubes,
      href: "/dashboard/clubes",
      icon: Building2,
    },
    {
      label: "Jugadores",
      value: metricas.jugadores,
      href: "/dashboard/jugadores",
      icon: Users,
    },
  ];

  const torneosTotal =
    metricas.torneos_activos +
    metricas.torneos_finalizados +
    metricas.torneos_borrador;

  const torneoEstados = [
    {
      label: "Activos",
      value: metricas.torneos_activos,
      color: "bg-brand-chartreuse",
      text: "text-brand-chartreuse",
    },
    {
      label: "Finalizados",
      value: metricas.torneos_finalizados,
      color: "bg-blue-400",
      text: "text-blue-400",
    },
    {
      label: "Borrador",
      value: metricas.torneos_borrador,
      color: "bg-white/25",
      text: "text-gray-300",
    },
  ];

  const inscripcionesDenominador = Math.max(metricas.inscripciones_total, 1);
  const pctPagadas = percent(
    metricas.inscripciones_pagadas,
    inscripcionesDenominador,
  );
  const pctPendientes = percent(
    metricas.inscripciones_pendientes,
    inscripcionesDenominador,
  );

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10 animate-pulse">
        <div className="w-80 h-10 bg-white/10 rounded-lg" />
        <div className="h-40 bg-[#151515] border border-white/5 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-[#151515] border border-white/5 rounded-3xl" />
          <div className="h-64 bg-[#151515] border border-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-10 md:px-10 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-brand-chartreuse flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.2)]">
              <Scale className="size-5 text-brand-black" />
            </div>
            <span className="text-xs font-black text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
              Superadmin · CRM
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1 md:text-4xl">
            Panel de la red
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Visión consolidada de federaciones, asociaciones, clubes y operación ·{" "}
            {dateString}
          </p>
        </div>
        <div className="hidden md:block">
          <NotificationCenter />
        </div>
      </div>

      {/* RED INSTITUCIONAL */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SectionHeading
          kicker="01"
          title="La red"
          hint="Quiénes forman el ecosistema"
        />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {red.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.href)}
              className="group bg-[#151515] border border-white/5 hover:border-brand-chartreuse/30 rounded-2xl p-5 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="size-10 rounded-xl bg-[#2a3614] border border-brand-chartreuse/15 flex items-center justify-center">
                  <item.icon className="size-5 text-brand-chartreuse stroke-[1.5]" />
                </div>
                <ArrowRight className="size-4 text-gray-600 group-hover:text-brand-chartreuse transition-colors" />
              </div>
              <p className="text-4xl font-bold text-white tracking-tight">
                {item.value}
              </p>
              <p className="text-sm text-gray-400 mt-1">{item.label}</p>
            </button>
          ))}
        </div>
      </motion.section>

      {/* COMPETENCIA */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
      >
        <SectionHeading
          kicker="02"
          title="Competencia"
          hint="Estado de torneos e inscripciones"
        />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard/torneos")}
            className="lg:col-span-3 group bg-[#151515] border border-white/5 hover:border-brand-chartreuse/30 rounded-3xl p-6 md:p-8 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">
                  Torneos
                </p>
                <p className="text-5xl font-bold text-white tracking-tight">
                  {torneosTotal}
                </p>
                <p className="text-sm text-gray-400 mt-1">en el circuito</p>
              </div>
              <div className="size-12 rounded-xl bg-[#2a3614] border border-brand-chartreuse/15 flex items-center justify-center">
                <Trophy className="size-6 text-brand-chartreuse stroke-[1.5]" />
              </div>
            </div>

            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex mb-6">
              {torneoEstados.map((estado) => {
                const width = percent(estado.value, Math.max(torneosTotal, 1));
                if (width === 0 && torneosTotal > 0) return null;
                return (
                  <div
                    key={estado.label}
                    className={`${estado.color} h-full first:rounded-l-full last:rounded-r-full`}
                    style={{
                      width: torneosTotal === 0 ? "33.33%" : `${width}%`,
                      opacity: torneosTotal === 0 ? 0.25 : 1,
                    }}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {torneoEstados.map((estado) => (
                <div
                  key={estado.label}
                  className="rounded-2xl bg-black/30 border border-white/5 px-3 py-3"
                >
                  <p className={`text-2xl font-bold ${estado.text}`}>
                    {estado.value}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                    {estado.label}
                  </p>
                </div>
              ))}
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/inscripciones")}
            className="lg:col-span-2 group bg-[#151515] border border-white/5 hover:border-brand-chartreuse/30 rounded-3xl p-6 md:p-8 text-left transition-colors cursor-pointer flex flex-col"
          >
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">
                  Inscripciones
                </p>
                <p className="text-5xl font-bold text-white tracking-tight">
                  {metricas.inscripciones_total}
                </p>
                <p className="text-sm text-gray-400 mt-1">a torneos</p>
              </div>
              <div className="size-12 rounded-xl bg-[#2a3614] border border-brand-chartreuse/15 flex items-center justify-center">
                <ClipboardList className="size-6 text-brand-chartreuse stroke-[1.5]" />
              </div>
            </div>

            <div className="mt-auto space-y-4">
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex">
                <div
                  className="h-full bg-brand-chartreuse"
                  style={{ width: `${pctPagadas}%` }}
                />
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${pctPendientes}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/30 border border-white/5 px-3 py-3">
                  <p className="text-xl font-bold text-brand-chartreuse">
                    {metricas.inscripciones_pagadas}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                    Pagadas
                  </p>
                </div>
                <div className="rounded-2xl bg-black/30 border border-white/5 px-3 py-3">
                  <p className="text-xl font-bold text-amber-400">
                    {metricas.inscripciones_pendientes}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                    Pendientes
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>
      </motion.section>

      {/* OPERACIÓN */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.4 }}
      >
        <SectionHeading
          kicker="03"
          title="Operación"
          hint="Reservas, marketplace e ingresos"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard/inscripciones")}
            className="lg:col-span-1 group relative overflow-hidden bg-[#151515] border border-brand-chartreuse/20 hover:border-brand-chartreuse/40 rounded-3xl p-6 md:p-8 text-left transition-colors cursor-pointer"
          >
            <div className="absolute -right-6 -top-6 size-28 rounded-full bg-brand-chartreuse/8" />
            <div className="flex items-center justify-between mb-8 relative">
              <p className="text-[11px] font-black uppercase tracking-widest text-brand-chartreuse">
                Ingresos netos
              </p>
              <BadgeDollarSign className="size-5 text-brand-chartreuse" />
            </div>
            <p className="text-5xl font-bold text-white tracking-tight relative">
              {formatMoney(metricas.ingresos_netos)}
            </p>
            <p className="text-sm text-gray-400 mt-3 relative">
              {formatMoney(metricas.ingresos_pendientes)} todavía pendientes
            </p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/clubes")}
            className="group bg-[#151515] border border-white/5 hover:border-brand-chartreuse/30 rounded-3xl p-6 md:p-8 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-8">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                Reservas del mes
              </p>
              <CalendarCheck className="size-5 text-blue-400" />
            </div>
            <p className="text-5xl font-bold text-white tracking-tight">
              {metricas.reservas_mes}
            </p>
            <p className="text-sm text-gray-400 mt-3">
              Turnos cargados en el mes en curso
            </p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/marketplace")}
            className="group bg-[#151515] border border-white/5 hover:border-brand-chartreuse/30 rounded-3xl p-6 md:p-8 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-8">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                Ventas Marketplace
              </p>
              <ShoppingBag className="size-5 text-purple-400" />
            </div>
            <p className="text-5xl font-bold text-white tracking-tight">
              {formatMoney(metricas.ventas_marketplace)}
            </p>
            <p className="text-sm text-gray-400 mt-3">
              {metricas.ventas_marketplace_count} órdenes cobradas
            </p>
          </button>
        </div>
      </motion.section>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  hint,
}: {
  kicker: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-chartreuse/80 mb-1">
        {kicker}
      </p>
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-gray-500 hidden sm:block">{hint}</p>
      </div>
    </div>
  );
}
