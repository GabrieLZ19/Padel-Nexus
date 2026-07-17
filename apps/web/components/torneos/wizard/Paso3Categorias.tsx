import React, { useState, useEffect } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { Layers, Calendar, ShieldCheck, DollarSign } from "lucide-react";

interface Paso3CategoriasProps {
  torneo: Torneo;
  torneoId: string;
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void;
  triggerRefresh: () => void;
}

export const Paso3Categorias = ({
  torneo,
  torneoId,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
}: Paso3CategoriasProps) => {
  const [editCategoria, setEditCategoria] = useState(
    torneo.categoria || "Masculino",
  );
  const [editNivel, setEditNivel] = useState(torneo.nivel || "5ª");
  const [editModalidad, setEditModalidad] = useState(
    torneo.modalidad || "Duplas",
  );
  const [editPrecio, setEditPrecio] = useState(
    torneo.precio_inscripcion ? String(torneo.precio_inscripcion) : "0",
  );
  const [validarEdad, setValidarEdad] = useState(
    (torneo as any).validar_edad || false,
  );
  const [selectedDias, setSelectedDias] = useState<string[]>(() => {
    const raw = (torneo as any).dias_juego;
    return Array.isArray(raw) ? raw : [];
  });
  const [guardandoCategorias, setGuardandoCategorias] = useState(false);

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

  const handleSaveStep3 = async () => {
    try {
      setGuardandoCategorias(true);
      await TorneosService.update(torneoId, {
        categoria: editCategoria,
        nivel: editNivel,
        modalidad: editModalidad,
        precio_inscripcion: Number(editPrecio),
        validar_edad: validarEdad,
        dias_juego: selectedDias,
      } as any);

      triggerRefresh();
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "success",
        title: "¡Cambios guardados!",
        description:
          "Las categorías, precios y días de juego han sido actualizados con éxito.",
      }));
    } catch (e: any) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "error",
        title: "Error al guardar",
        description: e.message || "No se pudieron guardar los cambios.",
      }));
    } finally {
      setGuardandoCategorias(false);
    }
  };

  return (
    <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 space-y-8">
      <div>
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
          Paso 3: Categoría, Edad y Programación
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Definí la categoría, el control de validación de edad y marcá qué días
          se disputarán los partidos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Rama / Categoría
          </label>
          <CustomDropdown
            value={editCategoria}
            onChange={setEditCategoria}
            options={[
              { value: "Masculino", label: "Masculino" },
              { value: "Femenino", label: "Femenino" },
              { value: "Mixto", label: "Mixto" },
              { value: "Veteranos", label: "Veteranos" },
              { value: "Seniors", label: "Seniors" },
              { value: "Juniors", label: "Juniors" },
            ]}
            placeholder="Seleccionar Categoría..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Nivel / Rango
          </label>
          <CustomDropdown
            value={editNivel}
            onChange={setEditNivel}
            options={[
              { value: "1ª", label: "1ª (Profesional)" },
              { value: "2ª", label: "2ª" },
              { value: "3ª", label: "3ª" },
              { value: "4ª", label: "4ª" },
              { value: "5ª", label: "5ª" },
              { value: "6ª", label: "6ª" },
              { value: "7ª", label: "7ª" },
              { value: "+30", label: "+30 Años" },
              { value: "+40", label: "+40 Años" },
              { value: "+50", label: "+50 Años" },
              { value: "+55", label: "+55 Años" },
              { value: "Sub-12", label: "Sub-12" },
              { value: "Sub-14", label: "Sub-14" },
              { value: "Sub-16", label: "Sub-16" },
              { value: "Sub-18", label: "Sub-18" },
            ]}
            placeholder="Seleccionar Nivel..."
          />
        </div>
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
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
              $
            </span>
            <input
              type="number"
              value={editPrecio}
              onChange={(e) => setEditPrecio(e.target.value)}
              className="w-full bg-brand-input border border-white/10 text-white pl-8 p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none"
            />
          </div>
        </div>

        {/* VALIDACIÓN DE EDAD */}
        <div className="flex flex-col justify-end pb-3">
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider  mb-2 flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-brand-chartreuse" /> Control de
            Edad
          </label>
          <div
            onClick={() => setValidarEdad(!validarEdad)}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              validarEdad
                ? "bg-brand-chartreuse/10 border-brand-chartreuse/40 text-white"
                : "bg-black/20 border-white/5 text-gray-400 hover:border-white/10"
            }`}
          >
            <div>
              <p className="font-extrabold text-sm text-white">
                Validar Edad en Registro
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Exige que los jugadores cumplan con el límite de edad del nivel.
              </p>
            </div>
            <input
              type="checkbox"
              checked={validarEdad}
              onChange={() => {}}
              className="size-4 rounded border-white/10 text-brand-chartreuse cursor-pointer"
            />
          </div>
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
            onClick={handleSaveStep3}
            disabled={
              guardandoCategorias ||
              !editCategoria ||
              !editNivel ||
              !editModalidad
            }
            className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            {guardandoCategorias ? "Guardando..." : "Guardar Cambios"}
          </button>
          <button
            onClick={() => setActiveTab("logos")}
            className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-white/10 transition-all cursor-pointer"
          >
            Atrás
          </button>
        </div>
        <button
          onClick={() => setActiveTab("players")}
          className="bg-brand-chartreuse/10 border border-brand-chartreuse text-brand-chartreuse px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-brand-chartreuse hover:text-brand-black transition-all cursor-pointer"
        >
          Siguiente Paso: Jugadores
        </button>
      </div>
    </div>
  );
};
