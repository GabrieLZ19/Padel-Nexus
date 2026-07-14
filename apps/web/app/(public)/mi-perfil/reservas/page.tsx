"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Building2,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { api } from "@/utils/api";
import { sileo } from "sileo";

interface ReservaUsuario {
  id: string;
  turno_id: string;
  usuario_id: string;
  fecha_reserva: string;
  estado_pago: "pendiente" | "completado" | "rechazado" | string;
  estado_reserva: "confirmada" | "cancelada" | "pendiente" | string;
  created_at: string;
  turnos?: {
    hora_inicio: string;
    hora_fin: string;
    precio: number;
    canchas?: {
      nombre: string;
      tipo_suelo: string | null;
      techada: boolean;
      clubes?: {
        nombre: string;
        localidad: string;
        provincia: string;
      } | null;
    } | null;
  } | null;
  pagos?: Array<{
    id: string;
    metodo_pago: string;
    referencia_pago: string | null;
    estado: string;
    comprobante_url: string | null;
    created_at: string;
  }> | null;
}

export default function MisReservasPage() {
  const [reservas, setReservas] = useState<ReservaUsuario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reservas/mis-reservas");
      setReservas(data.data || []);
    } catch (err: any) {
      console.error("Error al obtener reservas del usuario:", err);
      sileo.error({
        title: "Error al Cargar",
        description:
          "No se pudieron cargar tus reservas. Intentá de nuevo más tarde.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservas();
  }, [fetchReservas]);

  const formatHora = (time?: string) => (time ? time.slice(0, 5) : "00:00");

  const formatFecha = (dateStr?: string) => {
    if (!dateStr) return "";
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

  return (
    <main className="max-w-5xl mx-auto p-5 md:p-10 space-y-8 min-h-screen">
      {/* Encabezado */}
      <header className="border-b border-brand-white/5 pb-6">
        <Link
          href="/mi-perfil"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-chartreuse transition-colors mb-3"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a mi perfil
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Mis Reservas
        </h1>
        <p className="text-gray-400 mt-1.5 text-sm">
          Consultá el estado de tus turnos reservados y pagos pendientes.
        </p>
      </header>

      {/* Listado */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-chartreuse" />
        </div>
      ) : reservas.length === 0 ? (
        <div className="text-center py-20 bg-brand-card border border-brand-white/5 rounded-3xl max-w-xl mx-auto space-y-5">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-400">
              No tenés reservas hechas
            </h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mt-1">
              Aún no registraste reservas de canchas. ¡Elegí un club y asegurá
              tu próximo partido!
            </p>
          </div>
          <Link
            href="/reservar"
            className="inline-flex items-center gap-2 px-5 py-3 bg-brand-chartreuse text-black font-bold rounded-xl hover:brightness-110 transition-all text-sm shadow-md cursor-pointer"
          >
            Reservar Cancha
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reservas.map((reserva) => {
            const turno = reserva.turnos;
            const cancha = turno?.canchas;
            const club = cancha?.clubes;

            const isConfirmed = reserva.estado_reserva === "confirmada";
            const isPending = reserva.estado_reserva === "pendiente";
            const isCancelled = reserva.estado_reserva === "cancelada";

            const isPaid = reserva.estado_pago === "completado";
            const isPayPending = reserva.estado_pago === "pendiente";
            const isPayRejected = reserva.estado_pago === "rechazado";

            // Buscar pago activo/reciente
            const activePayment = reserva.pagos && reserva.pagos.length > 0
              ? reserva.pagos[0]
              : null;

            // Determinar si es transferencia pendiente de aprobación (en revisión)
            const isWaitingValidation = activePayment &&
              activePayment.metodo_pago === "transferencia" &&
              activePayment.estado === "pendiente";

            // Etiqueta del método de pago
            let paymentMethodLabel = "";
            if (activePayment) {
              if (activePayment.metodo_pago === "transferencia") paymentMethodLabel = "Transferencia";
              else if (activePayment.metodo_pago === "efectivo") paymentMethodLabel = "Efectivo";
              else if (activePayment.metodo_pago === "mercadopago" || activePayment.metodo_pago === "MercadoPago") paymentMethodLabel = "MercadoPago";
              else paymentMethodLabel = activePayment.metodo_pago;
            }

            return (
              <div
                key={reserva.id}
                className="bg-brand-card border border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Fila superior: Club y Estado de la reserva */}
                  <div className="flex justify-between items-start ">
                    <div className="flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 text-brand-chartreuse shrink-0 mt-1" />
                      <div>
                        <h3 className="font-bold text-white leading-tight">
                          {club?.nombre || "Club Deportivo"}
                        </h3>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            club
                              ? `${club.nombre}, ${club.localidad || ""}, ${club.provincia || ""}`
                              : "Club de Padel",
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:text-brand-chartreuse mt-1.5 flex items-center gap-1 transition-colors"
                        >
                          <MapPin className="w-3 h-3 text-brand-chartreuse" />
                          {club?.localidad
                            ? `${club.localidad}, ${club.provincia}`
                            : "Ver Ubicación"}
                          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                        </a>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isConfirmed
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : isPending
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {isConfirmed && <CheckCircle2 className="w-3 h-3" />}
                      {isPending && <AlertTriangle className="w-3 h-3" />}
                      {isCancelled && <XCircle className="w-3 h-3" />}
                      {reserva.estado_reserva}
                    </span>
                  </div>

                  {/* Detalles de la cancha y horario */}
                  <div className="border-t border-white/5 pt-3.5 grid grid-cols-2 gap-4 text-xs text-gray-300">
                    <div className="space-y-1">
                      <p className="text-gray-500 uppercase tracking-wider font-semibold">
                        Cancha
                      </p>
                      <p className="font-bold text-white">
                        {cancha?.nombre || "Cancha Estándar"}
                        {cancha?.tipo_suelo && ` (${cancha.tipo_suelo})`}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {cancha?.techada ? "Techada" : "Al aire libre"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-500 uppercase tracking-wider font-semibold">
                        Fecha y Hora
                      </p>
                      <p className="font-bold text-white flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-brand-chartreuse" />
                        {formatFecha(reserva.fecha_reserva)}
                      </p>
                      <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-brand-chartreuse" />
                        {formatHora(turno?.hora_inicio)} -{" "}
                        {formatHora(turno?.hora_fin)} Hs
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pie: Precio y estado del pago */}
                <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-sm text-gray-400">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span>Precio:</span>
                    <span className="text-white font-extrabold text-lg">
                      ${turno?.precio ?? 0}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Método de pago utilizado */}
                    {paymentMethodLabel && (
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-white/5 border border-white/10 text-gray-300 rounded-lg">
                        {paymentMethodLabel}
                      </span>
                    )}

                    {/* Badge de estado de pago */}
                    {isPaid && (
                      <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pago Aprobado
                      </span>
                    )}

                    {isWaitingValidation && (
                      <span className="inline-flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 rounded-lg animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-yellow-400" /> En revisión
                      </span>
                    )}

                    {isPayPending && !isWaitingValidation && (
                      <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5" /> Pago Pendiente
                      </span>
                    )}

                    {/* Botón Pagar Ahora */}
                    {isPayPending && !isCancelled && !isWaitingValidation && (
                      <Link
                        href={`/reservar/checkout/${reserva.id}`}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-brand-chartreuse hover:brightness-110 text-black font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ml-1"
                      >
                        Pagar Ahora <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
