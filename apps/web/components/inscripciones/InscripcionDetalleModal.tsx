"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  User,
  Trophy,
  Clock,
  CreditCard,
  Receipt,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { Inscripcion } from "../../utils/types";

interface InscripcionDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  inscripcion: Inscripcion | null;
}

export default function InscripcionDetalleModal({
  isOpen,
  onClose,
  inscripcion,
}: InscripcionDetalleModalProps) {
  if (!inscripcion) return null;

  // Lógica para detectar si es una dupla o un jugador individual
  // Asumimos que si jugador2 está vacío o tiene un guión, es individual.
  const esDupla =
    inscripcion.jugador2_nombre &&
    inscripcion.jugador2_nombre.trim() !== "" &&
    inscripcion.jugador2_nombre !== "-";

  // Solución al error de TypeScript: Convertimos el ID a String antes de usar .slice()
  const idAbreviado = String(inscripcion.id).slice(0, 8).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1a1a1a] p-8 rounded-4xl border border-white/5 w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] my-8 relative"
          >
            {/* ENCABEZADO */}
            <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
              <div>
                <h2 className="text-[24px] font-bold text-white tracking-tight leading-none mb-2">
                  Detalle de Inscripción
                </h2>
                <p className="text-gray-400 text-sm flex items-center gap-1.5">
                  <Receipt className="size-4" /> ID: {idAbreviado}...
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* ESTADO DEL PAGO (Destacado) */}
              <div className="flex items-center justify-between bg-[#111111] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/5 ${
                      inscripcion.estado_pago === "Confirmado"
                        ? "text-[#00ff88]"
                        : inscripcion.estado_pago === "Rechazado"
                          ? "text-[#ff4444]"
                          : "text-[#ffb800]"
                    }`}
                  >
                    <CreditCard className="size-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      Monto Abonado
                    </div>
                    <div className="text-xl font-black text-white">
                      ${Number(inscripcion.monto).toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                    Estado
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      inscripcion.estado_pago === "Confirmado"
                        ? "bg-green-500/10 border-green-500/20 text-[#00ff88]"
                        : inscripcion.estado_pago === "Rechazado"
                          ? "bg-red-500/10 border-red-500/20 text-[#ff4444]"
                          : "bg-yellow-500/10 border-yellow-500/20 text-[#ffb800]"
                    }`}
                  >
                    {inscripcion.estado_pago}
                  </div>
                </div>
              </div>

              {/* GRILLA DE DATOS (Dinámica para Jugador o Dupla) */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`bg-white/5 p-4 rounded-xl ${!esDupla ? "col-span-2" : ""}`}
                >
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    {esDupla ? (
                      <Users className="size-3" />
                    ) : (
                      <User className="size-3" />
                    )}
                    {esDupla ? "Jugador 1" : "Jugador"}
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {inscripcion.jugador1_nombre}
                  </div>
                </div>

                {esDupla && (
                  <div className="bg-white/5 p-4 rounded-xl">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Users className="size-3" /> Jugador 2
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {inscripcion.jugador2_nombre}
                    </div>
                  </div>
                )}

                <div className="bg-white/5 p-4 rounded-xl col-span-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    {inscripcion.tipo === "Reserva cancha" ? (
                      <>
                        <MapPin className="size-3" /> Cancha Reservada
                      </>
                    ) : (
                      <>
                        <Trophy className="size-3" /> Torneo y Categoría
                      </>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {inscripcion.tipo === "Reserva cancha"
                      ? inscripcion.cancha_nombre
                      : inscripcion.torneo_nombre}
                  </div>
                  {inscripcion.categoria && inscripcion.categoria !== "-" && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {inscripcion.categoria}
                    </div>
                  )}
                </div>

                <div className="bg-white/5 p-4 rounded-xl col-span-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <CalendarDays className="size-3" /> Fecha de Registro
                  </div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    {new Date(inscripcion.created_at).toLocaleDateString(
                      "es-AR",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                    <span className="text-gray-500 font-normal">
                      <Clock className="size-3.5 inline mr-1" />
                      {new Date(inscripcion.created_at).toLocaleTimeString(
                        "es-AR",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl mt-2 transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
