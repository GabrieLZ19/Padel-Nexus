"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Sun,
  CloudRain,
} from "lucide-react";
import { api } from "@/utils/api";
import type { SlotDisponible } from "@/utils/types/club.types";

interface ClubDetalle {
  id: string;
  nombre: string;
  provincia: string;
  localidad: string;
}

export default function ClubHorariosPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.id as string;
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [club, setClub] = useState<ClubDetalle | null>(null);
  const [slots, setSlots] = useState<SlotDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponible | null>(null);
  const [reservando, setReservando] = useState(false);

  // Fetch club data
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

  // Fetch disponibilidad
  const fetchDisponibilidad = useCallback(async () => {
    setLoading(true);
    setSelectedSlot(null);
    try {
      const { data } = await api.get("/reservas/disponibles", {
        params: { club_id: clubId, fecha: selectedDate },
      });
      setSlots(data.data || []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [clubId, selectedDate]);

  useEffect(() => {
    fetchDisponibilidad();
  }, [fetchDisponibilidad]);

  // Navegar entre días
  const changeDate = (direction: number) => {
    const date = new Date(selectedDate + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + direction);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date >= today) {
      setSelectedDate(date.toISOString().split("T")[0]);
    }
  };

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
    return `${dias[date.getUTCDay()]} ${date.getUTCDate()} ${meses[date.getUTCMonth()]}`;
  };

  const formatHora = (time: string) => time.slice(0, 5);

  // Agrupar slots por cancha
  const slotsPorCancha = slots.reduce(
    (acc, slot) => {
      if (!acc[slot.cancha_id]) {
        acc[slot.cancha_id] = {
          cancha_nombre: slot.cancha_nombre,
          tipo_suelo: slot.tipo_suelo,
          techada: slot.techada,
          slots: [],
        };
      }
      acc[slot.cancha_id].slots.push(slot);
      return acc;
    },
    {} as Record<
      string,
      {
        cancha_nombre: string;
        tipo_suelo: string | null;
        techada: boolean;
        slots: SlotDisponible[];
      }
    >,
  );

  // Reservar
  const handleReservar = () => {
    if (!selectedSlot) return;
    router.push(`/reservar/checkout/new?turno_id=${selectedSlot.turno_id}&fecha_reserva=${selectedDate}`);
  };

  // Generar los próximos 7 días
  const getNextDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const next = new Date(today);
      next.setDate(today.getDate() + i);
      days.push(next.toISOString().split("T")[0]);
    }
    return days;
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00Z");
    const names = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return names[date.getUTCDay()];
  };

  const getDayNumber = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00Z");
    return date.getUTCDate();
  };

  return (
    <main className="min-h-screen pt-24 pb-16">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Breadcrumb y Header Premium ─────────────────── */}
        <div className="mb-6">
          <Link
            href="/reservar"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-chartreuse transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver a clubes
          </Link>

          {club && (
            <div className="bg-brand-card border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 hover:shadow-[0_0_30px_rgba(203,254,1,0.02)] transition-shadow">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                  {club.nombre}
                </h1>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-chartreuse" />
                    {club.localidad}, {club.provincia}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/10 hidden sm:inline" />
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-chartreuse/10 text-brand-chartreuse text-xs font-semibold">
                    Club Afiliado FAP
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Selector de Fecha con Cápsulas Premium ──────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex-1 overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-2 min-w-max">
              {getNextDays().map((dateStr) => {
                const isActive = selectedDate === dateStr;
                const isToday =
                  new Date().toISOString().split("T")[0] === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex flex-col items-center justify-center w-16 py-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-brand-chartreuse border-brand-chartreuse text-black shadow-[0_0_15px_rgba(203,254,1,0.15)]"
                        : "bg-brand-card border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      {isToday ? "Hoy" : getDayName(dateStr)}
                    </span>
                    <span className="text-lg font-bold mt-1">
                      {getDayNumber(dateStr)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 bg-brand-card border border-white/10 rounded-xl p-3.5 shrink-0">
            <button
              onClick={() => changeDate(-1)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
              disabled={selectedDate <= new Date().toISOString().split("T")[0]}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div
              className="relative cursor-pointer group"
              onClick={() => dateInputRef.current?.showPicker()}
            >
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="absolute inset-0 opacity-0 pointer-events-none w-0 h-10"
              />
              <button className="flex items-center gap-2 text-sm text-gray-400 group-hover:text-white transition-colors py-1 px-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer">
                <Calendar className="w-4 h-4 text-brand-chartreuse" />
                <span className="font-medium text-xs sm:text-sm">
                  {formatFecha(selectedDate)}
                </span>
              </button>
            </div>

            <button
              onClick={() => changeDate(1)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Grilla de Canchas ──────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-chartreuse" />
          </div>
        ) : Object.keys(slotsPorCancha).length === 0 ? (
          <div className="text-center py-16 bg-brand-card border border-white/5 rounded-2xl">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              Sin horarios disponibles
            </h3>
            <p className="text-gray-500">
              No hay turnos configurados para este día. Probá otro día.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(slotsPorCancha).map(([canchaId, cancha]) => (
              <div
                key={canchaId}
                className="bg-brand-card border border-white/5 rounded-2xl p-6"
              >
                {/* Encabezado de cancha */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-chartreuse/10 flex items-center justify-center">
                    {cancha.techada ? (
                      <Sun className="w-5 h-5 text-brand-chartreuse" />
                    ) : (
                      <CloudRain className="w-5 h-5 text-brand-moss" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{cancha.cancha_nombre}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {cancha.tipo_suelo && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5">
                          {cancha.tipo_suelo}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-white/5">
                        {cancha.techada ? "Techada" : "Descubierta"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid de slots horarios */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {cancha.slots.map((slot) => {
                    const isSelected = selectedSlot?.turno_id === slot.turno_id;
                    const now = new Date();
                    const slotDateTime = new Date(`${selectedDate}T${slot.hora_inicio}`);
                    const isPast = slotDateTime < now;
                    const isDisponibleReal = slot.disponible && !isPast;

                    return (
                      <button
                        key={slot.turno_id}
                        disabled={!isDisponibleReal}
                        onClick={() =>
                          setSelectedSlot(isSelected ? null : slot)
                        }
                        className={`relative p-3 rounded-xl border text-center transition-all duration-200 ${
                          !isDisponibleReal
                            ? "bg-white/5 border-white/5 text-gray-600 cursor-not-allowed opacity-50"
                            : isSelected
                              ? "bg-brand-chartreuse border-brand-chartreuse text-black shadow-[0_0_20px_rgba(203,254,1,0.2)]"
                              : "bg-brand-card border-white/10 hover:border-brand-chartreuse/40 text-white hover:shadow-[0_0_15px_rgba(203,254,1,0.05)]"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-chartreuse rounded-full flex items-center justify-center border-2 border-brand-black">
                            <Check className="w-3 h-3 text-black" />
                          </div>
                        )}
                        <p className="text-sm font-semibold">
                          {formatHora(slot.hora_inicio)}
                        </p>
                        <p className="text-[10px] opacity-70">
                          {formatHora(slot.hora_fin)}
                        </p>
                        <p
                          className={`text-xs font-medium mt-1 ${
                            isSelected
                              ? "text-black/70"
                              : "text-brand-chartreuse"
                          }`}
                        >
                          ${slot.precio}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Barra de Confirmación Fija ─────────────────── */}
        {selectedSlot && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-brand-card/95 backdrop-blur-xl border-t border-white/10 p-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Turno seleccionado</p>
                <p className="font-semibold">
                  {selectedSlot.cancha_nombre} ·{" "}
                  {formatHora(selectedSlot.hora_inicio)} -{" "}
                  {formatHora(selectedSlot.hora_fin)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-2xl font-bold text-brand-chartreuse">
                  ${selectedSlot.precio}
                </p>
                <button
                  onClick={handleReservar}
                  disabled={reservando}
                  className="px-6 py-3 bg-brand-chartreuse text-black font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {reservando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reservando...
                    </>
                  ) : (
                    "Reservar ahora"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
