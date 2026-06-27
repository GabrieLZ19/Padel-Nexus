"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Trash2, Info, X, XCircle } from "lucide-react";

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type?: "success" | "danger" | "warning" | "info" | "error";
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  showInput?: boolean;
  inputPlaceholder?: string;
  inputType?: string;
  showSelect?: boolean;
  selectOptions?: { value: string; label: string }[];
  onConfirm?: (inputValue?: string, selectValue?: string) => void;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  title,
  description,
  type = "info",
  onConfirm,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  isLoading = false,
  showInput = false,
  inputPlaceholder = "Ingrese un valor",
  inputType = "text",
  showSelect = false,
  selectOptions = [],
}: FeedbackModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectValue, setSelectValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setSelectValue(selectOptions[0]?.value || "");
    }
  }, [isOpen, selectOptions]);
  // Configuraciones visuales dinámicas según el tipo de alerta
  const config = {
    success: {
      icon: CheckCircle2,
      color: "text-[#00ff88]",
      bg: "bg-[#00ff88]/10",
      border: "border-[#00ff88]/20",
      btnClass:
        "bg-[#00ff88] text-black hover:bg-[#00ff88]/90 shadow-[0_0_15px_rgba(0,255,136,0.2)]",
    },
    danger: {
      icon: Trash2,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      btnClass:
        "bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    },
    error: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      btnClass:
        "bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-[#ffb800]",
      bg: "bg-[#ffb800]/10",
      border: "border-[#ffb800]/20",
      btnClass:
        "bg-[#ffb800] text-black hover:bg-[#ffb800]/90 shadow-[0_0_15px_rgba(255,184,0,0.2)]",
    },
    info: {
      icon: Info,
      color: "text-brand-chartreuse",
      bg: "bg-brand-chartreuse/10",
      border: "border-brand-chartreuse/20",
      btnClass:
        "bg-brand-chartreuse text-black hover:bg-[#b3e600] shadow-[0_0_15px_rgba(204,255,0,0.2)]",
    },
  };

  const { icon: Icon, color, bg, border, btnClass } = config[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[#1a1a1a] rounded-4xl border border-white/10 w-full max-w-100 p-8 relative overflow-hidden shadow-2xl text-center"
          >
            {/* Botón Cerrar */}
            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
              >
                <X className="size-4" />
              </button>
            )}

            {/* Icono central iluminado */}
            <div
              className={`mx-auto w-20 h-20 rounded-full ${bg} ${border} border-2 flex items-center justify-center mb-6`}
            >
              <Icon className={`size-10 ${color}`} />
            </div>

            {/* Textos */}
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
              {title}
            </h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed px-2">
              {description}
            </p>

            {/* Inputs Dinámicos */}
            {(showInput || showSelect) && (
              <div className="flex flex-col gap-4 mb-8 text-left">
                {showSelect && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">
                      Método
                    </label>
                    <select
                      value={selectValue}
                      onChange={(e) => setSelectValue(e.target.value)}
                      className="w-full bg-[#111111] text-white rounded-xl border border-white/10 px-4 py-3 focus:border-brand-chartreuse focus:ring-1 focus:ring-brand-chartreuse transition-colors"
                    >
                      {selectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {showInput && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">
                      Monto
                    </label>
                    <input
                      type={inputType}
                      placeholder={inputPlaceholder}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-full bg-[#111111] text-white rounded-xl border border-white/10 px-4 py-3 focus:border-brand-chartreuse focus:ring-1 focus:ring-brand-chartreuse transition-colors"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Controles Dinámicos */}
            <div className="flex flex-col gap-3">
              {onConfirm && (
                <button
                  disabled={isLoading || (showInput && !inputValue)}
                  onClick={() => onConfirm(inputValue, selectValue)}
                  className={`w-full py-4 rounded-xl font-bold text-[15px] transition-all ${btnClass} disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {isLoading ? "Procesando..." : confirmText}
                </button>
              )}
              <button
                disabled={isLoading}
                onClick={onClose}
                className={`w-full py-4 rounded-xl font-bold text-[15px] transition-colors disabled:opacity-50 ${
                  onConfirm
                    ? "bg-transparent text-gray-400 hover:text-white hover:bg-white/5"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {onConfirm ? cancelText : "Entendido"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
