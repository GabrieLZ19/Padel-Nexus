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
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { api } from "@/utils/api";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";
import { sileo } from "sileo";

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
        cbu?: string | null;
        alias?: string | null;
        latitud?: number | null;
        longitud?: number | null;
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
  const [referenciaTransferencia, setReferenciaTransferencia] = useState("");
  const [comprobanteArchivo, setComprobanteArchivo] = useState<File | null>(null);
  const [copiadoCbu, setCopiadoCbu] = useState(false);
  const [copiadoAlias, setCopiadoAlias] = useState(false);

  const handleCopiarCbu = () => {
    if (reserva?.turnos?.canchas?.clubes?.cbu) {
      navigator.clipboard.writeText(reserva.turnos.canchas.clubes.cbu);
      setCopiadoCbu(true);
      setTimeout(() => setCopiadoCbu(false), 2000);
    }
  };

  const handleCopiarAlias = () => {
    if (reserva?.turnos?.canchas?.clubes?.alias) {
      navigator.clipboard.writeText(reserva.turnos.canchas.clubes.alias);
      setCopiadoAlias(true);
      setTimeout(() => setCopiadoAlias(false), 2000);
    }
  };

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
          const turnData = data.data;
          const hasBankDetails = !!(turnData?.canchas?.clubes?.cbu?.trim() || turnData?.canchas?.clubes?.alias?.trim());
          if (!hasBankDetails) {
            setMetodoPago("efectivo");
          }

          setReserva({
            id: "new",
            turno_id: tId,
            usuario_id: "",
            fecha_reserva: fRes,
            estado_pago: "pendiente",
            estado_reserva: "pendiente",
            turnos: turnData,
          });
        } else {
          const { data } = await api.get(`/reservas/${reservaId}`);
          const resData = data.data;
          const hasBankDetails = !!(resData?.turnos?.canchas?.clubes?.cbu?.trim() || resData?.turnos?.canchas?.clubes?.alias?.trim());
          if (!hasBankDetails) {
            setMetodoPago("efectivo");
          }

          setReserva(resData);

          if (resData.estado_pago === "completado") {
            setCompletado(true);
            const lastPayment = resData.pagos && resData.pagos.length > 0 ? resData.pagos[0] : null;
            if (lastPayment) {
              setMetodoPago(lastPayment.metodo_pago);
            }
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
        setMetodoPago("mercadopago");
        if (paymentId && reservaId !== "new") {
          api.post(`/reservas/${reservaId}/confirmar-retorno`, { payment_id: paymentId })
            .then(() => {
              setCompletado(true);
            })
            .catch((err) => {
              console.error("Error al confirmar retorno de pago:", err);
              sileo.error({
                title: "Error de Acreditación",
                description: "Hubo un problema al registrar tu pago. Si se debitó dinero de tu cuenta, por favor contactá al club.",
              });
            });
        } else if (!paymentId) {
          sileo.error({
            title: "Pago no verificado",
            description: "No se encontró el identificador de pago en la URL de retorno.",
          });
        }
      } else if (paymentStatus === "failure") {
        setMetodoPago("mercadopago");
        sileo.error({
          title: "Pago Fallido",
          description: "El pago a través de Mercado Pago no pudo completarse. Por favor, intenta nuevamente.",
        });
      } else if (paymentStatus === "pending") {
        setMetodoPago("mercadopago");
        sileo.warning({
          title: "Pago Pendiente",
          description: "Tu pago se encuentra pendiente de acreditación en Mercado Pago.",
        });
      }
    }
  }, [reservaId]);

  const handlePagar = async () => {
    if (!reserva) return;

    if (metodoPago === "transferencia") {
      if (!referenciaTransferencia.trim()) {
        sileo.warning({
          title: "Referencia Requerida",
          description: "Por favor, ingresá la referencia de la transferencia.",
        });
        return;
      }
      if (!comprobanteArchivo) {
        sileo.warning({
          title: "Comprobante Requerido",
          description: "Por favor, seleccioná la imagen o PDF del comprobante de transferencia.",
        });
        return;
      }
    }

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

      // Subir archivo si es transferencia bancaria
      let comprobanteUrl = "";
      if (metodoPago === "transferencia" && comprobanteArchivo) {
        try {
          const supabase = getSupabaseBrowserClient();
          const fileExt = comprobanteArchivo.name.split(".").pop();
          const fileName = `${activeReservaId}_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("comprobantes")
            .upload(fileName, comprobanteArchivo);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("comprobantes")
            .getPublicUrl(fileName);
          
          comprobanteUrl = urlData.publicUrl;
        } catch (uploadErr: any) {
          throw new Error(`Error al subir el comprobante: ${uploadErr.message}`);
        }
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
          referencia_pago: metodoPago === "transferencia" ? referenciaTransferencia : undefined,
          comprobante_url: comprobanteUrl || undefined,
        });
        setCompletado(true);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Error al procesar el pago";
      sileo.error({
        title: "Error al Procesar",
        description: msg,
      });
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

          <h1 className="text-3xl font-bold mb-2">
            {metodoPago === "transferencia" ? "¡Comprobante enviado!" : "¡Reserva confirmada!"}
          </h1>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            {metodoPago === "transferencia" ? (
              <>
                El club está validando tu transferencia para el complejo{" "}
                <span className="text-white font-medium">
                  {reserva.turnos.canchas.clubes.nombre}
                </span>
                . Te notificaremos cuando tu reserva sea confirmada.
              </>
            ) : (
              <>
                Tu cancha está lista. Te esperamos en{" "}
                <span className="text-white font-medium">
                  {reserva.turnos.canchas.clubes.nombre}
                </span>
                .
              </>
            )}
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
              href="/mi-perfil/reservas"
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
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
                ].filter((metodo) => {
                  if (metodo.id === "transferencia") {
                    const club = reserva?.turnos?.canchas?.clubes;
                    return !!(club?.cbu?.trim() || club?.alias?.trim());
                  }
                  return true;
                }).map((metodo) => {
                  const IconComponent = metodo.icon;
                  const isSelected = metodoPago === metodo.id;
                  return (
                    <label
                      key={metodo.id}
                      className={`flex items-center justify-between p-4 md:p-4.5 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden group ${
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
                      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 mr-2">
                        <div
                          className={`p-2.5 md:p-3 rounded-xl border shrink-0 transition-all duration-300 ${
                            isSelected
                              ? "bg-brand-chartreuse text-black border-brand-chartreuse"
                              : "bg-white/5 text-gray-400 border-white/5 group-hover:text-white"
                          }`}
                        >
                          <IconComponent className="w-4.5 h-4.5 md:w-5 md:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                            <p className="font-semibold text-sm md:text-base text-white truncate">
                              {metodo.label}
                            </p>
                            {metodo.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold uppercase tracking-wider bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/25 shrink-0">
                                {metodo.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 line-clamp-2 md:line-clamp-none">
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

              {metodoPago === "transferencia" && (
                <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Datos de Transferencia Bancaria del Club
                  </h3>
                  <div className="p-4 rounded-xl bg-brand-black border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">CBU / CVU:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-brand-chartreuse select-all">
                          {reserva.turnos.canchas.clubes.cbu || "No disponible"}
                        </span>
                        {reserva.turnos.canchas.clubes.cbu && (
                          <button
                            type="button"
                            onClick={handleCopiarCbu}
                            className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                            title="Copiar CBU"
                          >
                            {copiadoCbu ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Alias de la Cuenta:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-bold text-brand-chartreuse select-all">
                          {reserva.turnos.canchas.clubes.alias || "No disponible"}
                        </span>
                        {reserva.turnos.canchas.clubes.alias && (
                          <button
                            type="button"
                            onClick={handleCopiarAlias}
                            className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                            title="Copiar Alias"
                          >
                            {copiadoAlias ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3.5 pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Referencia o Nro de Operación de la Transferencia
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Código de transferencia, titular de la cuenta emisora"
                        className="w-full bg-brand-black px-4 py-3 rounded-xl border border-white/10 focus:border-brand-chartreuse focus:outline-none text-sm text-white transition-colors"
                        value={referenciaTransferencia}
                        onChange={(e) => setReferenciaTransferencia(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Comprobante de Transferencia (Foto o PDF)
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setComprobanteArchivo(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-chartreuse/10 file:text-brand-chartreuse hover:file:bg-brand-chartreuse/20 file:cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
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
                  <CheckCircle2 className="w-4 h-4 text-brand-chartreuse shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Cancha
                    </p>
                    <p className="font-semibold text-white mt-0.5">
                      {reserva.turnos.canchas.nombre}
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
                  <MapPin className="w-4 h-4 text-brand-chartreuse shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Ubicación
                    </p>
                    <a
                      href={
                        reserva.turnos.canchas.clubes.latitud && reserva.turnos.canchas.clubes.longitud
                          ? `https://www.google.com/maps/search/?api=1&query=${reserva.turnos.canchas.clubes.latitud},${reserva.turnos.canchas.clubes.longitud}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${reserva.turnos.canchas.clubes.nombre}, ${reserva.turnos.canchas.clubes.localidad || ""}, ${reserva.turnos.canchas.clubes.provincia || ""}, Argentina`
                            )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-white mt-0.5 hover:text-brand-chartreuse transition-colors inline-flex items-center gap-1.5 group cursor-pointer"
                    >
                      <span>
                        {reserva.turnos.canchas.clubes.localidad || "Ver dirección"},{" "}
                        {reserva.turnos.canchas.clubes.provincia || ""}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
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
