"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  User,
  Calendar,
  MapPin,
} from "lucide-react";
import { Torneo } from "../../utils/types";
import { InscripcionesService } from "../../utils/services/inscripciones";
import FeedbackModal, { FeedbackModalProps } from "../ui/FeedbackModal";
import { useProfileStore } from "@/store/useProfileStore";
import { useRouter } from "next/navigation";

interface InscripcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  torneo: Torneo;
}

export default function InscripcionModal({
  isOpen,
  onClose,
  torneo,
}: InscripcionModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [email2, setEmail2] = useState("");
  const { profile } = useProfileStore();

  const userLevel = profile?.categoria_padel || "";
  const requiredLevel = torneo.nivel || "";
  const isLevelValid = userLevel === requiredLevel;
  const isIndividual = torneo.modalidad === "Individual";

  // El nombre del jugador 1 viene del perfil — no se pide al usuario
  const jugador1Nombre = profile
    ? `${profile.apellido?.toUpperCase() ?? ""}, ${profile.nombre ?? ""}`.trim()
    : "";

  // Estado para el modal de errores
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  // El botón queda habilitado si el nivel coincide y, en duplas, si hay email del compañero
  const canSubmit =
    isLevelValid && (isIndividual || email2.includes("@")) && !!profile;

  const handleSubmit = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      await InscripcionesService.inscribir({
        torneo_id: torneo.id,
        usuario_id: profile.id,
        usuario2_email: isIndividual ? null : email2,
        jugador1_nombre: jugador1Nombre,
        jugador2_nombre: isIndividual ? "-" : "",
        monto: Number(torneo.precio_inscripcion),
      });

      router.refresh();
      setStep("success");
    } catch (error: unknown) {
      console.error(error);

      interface ApiError {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      }
      const apiError = error as ApiError;
      const mensajeError =
        apiError.response?.data?.error ||
        apiError.response?.data?.message ||
        apiError.message ||
        "Ocurrió un error inesperado al procesar la inscripción.";

      setFeedbackModal({
        isOpen: true,
        type: "error",
        title: "No se pudo inscribir",
        description: mensajeError,
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setEmail2("");
    onClose();
  };

  // Formatear fecha del torneo
  const formatFechaTorneo = (iso?: string | null) => {
    if (!iso) return "—";
    const parts = iso.split("T")[0].split("-");
    if (parts.length < 3) return iso;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={handleClose}
                className="absolute top-5 right-5 text-gray-600 hover:text-white transition-colors z-10 p-1.5 rounded-full hover:bg-white/5 cursor-pointer"
              >
                <X className="size-5" />
              </button>

              {step === "form" ? (
                <div className="p-8">
                  {/* Header */}
                  <div className="mb-7">
                    <div className="inline-flex items-center gap-2 bg-brand-chartreuse/10 text-brand-chartreuse px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-brand-chartreuse/20">
                      Confirmar Inscripción
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
                      {torneo.nombre}
                    </h2>
                  </div>

                  {/* Datos del torneo */}
                  <div className="bg-white/3 border border-white/5 rounded-2xl p-4 mb-6 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Calendar className="size-3.5 text-brand-chartreuse" />
                        Fecha
                      </span>
                      <span className="text-gray-200 font-semibold">
                        {formatFechaTorneo(torneo.fecha)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Users className="size-3.5 text-brand-chartreuse" />
                        Modalidad
                      </span>
                      <span className="text-gray-200 font-semibold">
                        {torneo.modalidad}
                      </span>
                    </div>
                    {torneo.lugar && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-2">
                          <MapPin className="size-3.5 text-brand-chartreuse" />
                          Lugar
                        </span>
                        <span className="text-gray-200 font-semibold">
                          {torneo.lugar}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Jugador 1 — sólo lectura, viene del perfil */}
                  <div className="mb-5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <User className="size-3 text-brand-chartreuse" />
                      {isIndividual ? "Jugador" : "Jugador 1 (vos)"}
                    </label>
                    <div className="w-full bg-white/3 border border-white/5 px-4 py-3.5 rounded-2xl text-gray-300 text-sm flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center shrink-0">
                        <User className="size-3.5 text-brand-chartreuse" />
                      </div>
                      <span className="font-semibold">
                        {jugador1Nombre || profile?.email || "—"}
                      </span>
                      <span className="ml-auto text-[10px] bg-brand-chartreuse/10 text-brand-chartreuse px-2 py-0.5 rounded-full border border-brand-chartreuse/20 font-bold uppercase">
                        {userLevel || "Sin categoría"}
                      </span>
                    </div>
                  </div>

                  {/* Jugador 2 email — solo si es duplas */}
                  {!isIndividual && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mb-5"
                    >
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Users className="size-3 text-brand-chartreuse" />
                        Email de tu compañero/a
                      </label>
                      <input
                        type="email"
                        placeholder="compañero@email.com"
                        className="w-full bg-white/5 border border-white/5 px-4 py-3.5 rounded-2xl text-white text-sm focus:outline-none focus:border-brand-chartreuse/50 transition-all placeholder:text-gray-600"
                        value={email2}
                        onChange={(e) => setEmail2(e.target.value)}
                      />
                      <p className="text-[11px] text-gray-600 mt-1.5">
                        El compañero debe estar registrado en Padel Nexus.
                      </p>
                    </motion.div>
                  )}

                  {/* Precio */}
                  <div className="bg-brand-chartreuse/5 border border-brand-chartreuse/10 p-4 rounded-2xl flex justify-between items-center mb-5">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Total a pagar
                      </p>
                      <p className="text-2xl font-black text-brand-chartreuse">
                        $
                        {Number(torneo.precio_inscripcion).toLocaleString(
                          "es-AR",
                        )}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500 text-right max-w-[140px] leading-relaxed">
                      El pago se valida manualmente por el administrador.
                    </p>
                  </div>

                  {/* Alerta de nivel inválido */}
                  {!isLevelValid && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 mb-5">
                      <X className="size-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-red-300 leading-relaxed">
                        Tu categoría actual{" "}
                        <strong>({userLevel || "sin definir"})</strong> no
                        coincide con la requerida{" "}
                        <strong>({requiredLevel})</strong>.
                      </p>
                    </div>
                  )}

                  {/* Aviso pago fase 2 */}
                  <div className="flex items-start gap-3 mb-6">
                    <ShieldCheck className="size-6 text-gray-600 shrink-0 mt-0.5" />
                    <p className="text-[15px] text-gray-600 leading-relaxed">
                      Al inscribirte reservás tu lugar.
                    </p>
                  </div>

                  <button
                    disabled={!canSubmit || loading}
                    onClick={handleSubmit}
                    className="w-full bg-brand-chartreuse disabled:opacity-30 disabled:grayscale hover:bg-[#b3e600] text-[#111] py-4 rounded-2xl font-black text-base transition-all shadow-[0_0_30px_rgba(203,254,1,0.15)] flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Procesando...
                      </span>
                    ) : (
                      <>
                        Confirmar inscripción
                        <CreditCard className="size-5" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* ÉXITO */
                <div className="p-10 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-brand-chartreuse rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(203,254,1,0.3)]">
                    <CheckCircle2 className="size-10 text-[#111]" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-3">
                    ¡Inscripción enviada!
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed mb-2">
                    Tu solicitud para{" "}
                    <span className="text-white font-semibold">
                      {torneo.nombre}
                    </span>{" "}
                    fue recibida con éxito.
                  </p>
                  <p className="text-gray-500 text-xs leading-relaxed mb-8">
                    El administrador revisará los datos y confirmará tu lugar.
                    Recibirás una notificación cuando tu pago sea validado.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold transition-all cursor-pointer"
                  >
                    Entendido, volver
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-50">
        <FeedbackModal {...feedbackModal} />
      </div>
    </>
  );
}
