"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  Loader2,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "@/utils/api";
import CustomDropdown from "@/components/ui/CustomDropdown";

interface ReservaAdmin {
  id: string;
  turno_id: string;
  usuario_id: string;
  fecha_reserva: string;
  estado_pago: "pendiente" | "completado" | "rechazado";
  estado_reserva: "confirmada" | "cancelada" | "pendiente";
  created_at: string;
  perfiles: {
    nombre: string | null;
    apellido: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
  turnos: {
    hora_inicio: string;
    hora_fin: string;
    precio: number;
    canchas: {
      nombre: string;
    } | null;
  } | null;
}

interface ClubDetalle {
  id: string;
  nombre: string;
}

export default function ReservasAdminPage() {
  const params = useParams();
  const clubId = params.id as string;

  const [club, setClub] = useState<ClubDetalle | null>(null);
  const [reservas, setReservas] = useState<ReservaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Fetch club info
  useEffect(() => {
    const fetchClub = async () => {
      try {
        const { data } = await api.get(`/clubes/${clubId}`);
        setClub(data.data);
      } catch {
        setClub(null);
      }
    };
    fetchClub();
  }, [clubId]);

  // Fetch reservas
  const fetchReservas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reservas/club/${clubId}`, {
        params: { fecha: selectedDate },
      });
      setReservas(data.data || []);
    } catch {
      setReservas([]);
    } finally {
      setLoading(false);
    }
  }, [clubId, selectedDate]);

  useEffect(() => {
    fetchReservas();
  }, [fetchReservas]);

  const formatHora = (time: string) => time.slice(0, 5);

  const formatFecha = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00Z");
    const dias = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const meses = [
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
    return `${dias[date.getUTCDay()]} ${date.getUTCDate()} de ${meses[date.getUTCMonth()]}`;
  };

  const filteredReservas = reservas.filter((r) => {
    if (statusFilter === "todos") return true;
    if (statusFilter === "confirmadas")
      return r.estado_reserva === "confirmada";
    if (statusFilter === "pendientes") return r.estado_reserva === "pendiente";
    if (statusFilter === "canceladas") return r.estado_reserva === "cancelada";
    return true;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 sm:p-10 space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/clubes"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-chartreuse transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a clubes
          </Link>
          <h1 className="text-2xl font-bold">
            Agenda de Reservas {club ? `— ${club.nombre}` : ""}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/clubes/${clubId}/reservas/transferencias`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-chartreuse text-black hover:brightness-110 rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-chartreuse/10"
          >
            Validar Transferencias
          </Link>
          <button
            onClick={fetchReservas}
            className="inline-flex items-center gap-2 px-3 py-2 bg-brand-card hover:bg-white/5 border border-white/10 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Controles de Filtros ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-brand-card border border-white/10 rounded-2xl p-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Seleccionar fecha
          </label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-brand-input border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-chartreuse/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Estado de la reserva
          </label>
          <CustomDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: "todos", label: "Todos los estados" },
              { value: "confirmadas", label: "Confirmadas" },
              { value: "pendientes", label: "Pendientes" },
              { value: "canceladas", label: "Canceladas" },
            ]}
            placeholder="Seleccionar estado..."
          />
        </div>

        <div className="flex flex-col justify-end text-sm text-gray-400">
          <p>Mostrando reservas para:</p>
          <p className="font-semibold text-white mt-1">
            {formatFecha(selectedDate)}
          </p>
        </div>
      </div>

      {/* ── Agenda/Listado de Reservas ───────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-chartreuse" />
        </div>
      ) : filteredReservas.length === 0 ? (
        <div className="text-center py-16 bg-brand-card border border-white/5 rounded-2xl">
          <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            No hay reservas registradas
          </h3>
          <p className="text-gray-500">
            No se encontraron reservas para el día y estado seleccionado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReservas.map((reserva) => {
            const isConfirmed = reserva.estado_reserva === "confirmada";
            const isPending = reserva.estado_reserva === "pendiente";
            const isCancelled = reserva.estado_reserva === "cancelada";

            return (
              <div
                key={reserva.id}
                className={`bg-brand-card border rounded-2xl p-6 space-y-4 transition-all hover:border-white/20 ${
                  isConfirmed
                    ? "border-green-500/20"
                    : isPending
                      ? "border-yellow-500/20"
                      : "border-red-500/20"
                }`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      {reserva.turnos?.canchas?.nombre ?? "Cancha desconocida"}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                      <Clock className="w-3.5 h-3.5 text-brand-chartreuse" />
                      <span>
                        {reserva.turnos
                          ? `${formatHora(reserva.turnos.hora_inicio)} - ${formatHora(
                              reserva.turnos.hora_fin,
                            )}`
                          : "Horario desconocido"}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isConfirmed
                        ? "bg-green-500/10 text-green-400"
                        : isPending
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {isConfirmed && <CheckCircle2 className="w-3 h-3" />}
                    {isPending && <AlertTriangle className="w-3 h-3" />}
                    {isCancelled && <XCircle className="w-3 h-3" />}
                    {reserva.estado_reserva.toUpperCase()}
                  </span>
                </div>

                {/* Datos del Jugador */}
                <div className="border-t border-white/5 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <User className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="font-medium">
                      {reserva.perfiles
                        ? `${reserva.perfiles.apellido || ""}, ${
                            reserva.perfiles.nombre || ""
                          }`.trim() || "Usuario sin nombre"
                        : "Usuario desconocido"}
                    </span>
                  </div>

                  {reserva.perfiles?.telefono && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                      <a
                        href={`tel:${reserva.perfiles.telefono}`}
                        className="hover:text-brand-chartreuse transition-colors"
                      >
                        {reserva.perfiles.telefono}
                      </a>
                    </div>
                  )}

                  {reserva.perfiles?.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                      <a
                        href={`mailto:${reserva.perfiles.email}`}
                        className="hover:text-brand-chartreuse transition-colors truncate"
                      >
                        {reserva.perfiles.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Datos Financieros */}
                <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span>Precio:</span>
                    <span className="text-white font-medium">
                      ${reserva.turnos?.precio ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Pago:</span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        reserva.estado_pago === "completado"
                          ? "bg-green-500/10 text-green-400"
                          : reserva.estado_pago === "pendiente"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {reserva.estado_pago.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
