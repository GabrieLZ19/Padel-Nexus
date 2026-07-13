"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  CreditCard,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  Shield,
  Calendar,
  Building2,
  Coins,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { api } from "@/utils/api";

interface ReservaDetalle {
  id: string;
  turno_id: string;
  usuario_id: string;
  fecha_reserva: string;
  estado_pago: string;
  estado_reserva: string;
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
        provincia: string;
        localidad: string;
      };
    };
  };
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const reservaId = params.reserva_id as string;

  const [reserva, setReserva] = useState<ReservaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [metodoPago, setMetodoPago] = useState("transferencia");

  useEffect(() => {
    const fetchReserva = async () => {
      try {
        if (reservaId === "new") {
          const urlParams = new URLSearchParams(window.location.search);
          const tId = urlParams.get("turno_id");
          const fRes = urlParams.get("fecha_reserva");

          if (!tId || !fRes) {
            setReserva(null);
            setLoading(false);
            return;
          }

          const { data } = await api.get(`/reservas/turno/${tId}`);
          setReserva({
            id: "new",
            turno_id: tId,
            usuario_id: "",
            fecha_reserva: fRes,
            estado_pago: "pendiente",
            estado_reserva: "pendiente",
            turnos: data.data,
          });
        } else {
          const { data } = await api.get(`/reservas/${reservaId}`);
          setReserva(data.data);

          if (data.data.estado_pago === "completado") {
            setCompletado(true);
          }
        }
      } catch {
        setReserva(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReserva();

    // Capturar el retorno de Mercado Pago desde la URL
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get("payment") || urlParams.get("status");
      const paymentId = urlParams.get("payment_id") || urlParams.get("collection_id");

      if (paymentStatus === "success" || paymentStatus === "approved") {
        if (paymentId && reservaId !== "new") {
          api.post(`/reservas/${reservaId}/confirmar-retorno`, { payment_id: paymentId })
            .then(() => {
              setCompletado(true);
            })
            .catch((err) => {
              console.error("Error al confirmar retorno de pago:", err);
              setCompletado(true);
            });
        } else {
          setCompletado(true);
        }
      } else if (paymentStatus === "failure") {
        alert(
          "El pago a través de Mercado Pago no pudo completarse. Por favor, intenta nuevamente.",
        );
      } else if (paymentStatus === "pending") {
        alert(
          "Tu pago se encuentra pendiente de acreditación en Mercado Pago.",
        );
      }
    }
  }, [reservaId]);

  const handlePagar = async () => {
    if (!reserva) return;
    setProcesando(true);

    try {
      let activeReservaId = reservaId;

      // 1. Si la reserva es nueva, la creamos en la base de datos en este instante
      if (reservaId === "new") {
        const { data: createData } = await api.post("/reservas", {
          turno_id: reserva.turno_id,
          fecha_reserva: reserva.fecha_reserva,
        });
        activeReservaId = createData.data.id;
      }

      // 2. Procesar el pago de la reserva
      if (metodoPago === "mercadopago") {
        // Generar la preferencia en el backend
        const { data } = await api.post(
          `/reservas/${activeReservaId}/preferencia-mp`,
        );
        const initPoint = data.data.initPoint || data.data.sandboxInitPoint;
        if (initPoint) {
          // Redirigir al usuario al checkout oficial de Mercado Pago
          window.location.href = initPoint;
        } else {
          throw new Error(
            "No se recibió una URL de pago válida de Mercado Pago.",
          );
        }
      } else {
        // Métodos de pago offline/manuales
        await api.post(`/reservas/${activeReservaId}/pagar`, {
          monto: reserva.turnos.precio,
          metodo_pago: metodoPago,
        });
        setCompletado(true);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al procesar el pago";
      alert(msg);
    } finally {
      setProcesando(false);
    }
  };

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
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return `${dias[date.getUTCDay()]} ${date.getUTCDate()} de ${meses[date.getUTCMonth()]}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-chartreuse" />
      </main>
    );
  }

  if (!reserva) {
    return (
      <main className="min-h-screen pt-24 flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold text-gray-400">
          Reserva no encontrada
        </h2>
        <Link
          href="/reservar"
          className="text-brand-chartreuse hover:underline"
        >
          Volver a buscar canchas
        </Link>
      </main>
    );
  }

  // ── Estado de Pago Exitoso ────────────────────────────
  if (completado) {
    return (
      <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-brand-chartreuse/20 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-brand-chartreuse" />
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-brand-chartreuse/10 animate-ping" />
          </div>

          <h1 className="text-3xl font-bold mb-2">¡Reserva confirmada!</h1>
          <p className="text-gray-400 mb-8">
            Tu cancha está lista. Te esperamos en{" "}
            <span className="text-white font-medium">
              {reserva.turnos.canchas.clubes.nombre}
            </span>
          </p>

          <div className="bg-brand-card border border-white/10 rounded-2xl p-6 mb-8 text-left space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-brand-chartreuse shrink-0" />
              <span>{formatFecha(reserva.fecha_reserva)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-brand-chartreuse shrink-0" />
              <span>
                {formatHora(reserva.turnos.hora_inicio)} -{" "}
                {formatHora(reserva.turnos.hora_fin)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-brand-chartreuse shrink-0" />
              <span>
                {reserva.turnos.canchas.nombre} —{" "}
                {reserva.turnos.canchas.clubes.localidad}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/reservar"
              className="px-6 py-3 bg-brand-chartreuse text-black font-semibold rounded-xl hover:brightness-110 transition-all"
            >
              Reservar otra cancha
            </Link>
            <Link
              href="/mi-perfil"
              className="px-6 py-3 bg-brand-card border border-white/10 text-white font-medium rounded-xl hover:border-white/20 transition-all"
            >
              Ver mis reservas
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Formulario de Checkout ────────────────────────────
  return (
    <main className="min-h-screen pt-24 pb-20 bg-black text-white transition-colors duration-200">
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link
          href={`/reservar/club/${reserva.turnos.canchas.clubes.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-brand-chartreuse transition-all mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
          Volver a horarios
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Confirmar reserva
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Completá el pago para asegurar tu turno en cancha.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Columna Izquierda: Método de Pago ────── */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-brand-card border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-brand-chartreuse/50 to-transparent" />

              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2.5 text-white">
                <CreditCard className="w-5 h-5 text-brand-chartreuse" />
                Seleccioná tu método de pago
              </h2>

              <div className="space-y-3.5">
                {[
                  {
                    id: "transferencia",
                    label: "Transferencia bancaria",
                    desc: "CBU / Alias inmediato",
                    icon: CreditCard,
                  },
                  {
                    id: "efectivo",
                    label: "Efectivo en el club",
                    desc: "Abonás al momento de jugar",
                    icon: Coins,
                  },
                  {
                    id: "mercadopago",
                    label: "MercadoPago",
                    desc: "Tarjetas de crédito, débito o dinero en cuenta",
                    icon: Wallet,
                    badge: "Recomendado",
                  },
                ].map((metodo) => {
                  const IconComponent = metodo.icon;
                  const isSelected = metodoPago === metodo.id;
                  return (
                    <label
                      key={metodo.id}
                      className={`flex items-center justify-between p-4.5 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                        isSelected
                          ? "border-brand-chartreuse bg-brand-chartreuse/5 shadow-[0_0_15px_rgba(203,254,1,0.05)]"
                          : "border-white/10 bg-brand-input hover:border-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="metodo_pago"
                        value={metodo.id}
                        checked={isSelected}
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl border transition-all duration-300 ${
                            isSelected
                              ? "bg-brand-chartreuse text-black border-brand-chartreuse"
                              : "bg-white/5 text-gray-400 border-white/5 group-hover:text-white"
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">
                              {metodo.label}
                            </p>
                            {metodo.badge && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/25">
                                {metodo.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {metodo.desc}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "border-brand-chartreuse"
                            : "border-gray-600"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-chartreuse" />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 leading-relaxed">
              <Shield className="w-5 h-5 text-brand-chartreuse shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-medium">
                  Pago Seguro Protegido:
                </span>{" "}
                Procesamos tus datos de forma encriptada bajo estándares
                internacionales de seguridad de extremo a extremo.
              </div>
            </div>
          </div>

          {/* ── Columna Derecha: Resumen en formato Ticket ── */}
          <div className="lg:col-span-2">
            <div className="bg-brand-card border border-white/10 rounded-2xl p-6 shadow-xl sticky top-28 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-brand-chartreuse to-brand-chartreuse/30" />

              <h2 className="text-lg font-semibold mb-6 text-white">
                Resumen del Turno
              </h2>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <Building2 className="w-4 h-4 text-brand-chartreuse shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Club / Complejo
                    </p>
                    <p className="font-semibold text-white mt-0.5">
                      {reserva.turnos.canchas.clubes.nombre}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <MapPin className="w-4 h-4 text-brand-chartreuse shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Cancha / Ubicación
                    </p>
                    <p className="font-semibold text-white mt-0.5">
                      {reserva.turnos.canchas.nombre}
                      <span className="text-gray-400 font-medium">
                        {" "}
                        ({reserva.turnos.canchas.clubes.localidad},{" "}
                        {reserva.turnos.canchas.clubes.provincia})
                      </span>
                      {reserva.turnos.canchas.tipo_suelo && (
                        <span className="text-gray-400 font-medium">
                          {" "}
                          · {reserva.turnos.canchas.tipo_suelo}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Calendar className="w-4 h-4 text-brand-chartreuse shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Fecha Seleccionada
                    </p>
                    <p className="font-semibold text-white mt-0.5">
                      {formatFecha(reserva.fecha_reserva)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Clock className="w-4 h-4 text-brand-chartreuse shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Horario Reservado
                    </p>
                    <p className="font-semibold text-white mt-0.5">
                      {formatHora(reserva.turnos.hora_inicio)} -{" "}
                      {formatHora(reserva.turnos.hora_fin)} Hs
                    </p>
                  </div>
                </div>

                <div className="pt-5 border-t border-dashed border-white/10 mt-6">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Total a Pagar
                    </span>
                    <span className="text-3xl font-extrabold text-brand-chartreuse tracking-tight">
                      ${reserva.turnos.precio}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePagar}
                disabled={procesando}
                className="w-full mt-8 px-6 py-4 bg-brand-chartreuse text-black font-bold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(203,254,1,0.15)] font-sans"
              >
                {procesando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <span>Confirmar y pagar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
