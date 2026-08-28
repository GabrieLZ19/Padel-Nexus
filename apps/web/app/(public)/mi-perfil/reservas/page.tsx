"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  UserPlus,
  X,
} from "lucide-react";
import { isAxiosError } from "axios";
import { ReservasService } from "@/utils/services/reservas";
import { PartidosService } from "@/utils/services/partidos";
import { PARTIDOS_ABIERTOS } from "@/utils/constants/partidosAbiertos";
import { NIVELES_PARTIDO_ABIERTO } from "@/utils/constants/padelConfig";
import { NIVEL_PARTIDO_DEFAULT } from "@/utils/types";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";

interface ReservaUsuario {
  id: string;
  turno_id: string;
  usuario_id: string;
  fecha_reserva: string;
  estado_pago: string;
  estado_reserva: string;
  created_at: string;
  turnos: {
    id: string;
    hora_inicio: string;
    hora_fin: string;
    precio: number;
    canchas: {
      id: string;
      nombre: string;
      tipo_suelo: string | null;
      techada: boolean;
      clubes: {
        id: string;
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
  const router = useRouter();
  const [reservas, setReservas] = useState<ReservaUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [partidosPorReserva, setPartidosPorReserva] = useState<
    Record<string, { id: string; estado: string }>
  >({});

  const [modalReserva, setModalReserva] = useState<ReservaUsuario | null>(null);
  const [nivel, setNivel] = useState<string>(NIVEL_PARTIDO_DEFAULT);
  const [cupos, setCupos] = useState(1);
  const [notas, setNotas] = useState("");
  const [publicando, setPublicando] = useState(false);

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ReservasService.getMisReservas();
      const lista = res || [];
      setReservas(lista);

      const map: Record<string, { id: string; estado: string }> = {};
      await Promise.all(
        lista
          .filter((r: ReservaUsuario) => r.estado_reserva === "confirmada")
          .map(async (r: ReservaUsuario) => {
            try {
              const partido = await PartidosService.getPorReserva(r.id);
              if (partido) map[r.id] = partido;
            } catch {
              // ignore
            }
          }),
      );
      setPartidosPorReserva(map);
    } catch (err: unknown) {
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

  const esReservaFutura = (fecha: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const f = new Date(`${fecha}T12:00:00`);
    return f >= hoy;
  };

  const openModal = (reserva: ReservaUsuario) => {
    setModalReserva(reserva);
    setNivel(NIVEL_PARTIDO_DEFAULT);
    setCupos(1);
    setNotas("");
  };

  const handlePublicar = async () => {
    if (!modalReserva) return;
    setPublicando(true);
    try {
      const partido = await PartidosService.publicar({
        reserva_id: modalReserva.id,
        nivel_requerido: nivel,
        jugadores_faltantes: cupos,
        notas: notas.trim() || undefined,
      });
      sileo.success({
        title: "Partido publicado",
        description: "Tu convocatoria ya está visible en Partidos.",
      });
      setModalReserva(null);
      setPartidosPorReserva((prev) => ({
        ...prev,
        [modalReserva.id]: { id: partido.id, estado: partido.estado },
      }));
      router.push(`/partidos/${partido.id}`);
    } catch (err: unknown) {
      const message = isAxiosError(err)
        ? err.response?.data?.error || "No se pudo publicar el partido."
        : "No se pudo publicar el partido.";
      sileo.error({ title: "Error", description: message });
    } finally {
      setPublicando(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-5 md:p-10 space-y-8 min-h-screen">
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
          Consultá el estado de tus turnos reservados y publicá &quot;
          {PARTIDOS_ABIERTOS.titulo}&quot; desde una reserva confirmada.
        </p>
      </header>

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

            const activePayment =
              reserva.pagos && reserva.pagos.length > 0
                ? reserva.pagos[0]
                : null;

            const isWaitingValidation =
              activePayment &&
              activePayment.metodo_pago === "transferencia" &&
              activePayment.estado === "pendiente";

            let paymentMethodLabel = "";
            if (activePayment) {
              if (activePayment.metodo_pago === "transferencia")
                paymentMethodLabel = "Transferencia";
              else if (activePayment.metodo_pago === "efectivo")
                paymentMethodLabel = "Efectivo";
              else if (
                activePayment.metodo_pago === "mercadopago" ||
                activePayment.metodo_pago === "MercadoPago"
              )
                paymentMethodLabel = "MercadoPago";
              else paymentMethodLabel = activePayment.metodo_pago;
            }

            const partidoExistente = partidosPorReserva[reserva.id];
            const puedePublicar =
              isConfirmed &&
              esReservaFutura(reserva.fecha_reserva) &&
              !partidoExistente;

            return (
              <div
                key={reserva.id}
                className="bg-brand-card border border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
              >
                <div className="space-y-4">
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

                <div className="border-t border-white/5 pt-4 flex flex-col gap-3 mt-auto">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>Precio:</span>
                      <span className="text-white font-extrabold text-lg">
                        ${turno?.precio ?? 0}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {paymentMethodLabel && (
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-white/5 border border-white/10 text-gray-300 rounded-lg">
                          {paymentMethodLabel}
                        </span>
                      )}

                      {isPaid && (
                        <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pago Aprobado
                        </span>
                      )}

                      {isWaitingValidation && (
                        <span className="inline-flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 rounded-lg animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />{" "}
                          En revisión
                        </span>
                      )}

                      {isPayPending && !isWaitingValidation && (
                        <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5" /> Pago
                          Pendiente
                        </span>
                      )}

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

                  {puedePublicar && (
                    <button
                      onClick={() => openModal(reserva)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-chartreuse/40 text-brand-chartreuse text-sm font-bold hover:bg-brand-chartreuse/10 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      {PARTIDOS_ABIERTOS.titulo}
                    </button>
                  )}

                  {partidoExistente && (
                    <Link
                      href={`/partidos/${partidoExistente.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-white/5 border border-brand-white/10 text-gray-300 text-xs font-bold hover:text-brand-white transition-colors"
                    >
                      Convocatoria publicada ({partidoExistente.estado}) — Ver
                      detalle
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalReserva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Cerrar"
            onClick={() => setModalReserva(null)}
          />
          <div className="relative w-full max-w-md bg-brand-card border border-brand-white/10 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">
                  {PARTIDOS_ABIERTOS.titulo}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Publicá tu reserva para completar el partido.
                </p>
              </div>
              <button
                onClick={() => setModalReserva(null)}
                className="p-2 rounded-xl hover:bg-brand-white/5 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-400 bg-brand-black/40 border border-brand-white/5 rounded-xl px-3 py-2.5 space-y-1">
              <p className="font-bold text-white">
                {modalReserva.turnos?.canchas?.clubes?.nombre || "Club"}
              </p>
              <p>
                {formatFecha(modalReserva.fecha_reserva)} ·{" "}
                {formatHora(modalReserva.turnos?.hora_inicio)} -{" "}
                {formatHora(modalReserva.turnos?.hora_fin)}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Nivel requerido
              </label>
              <CustomDropdown
                value={nivel}
                onChange={setNivel}
                placeholder="Selecciona nivel"
                options={NIVELES_PARTIDO_ABIERTO.map((n) => ({
                  value: n.value,
                  label: n.label,
                }))}
              />

              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Jugadores faltantes
              </label>
              <CustomDropdown
                value={String(cupos)}
                onChange={(val) => setCupos(Number(val))}
                placeholder="Selecciona cupos"
                options={[
                  { value: "1", label: "1 jugador" },
                  { value: "2", label: "2 jugadores" },
                  { value: "3", label: "3 jugadores" },
                ]}
              />

              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Notas (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Ej: traer pelotas, nivel amistoso..."
                className="w-full bg-brand-black border border-brand-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 resize-none"
              />
            </div>

            <button
              onClick={handlePublicar}
              disabled={publicando}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-chartreuse text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {publicando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Publicar convocatoria
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
