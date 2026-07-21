"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";
import { Club, FormTorneoState } from "../../utils/types";
import { useProfileStore } from "../../store/useProfileStore";
import {
  RAMAS_PADEL,
  getAlcancesPermitidos,
} from "../../utils/constants/fapApaRules";
import type { RolUsuario } from "../../utils/types/user.types";

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
  const profile = useProfileStore((s) => s.profile);
  const userRole = (profile?.rol || "admin") as RolUsuario;

  // Day logic in local user timezone
  const hoy = new Date();
  const fechaLocal = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  const fechaFormulario = formData.fecha ? formData.fecha.split("T")[0] : "";
  const minDate =
    editingId && fechaFormulario && fechaFormulario < fechaLocal
      ? fechaFormulario
      : fechaLocal;

  const opcionesClubes = clubs.map((c) => ({
    value: String(c.id),
    label: c.nombre,
  }));

  // Obtener alcances filtrados por rol
  const alcancesDisponibles = getAlcancesPermitidos(userRole);
  const alcanceOptions = alcancesDisponibles
    .filter((a) => !a.disabled)
    .map((a) => ({ value: a.value, label: a.label }));

  const ramaOptions = RAMAS_PADEL.map((r) => ({
    value: r.value,
    label: r.label,
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1a1a1a] p-8 rounded-4xl border border-white/5 w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative"
          >
            <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">
                  {editingId ? "Editar Torneo" : "Nuevo Torneo"}
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  Creá el borrador inicial de la competencia.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5">
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
                  Sede / Club Organizador
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
                      : "Seleccionar Club..."
                  }
                  disabled={clubs.length === 0}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Rama
                </label>
                <CustomDropdown
                  value={formData.rama || "Masculina"}
                  onChange={(val) =>
                    setFormData({ ...formData, rama: val })
                  }
                  options={ramaOptions}
                  placeholder="Seleccionar Rama..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Alcance del Torneo
                </label>
                <CustomDropdown
                  value={formData.alcance ?? "Provincial"}
                  onChange={(val) =>
                    setFormData({ ...formData, alcance: val as FormTorneoState["alcance"] })
                  }
                  options={alcanceOptions}
                  placeholder="Seleccionar Alcance..."
                />
                {/* Indicador de restricción para roles limitados */}
                {(userRole === "admin" || userRole === "admin_club") && (
                  <p className="text-[10px] text-yellow-500/80 mt-1.5 font-semibold">
                    Tu perfil de Club solo permite organizar torneos Locales, Regionales o Provinciales.
                  </p>
                )}
                {userRole === "admin_provincial" && (
                  <p className="text-[10px] text-yellow-500/80 mt-1.5 font-semibold">
                    Tu perfil Provincial no permite organizar torneos Nacionales.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  min={minDate}
                  className="w-full bg-brand-card p-4 rounded-xl border border-transparent focus:border-white/10 text-brand-white focus:outline-none text-sm transition-colors cursor-pointer"
                  value={fechaFormulario}
                  onClick={(e) => {
                    try {
                      (e.target as any).showPicker();
                    } catch (err) {
                      console.log("Picker not supported:", err);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    // MAGIA ANTI-ZONA HORARIA: Inyectamos mediodía con huso horario argentino (-03:00)
                    setFormData({
                      ...formData,
                      fecha: val ? `${val}T12:00:00-03:00` : "",
                    });
                  }}
                />
              </div>

              <button
                disabled={isSaving || !formData.nombre || !formData.club_id || !formData.fecha}
                onClick={onSave}
                className="w-full bg-brand-chartreuse disabled:opacity-50 text-brand-black font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg cursor-pointer"
              >
                {isSaving ? (
                  "Procesando..."
                ) : (
                  <>
                    <Save className="size-5" />
                    {editingId ? "Guardar Cambios" : "Crear Borrador & Configurar"}
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
