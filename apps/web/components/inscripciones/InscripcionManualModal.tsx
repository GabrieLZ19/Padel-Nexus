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
import { identificadorPareceDni } from "../../utils/identificadorJugadorManual";

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
  const [j1Nombre, setJ1Nombre] = useState("");
  const [j1Apellido, setJ1Apellido] = useState("");
  const [j1Categoria, setJ1Categoria] = useState("");
  const [j1Nacimiento, setJ1Nacimiento] = useState("");
  const [j1Telefono, setJ1Telefono] = useState("");
  const [j2Nombre, setJ2Nombre] = useState("");
  const [j2Apellido, setJ2Apellido] = useState("");
  const [j2Categoria, setJ2Categoria] = useState("");
  const [j2Nacimiento, setJ2Nacimiento] = useState("");
  const [j2Telefono, setJ2Telefono] = useState("");
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
  const categoriaTorneo = (torneo.categoria || "").trim();
  const gratuito =
    typeof torneo.es_gratis === "boolean"
      ? torneo.es_gratis
      : Number(torneo.precio_inscripcion || 0) === 0;

  const mostrarDatosJ1 = identificadorPareceDni(j1);
  const mostrarDatosJ2 = identificadorPareceDni(j2);

  const armarDatosAlta = (
    identificador: string,
    nombre: string,
    apellido: string,
    categoria: string,
    nacimiento: string,
    telefono: string,
  ) => {
    if (!identificadorPareceDni(identificador)) return undefined;
    const cat = categoria.trim() || categoriaTorneo;
    const payload = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      ...(cat ? { categoria_padel: cat } : {}),
      ...(nacimiento.trim() ? { fecha_nacimiento: nacimiento.trim() } : {}),
      ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
    };
    if (!payload.nombre && !payload.apellido) return undefined;
    return payload;
  };

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
        jugador1_datos: armarDatosAlta(
          j1,
          j1Nombre,
          j1Apellido,
          j1Categoria,
          j1Nacimiento,
          j1Telefono,
        ),
        jugador2_datos: armarDatosAlta(
          j2,
          j2Nombre,
          j2Apellido,
          j2Categoria,
          j2Nacimiento,
          j2Telefono,
        ),
        monto: Number(monto),
        metodo_pago: gratuito
          ? undefined
          : modoFederacion
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
      setJ1Nombre("");
      setJ1Apellido("");
      setJ1Categoria("");
      setJ1Nacimiento("");
      setJ1Telefono("");
      setJ2Nombre("");
      setJ2Apellido("");
      setJ2Categoria("");
      setJ2Nacimiento("");
      setJ2Telefono("");
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
              className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative p-6 space-y-6"
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

                {mostrarDatosJ1 ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3"
                  >
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Ficha provisional jugador 1: nombre y apellido *
                      {categoriaTorneo
                        ? ` · categoría por defecto ${categoriaTorneo}`
                        : ""}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre *"
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j1Nombre}
                        onChange={(e) => setJ1Nombre(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Apellido *"
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j1Apellido}
                        onChange={(e) => setJ1Apellido(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder={
                          categoriaTorneo
                            ? `Categoría (def. ${categoriaTorneo})`
                            : "Categoría *"
                        }
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j1Categoria}
                        onChange={(e) => setJ1Categoria(e.target.value)}
                      />
                      <input
                        type="date"
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j1Nacimiento}
                        onChange={(e) => setJ1Nacimiento(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Teléfono"
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j1Telefono}
                        onChange={(e) => setJ1Telefono(e.target.value)}
                      />
                    </div>
                  </motion.div>
                ) : null}

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

                {mostrarDatosJ2 && esModalidadParejas(torneo.modalidad) ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3"
                  >
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Ficha provisional jugador 2: nombre y apellido *
                      {categoriaTorneo
                        ? ` · categoría por defecto ${categoriaTorneo}`
                        : ""}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre *"
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j2Nombre}
                        onChange={(e) => setJ2Nombre(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Apellido *"
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j2Apellido}
                        onChange={(e) => setJ2Apellido(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder={
                          categoriaTorneo
                            ? `Categoría (def. ${categoriaTorneo})`
                            : "Categoría *"
                        }
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j2Categoria}
                        onChange={(e) => setJ2Categoria(e.target.value)}
                      />
                      <input
                        type="date"
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j2Nacimiento}
                        onChange={(e) => setJ2Nacimiento(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Teléfono"
                        className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-chartreuse/50"
                        value={j2Telefono}
                        onChange={(e) => setJ2Telefono(e.target.value)}
                      />
                    </div>
                  </motion.div>
                ) : null}

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
                      Se mostrará como provincia + letra (ej. NEUQUÉN A, BUENOS AIRES C) según la
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
                      {gratuito
                        ? "Pago"
                        : modoFederacion
                          ? "Estado de pago"
                          : "Método de Pago (Cobro)"}
                    </label>
                    {gratuito ? (
                      <div className="flex h-[46px] items-center rounded-xl border border-white/5 bg-[#111] px-4 text-sm font-bold text-gray-400">
                        N/A
                      </div>
                    ) : (
                      <CustomDropdown
                        value={estadoPago}
                        onChange={setEstadoPago}
                        options={pagoOptions}
                        placeholder="Seleccionar..."
                        haciaArriba={true}
                        className="py-2.5! text-sm!"
                      />
                    )}
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
