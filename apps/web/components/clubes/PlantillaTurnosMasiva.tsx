"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Copy, Plus, Trash2, X } from "lucide-react";
import { ClubPanelService } from "@/utils/services/club-panel";
import type { Cancha, TurnoPlantillaSlot } from "@/utils/types";
import { sileo } from "sileo";

type Alcance = "esta" | "todas" | "seleccion";

const DIAS = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mié" },
  { id: 4, label: "Jue" },
  { id: 5, label: "Vie" },
  { id: 6, label: "Sáb" },
  { id: 0, label: "Dom" },
] as const;

function toMinutes(hhmm: string): number {
  const [hh, mm] = hhmm.split(":").map(Number);
  return hh * 60 + mm;
}

function fromMinutes(total: number): string {
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function armarJornada(
  inicio: string,
  cierre: string,
  duracionMin: number,
  precio: number,
): TurnoPlantillaSlot[] {
  const start = toMinutes(inicio);
  const end = toMinutes(cierre);
  if (!Number.isFinite(start) || !Number.isFinite(end) || duracionMin < 15) {
    return [];
  }
  const slots: TurnoPlantillaSlot[] = [];
  for (let t = start; t + duracionMin <= end; t += duracionMin) {
    slots.push({
      hora_inicio: fromMinutes(t),
      hora_fin: fromMinutes(t + duracionMin),
      precio,
    });
  }
  return slots;
}

interface PlantillaTurnosMasivaProps {
  canchas: Cancha[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canchaOrigenId?: string | null;
}

export function PlantillaTurnosMasiva({
  canchas,
  isOpen,
  onClose,
  onSuccess,
  canchaOrigenId = null,
}: PlantillaTurnosMasivaProps) {
  const origenId = canchaOrigenId || canchas[0]?.id || "";
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [slots, setSlots] = useState<TurnoPlantillaSlot[]>([
    { hora_inicio: "08:00", hora_fin: "09:30", precio: 8000 },
  ]);
  const [alcance, setAlcance] = useState<Alcance>("esta");
  const [canchasSeleccionadas, setCanchasSeleccionadas] = useState<string[]>([]);
  const [genInicio, setGenInicio] = useState("08:00");
  const [genCierre, setGenCierre] = useState("23:00");
  const [genDuracion, setGenDuracion] = useState(90);
  const [genPrecio, setGenPrecio] = useState(8000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDias([1, 2, 3, 4, 5]);
    setSlots([{ hora_inicio: "08:00", hora_fin: "09:30", precio: 8000 }]);
    setAlcance(canchaOrigenId ? "esta" : "todas");
    setCanchasSeleccionadas(origenId ? [origenId] : []);
    setGenInicio("08:00");
    setGenCierre("23:00");
    setGenDuracion(90);
    setGenPrecio(8000);
  }, [isOpen, canchaOrigenId, origenId]);

  const canchaOrigen = canchas.find((c) => c.id === origenId);

  const canchaIdsDestino = useMemo(() => {
    if (alcance === "todas") return canchas.map((c) => c.id);
    if (alcance === "seleccion") return canchasSeleccionadas;
    return origenId ? [origenId] : [];
  }, [alcance, canchas, canchasSeleccionadas, origenId]);

  if (!isOpen) return null;

  const toggleDia = (id: number) => {
    setDias((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const updateSlot = (index: number, patch: Partial<TurnoPlantillaSlot>) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  };

  const addSlot = () => {
    const last = slots[slots.length - 1];
    const nextStart = last?.hora_fin || "08:00";
    const nextEnd = fromMinutes(toMinutes(nextStart) + genDuracion);
    setSlots((prev) => [
      ...prev,
      { hora_inicio: nextStart, hora_fin: nextEnd, precio: genPrecio },
    ]);
  };

  const handleGenerar = () => {
    const generated = armarJornada(genInicio, genCierre, genDuracion, genPrecio);
    if (generated.length === 0) {
      sileo.error({
        title: "No se pudo armar el día",
        description: "Revisá inicio, cierre y duración (mínimo 15 minutos).",
      });
      return;
    }
    setSlots(generated);
  };

  const handleApply = async () => {
    if (dias.length === 0) {
      sileo.error({
        title: "Faltan días",
        description: "Seleccioná al menos un día de la semana.",
      });
      return;
    }
    if (slots.length === 0) {
      sileo.error({
        title: "Faltan horarios",
        description: "Agregá al menos un turno (ej. 08:00 a 09:30).",
      });
      return;
    }
    if (canchaIdsDestino.length === 0) {
      sileo.error({
        title: "Faltan canchas",
        description: "Seleccioná a qué canchas aplica esta plantilla.",
      });
      return;
    }

    try {
      setSaving(true);
      const result = await ClubPanelService.crearPlantillaTurnos({
        cancha_ids: canchaIdsDestino,
        dias,
        slots,
      });
      const extra =
        result.omitidos > 0
          ? ` Se omitieron ${result.omitidos} que ya existían.`
          : "";
      sileo.success({
        title: "Plantilla aplicada",
        description: `Se crearon ${result.creados} turno${result.creados === 1 ? "" : "s"} en ${canchaIdsDestino.length} cancha${canchaIdsDestino.length === 1 ? "" : "s"}.${extra}`,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } }; message?: string };
      sileo.error({
        title: "No se pudo aplicar",
        description:
          apiErr.response?.data?.error ||
          apiErr.message ||
          "Revisá horarios y canchas e intentá de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] p-6 sm:p-8 rounded-3xl border border-white/10 w-full max-w-2xl shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-extrabold text-white">
              Plantilla de horarios
            </h3>
            <p className="text-gray-400 text-xs mt-1">
              Armá los turnos del día y aplicá a una, varias o todas las canchas.
              {canchaOrigen ? ` Origen: ${canchaOrigen.nombre}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">
              Días de la semana
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-xs font-bold">
              {DIAS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDia(d.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    dias.includes(d.id)
                      ? "bg-brand-chartreuse/20 border-brand-chartreuse text-brand-chartreuse"
                      : "bg-black/20 border-white/5 text-gray-400"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Armar jornada completa
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="text-[11px] text-gray-500 font-bold">
                Desde
                <input
                  type="time"
                  value={genInicio}
                  onChange={(e) => setGenInicio(e.target.value)}
                  className="mt-1 w-full bg-brand-input border border-white/10 text-white p-2 rounded-xl text-sm outline-none focus:border-brand-chartreuse/50"
                />
              </label>
              <label className="text-[11px] text-gray-500 font-bold">
                Hasta
                <input
                  type="time"
                  value={genCierre}
                  onChange={(e) => setGenCierre(e.target.value)}
                  className="mt-1 w-full bg-brand-input border border-white/10 text-white p-2 rounded-xl text-sm outline-none focus:border-brand-chartreuse/50"
                />
              </label>
              <label className="text-[11px] text-gray-500 font-bold">
                Duración (min)
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={genDuracion}
                  onChange={(e) => setGenDuracion(Number(e.target.value) || 90)}
                  className="mt-1 w-full bg-brand-input border border-white/10 text-white p-2 rounded-xl text-sm outline-none focus:border-brand-chartreuse/50"
                />
              </label>
              <label className="text-[11px] text-gray-500 font-bold">
                Precio
                <input
                  type="number"
                  min={0}
                  value={genPrecio}
                  onChange={(e) => setGenPrecio(Number(e.target.value) || 0)}
                  className="mt-1 w-full bg-brand-input border border-white/10 text-white p-2 rounded-xl text-sm outline-none focus:border-brand-chartreuse/50"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleGenerar}
              className="text-xs font-black text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-3 py-2 rounded-xl cursor-pointer hover:bg-brand-chartreuse/20"
            >
            Generar {genInicio.slice(0, 5)}–{genCierre.slice(0, 5)} en bloques de{" "}
            {genDuracion} min
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Turnos del día ({slots.length})
              </label>
              <button
                type="button"
                onClick={addSlot}
                className="text-[11px] font-bold text-brand-chartreuse flex items-center gap-1 cursor-pointer"
              >
                <Plus className="size-3.5" /> Agregar horario
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {slots.map((slot, index) => (
                <div
                  key={`${slot.hora_inicio}-${index}`}
                  className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center bg-white/[0.03] border border-white/5 rounded-xl p-2"
                >
                  <input
                    type="time"
                    value={slot.hora_inicio}
                    onChange={(e) =>
                      updateSlot(index, { hora_inicio: e.target.value })
                    }
                    className="w-full bg-brand-input border border-white/10 text-white p-2 rounded-lg text-xs outline-none focus:border-brand-chartreuse/50"
                    aria-label={`Inicio turno ${index + 1}`}
                  />
                  <input
                    type="time"
                    value={slot.hora_fin}
                    onChange={(e) =>
                      updateSlot(index, { hora_fin: e.target.value })
                    }
                    className="w-full bg-brand-input border border-white/10 text-white p-2 rounded-lg text-xs outline-none focus:border-brand-chartreuse/50"
                    aria-label={`Fin turno ${index + 1}`}
                  />
                  <input
                    type="number"
                    min={0}
                    value={slot.precio}
                    onChange={(e) =>
                      updateSlot(index, {
                        precio: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-brand-input border border-white/10 text-white p-2 rounded-lg text-xs outline-none focus:border-brand-chartreuse/50"
                    aria-label={`Precio turno ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSlots((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="p-2 text-gray-500 hover:text-red-400 cursor-pointer"
                    title="Quitar horario"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">
              Aplicar a
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  ["esta", "Solo esta cancha"],
                  ["todas", "Todas las canchas"],
                  ["seleccion", "Elegir canchas"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAlcance(value)}
                  className={`py-3 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    alcance === value
                      ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                      : "bg-white/5 text-gray-300 border-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {alcance === "esta" && canchaOrigen && (
              <p className="text-[11px] text-gray-500 mt-2">
                Se aplica únicamente a {canchaOrigen.nombre}.
              </p>
            )}
            {alcance === "seleccion" && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {canchas.map((cancha) => {
                  const checked = canchasSeleccionadas.includes(cancha.id);
                  return (
                    <label
                      key={cancha.id}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold ${
                        checked
                          ? "border-brand-chartreuse/40 bg-brand-chartreuse/10 text-white"
                          : "border-white/5 bg-black/20 text-gray-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setCanchasSeleccionadas((prev) =>
                            prev.includes(cancha.id)
                              ? prev.filter((id) => id !== cancha.id)
                              : [...prev, cancha.id],
                          )
                        }
                        className="accent-brand-chartreuse"
                      />
                      {cancha.nombre}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <Clock className="size-3.5 text-brand-chartreuse" />
            {slots.length} horario{slots.length === 1 ? "" : "s"} × {dias.length}{" "}
            día{dias.length === 1 ? "" : "s"} × {canchaIdsDestino.length} cancha
            {canchaIdsDestino.length === 1 ? "" : "s"} ={" "}
            <span className="text-white font-bold">
              {slots.length * dias.length * canchaIdsDestino.length} turnos
            </span>
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleApply()}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-chartreuse text-brand-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <Copy className="size-4" />
              {saving ? "Aplicando..." : "Aplicar plantilla"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
