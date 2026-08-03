import React, { useState, useEffect, useMemo, useRef } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import {
  Layers,
  Calendar,
  ShieldCheck,
  DollarSign,
  PlusCircle,
} from "lucide-react";
import {
  RAMAS_PADEL,
  getCategoriasParaAsociacion,
  getNivelesParaCategoria,
  CUSTOM_OPTION_VALUE,
} from "@/utils/constants/fapApaRules";
import type { RegisterSaveHandler } from "./types";

interface Paso3CategoriasProps {
  torneo: Torneo;
  torneoId: string;
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  registerSaveHandler?: RegisterSaveHandler;
  readOnly?: boolean;
}

export const Paso3Categorias = ({
  torneo,
  torneoId,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
  registerSaveHandler,
  readOnly = false,
}: Paso3CategoriasProps) => {
  // Asociación viene del Paso 1
  const asociacion = (torneo as any).asociacion || "FAP";

  // Rama
  const [editRama, setEditRama] = useState((torneo as any).rama || "Masculina");

  // Categoría
  const [editCategoria, setEditCategoria] = useState(
    torneo.categoria || "Libres",
  );
  const [customCategoria, setCustomCategoria] = useState("");
  const [showCustomCategoria, setShowCustomCategoria] = useState(false);

  // Nivel
  const [editNivel, setEditNivel] = useState(torneo.nivel || "5ª");
  const [customNivel, setCustomNivel] = useState("");
  const [showCustomNivel, setShowCustomNivel] = useState(false);

  // Otros
  const [editModalidad, setEditModalidad] = useState(
    torneo.modalidad || "Duplas",
  );
  const [editPrecio, setEditPrecio] = useState(
    torneo.precio_inscripcion ? String(torneo.precio_inscripcion) : "0",
  );
  const [validarEdad, setValidarEdad] = useState(
    (torneo as any).validar_edad || false,
  );
  const reglasArbitrajeObj = (torneo as any).reglas_arbitraje || {};
  const [requiereCarnet, setRequiereCarnet] = useState<boolean>(
    Boolean(reglasArbitrajeObj.requiere_carnet_federativo),
  );
  const [montoCarnet, setMontoCarnet] = useState<string>(
    reglasArbitrajeObj.monto_carnet !== undefined
      ? String(reglasArbitrajeObj.monto_carnet)
      : "0",
  );
  const [selectedDias, setSelectedDias] = useState<string[]>(() => {
    const raw = (torneo as any).dias_juego;
    return Array.isArray(raw) ? raw : [];
  });
  const [guardandoCategorias, setGuardandoCategorias] = useState(false);

  // ====================================================================
  // Opciones dinámicas de Categoría y Nivel
  // ====================================================================
  const categoriasOficiales = useMemo(
    () => getCategoriasParaAsociacion(asociacion),
    [asociacion],
  );

  const categoriasConCustom = useMemo(() => {
    const items = [...categoriasOficiales];
    items.push({
      value: CUSTOM_OPTION_VALUE,
      label: "+ Crear otra categoría...",
    });
    return items;
  }, [categoriasOficiales]);

  // Categoría efectiva = custom text o selección del dropdown
  const categoriaEfectiva =
    showCustomCategoria && customCategoria ? customCategoria : editCategoria;

  const nivelesOficiales = useMemo(
    () => getNivelesParaCategoria(asociacion, categoriaEfectiva),
    [asociacion, categoriaEfectiva],
  );

  const nivelesConCustom = useMemo(() => {
    const items = [...nivelesOficiales];
    items.push({
      value: CUSTOM_OPTION_VALUE,
      label: "+ Crear otro nivel...",
    });
    return items;
  }, [nivelesOficiales]);

  // Auto-activar o desactivar validación de edad según categoría
  useEffect(() => {
    const esConEdad = /\+(30|40|50|60)|veteranos|ladies|menores/i.test(
      categoriaEfectiva,
    );
    if (esConEdad) {
      setValidarEdad(true);
    }
  }, [categoriaEfectiva]);

  // Reset nivel cuando cambia la categoría (y hay opciones válidas)
  useEffect(() => {
    if (!showCustomCategoria && nivelesOficiales.length > 0) {
      const currentValid = nivelesOficiales.some((n) => n.value === editNivel);
      if (!currentValid) {
        setEditNivel(nivelesOficiales[0].value);
        setShowCustomNivel(false);
        setCustomNivel("");
      }
    }
  }, [categoriaEfectiva, asociacion]);

  // Reset categoría y nivel cuando cambia la asociación
  useEffect(() => {
    const valid = categoriasOficiales.some((c) => c.value === editCategoria);
    if (!valid && categoriasOficiales.length > 0) {
      setEditCategoria(categoriasOficiales[0].value);
      setShowCustomCategoria(false);
      setCustomCategoria("");
    }
  }, [asociacion]);

  // Genera el rango de días reales del torneo si existen las fechas
  const getPlayDaysRange = () => {
    if (!torneo.fecha) {
      return [
        { label: "Viernes", value: "Viernes" },
        { label: "Sábado", value: "Sábado" },
        { label: "Domingo", value: "Domingo" },
      ];
    }
    const startStr = torneo.fecha.split("T")[0];
    const endStr = (torneo as any).fecha_fin
      ? (torneo as any).fecha_fin.split("T")[0]
      : startStr;

    const start = new Date(startStr + "T12:00:00");
    const end = new Date(endStr + "T12:00:00");

    const days = [];
    const current = new Date(start);
    let limit = 0;

    while (current <= end && limit < 15) {
      const dayName = current.toLocaleDateString("es-AR", { weekday: "short" });
      const capitalized =
        dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "");
      const dayNum = current.getDate();
      const monthName = current.toLocaleDateString("es-AR", { month: "short" });
      const capitalizedMonth =
        monthName.charAt(0).toUpperCase() + monthName.slice(1).replace(".", "");

      const label = `${capitalized} ${dayNum} ${capitalizedMonth}`;
      const value = `${capitalized} ${dayNum}`; // Identificador interno estable

      days.push({ label, value });
      current.setDate(current.getDate() + 1);
      limit++;
    }
    return days;
  };

  const playDays = getPlayDaysRange();

  const handleToggleDia = (value: string) => {
    setSelectedDias((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  };

  // Handlers de selección con soporte para opción personalizada
  const handleCategoriaChange = (val: string) => {
    if (val === CUSTOM_OPTION_VALUE) {
      setShowCustomCategoria(true);
      setCustomCategoria("");
      // También reseteamos nivel
      setShowCustomNivel(false);
      setCustomNivel("");
      setEditNivel("");
    } else {
      setShowCustomCategoria(false);
      setCustomCategoria("");
      setEditCategoria(val);
    }
  };

  const handleNivelChange = (val: string) => {
    if (val === CUSTOM_OPTION_VALUE) {
      setShowCustomNivel(true);
      setCustomNivel("");
    } else {
      setShowCustomNivel(false);
      setCustomNivel("");
      setEditNivel(val);
    }
  };

  const handleSaveStep3 = async (options?: {
    silent?: boolean;
  }): Promise<boolean> => {
    if (readOnly) return true;

    const finalCategoria = showCustomCategoria
      ? customCategoria
      : editCategoria;
    const finalNivel = showCustomNivel ? customNivel : editNivel;

    if (!finalCategoria || !finalNivel) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Campos incompletos",
        description:
          "Por favor completá la Categoría y el Nivel antes de guardar.",
      }));
      return false;
    }

    const esGratisTorneo = Boolean(
      (torneo as any).es_gratis || Number(torneo.precio_inscripcion) === 0,
    );
    const precioFinal = esGratisTorneo
      ? 0
      : Math.max(0, Number(editPrecio) || 0);

    const montoCarnetNum = Math.max(0, Number(montoCarnet) || 0);

    if (requiereCarnet && Number(montoCarnet) < 0) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Monto inválido",
        description: "El monto del carnet federativo no puede ser negativo.",
      }));
      return false;
    }

    try {
      setGuardandoCategorias(true);
      await TorneosService.update(torneoId, {
        rama: editRama,
        categoria: finalCategoria,
        nivel: finalNivel,
        modalidad: editModalidad,
        precio_inscripcion: precioFinal,
        validar_edad: editCategoria === "Libres" ? false : validarEdad,
        dias_juego: selectedDias,
        reglas_arbitraje: {
          ...((torneo as any).reglas_arbitraje || {}),
          requiere_carnet_federativo: requiereCarnet,
          monto_carnet: requiereCarnet ? montoCarnetNum : 0,
        },
      } as any);

      triggerRefresh();
      if (!options?.silent) {
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          type: "success",
          title: "¡Cambios guardados!",
          description:
            "La rama, categoría, nivel y días de juego han sido actualizados con éxito.",
        }));
      }
      return true;
    } catch (e: any) {
      console.error("🚨 Error al guardar Paso 3:", e?.response?.data || e);
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "error",
        title: "Error al guardar",
        description:
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e.message ||
          "No se pudieron guardar los cambios.",
      }));
      return false;
    } finally {
      setGuardandoCategorias(false);
    }
  };

  const saveRef = useRef(handleSaveStep3);
  saveRef.current = handleSaveStep3;

  useEffect(() => {
    if (!registerSaveHandler) return;
    registerSaveHandler(() => saveRef.current({ silent: true }));
    return () => registerSaveHandler(null);
  }, [registerSaveHandler]);

  return (
    <div
      className={`bg-brand-card border border-white/10 rounded-3xl p-6 space-y-8 shadow-xl ${readOnly ? "pointer-events-none opacity-60 select-none" : ""}`}
    >
      <div>
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
          Paso 3: Rama, Categoría, Nivel y Programación
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Configurá la rama, categoría y nivel según el reglamento{" "}
          <span className="text-brand-chartreuse font-bold">{asociacion}</span>.
          Marcá los días de competencia.
        </p>
      </div>

      {/* RAMA, CATEGORÍA, NIVEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RAMA */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Rama
          </label>
          <CustomDropdown
            value={editRama}
            onChange={setEditRama}
            options={RAMAS_PADEL.map((r) => ({
              value: r.value,
              label: r.label,
            }))}
            placeholder="Seleccionar Rama..."
          />
        </div>

        {/* CATEGORÍA */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Categoría
          </label>
          {showCustomCategoria ? (
            <div className="space-y-2">
              <input
                type="text"
                value={customCategoria}
                onChange={(e) => setCustomCategoria(e.target.value)}
                placeholder="Ej: Empresarial Promocional"
                className="w-full bg-brand-input border border-brand-chartreuse/30 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowCustomCategoria(false);
                  setEditCategoria(categoriasOficiales[0]?.value || "Libres");
                }}
                className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer underline"
              >
                ← Volver a la lista oficial
              </button>
            </div>
          ) : (
            <CustomDropdown
              value={editCategoria}
              onChange={handleCategoriaChange}
              options={categoriasConCustom}
              placeholder="Seleccionar Categoría..."
            />
          )}
        </div>

        {/* NIVEL */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Nivel
          </label>
          {showCustomNivel ? (
            <div className="space-y-2">
              <input
                type="text"
                value={customNivel}
                onChange={(e) => setCustomNivel(e.target.value)}
                placeholder="Ej: Categoría Z"
                className="w-full bg-brand-input border border-brand-chartreuse/30 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowCustomNivel(false);
                  if (nivelesOficiales.length > 0) {
                    setEditNivel(nivelesOficiales[0].value);
                  }
                }}
                className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer underline"
              >
                ← Volver a la lista oficial
              </button>
            </div>
          ) : nivelesConCustom.length > 1 ? (
            <CustomDropdown
              value={editNivel}
              onChange={handleNivelChange}
              options={nivelesConCustom}
              placeholder="Seleccionar Nivel..."
            />
          ) : (
            /* Si no hay niveles oficiales (ej: categoría custom), mostrar solo input */
            <div className="space-y-2">
              <input
                type="text"
                value={customNivel || editNivel}
                onChange={(e) => {
                  setCustomNivel(e.target.value);
                  setShowCustomNivel(true);
                }}
                placeholder="Ingresá el nivel manualmente"
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* MODALIDAD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Modalidad
          </label>
          <CustomDropdown
            value={editModalidad}
            onChange={setEditModalidad}
            options={[
              { value: "Duplas", label: "Duplas / Parejas" },
              { value: "Individual", label: "Individual / Singles" },
            ]}
            placeholder="Seleccionar Modalidad..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-6">
        {/* PRECIO DE INSCRIPCIÓN */}
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <DollarSign className="size-4 text-brand-chartreuse" /> Precio de
            Inscripción
          </label>
          {(torneo as any).es_gratis === true ? (
            <div className="bg-brand-card/50 border border-brand-white/10 p-3 rounded-xl flex items-center justify-between text-sm">
              <span className="text-brand-chartreuse font-extrabold uppercase text-xs tracking-wider">
                Torneo Gratuito
              </span>
              <span className="text-[11px] text-gray-400">
                Configurado en Paso 1
              </span>
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                $
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={editPrecio}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setEditPrecio(String(val));
                }}
                className="w-full bg-brand-input border border-white/10 text-white pl-8 p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none"
                placeholder="0"
              />
            </div>
          )}
        </div>

        {/* CONTROL DE EDAD (Oculto si la categoría es Libres) */}
        {editCategoria !== "Libres" && (
          <div className="flex flex-col justify-end">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-brand-chartreuse" /> Control
              de Edad
            </label>
            <div
              onClick={() => setValidarEdad(!validarEdad)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                validarEdad
                  ? "bg-brand-chartreuse/10 border-brand-chartreuse/40 text-white shadow-[0_0_15px_rgba(204,255,0,0.1)]"
                  : "bg-brand-input border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              <div>
                <p className="font-extrabold text-xs text-white">
                  Validar Edad según Categoría
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Verifica que los participantes cumplan con la edad
                  reglamentaria.
                </p>
              </div>
              <input
                type="checkbox"
                checked={validarEdad}
                onChange={() => {}}
                className="size-5 rounded border-white/10 bg-black/50 text-brand-chartreuse focus:ring-brand-chartreuse accent-brand-chartreuse cursor-pointer transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN CARNET FEDERATIVO */}
      <div className="border-t border-white/10 pt-6 space-y-4">
        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand-chartreuse" /> Carnet
          Federativo Obligatorio
        </h4>

        <div className="bg-brand-input/40 p-5 rounded-2xl border border-white/10 space-y-4">
          <div
            onClick={() => setRequiereCarnet(!requiereCarnet)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              requiereCarnet
                ? "bg-brand-chartreuse/10 border-brand-chartreuse/40 text-white shadow-[0_0_15px_rgba(204,255,0,0.1)]"
                : "bg-brand-input border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            <div>
              <p className="font-extrabold text-xs text-white">
                ¿Cobra o Exige Carnet Federativo Vigente?
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Requerido para competir en torneos oficiales FAP/APA de
                circuito.
              </p>
            </div>
            <input
              type="checkbox"
              checked={requiereCarnet}
              onChange={() => {}}
              className="size-5 rounded border-white/10 bg-black/50 text-brand-chartreuse focus:ring-brand-chartreuse accent-brand-chartreuse cursor-pointer transition-all"
            />
          </div>

          {requiereCarnet && (
            <div className="max-w-sm pt-2">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                Monto del Carnet Federativo ($)
              </label>
              <input
                type="number"
                min="0"
                value={montoCarnet}
                onChange={(e) => {
                  const val = e.target.value;
                  if (Number(val) < 0) return;
                  setMontoCarnet(val);
                }}
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-xs"
                placeholder="Ingresá el valor del carnet..."
              />
            </div>
          )}
        </div>
      </div>

      {/* DÍAS DE PARTIDO */}
      <div className="border-t border-white/5 pt-6 space-y-4">
        <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="size-4 text-brand-chartreuse" /> Días de
          Competencia (Partidos)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {playDays.map((dia) => {
            const isSelected = selectedDias.includes(dia.value);
            return (
              <div
                key={dia.value}
                onClick={() => handleToggleDia(dia.value)}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-center ${
                  isSelected
                    ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse font-black"
                    : "bg-black/20 border-white/5 text-gray-400 hover:border-white/10 font-bold"
                }`}
              >
                <p className="text-xs uppercase tracking-wider">{dia.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        <div className="flex gap-3">
          <button
            onClick={() => void handleSaveStep3()}
            disabled={readOnly || guardandoCategorias}
            className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            {readOnly
              ? "Modo Lectura (En curso)"
              : guardandoCategorias
                ? "Guardando..."
                : "Guardar Cambios"}
          </button>
          <button
            onClick={() => void setActiveTab("logos")}
            disabled={guardandoCategorias}
            className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40"
          >
            Atrás
          </button>
        </div>
        <button
          onClick={() => void setActiveTab("players")}
          disabled={guardandoCategorias}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-40"
        >
          Siguiente Paso: Jugadores
        </button>
      </div>
    </div>
  );
};
