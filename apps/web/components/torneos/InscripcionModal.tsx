"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Users,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
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

const INITIAL_STATE = {
  jugador1: "",
  jugador2: "",
  email2: "",
};

export default function InscripcionModal({
  isOpen,
  onClose,
  torneo,
}: InscripcionModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_STATE);
  const { profile } = useProfileStore();
  const userLevel = profile?.categoria_padel || "";
  const requiredLevel = torneo.nivel || "";
  const isLevelValid = userLevel === requiredLevel;

  // Estado para el modal de errores
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  const isIndividual = torneo.modalidad === "Individual";
  const canSubmit =
    (isIndividual
      ? formData.jugador1.length > 3
      : formData.jugador1.length > 3 && formData.jugador2.length > 3) &&
    isLevelValid;

  const handleSubmit = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      await InscripcionesService.inscribir({
        torneo_id: torneo.id,
        usuario_id: profile.id,
        usuario2_email: isIndividual ? null : formData.email2,
        jugador1_nombre: formData.jugador1,
        jugador2_nombre: isIndividual ? "-" : formData.jugador2,
        monto: Number(torneo.precio_inscripcion),
      });

      // --- CRÍTICO: Invalida la caché de Next.js en segundo plano ---
      router.refresh();

      setStep("success");
    } catch (error: unknown) {
      console.error(error);

      let mensajeError =
        "Ocurrió un error inesperado al procesar la inscripción.";
      if (error instanceof Error) {
        mensajeError = error.message;
      }
      interface ApiError {
        response?: {
          data?: {
            message?: string;
          };
        };
      }

      const apiError = error as ApiError;

      if (apiError.response?.data?.message) {
        mensajeError = apiError.response.data.message;
      }

      setFeedbackModal({
        isOpen: true,
        type: "danger",
        title: "Hubo un problema",
        description: mensajeError,
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setFormData({
      ...INITIAL_STATE,
      jugador2: isIndividual ? "-" : "",
    });

    onClose();
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
              className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-4xl overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={handleClose}
                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-10"
              >
                <X className="size-6" />
              </button>

              {step === "form" ? (
                <div className="p-8 lg:p-10">
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 bg-brand-chartreuse/10 text-brand-chartreuse px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-brand-chartreuse/20">
                      Confirmar Inscripción
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
                      {torneo.nombre}
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">
                      Completa los datos para reservar tu lugar.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {/* JUGADOR 1 */}
                    <div>
                      <label className=" text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <User className="size-3 text-brand-chartreuse" />{" "}
                        {isIndividual
                          ? "Nombre del Jugador"
                          : "Nombre Jugador 1"}
                      </label>
                      <input
                        autoFocus
                        placeholder="Ej: Gabriel Lazo"
                        className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-white focus:outline-none focus:border-brand-chartreuse/50 transition-all"
                        value={formData.jugador1}
                        onChange={(e) =>
                          setFormData({ ...formData, jugador1: e.target.value })
                        }
                      />
                    </div>

                    {/* JUGADOR 2 (SOLO SI ES DUPLAS) */}
                    {!isIndividual && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                      >
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Users className="size-3 text-brand-chartreuse" /> Nombre Email
                          de tu compañero
                        </label>
                        <input
                          type="email"
                          placeholder="compañero@email.com"
                          className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-white focus:outline-none focus:border-brand-chartreuse/50 transition-all"
                          value={formData.email2}
                          onChange={(e) =>
                            setFormData({ ...formData, email2: e.target.value })
                          }
                        />
                      </motion.div>
                    )}

                    {/* RESUMEN DE COSTO */}
                    <div className="bg-brand-chartreuse/5 border border-brand-chartreuse/10 p-5 rounded-2xl flex justify-between items-center">
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
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Modalidad
                        </p>
                        <p className="text-white font-bold">
                          {torneo.modalidad}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2">
                      <ShieldCheck className="size-5 text-gray-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Al inscribirte, te comprometes a asistir al torneo. El
                        pago se valida manualmente por el administrador del
                        club.
                      </p>
                    </div>

                    {!isLevelValid && (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 mb-4">
                        <X className="size-5 text-red-500 shrink-0" />
                        <p className="text-[12px] text-red-200">
                          Tu categoría actual ({userLevel || "sin definir"}) no
                          coincide con la categoría requerida para este torneo (
                          {requiredLevel}).
                        </p>
                      </div>
                    )}

                    <button
                      disabled={!canSubmit || loading}
                      onClick={handleSubmit}
                      className="w-full bg-brand-chartreuse disabled:opacity-30 disabled:grayscale hover:bg-[#b3e600] text-[#111] py-5 rounded-2xl font-black text-lg transition-all shadow-[0_0_30px_rgba(204,255,0,0.2)] flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        "Procesando..."
                      ) : (
                        <>
                          Confirmar Inscripción{" "}
                          <CreditCard className="size-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* ESTADO DE ÉXITO */
                <div className="p-10 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-brand-chartreuse rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(204,255,0,0.3)]">
                    <CheckCircle2 className="size-10 text-[#111]" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-3">
                    ¡Inscripción enviada!
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed mb-8">
                    Tu solicitud ha sido recibida con éxito. El administrador
                    del club revisará los datos y confirmará tu lugar a la
                    brevedad.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold transition-all"
                  >
                    Entendido, volver
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE ERRORES (Z-index 50 para que quede por encima del fondo oscuro) */}
      <div className="relative z-50">
        <FeedbackModal {...feedbackModal} />
      </div>
    </>
  );
}
