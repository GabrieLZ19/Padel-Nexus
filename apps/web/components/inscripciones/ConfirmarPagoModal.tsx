"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, CheckCircle2, DollarSign } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";

interface ConfirmarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (monto: number, metodo: string) => void;
  montoSugerido?: number;
  isLoading?: boolean;
}

const PAYMENT_METHODS = [
  { value: "Efectivo", label: "Efectivo" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Mercado Pago", label: "Mercado Pago" },
];

export default function ConfirmarPagoModal({
  isOpen,
  onClose,
  onConfirm,
  montoSugerido = 0,
  isLoading = false,
}: ConfirmarPagoModalProps) {
  const [monto, setMonto] = useState<string>(montoSugerido.toString());
  const [metodo, setMetodo] = useState<string>("Efectivo");

  useEffect(() => {
    setMonto(montoSugerido.toString());
  }, [montoSugerido]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={isLoading ? undefined : onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-chartreuse/10 flex items-center justify-center border border-brand-chartreuse/20">
                <CreditCard className="size-5 text-brand-chartreuse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirmar Pago</h3>
                <p className="text-sm text-gray-400">
                  Recepción manual de dinero
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-5">
            <div className="bg-brand-chartreuse/5 border border-brand-chartreuse/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-gray-400 mb-1">
                Monto de la inscripción
              </p>
              <div className="flex items-center text-3xl font-black text-brand-chartreuse">
                <span className="text-xl mr-1 text-brand-chartreuse/60">$</span>
                {montoSugerido.toLocaleString("es-AR")}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300 ml-1">
                  Monto cobrado
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                  <input
                    type="number"
                    value={monto}
                    readOnly={true}
                    className="w-full bg-[#111] text-white text-lg font-semibold rounded-xl border border-white/10 pl-11 pr-4 py-3.5 cursor-not-allowed opacity-60 transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <label className="text-sm font-semibold text-gray-300 ml-1">
                  Método de pago
                </label>
                <CustomDropdown
                  options={PAYMENT_METHODS}
                  value={metodo}
                  onChange={setMetodo}
                  placeholder="Seleccionar método"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-2 flex flex-col gap-3">
            <button
              disabled={isLoading || !monto || Number(monto) <= 0}
              onClick={() => onConfirm(Number(monto), metodo)}
              className="w-full py-4 rounded-xl font-bold text-[#111] bg-brand-chartreuse hover:bg-brand-chartreuse/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(203,254,1,0.15)]"
            >
              {isLoading ? (
                "Procesando..."
              ) : (
                <>
                  <CheckCircle2 className="size-5" />
                  Confirmar y Aceptar Inscripción
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
