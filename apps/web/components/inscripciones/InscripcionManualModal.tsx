"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, User, Users, CreditCard } from "lucide-react";
import { Torneo } from "../../utils/types";
import { InscripcionesService } from "../../utils/services/inscripciones";
import FeedbackModal, { FeedbackModalProps } from "../ui/FeedbackModal";
import CustomDropdown from "../ui/CustomDropdown";
import { useProfileStore } from "../../store/useProfileStore";
import { esTorneoContextoFederacion } from "../../utils/constants/fapApaRules";
import { esModalidadParejas } from "../../utils/formatFecha";
import type { RolUsuario } from "../../utils/types/user.types";

interface InscripcionManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  torneo: Torneo;
}

export default function InscripcionManualModal({
  isOpen,
  onClose,
  onSuccess,
  torneo,
}: InscripcionManualModalProps) {
  const profile = useProfileStore((s) => s.profile);
  const userRole = (profile?.rol || "admin") as RolUsuario;
  const modoFederacion = esTorneoContextoFederacion(
    {
      alcance: torneo.alcance,
      reglamento: (torneo as { reglamento?: string }).reglamento,
      asociacion: (torneo as { asociacion?: string }).asociacion,
    },
    userRole,
  );

  const [j1, setJ1] = useState("");
  const [j2, setJ2] = useState("");
  const [letraPrioridad, setLetraPrioridad] = useState("");
  const [monto, setMonto] = useState<number>(
    Number(torneo.precio_inscripcion || 0),
  );
  /** "" = No pagó / pendiente; "Confirmado" = Pagó */
  const [estadoPago, setEstadoPago] = useState("");
  const [omitirValidaciones, setOmitirValidaciones] = useState(false);
  const [motivoOverride, setMotivoOverride] = useState("");
  const [loading, setLoading] = useState(false);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  const esNacional = /nacional/i.test(String(torneo.alcance || ""));

  const handleSubmit = async () => {
    if (!j1) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Campo requerido",
        description: "Debes ingresar al menos el identificador del Jugador 1.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    if (esNacional && !letraPrioridad.trim()) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Letra requerida",
        description:
          "En torneos nacionales debés indicar la letra de prioridad (A, B, C…).",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    if (omitirValidaciones && motivoOverride.trim().length < 10) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Motivo requerido",
        description:
          "Para omitir validaciones indicá un motivo de al menos 10 caracteres.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    setLoading(true);
    try {
      await InscripcionesService.inscribirManual({
        torneo_id: torneo.id,
        jugador1_identificador: j1.trim(),
        jugador2_identificador: j2.trim() || undefined,
        monto: Number(monto),
        metodo_pago: modoFederacion
          ? estadoPago === "Confirmado"
            ? "Confirmado"
            : undefined
          : estadoPago || undefined,
        omitir_validaciones: omitirValidaciones,
        motivo: omitirValidaciones ? motivoOverride.trim() : undefined,
        letra_prioridad: esNacional ? letraPrioridad.trim().toUpperCase() : undefined,
      });

      setJ1("");
      setJ2("");
      setLetraPrioridad("");
      setEstadoPago("");
      setOmitirValidaciones(false);
      setMotivoOverride("");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      const errMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Error al inscribir jugador manualmente.";

      setFeedbackModal({
        isOpen: true,
        type: "error",
        title: "Error al inscribir",
        description: errMsg,
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const pagoOptions = modoFederacion
    ? [
        { value: "", label: "No pagó" },
        { value: "Confirmado", label: "Pagó" },
      ]
    : [
        { value: "", label: "Pendiente (No Cobrar)" },
        { value: "Efectivo", label: "Efectivo" },
        { value: "Transferencia", label: "Transferencia" },
      ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1a1a1a] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative p-6 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Inscribir{" "}
                    {torneo.modalidad === "Individual" ? "Jugador" : "Pareja"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Torneo: {torneo.nombre}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Jugador 1 (DNI o Email) *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
                    <input
                      type="text"
                      placeholder="Ej: 12345678 o jugador1@email.com"
                      className="w-full bg-[#111] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
                      value={j1}
                      onChange={(e) => setJ1(e.target.value)}
                    />
                  </div>
                </div>

                {esModalidadParejas(torneo.modalidad) && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      Jugador 2 (DNI o Email)
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
                      <input
                        type="text"
                        placeholder="Ej: 87654321 o jugador2@email.com"
                        className="w-full bg-[#111] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
                        value={j2}
                        onChange={(e) => setJ2(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {esNacional && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      Letra de prioridad (denominación) *
                    </label>
                    <CustomDropdown
                      value={letraPrioridad}
                      onChange={setLetraPrioridad}
                      options={Array.from({ length: 12 }, (_, i) => {
                        const letter = String.fromCharCode(65 + i);
                        return { value: letter, label: letter };
                      })}
                      placeholder="A, B, C…"
                      className="py-2.5! text-sm!"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5">
                      Se mostrará como provincia + letra (ej. NEUQUÉN A) según la
                      residencia del jugador 1.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      Monto de Inscripción ($)
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
                      <input
                        type="number"
                        placeholder="Ej: 12000"
                        className="w-full bg-[#111] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-chartreuse/50 transition-colors font-semibold cursor-not-allowed opacity-60"
                        value={monto}
                        readOnly={true}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      {modoFederacion ? "Estado de pago" : "Método de Pago (Cobro)"}
                    </label>
                    <CustomDropdown
                      value={estadoPago}
                      onChange={setEstadoPago}
                      options={pagoOptions}
                      placeholder="Seleccionar..."
                      haciaArriba={true}
                      className="py-2.5! text-sm!"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={omitirValidaciones}
                      onChange={(e) => setOmitirValidaciones(e.target.checked)}
                      className="mt-0.5 accent-[#cbfe01]"
                    />
                    <span className="text-xs text-amber-200/90 leading-relaxed">
                      Omitir validaciones de elegibilidad (categoría, carnet,
                      rama, edad, cierre). Requiere motivo auditable.
                    </span>
                  </label>
                  {omitirValidaciones && (
                    <textarea
                      value={motivoOverride}
                      onChange={(e) => setMotivoOverride(e.target.value)}
                      placeholder="Motivo del override (mín. 10 caracteres)"
                      rows={3}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-400/40"
                    />
                  )}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !j1 ||
                  (esNacional && !letraPrioridad.trim()) ||
                  (omitirValidaciones && motivoOverride.trim().length < 10)
                }
                className="w-full bg-brand-chartreuse hover:bg-[#b3e600] disabled:opacity-30 text-brand-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-chartreuse/10"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="size-4" />
                    Registrar{" "}
                    {torneo.modalidad === "Individual" ? "Jugador" : "Pareja"}
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-60">
        <FeedbackModal {...feedbackModal} />
      </div>
    </>
  );
}
