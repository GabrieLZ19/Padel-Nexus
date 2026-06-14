// apps/web/components/torneos/TorneoModal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Save } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";
import { Club, FormTorneoState } from "../../utils/types";

interface TorneoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  formData: FormTorneoState;
  setFormData: (data: FormTorneoState) => void;
  clubs: Club[];
  isSaving: boolean;
  editingId: string | number | null;
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
  const opcionesClubes = clubs.map((c) => ({
    value: String(c.id),
    label: c.nombre,
  }));
  const opcionesCategoria = [
    { value: "Masculino", label: "Masculino" },
    { value: "Femenino", label: "Femenino" },
    { value: "Mixto", label: "Mixto" },
  ];
  const opcionesNivel = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª", "7ª", "8ª"].map(
    (n) => ({
      value: n,
      label: n,
    }),
  );
  const opcionesEstado = [
    { value: "Borrador", label: "Borrador (Oculto)" },
    { value: "Inscripción", label: "Inscripción Abierta" },
    { value: "En curso", label: "En Curso" },
    { value: "Finalizado", label: "Finalizado" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1a1a1a] p-8 rounded-4xl border border-white/5 w-full max-w-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] my-8 relative"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-[26px] font-bold text-white tracking-tight leading-none mb-2">
                  {editingId ? "Editar Torneo" : "Configurar Torneo"}
                </h2>
                <p className="text-gray-400 text-sm">
                  Completá los datos para publicar la competencia
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Nombre del Torneo
                  </label>
                  <input
                    placeholder="Ej: Master Series BA"
                    className="w-full bg-padel-1 p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
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
                    className="w-full bg-padel-1 p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors scheme-dark"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Sede / Club
                  </label>
                  <CustomDropdown
                    value={formData.club_id}
                    onChange={(val) =>
                      setFormData({ ...formData, club_id: val })
                    }
                    options={opcionesClubes}
                    placeholder={
                      clubs.length === 0
                        ? "No hay clubes creados"
                        : "Seleccionar un club adherido"
                    }
                    disabled={clubs.length === 0}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Estado de publicación
                  </label>
                  <CustomDropdown
                    value={formData.estado}
                    onChange={(val) =>
                      setFormData({ ...formData, estado: val })
                    }
                    options={opcionesEstado}
                    placeholder="Seleccionar..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Rama / Categoría
                  </label>
                  <CustomDropdown
                    value={formData.categoria}
                    onChange={(val) =>
                      setFormData({ ...formData, categoria: val })
                    }
                    options={opcionesCategoria}
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
                    options={opcionesNivel}
                    placeholder="Seleccionar..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Cupos (Duplas)
                  </label>
                  <input
                    type="number"
                    min="4"
                    className="w-full bg-padel-1 p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                    value={formData.cupos_maximos || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cupos_maximos:
                          e.target.value === "" ? 0 : parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <button
                disabled={isSaving || !formData.nombre || !formData.club_id}
                onClick={onSave}
                className="w-full bg-[#212b06] disabled:opacity-50 border border-padel-4/10 hover:border-padel-4/30 hover:bg-[#2c3a08] text-padel-4 font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(204,255,0,0.05)]"
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
