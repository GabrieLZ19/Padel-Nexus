"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, User, Users, CreditCard } from "lucide-react";
import { Torneo } from "../../utils/types";
import { InscripcionesService } from "../../utils/services/inscripciones";
import FeedbackModal, { FeedbackModalProps } from "../ui/FeedbackModal";
import CustomDropdown from "../ui/CustomDropdown";

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
  const [j1, setJ1] = useState("");
  const [j2, setJ2] = useState("");
  const [monto, setMonto] = useState<number>(Number(torneo.precio_inscripcion || 0));
  const [metodoPago, setMetodoPago] = useState("");
  const [loading, setLoading] = useState(false);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

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

    setLoading(true);
    try {
      await InscripcionesService.inscribirManual({
        torneo_id: torneo.id,
        jugador1_identificador: j1.trim(),
        jugador2_identificador: j2.trim() || undefined,
        monto: Number(monto),
        metodo_pago: metodoPago || undefined,
      });

      setJ1("");
      setJ2("");
      setMetodoPago("");
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
                  <h3 className="text-xl font-bold text-white">Inscribir Pareja</h3>
                  <p className="text-xs text-gray-500 mt-1">Torneo: {torneo.nombre}</p>
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

                {torneo.modalidad === "Duplas" && (
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
                        className="w-full bg-[#111] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-chartreuse/50 transition-colors font-semibold"
                        value={monto}
                        onChange={(e) => setMonto(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      Método de Pago (Cobro)
                    </label>
                    <CustomDropdown
                      value={metodoPago}
                      onChange={(val) => setMetodoPago(val)}
                      options={[
                        { value: "", label: "Pendiente (No Cobrar)" },
                        { value: "Efectivo", label: "Efectivo" },
                        { value: "Transferencia", label: "Transferencia" },
                      ]}
                      placeholder="Seleccionar..."
                      haciaArriba={true}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !j1}
                className="w-full bg-brand-chartreuse hover:bg-[#b3e600] disabled:opacity-30 text-brand-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand-chartreuse/10"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="size-4" />
                    Registrar Pareja
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
