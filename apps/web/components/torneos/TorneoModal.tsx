"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Lock } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";
import { Club, FormTorneoState } from "../../utils/types";

import {
  NIVELES_PADEL,
  CATEGORIAS_TORNEO,
  ESTADOS_TORNEO,
  MODALIDADES_TORNEO,
  FORMATOS_TORNEO,
} from "@/utils/constants/padelConfig";

interface TorneoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  formData: FormTorneoState;
  setFormData: (data: FormTorneoState) => void;
  clubs: Club[];
  isSaving: boolean;
  editingId: string | null;
}

export default function TorneoModal({
  isOpen,
  onClose,
  onSave,
  formData,
  setFormData,
  clubs,
  isSaving,
  editingId,
}: TorneoModalProps) {
  // 1. Obtenemos el día actual estrictamente en la zona horaria local del usuario
  const hoy = new Date();
  const fechaLocal = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  // 2. Lógica inteligente para la fecha mínima
  const fechaFormulario = formData.fecha ? formData.fecha.split("T")[0] : "";
  const minDate =
    editingId && fechaFormulario && fechaFormulario < fechaLocal
      ? fechaFormulario
      : fechaLocal;

  const opcionesClubes = clubs.map((c) => ({
    value: String(c.id),
    label: c.nombre,
  }));

  const opcionesCupos = [4, 8, 16, 32, 64].map((num) => ({
    value: String(num),
    label: `${num} ${formData.modalidad === "Individual" ? "Jugadores" : "Duplas"}`,
  }));

  // Lógica de estados automáticos: si ya tiene llaves generadas, se bloquea la edición de estado.
  const estadoNormalizado = (formData.estado || "").toLowerCase().trim();
  const isAutoManaged =
    estadoNormalizado === "en curso" || estadoNormalizado === "finalizado";

  // Usamos la constante ESTADOS_TORNEO que pediste
  const opcionesEstado = isAutoManaged
    ? [{ value: formData.estado, label: formData.estado.toUpperCase() }]
    : ESTADOS_TORNEO;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1a1a1a] p-8 rounded-4xl border border-white/5 w-full max-w-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] my-8 relative"
          >
            <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
              <div>
                <h2 className="text-[26px] font-bold text-white tracking-tight leading-none mb-2">
                  {editingId ? "Editar Torneo" : "Configurar Torneo"}
                </h2>
                <p className="text-gray-400 text-sm">
                  Definí los detalles técnicos, financieros y operativos de la
                  competencia.
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
              {/* FILA 1: Nombre y Fecha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Nombre del Torneo
                  </label>
                  <input
                    placeholder="Ej: Master Series BA"
                    className="w-full bg-brand-card p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    className="w-full bg-brand-card p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors scheme-dark"
                    value={fechaFormulario}
                    onChange={(e) => {
                      const val = e.target.value;
                      // MAGIA ANTI-ZONA HORARIA: Inyectamos mediodía con huso horario argentino (-03:00)
                      // Esto garantiza que en la base de datos caiga exactamente en el día que elegiste.
                      setFormData({
                        ...formData,
                        fecha: val ? `${val}T12:00:00-03:00` : "",
                      });
                    }}
                  />
                </div>
              </div>

              {/* FILA 2: Sede y Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Sede / Club
                  </label>
                  <CustomDropdown
                    value={formData.club_id ?? ""}
                    onChange={(val) =>
                      setFormData({ ...formData, club_id: val })
                    }
                    options={opcionesClubes}
                    placeholder={
                      clubs.length === 0
                        ? "No hay clubes creados"
                        : "Sede a confirmar..."
                    }
                    disabled={clubs.length === 0}
                  />
                </div>
                <div>
                  <label className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    <span>Estado de publicación</span>
                    {isAutoManaged && (
                      <span className="flex items-center gap-1 text-brand-chartreuse">
                        <Lock className="size-3" /> Auto
                      </span>
                    )}
                  </label>
                  <div
                    className={
                      isAutoManaged ? "opacity-60 cursor-not-allowed" : ""
                    }
                  >
                    <CustomDropdown
                      value={formData.estado}
                      onChange={(val) =>
                        setFormData({ ...formData, estado: val })
                      }
                      options={opcionesEstado}
                      placeholder="Seleccionar..."
                      disabled={isAutoManaged}
                    />
                  </div>
                  {isAutoManaged && (
                    <p className="text-[10px] text-gray-500 mt-1.5">
                      El sistema gestiona este estado porque el torneo ya tiene
                      llaves generadas.
                    </p>
                  )}
                </div>
              </div>

              {/* FILA 3: Modalidad, Rama y Nivel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Modalidad
                  </label>
                  <CustomDropdown
                    value={formData.modalidad || "Duplas"}
                    onChange={(val) =>
                      setFormData({ ...formData, modalidad: val })
                    }
                    options={MODALIDADES_TORNEO}
                    placeholder="Seleccionar..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Rama / Categoría
                  </label>
                  <CustomDropdown
                    value={formData.categoria}
                    onChange={(val) =>
                      setFormData({ ...formData, categoria: val })
                    }
                    options={CATEGORIAS_TORNEO}
                    placeholder="Seleccionar..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Nivel
                  </label>
                  <CustomDropdown
                    value={formData.nivel}
                    onChange={(val) => setFormData({ ...formData, nivel: val })}
                    options={NIVELES_PADEL}
                    placeholder="Seleccionar..."
                  />
                </div>
              </div>

              {/* FILA 4: Fases, Cupos y Precio */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Formato de Fases
                  </label>
                  <CustomDropdown
                    value={formData.formato || "Eliminatoria Directa"}
                    onChange={(val) =>
                      setFormData({ ...formData, formato: val })
                    }
                    options={FORMATOS_TORNEO}
                    placeholder="Seleccionar..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Cupos Máximos
                  </label>
                  <CustomDropdown
                    value={String(formData.cupos_maximos || 16)}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        cupos_maximos: Number(val),
                      })
                    }
                    options={opcionesCupos}
                    placeholder="Elegir cupos..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Precio Inscripción ($)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 24000"
                    className="w-full bg-brand-card p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors font-semibold"
                    value={formData.precio_inscripcion ?? ""}
                    onChange={(e) => {
                      const soloNumeros = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({
                        ...formData,
                        precio_inscripcion:
                          soloNumeros === "" ? undefined : Number(soloNumeros),
                      });
                    }}
                  />
                </div>
              </div>

              {/* FILA 5: Premios (1º, 2º y 3º) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                  Estructura de Premios (Dejar en blanco si no hay premios)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-black text-[10px] border border-yellow-500/30">
                        1º
                      </span>
                      <span className="text-[11px] font-bold text-gray-400">
                        Campeón
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Ej: $180.000 + Trofeo"
                      className="w-full bg-brand-card p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                      value={formData.premio_1 || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, premio_1: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-gray-400/20 text-gray-400 flex items-center justify-center font-black text-[10px] border border-gray-400/30">
                        2º
                      </span>
                      <span className="text-[11px] font-bold text-gray-400">
                        Subcampeón (Opcional)
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Ej: $80.000 + Medalla"
                      className="w-full bg-brand-card p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                      value={formData.premio_2 || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, premio_2: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-amber-700/20 text-amber-600 flex items-center justify-center font-black text-[10px] border border-amber-700/30">
                        3º
                      </span>
                      <span className="text-[11px] font-bold text-gray-400">
                        Tercer Puesto (Opcional)
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Ej: Inscripción gratis"
                      className="w-full bg-brand-card p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                      value={formData.premio_3 || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, premio_3: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={isSaving || !formData.nombre}
                onClick={onSave}
                className="w-full bg-[#212b06] disabled:opacity-50 border border-brand-chartreuse/10 hover:border-brand-chartreuse/30 hover:bg-[#2c3a08] text-brand-chartreuse font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(204,255,0,0.05)]"
              >
                {isSaving ? (
                  "Procesando..."
                ) : (
                  <>
                    <Save className="size-5" />
                    {editingId ? "Guardar Cambios" : "Publicar Torneo"}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
