import React, { useState, useEffect, useMemo, useRef } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import {
  Layers,
  Calendar,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";
import {
  labelModalidad,
  MODALIDAD_PAREJAS,
} from "@/utils/formatFecha";
import {
  RAMAS_PADEL,
  getCategoriasParaAsociacion,
  getNivelesParaCategoria,
  reglamentoTorneo,
  labelReglamentoTorneo,
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
  /** Torneos del panel de club: validaciones de inscripción opcionales */
  modoClub?: boolean;
}

export const Paso3Categorias = ({
  torneo,
  torneoId,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
  registerSaveHandler,
  readOnly = false,
  modoClub = false,
}: Paso3CategoriasProps) => {
  // Reglamento definido en el Paso 1 (columna `reglamento`)
  const reglamento = reglamentoTorneo(torneo);

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
    labelModalidad(torneo.modalidad),
  );
  const [validarEdad, setValidarEdad] = useState<boolean>(
    Boolean((torneo as { validar_edad?: boolean }).validar_edad),
  );
  const reglasArbitrajeObj = (torneo as any).reglas_arbitraje || {};
  const [validarCategoria, setValidarCategoria] = useState<boolean>(
    Boolean(
      modoClub
        ? reglasArbitrajeObj.validar_categoria
        : reglasArbitrajeObj.validar_categoria ?? true,
    ),
  );
  const [requiereCarnet, setRequiereCarnet] = useState<boolean>(
    Boolean(
      reglasArbitrajeObj.requiere_carnet_federativo ??
        (torneo as { requiere_carnet_federativo?: boolean }).requiere_carnet_federativo,
    ),
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
    () => getCategoriasParaAsociacion(reglamento),
    [reglamento],
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
    () => getNivelesParaCategoria(reglamento, categoriaEfectiva),
    [reglamento, categoriaEfectiva],
  );

  const nivelesConCustom = useMemo(() => {
    const items = [...nivelesOficiales];
    items.push({
      value: CUSTOM_OPTION_VALUE,
      label: "+ Crear otro nivel...",
    });
    return items;
  }, [nivelesOficiales]);

  // Auto-activar validación de edad según categoría (solo circuito federativo / admin)
  useEffect(() => {
    if (modoClub) return;
    const esConEdad = /\+(30|40|50|60)|veteranos|ladies|menores/i.test(
      categoriaEfectiva,
    );
    if (esConEdad) {
      setValidarEdad(true);
    }
  }, [categoriaEfectiva, modoClub]);

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
  }, [categoriaEfectiva, reglamento]);

  // Reset categoría y nivel cuando cambia el reglamento
  useEffect(() => {
    const valid = categoriasOficiales.some((c) => c.value === editCategoria);
    if (!valid && categoriasOficiales.length > 0) {
      setEditCategoria(categoriasOficiales[0].value);
      setShowCustomCategoria(false);
      setCustomCategoria("");
    }
  }, [reglamento]);

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

    if (selectedDias.length === 0) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Días de competencia requeridos",
        description:
          "Seleccioná al menos un día de competencia antes de guardar o avanzar.",
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
        validar_edad: modoClub
          ? validarEdad
          : editCategoria === "Libres"
            ? false
            : validarEdad,
        dias_juego: selectedDias,
        reglas_arbitraje: {
          ...((torneo as any).reglas_arbitraje || {}),
          validar_categoria: modoClub ? validarCategoria : true,
          requiere_carnet_federativo: requiereCarnet,
          monto_carnet: 0,
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
          <span className="text-brand-chartreuse font-bold">
            {labelReglamentoTorneo(reglamento)}
          </span>
          .
          Marcá los días de competencia (obligatorio).
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
              { value: MODALIDAD_PAREJAS, label: "Parejas" },
              { value: "Individual", label: "Individual / Singles" },
            ]}
            placeholder="Seleccionar Modalidad..."
          />
        </div>
      </div>

      {modoClub ? (
        <div className="border-t border-white/5 pt-6 space-y-4">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-chartreuse" />
            Validaciones de inscripción (opcionales)
          </h4>
          <p className="text-[11px] text-gray-500 -mt-2">
            En torneos de club podés activar solo las reglas que necesites. Si
            ninguna está marcada, cualquier jugador podrá inscribirse (salvo
            rama y cupos).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                checked: validarCategoria,
                onToggle: () => setValidarCategoria((v) => !v),
                title: "Validar categoría",
                desc: "Verifica que la categoría del jugador alcance para el nivel del torneo.",
              },
              {
                checked: validarEdad,
                onToggle: () => setValidarEdad((v) => !v),
                title: "Validar edad",
                desc: "Usa la fecha de nacimiento del perfil para el rango etario del nivel.",
              },
              {
                checked: requiereCarnet,
                onToggle: () => setRequiereCarnet((v) => !v),
                title: "Exigir carnet FAP",
                desc: "Ambos jugadores deben tener licencia FAP activa para inscribirse.",
              },
            ].map((item) => (
              <div
                key={item.title}
                onClick={item.onToggle}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  item.checked
                    ? "bg-brand-chartreuse/10 border-brand-chartreuse/40 text-white shadow-[0_0_15px_rgba(204,255,0,0.1)]"
                    : "bg-brand-input border-white/10 text-gray-400 hover:border-white/20"
                }`}
              >
                <div>
                  <p className="font-extrabold text-xs text-white">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => {}}
                  className="mt-0.5 size-5 rounded border-white/10 bg-black/50 text-brand-chartreuse focus:ring-brand-chartreuse accent-brand-chartreuse cursor-pointer transition-all shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {editCategoria !== "Libres" && (
            <div className="border-t border-white/5 pt-6">
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
                    Exige carnet federativo FAP vigente
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Si está activo, ambos jugadores deben tener licencia FAP en
                    estado Activa para inscribirse. Sin precio adicional.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requiereCarnet}
                  onChange={() => {}}
                  className="size-5 rounded border-white/10 bg-black/50 text-brand-chartreuse focus:ring-brand-chartreuse accent-brand-chartreuse cursor-pointer transition-all"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* DÍAS DE PARTIDO — sección carnet duplicada eliminada para modoClub */}
      <div className="border-t border-white/5 pt-6 space-y-4">
        <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="size-4 text-brand-chartreuse" /> Días de
          Competencia (Partidos) *
        </h4>
        <p className="text-[11px] text-gray-400 -mt-2">
          Obligatorio: seleccioná al menos un día.
        </p>
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
