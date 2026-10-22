"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Save } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";
import { Club, FormTorneoState } from "../../utils/types";
import { useProfileStore } from "../../store/useProfileStore";
import {
  RAMAS_PADEL,
  getAlcancesPermitidos,
  getCategoriasParaAsociacion,
  getNivelesParaCategoria,
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
  /** Si true, el club_id viene fijado por el contexto (panel club) y no se muestra selector. */
  sedeFija?: boolean;
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
  sedeFija = false,
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

  // Obtener alcances filtrados por rol
  const alcancesDisponibles = getAlcancesPermitidos(userRole);
  const alcanceOptions = alcancesDisponibles
    .filter((a) => !a.disabled)
    .map((a) => ({ value: a.value, label: a.label }));

  const ramaOptions = RAMAS_PADEL.map((r) => ({
    value: r.value,
    label: r.label,
  }));

  const reglamento = formData.asociacion || "FAP";
  const categorias = getCategoriasParaAsociacion(reglamento);
  const niveles = formData.categoria
    ? getNivelesParaCategoria(reglamento, formData.categoria)
    : [];

  const canSave =
    Boolean(formData.nombre) &&
    Boolean(formData.fecha) &&
    Boolean(formData.categoria) &&
    Boolean(formData.nivel) &&
    (!sedeFija || Boolean(formData.club_id));

  const sedeNombre =
    clubs.find((c) => String(c.id) === String(formData.club_id))?.nombre ||
    null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1a1a1a] my-auto w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-4xl border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative"
          >
            <div className="sticky top-0 z-10 flex justify-between items-start gap-3 border-b border-white/10 bg-[#1a1a1a] px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">
                  {editingId ? "Editar Torneo" : "Nuevo Torneo"}
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  Creá el borrador inicial. El centro de cómputos se configura en
                  el Paso 1 del asistente.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Nombre del Torneo
                </label>
                <input
                  placeholder="Ej: Master Series BA"
                  className="w-full bg-brand-card p-3 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Categoría
                  </label>
                  <CustomDropdown
                    value={formData.categoria || ""}
                    onChange={(val) =>
                      setFormData({ ...formData, categoria: val, nivel: "" })
                    }
                    options={categorias}
                    placeholder="Elegir categoría..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Nivel
                  </label>
                  <CustomDropdown
                    value={formData.nivel || ""}
                    onChange={(val) => setFormData({ ...formData, nivel: val })}
                    options={niveles}
                    placeholder={
                      formData.categoria
                        ? "Elegir nivel..."
                        : "Primero la categoría"
                    }
                    disabled={!formData.categoria}
                    haciaArriba
                  />
                </div>
              </div>

              {sedeFija && sedeNombre && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Centro de Cómputos
                  </label>
                  <div className="w-full bg-brand-card/50 px-3 py-2.5 rounded-xl border border-white/5 text-gray-300 text-sm font-semibold">
                    {sedeNombre}
                  </div>
                </div>
              )}

              {!sedeFija && clubs.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Centro de Cómputos (Sede Club)
                  </label>
                  <CustomDropdown
                    value={formData.club_id || ""}
                    onChange={(val) =>
                      setFormData({ ...formData, club_id: val })
                    }
                    options={[
                      { value: "", label: "Definir más adelante (en el Paso 1)" },
                      ...clubs.map((c) => ({
                        value: String(c.id),
                        label: `${c.nombre}${c.provincia ? ` (${c.provincia})` : ""}`,
                      })),
                    ]}
                    placeholder="Seleccionar Club Sede o definir después..."
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
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
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Alcance
                </label>
                <CustomDropdown
                  value={formData.alcance ?? "Provincial"}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      alcance: val as FormTorneoState["alcance"],
                    })
                  }
                  options={alcanceOptions}
                  placeholder="Seleccionar Alcance..."
                />
                {(userRole === "admin" || userRole === "admin_club") && (
                  <p className="text-[10px] text-yellow-500/80 mt-1.5 font-semibold">
                    Tu perfil de Club solo permite organizar torneos Locales,
                    Regionales o Provinciales.
                  </p>
                )}
                {userRole === "admin_provincial" && (
                  <p className="text-[10px] text-yellow-500/80 mt-1.5 font-semibold">
                    Tu perfil Provincial no permite organizar torneos
                    Nacionales.
                  </p>
                )}
                {(userRole === "admin_federacion" ||
                  userRole === "superadmin") && (
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    La federación nacional no organiza torneos Locales ni
                    Privados.
                  </p>
                )}
              </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  min={minDate}
                  className="w-full bg-brand-card p-3 rounded-xl border border-transparent focus:border-white/10 text-brand-white focus:outline-none text-sm transition-colors cursor-pointer"
                  value={fechaFormulario}
                  onClick={(e) => {
                    try {
                      (e.target as HTMLInputElement).showPicker();
                    } catch (err) {
                      console.log("Picker not supported:", err);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      fecha: val ? `${val}T12:00:00-03:00` : "",
                    });
                  }}
                />
              </div>

              <button
                disabled={isSaving || !canSave}
                onClick={onSave}
                className="w-full bg-brand-chartreuse disabled:opacity-50 text-brand-black font-bold py-3 rounded-xl mt-1 flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg cursor-pointer"
              >
                {isSaving ? (
                  "Procesando..."
                ) : (
                  <>
                    <Save className="size-5" />
                    {editingId
                      ? "Guardar Cambios"
                      : "Crear Borrador & Configurar"}
                  </>
                )}
              </button>
            </div>
          </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
