"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Save,
  Trash2,
  Loader2,
  Plus,
  Minus,
  MapPin,
  Building2,
} from "lucide-react";
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
  const [localidades, setLocalidades] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [localidadSearch, setLocalidadSearch] = useState(
    formData.localidad || "",
  );
  const [isLocalidadOpen, setIsLocalidadOpen] = useState(false);
  const localidadDropdownRef = useRef<HTMLDivElement>(null);

  // Sincronizar localidadSearch con el prop formData
  useEffect(() => {
    if (isOpen) {
      setLocalidadSearch(formData.localidad || "");
    }
  }, [formData.localidad, isOpen]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        localidadDropdownRef.current &&
        !localidadDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLocalidadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch localidades de la provincia seleccionada
  useEffect(() => {
    if (!formData.provincia || !isOpen) {
      setLocalidades([]);
      return;
    }

    let active = true;
    const loadLocalidades = async () => {
      setLoadingLocalidades(true);
      const provName =
        formData.provincia === "CABA"
          ? "Ciudad Autónoma de Buenos Aires"
          : formData.provincia;
      try {
        const res = await fetch(
          `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(
            provName,
          )}&max=2000&campos=nombre`,
        );
        const data = await res.json();
        if (active && data && data.localidades) {
          const list = data.localidades
            .map((loc: any) => {
              const formattedName = loc.nombre
                .toLowerCase()
                .split(" ")
                .map(
                  (word: string) =>
                    word.charAt(0).toUpperCase() + word.slice(1),
                )
                .join(" ");
              return formattedName;
            })
            .filter(
              (value: string, index: number, self: string[]) =>
                self.indexOf(value) === index,
            )
            .sort((a: string, b: string) => a.localeCompare(b))
            .map((name: string) => ({ value: name, label: name }));

          setLocalidades(list);
        }
      } catch (err) {
        console.error("Error loading localidades:", err);
      } finally {
        if (active) setLoadingLocalidades(false);
      }
    };

    loadLocalidades();
    return () => {
      active = false;
    };
  }, [formData.provincia, isOpen]);

  const filteredLocalidades = localidades.filter((loc) =>
    loc.label.toLowerCase().includes(localidadSearch.toLowerCase()),
  );

  return (
    <>
      <style>{`
        input.no-spinner::-webkit-outer-spin-button,
        input.no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input.no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="bg-brand-card/90 border border-brand-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative backdrop-blur-2xl w-full max-w-2xl my-8"
            >
              {/* Neon Glow inside modal */}
              <div className="absolute -top-20 -right-20 size-40 rounded-full bg-brand-chartreuse/10 blur-[50px] pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 size-40 rounded-full bg-brand-chartreuse/5 blur-[50px] pointer-events-none" />

              {/* ENCABEZADO */}
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="size-12 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center shadow-[0_0_15px_rgba(203,254,1,0.05)]">
                    <Building2 className="size-6 text-brand-chartreuse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-brand-white tracking-tight font-sans leading-none mb-1.5">
                      {editingId ? "Gestionar Club" : "Nuevo Club"}
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      Completá los datos del complejo deportivo
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-brand-white/5 flex items-center justify-center text-gray-400 hover:bg-brand-white/10 hover:text-brand-white transition-colors shrink-0 cursor-pointer"
                >
                  <X className="size-4" />
                </motion.button>
              </div>

              <div className="space-y-6 relative z-10">
                {/* FILA 1: NOMBRE */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Nombre del Complejo
                  </label>
                  <input
                    placeholder="Ej: Padel Center"
                    className="w-full bg-brand-black px-4 py-3.5 rounded-xl border border-brand-white/5 focus:border-brand-chartreuse/30 focus:outline-none text-sm text-brand-white transition-colors"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                  />
                </div>

                {/* FILA 2: PROVINCIA Y LOCALIDAD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Provincia
                    </label>
                    <CustomDropdown
                      value={formData.provincia}
                      onChange={(val) => {
                        setFormData({
                          ...formData,
                          provincia: val,
                          localidad: "",
                        });
                        setLocalidadSearch("");
                      }}
                      options={PROVINCIAS_ARG}
                      placeholder="Seleccionar..."
                    />
                  </div>

                  <div className="space-y-1.5" ref={localidadDropdownRef}>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Localidad
                    </label>
                    <div className="relative">
                      <input
                        placeholder={
                          formData.provincia
                            ? "Ciudad / Barrio..."
                            : "Seleccioná provincia primero..."
                        }
                        disabled={!formData.provincia}
                        className={`w-full bg-brand-black px-4 py-3.5 rounded-xl border text-sm text-brand-white transition-colors focus:outline-none ${
                          !formData.provincia
                            ? "cursor-not-allowed opacity-40 border-brand-white/5 text-gray-500"
                            : "focus:border-brand-chartreuse/30 border-brand-white/5"
                        }`}
                        value={localidadSearch}
                        onFocus={() =>
                          formData.provincia && setIsLocalidadOpen(true)
                        }
                        onChange={(e) => {
                          setLocalidadSearch(e.target.value);
                          setFormData({
                            ...formData,
                            localidad: e.target.value,
                          });
                          setIsLocalidadOpen(true);
                        }}
                      />
                      <AnimatePresence>
                        {isLocalidadOpen && formData.provincia && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.12, ease: "easeOut" }}
                            className="absolute left-0 right-0 mt-2 bg-brand-card border border-brand-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-50 overflow-hidden max-h-52 overflow-y-auto 
                            [&::-webkit-scrollbar]:w-1.5 
                            [&::-webkit-scrollbar-track]:bg-transparent 
                            [&::-webkit-scrollbar-thumb]:bg-brand-white/10 
                            [&::-webkit-scrollbar-thumb]:rounded-full 
                            hover:[&::-webkit-scrollbar-thumb]:bg-brand-white/20"
                          >
                            {loadingLocalidades ? (
                              <div className="p-4 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin size-4 text-brand-chartreuse" />
                                Buscando localidades...
                              </div>
                            ) : filteredLocalidades.length === 0 ? (
                              <div className="p-4 text-xs text-gray-500 text-center">
                                No se encontraron resultados. Podés escribirla a
                                mano.
                              </div>
                            ) : (
                              <div>
                                <div className="px-4 py-2 text-[9px] text-brand-chartreuse font-extrabold uppercase tracking-widest border-b border-brand-white/5 bg-brand-white/5 flex items-center gap-1">
                                  <MapPin size={9} /> Resultados Geográficos FAP
                                </div>
                                <div className="py-1">
                                  {filteredLocalidades.map((loc) => {
                                    const isSelected =
                                      formData.localidad === loc.value;
                                    return (
                                      <div
                                        key={loc.value}
                                        onClick={() => {
                                          setFormData({
                                            ...formData,
                                            localidad: loc.value,
                                          });
                                          setLocalidadSearch(loc.value);
                                          setIsLocalidadOpen(false);
                                        }}
                                        className={`px-4 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors text-left flex items-center ${
                                          isSelected
                                            ? "text-brand-chartreuse font-bold bg-brand-chartreuse/5 border-l-2 border-brand-chartreuse"
                                            : "text-gray-300 border-l-2 border-transparent hover:bg-brand-white/5 hover:text-brand-white"
                                        }`}
                                      >
                                        {loc.label}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* FILA 3: CANCHAS Y ESTADO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Cantidad de Canchas
                    </label>
                    <div className="flex items-center bg-brand-black border border-brand-white/5 rounded-xl overflow-hidden h-[50px] w-full">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            canchas: Math.max(1, (formData.canchas || 1) - 1),
                          })
                        }
                        className="w-12 h-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white flex items-center justify-center transition-colors cursor-pointer border-r border-brand-white/5 active:scale-95"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        className="no-spinner flex-1 text-center bg-transparent border-none text-brand-white text-sm font-semibold focus:outline-none w-full h-full"
                        value={formData.canchas || 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            canchas:
                              e.target.value === ""
                                ? 1
                                : Math.max(1, parseInt(e.target.value)),
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            canchas: (formData.canchas || 1) + 1,
                          })
                        }
                        className="w-12 h-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white flex items-center justify-center transition-colors cursor-pointer border-l border-brand-white/5 active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Estado
                    </label>
                    <CustomDropdown
                      value={formData.estado}
                      onChange={(val) =>
                        setFormData({ ...formData, estado: val })
                      }
                      options={ESTADOS}
                      placeholder="Seleccionar..."
                      haciaArriba={true}
                    />
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-4 border-t border-brand-white/5">
                  {editingId && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSaving}
                      onClick={onDelete}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                    >
                      <Trash2 className="size-4" /> Eliminar Club
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={
                      isSaving ||
                      !formData.nombre ||
                      !formData.localidad ||
                      !formData.provincia
                        ? {}
                        : { scale: 1.02 }
                    }
                    whileTap={
                      isSaving ||
                      !formData.nombre ||
                      !formData.localidad ||
                      !formData.provincia
                        ? {}
                        : { scale: 0.98 }
                    }
                    disabled={
                      isSaving ||
                      !formData.nombre ||
                      !formData.localidad ||
                      !formData.provincia
                    }
                    onClick={onSave}
                    className="flex-2 w-full bg-brand-chartreuse hover:bg-[#b3e600] disabled:bg-brand-white/5 disabled:text-gray-500 text-brand-black font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-chartreuse/10 hover:shadow-brand-chartreuse/20 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none text-sm"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin size-4" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />{" "}
                        {editingId ? "Guardar Cambios" : "Crear Club"}
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
