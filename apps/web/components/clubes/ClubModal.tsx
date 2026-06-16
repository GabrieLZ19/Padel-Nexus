"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2 } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";
import { FormClubState } from "../../utils/types";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";

interface ClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  formData: FormClubState;
  setFormData: (data: FormClubState) => void;
  isSaving: boolean;
  editingId: string | null;
}

const ESTADOS = [
  { value: "Activo", label: "Activo" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Inactivo", label: "Inactivo" },
];

export default function ClubModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  formData,
  setFormData,
  isSaving,
  editingId,
}: ClubModalProps) {
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
            {/* ENCABEZADO */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-[26px] font-bold text-white tracking-tight leading-none mb-2">
                  {editingId ? "Gestionar Club" : "Nuevo Club"}
                </h2>
                <p className="text-gray-400 text-sm">
                  Completá los datos del complejo deportivo
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
              {/* FILA 1: NOMBRE */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Nombre del Complejo
                </label>
                <input
                  placeholder="Ej: Padel Center"
                  className="w-full bg-padel-1 p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                />
              </div>

              {/* FILA 2: PROVINCIA Y LOCALIDAD (MIGRADOS A CONSTANTE GLOBAL) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Provincia
                  </label>
                  <CustomDropdown
                    value={formData.provincia}
                    onChange={(val) =>
                      setFormData({ ...formData, provincia: val })
                    }
                    options={PROVINCIAS_ARG} // <-- Pasado directamente sin duplicar lógica
                    placeholder="Seleccionar..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Localidad
                  </label>
                  <input
                    placeholder="Ciudad / Barrio"
                    className="w-full bg-padel-1 p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                    value={formData.localidad}
                    onChange={(e) =>
                      setFormData({ ...formData, localidad: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* FILA 3: CANCHAS Y ESTADO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Cantidad de Canchas
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-padel-1 p-4 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                    value={formData.canchas || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        canchas:
                          e.target.value === "" ? 0 : parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Estado
                  </label>
                  <CustomDropdown
                    value={formData.estado}
                    onChange={(val) =>
                      setFormData({ ...formData, estado: val })
                    }
                    options={ESTADOS}
                    placeholder="Seleccionar..."
                  />
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex gap-3 mt-6 pt-2">
                {editingId && (
                  <button
                    disabled={isSaving}
                    onClick={onDelete}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 className="size-5" /> Eliminar
                  </button>
                )}
                <button
                  disabled={isSaving || !formData.nombre || !formData.localidad}
                  onClick={onSave}
                  className="flex-2 w-full bg-padel-4 disabled:bg-padel-2 disabled:text-gray-500 text-padel-1 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)]"
                >
                  {isSaving ? (
                    "Procesando..."
                  ) : (
                    <>
                      <Save className="size-5" />{" "}
                      {editingId ? "Guardar Cambios" : "Guardar Club"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
