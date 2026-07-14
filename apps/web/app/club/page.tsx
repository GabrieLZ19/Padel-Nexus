"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  ArrowRight,
  Grid,
} from "lucide-react";
import Link from "next/link";
import { ClubPanelService } from "@/utils/services/club-panel";
import type { Club } from "@/utils/types";

interface Estadisticas {
  canchas_totales: number;
  canchas_activas: number;
  reservas_mes: number;
  ingresos_estimados: number;
  tasa_ocupacion: number;
}

export default function ClubDashboardPage() {
  const [club, setClub] = useState<Club | null>(null);
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [proximasReservas, setProximasReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const clubData = await ClubPanelService.getMiClub();
        setClub(clubData);

        const statsData = await ClubPanelService.getEstadisticas();
        setStats(statsData);

        const reservasData = await ClubPanelService.getReservas({
          page: 1,
          limit: 5,
        });
        setProximasReservas(reservasData.data);
      } catch (err) {
        console.error("Error al cargar datos del dashboard de club:", err);
      } finally {
        setLoading(false);
      }
    }
    cargarDatos();
  }, []);

  const formatHora = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const getEstadoPagoStyle = (estado: string) => {
    switch (estado) {
      case "completado":
        return "bg-green-500/10 text-green-500 border border-green-500/20";
      case "pendiente":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      default:
        return "bg-red-500/10 text-red-500 border border-red-500/20";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-brand-white/5 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-brand-white/5 rounded-3xl" />
          ))}
        </div>
        <div className="h-96 bg-brand-white/5 rounded-4xl" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Building2 className="size-16 mb-4 opacity-30 text-brand-chartreuse" />
        <h3 className="text-xl font-bold text-brand-white mb-2">
          Club no encontrado
        </h3>
        <p className="text-sm">
          Por favor, verifique que tenga un club asignado en su perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-brand-white">
            {club.nombre}
          </h1>
          <span className="bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20 px-3 py-1 rounded-full text-xs font-black uppercase">
            {club.estado}
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-2 font-medium">
          {club.localidad}, {club.provincia} · Panel de administración
          simplificado
        </p>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Canchas */}
        <div className="bg-brand-card border border-brand-white/5 p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Canchas
            </p>
            <h3 className="text-3xl font-black text-brand-white mt-2">
              {stats?.canchas_activas ?? 0}
              <span className="text-sm text-gray-500 font-medium">
                {" "}
                / {stats?.canchas_totales ?? 0} activas
              </span>
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center text-brand-chartreuse">
            <Grid className="size-5" />
          </div>
        </div>

        {/* Reservas del mes */}
        <div className="bg-brand-card border border-brand-white/5 p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Reservas (mes)
            </p>
            <h3 className="text-3xl font-black text-brand-white mt-2">
              {stats?.reservas_mes ?? 0}
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Calendar className="size-5" />
          </div>
        </div>

        {/* Ingresos estimados */}
        <div className="bg-brand-card border border-brand-white/5 p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Ingresos (mes)
            </p>
            <h3 className="text-3xl font-black text-brand-white mt-2">
              ${stats?.ingresos_estimados.toLocaleString("es-AR") ?? 0}
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
            <DollarSign className="size-5" />
          </div>
        </div>

        {/* Tasa de ocupación */}
        <div className="bg-brand-card border border-brand-white/5 p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Tasa Ocupación
            </p>
            <h3 className="text-3xl font-black text-brand-white mt-2">
              {stats?.tasa_ocupacion ?? 0}%
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Percent className="size-5" />
          </div>
        </div>
      </div>

      {/* Próximas reservas */}
      <div className="bg-brand-card border border-brand-white/5 rounded-4xl p-6 lg:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-brand-white">
              Próximas Reservas
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Monitoreo de turnos reservados del club
            </p>
          </div>
          <Link
            href="/club/reservas"
            className="flex items-center gap-2 text-xs font-black text-brand-chartreuse hover:opacity-80 transition-opacity"
          >
            Ver todas <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {proximasReservas.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-dashed border-brand-white/10 rounded-2xl">
            <Clock className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">
              No hay reservas programadas próximamente
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-white/5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="py-4 px-4">Fecha</th>
                  <th className="py-4 px-4">Cancha</th>
                  <th className="py-4 px-4">Horario</th>
                  <th className="py-4 px-4">Jugador</th>
                  <th className="py-4 px-4">Estado Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-white/5 text-sm">
                {proximasReservas.map((res) => (
                  <tr
                    key={res.id}
                    className="hover:bg-brand-white/2 transition-colors"
                  >
                    <td className="py-4 px-4 font-bold text-brand-white">
                      {new Date(
                        res.fecha_reserva + "T00:00:00",
                      ).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-4 px-4 text-gray-300 font-medium">
                      {res.turnos?.canchas?.nombre}
                    </td>
                    <td className="py-4 px-4 text-gray-300 font-medium">
                      {formatHora(res.turnos?.hora_inicio)} -{" "}
                      {formatHora(res.turnos?.hora_fin)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-brand-white">
                          {res.perfiles?.apellido?.toUpperCase()},{" "}
                          {res.perfiles?.nombre}
                        </span>
                        <span className="text-xs text-gray-500">
                          {res.perfiles?.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${getEstadoPagoStyle(res.estado_pago)}`}
                      >
                        {res.estado_pago}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
