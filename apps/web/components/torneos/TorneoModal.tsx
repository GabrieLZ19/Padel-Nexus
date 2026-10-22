"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";
import { Club, FormTorneoState } from "../../utils/types";
import { useProfileStore } from "../../store/useProfileStore";
import {
  RAMAS_PADEL,
  CUSTOM_OPTION_VALUE,
  FORMATOS_TORNEO_CLUB,
  FORMATOS_TORNEO_OFICIAL,
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
  const esClub = sedeFija || userRole === "admin_club" || userRole === "admin";

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

  const formatoOptions = (
    esClub ? FORMATOS_TORNEO_CLUB : FORMATOS_TORNEO_OFICIAL
  ).map((f) => ({
    value: f.value,
    label: f.label,
  }));

  const reglamento = formData.asociacion || "FAP";
  const categoriasBase = useMemo(
    () => getCategoriasParaAsociacion(reglamento, esClub),
    [reglamento, esClub],
  );

  const categoriasOptions = useMemo(() => {
    return [
      ...categoriasBase,
      {
        value: CUSTOM_OPTION_VALUE,
        label: "+ Crear otra categoría...",
      },
    ];
  }, [categoriasBase]);

  const [showCustomCategoria, setShowCustomCategoria] = useState(false);
  const [customCategoria, setCustomCategoria] = useState("");
  const [showCustomNivel, setShowCustomNivel] = useState(false);
  const [customNivel, setCustomNivel] = useState("");

  const categoriaEfectiva = showCustomCategoria
    ? customCategoria
    : formData.categoria || "";

  const nivelesBase = useMemo(() => {
    if (!categoriaEfectiva) return [];
    return getNivelesParaCategoria(reglamento, categoriaEfectiva);
  }, [reglamento, categoriaEfectiva]);

  const nivelesOptions = useMemo(() => {
    return [
      ...nivelesBase,
      {
        value: CUSTOM_OPTION_VALUE,
        label: "+ Crear otro nivel...",
      },
    ];
  }, [nivelesBase]);

  // Sincronizar estado inicial al abrir modal o cambiar de torneo
  useEffect(() => {
    if (!isOpen) return;

    if (formData.categoria) {
      const enCatalogo = categoriasBase.some(
        (c) => c.value === formData.categoria,
      );
      if (!enCatalogo && formData.categoria !== CUSTOM_OPTION_VALUE) {
        setShowCustomCategoria(true);
        setCustomCategoria(formData.categoria);
      } else {
        setShowCustomCategoria(false);
        setCustomCategoria("");
      }
    } else {
      setShowCustomCategoria(false);
      setCustomCategoria("");
    }

    if (formData.nivel) {
      const enNiveles = nivelesBase.some((n) => n.value === formData.nivel);
      if (!enNiveles && formData.nivel !== CUSTOM_OPTION_VALUE) {
        setShowCustomNivel(true);
        setCustomNivel(formData.nivel);
      } else {
        setShowCustomNivel(false);
        setCustomNivel("");
      }
    } else {
      setShowCustomNivel(false);
      setCustomNivel("");
    }
  }, [isOpen, editingId]);

  const handleCategoriaSelect = (val: string) => {
    if (val === CUSTOM_OPTION_VALUE) {
      setShowCustomCategoria(true);
      setCustomCategoria("");
      setShowCustomNivel(false);
      setCustomNivel("");
      setFormData({
        ...formData,
        categoria: "",
        nivel: "",
        asociacion: "Amateur",
      });
      return;
    }

    setShowCustomCategoria(false);
    setCustomCategoria("");
    setShowCustomNivel(false);
    setCustomNivel("");

    const updates: Partial<FormTorneoState> = {
      categoria: val,
    };

    // Sincronización inteligente para categorías recreativas típicas de club
    if (val === "Americano") {
      updates.formato = "Americano";
      updates.asociacion = "Amateur";
      updates.alcance = formData.alcance || "Local";
      updates.nivel = "Única";
    } else if (val === "Super 8") {
      updates.formato = "Super 8";
      updates.asociacion = "Amateur";
      updates.alcance = formData.alcance || "Local";
      updates.nivel = "Única";
    } else if (val === "Super 12") {
      updates.formato = "Super 12";
      updates.asociacion = "Amateur";
      updates.alcance = formData.alcance || "Local";
      updates.nivel = "Única";
    } else if (val === "Suma 8") {
      updates.formato = "Suma 8";
      updates.asociacion = "Amateur";
      updates.alcance = formData.alcance || "Local";
      updates.nivel = "Suma 8";
    } else if (val === "Suma 10") {
      updates.formato = "Zonas + Llaves";
      updates.asociacion = "Amateur";
      updates.alcance = formData.alcance || "Local";
      updates.nivel = "Suma 10";
    } else if (val === "Suma 12") {
      updates.formato = "Suma 12";
      updates.asociacion = "Amateur";
      updates.alcance = formData.alcance || "Local";
      updates.nivel = "Suma 12";
    } else if (val === "Recreativo") {
      updates.asociacion = "Amateur";
      updates.alcance = formData.alcance || "Local";
      updates.nivel = "Única";
    } else if (val === "Libres") {
      updates.asociacion = "FAP";
      updates.nivel = "5ª";
      if (formData.formato === "Americano" || formData.formato === "Super 8") {
        updates.formato = "Eliminatoria Directa";
      }
    } else {
      const opcionesNivel = getNivelesParaCategoria(reglamento, val);
      updates.nivel = opcionesNivel[0]?.value || "";
    }

    setFormData({
      ...formData,
      ...updates,
    });
  };

  const handleCustomCategoriaInput = (val: string) => {
    setCustomCategoria(val);
    setFormData({
      ...formData,
      categoria: val,
      asociacion: "Amateur",
    });
  };

  const handleCancelCustomCategoria = () => {
    setShowCustomCategoria(false);
    setCustomCategoria("");
    const defaultCat = categoriasBase[0]?.value || "Libres";
    setFormData({
      ...formData,
      categoria: defaultCat,
      nivel: "",
    });
  };

  const handleNivelSelect = (val: string) => {
    if (val === CUSTOM_OPTION_VALUE) {
      setShowCustomNivel(true);
      setCustomNivel("");
      setFormData({
        ...formData,
        nivel: "",
      });
      return;
    }

    setShowCustomNivel(false);
    setCustomNivel("");
    setFormData({
      ...formData,
      nivel: val,
    });
  };

  const handleCustomNivelInput = (val: string) => {
    setCustomNivel(val);
    setFormData({
      ...formData,
      nivel: val,
    });
  };

  const handleCancelCustomNivel = () => {
    setShowCustomNivel(false);
    setCustomNivel("");
    const defaultNiv = nivelesBase[0]?.value || "Única";
    setFormData({
      ...formData,
      nivel: defaultNiv,
    });
  };

  const finalCat = showCustomCategoria
    ? customCategoria.trim()
    : (formData.categoria || "").trim();
  const finalNiv = showCustomNivel
    ? customNivel.trim()
    : (formData.nivel || "").trim();

  const canSave =
    Boolean(formData.nombre?.trim()) &&
    Boolean(formData.fecha) &&
    Boolean(finalCat) &&
    Boolean(finalNiv) &&
    (!sedeFija || Boolean(formData.club_id));

  const handleSave = () => {
    if (!canSave) return;
    setFormData({
      ...formData,
      nombre: formData.nombre.trim(),
      categoria: finalCat,
      nivel: finalNiv,
    });
    onSave();
  };

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
                    Creá el borrador inicial. El centro de cómputos y detalles se
                    completan en el asistente.
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
                    placeholder="Ej: Americano de Primavera / Master Series BA"
                    className="w-full bg-brand-card p-3 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors font-medium"
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
                    {showCustomCategoria ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={customCategoria}
                          onChange={(e) =>
                            handleCustomCategoriaInput(e.target.value)
                          }
                          placeholder="Ej: Americano, Super 8, Nocturno..."
                          className="w-full bg-brand-card p-2.5 rounded-xl border border-brand-chartreuse/40 text-white focus:outline-none text-sm font-semibold"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleCancelCustomCategoria}
                          className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer underline"
                        >
                          ← Volver al listado
                        </button>
                      </div>
                    ) : (
                      <CustomDropdown
                        value={formData.categoria || ""}
                        onChange={handleCategoriaSelect}
                        options={categoriasOptions}
                        placeholder="Elegir categoría..."
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      Nivel
                    </label>
                    {showCustomNivel ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={customNivel}
                          onChange={(e) =>
                            handleCustomNivelInput(e.target.value)
                          }
                          placeholder="Ej: Principiante, Oro, 7ª..."
                          className="w-full bg-brand-card p-2.5 rounded-xl border border-brand-chartreuse/40 text-white focus:outline-none text-sm font-semibold"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleCancelCustomNivel}
                          className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer underline"
                        >
                          ← Volver al listado
                        </button>
                      </div>
                    ) : (
                      <CustomDropdown
                        value={formData.nivel || ""}
                        onChange={handleNivelSelect}
                        options={nivelesOptions}
                        placeholder={
                          categoriaEfectiva
                            ? "Elegir nivel..."
                            : "Primero la categoría"
                        }
                        disabled={!categoriaEfectiva}
                        haciaArriba
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Formato del Torneo
                  </label>
                  <CustomDropdown
                    value={formData.formato || "Eliminatoria Directa"}
                    onChange={(val) =>
                      setFormData({ ...formData, formato: val })
                    }
                    options={formatoOptions}
                    placeholder="Seleccionar formato..."
                  />
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
                        {
                          value: "",
                          label: "Definir más adelante (en el Paso 1)",
                        },
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
                      onChange={(val) => setFormData({ ...formData, rama: val })}
                      options={ramaOptions}
                      placeholder="Seleccionar Rama..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      Alcance
                    </label>
                    <CustomDropdown
                      value={formData.alcance ?? (esClub ? "Local" : "Provincial")}
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
                        Tu perfil de Club permite organizar torneos Locales,
                        Privados, Regionales o Provinciales.
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
                  onClick={handleSave}
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
