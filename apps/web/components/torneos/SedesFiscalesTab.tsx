"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Info,
  Calendar,
  Clock,
  MapPin,
  Layers,
} from "lucide-react";
import { Club } from "@/utils/types";
import { api } from "@/utils/api";
import CustomDropdown from "../ui/CustomDropdown";
import { ClubesService } from "@/utils/services/clubes";
import { sileo } from "sileo";
import { useProfileStore } from "@/store/useProfileStore";
import type { RolUsuario } from "@/utils/types/user.types";
import { labelModalidad } from "@/utils/formatFecha";

interface SedesFiscalesTabProps {
  torneoId: string;
  onRefresh?: () => void;
  readOnly?: boolean;
}

type FechaTorneo = {
  iso: string;
  label: string;
  diaJuegoValue: string;
};

function formatDateLabel(fStr: string) {
  try {
    const cleanDate = fStr.split("T")[0];
    const [yyyy, mm, dd] = cleanDate.split("-");
    const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    const dayName = dateObj.toLocaleDateString("es-AR", { weekday: "short" });
    const capDay =
      dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "");
    return `${capDay} ${dd}/${mm}/${yyyy}`;
  } catch {
    return fStr;
  }
}

function buildFechasTorneo(
  fechaInicio: string,
  fechaFin: string,
): FechaTorneo[] {
  if (!fechaInicio) return [];

  const end = fechaFin || fechaInicio;
  const dates: FechaTorneo[] = [];
  const current = new Date(`${fechaInicio}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  let limit = 0;

  while (current <= endDate && limit < 31) {
    const iso = current.toISOString().split("T")[0];
    const dayName = current.toLocaleDateString("es-AR", { weekday: "short" });
    const capDay =
      dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "");
    const dayNum = current.getDate();
    const monthName = current.toLocaleDateString("es-AR", { month: "short" });
    const capMonth =
      monthName.charAt(0).toUpperCase() + monthName.slice(1).replace(".", "");

    dates.push({
      iso,
      label: `${capDay} ${dayNum} ${capMonth}`,
      diaJuegoValue: `${capDay} ${dayNum}`,
    });

    current.setDate(current.getDate() + 1);
    limit++;
  }

  return dates;
}

function categoriaTorneoLabel(torneo: {
  rama?: string | null;
  categoria?: string | null;
  nivel?: string | null;
  modalidad?: string | null;
}) {
  const parts = [
    torneo.rama,
    torneo.categoria,
    torneo.nivel,
    torneo.modalidad ? labelModalidad(torneo.modalidad) : null,
  ].filter(Boolean);
  return parts.join(" · ") || "Sin categoría (configurá el Paso 3)";
}

export const SedesFiscalesTab: React.FC<SedesFiscalesTabProps> = ({
  torneoId,
  readOnly = false,
}) => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<Club[]>([]);
  const [canchasDisponibles, setCanchasDisponibles] = useState<
    { id: string | number; nombre: string }[]
  >([]);
  const [selectedCanchaIds, setSelectedCanchaIds] = useState<string[]>([]);
  const [dispList, setDispList] = useState<
    Array<Record<string, unknown> & { club_id?: string; cancha_id?: string }>
  >([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");

  const [newClubId, setNewClubId] = useState<string>("");
  const [activeSedeId, setActiveSedeId] = useState<string>("");
  const [cronogramaForm, setCronogramaForm] = useState({
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
  });

  const [torneoMeta, setTorneoMeta] = useState({
    rama: "",
    categoria: "",
    nivel: "",
    modalidad: "",
  });
  const [fechaInicioTorneo, setFechaInicioTorneo] = useState<string>("");
  const [fechaFinTorneo, setFechaFinTorneo] = useState<string>("");
  const [diasJuego, setDiasJuego] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const profile = useProfileStore((s) => s.profile);
  const userRole = (profile?.rol || "admin") as RolUsuario;
  const esEntidadReguladora =
    userRole === "admin_federacion" ||
    userRole === "admin_provincial" ||
    userRole === "superadmin";

  const categoriaLabel = useMemo(
    () => categoriaTorneoLabel(torneoMeta),
    [torneoMeta],
  );

  const fechasTorneo = useMemo(
    () => buildFechasTorneo(fechaInicioTorneo, fechaFinTorneo),
    [fechaInicioTorneo, fechaFinTorneo],
  );

  const fechasCompetencia = useMemo(() => {
    if (diasJuego.length === 0) return fechasTorneo;
    return fechasTorneo.filter((f) => diasJuego.includes(f.diaJuegoValue));
  }, [fechasTorneo, diasJuego]);

  const sedesOptions = useMemo(
    () =>
      selectedClubs.map((c) => ({
        value: String(c.id),
        label: c.nombre,
      })),
    [selectedClubs],
  );

  const groupedByDate = useMemo(() => {
    const map = new Map<
      string,
      { rawFecha: string; items: { item: (typeof dispList)[0]; originalIndex: number }[] }
    >();

    dispList.forEach((item, index) => {
      const f = String(item.fecha || "").split("T")[0];
      if (!f) return;
      if (!map.has(f)) {
        map.set(f, { rawFecha: f, items: [] });
      }
      map.get(f)!.items.push({ item, originalIndex: index });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.rawFecha.localeCompare(b.rawFecha),
    );
  }, [dispList]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const resClubsAll = await api.get<{ data?: Club[] }>("/clubes");
        setClubs(resClubsAll.data?.data || []);

        const resSedes = await api.get<Club[]>(`/torneos/${torneoId}/sedes`);
        setSelectedClubs(resSedes.data || []);

        const resDisp = await api.get(`/torneos/${torneoId}/canchas-disponibilidad`);
        setDispList(resDisp.data || []);

        const resTorneo = await api.get(`/torneos/${torneoId}`);
        if (resTorneo.data) {
          setTorneoMeta({
            rama: resTorneo.data.rama || "",
            categoria: resTorneo.data.categoria || "",
            nivel: resTorneo.data.nivel || "",
            modalidad: resTorneo.data.modalidad || "",
          });
          if (resTorneo.data.fecha) {
            setFechaInicioTorneo(resTorneo.data.fecha.split("T")[0]);
          }
          if (resTorneo.data.fecha_fin) {
            setFechaFinTorneo(resTorneo.data.fecha_fin.split("T")[0]);
          }
          if (Array.isArray(resTorneo.data.dias_juego)) {
            setDiasJuego(resTorneo.data.dias_juego);
          }
        }
      } catch (e) {
        console.error("Error loading tournament configuration", e);
      }
    };
    void loadData();
  }, [torneoId]);

  useEffect(() => {
    if (selectedClubs.length === 0) {
      setActiveSedeId("");
      setCanchasDisponibles([]);
      setSelectedCanchaIds([]);
      return;
    }

    const exists = selectedClubs.some(
      (c) => String(c.id) === String(activeSedeId),
    );
    if (!activeSedeId || !exists) {
      setActiveSedeId(String(selectedClubs[0].id));
    }
  }, [selectedClubs, activeSedeId]);

  useEffect(() => {
    if (!activeSedeId) {
      setCanchasDisponibles([]);
      setSelectedCanchaIds([]);
      return;
    }

    ClubesService.getCanchas(activeSedeId)
      .then((data) => {
        const list = data || [];
        setCanchasDisponibles(list);
        setSelectedCanchaIds(list.map((c) => String(c.id)));
      })
      .catch((e) => console.error(e));
  }, [activeSedeId]);

  useEffect(() => {
    if (!cronogramaForm.fecha && fechasCompetencia.length > 0) {
      setCronogramaForm((prev) => ({
        ...prev,
        fecha: fechasCompetencia[0].iso,
      }));
    }
  }, [fechasCompetencia, cronogramaForm.fecha]);

  const persistDisponibilidad = async (
    newList: typeof dispList,
    successMessage?: string,
  ) => {
    setSaving(true);
    try {
      await api.post(`/torneos/${torneoId}/canchas-disponibilidad`, {
        disponibilidad: newList,
      });
      const resDisp = await api.get(
        `/torneos/${torneoId}/canchas-disponibilidad`,
      );
      setDispList(resDisp.data || []);
      if (successMessage) {
        sileo.success({ title: "Cronograma actualizado", description: successMessage });
      }
    } catch (e) {
      console.error(e);
      sileo.error({
        title: "Error",
        description: "No se pudo guardar el cronograma.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSede = async () => {
    if (!newClubId || readOnly) return;
    const clubIds = [...selectedClubs.map((c) => c.id), newClubId];
    try {
      setSaving(true);
      await api.post(`/torneos/${torneoId}/sedes`, { club_ids: clubIds });
      const clubAdded = clubs.find((c) => String(c.id) === newClubId);
      if (clubAdded) setSelectedClubs([...selectedClubs, clubAdded]);
      setNewClubId("");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSede = async (clubId: string) => {
    if (readOnly) return;
    const clubIds = selectedClubs
      .map((c) => c.id)
      .filter((id) => String(id) !== String(clubId));
    try {
      setSaving(true);
      await api.post(`/torneos/${torneoId}/sedes`, { club_ids: clubIds });
      setSelectedClubs(
        selectedClubs.filter((c) => String(c.id) !== String(clubId)),
      );
      if (String(activeSedeId) === String(clubId)) {
        setActiveSedeId("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleCancha = (canchaId: string) => {
    setSelectedCanchaIds((prev) =>
      prev.includes(canchaId)
        ? prev.filter((id) => id !== canchaId)
        : [...prev, canchaId],
    );
  };

  const handleAddDiaCronograma = async () => {
    if (readOnly) return;

    const { fecha, hora_inicio, hora_fin } = cronogramaForm;

    if (!activeSedeId || !fecha || !hora_inicio) {
      sileo.warning({
        title: "Datos incompletos",
        description: "Elegí sede, día y hora de inicio.",
      });
      return;
    }

    if (selectedCanchaIds.length === 0) {
      sileo.warning({
        title: "Sin canchas",
        description: "Seleccioná al menos una cancha para este día.",
      });
      return;
    }

    if (fechaInicioTorneo && fecha < fechaInicioTorneo) {
      sileo.error({
        title: "Fecha inválida",
        description: `La fecha no puede ser anterior al inicio del torneo (${fechaInicioTorneo}).`,
      });
      return;
    }

    if (fechaFinTorneo && fecha > fechaFinTorneo) {
      sileo.error({
        title: "Fecha inválida",
        description: `La fecha no puede superar la finalización del torneo (${fechaFinTorneo}).`,
      });
      return;
    }

    if (diasJuego.length > 0) {
      const fechaObj = fechasTorneo.find((f) => f.iso === fecha);
      if (fechaObj && !diasJuego.includes(fechaObj.diaJuegoValue)) {
        sileo.error({
          title: "Día no habilitado",
          description: `Este día no está entre los días de competencia del Paso 3.`,
        });
        return;
      }
    }

    const normFormHora = hora_inicio.slice(0, 5);
    if (hora_fin && hora_fin.slice(0, 5) <= normFormHora) {
      sileo.error({
        title: "Horario inválido",
        description: "La hora de fin debe ser posterior a la hora de inicio.",
      });
      return;
    }

    const nuevosItems = selectedCanchaIds
      .map((canchaId) => {
        const conflicto = dispList.some((item) => {
          const itemFecha = String(item.fecha || "").split("T")[0];
          const itemHora = String(item.hora_inicio || "").slice(0, 5);
          return (
            String(item.club_id) === String(activeSedeId) &&
            String(item.cancha_id) === String(canchaId) &&
            itemFecha === fecha &&
            itemHora === normFormHora
          );
        });
        if (conflicto) return null;

        return {
          club_id: activeSedeId,
          cancha_id: canchaId,
          fecha,
          hora_inicio: hora_inicio,
          hora_fin: hora_fin || null,
          categoria: categoriaLabel,
        };
      })
      .filter(Boolean) as typeof dispList;

    if (nuevosItems.length === 0) {
      sileo.error({
        title: "Sin cambios",
        description:
          "Todas las canchas seleccionadas ya tienen ese horario cargado.",
      });
      return;
    }

    const omitidas = selectedCanchaIds.length - nuevosItems.length;
    const msg =
      omitidas > 0
        ? `Se agregaron ${nuevosItems.length} cancha(s). ${omitidas} ya existían.`
        : `Se agregaron ${nuevosItems.length} cancha(s) al cronograma.`;

    await persistDisponibilidad([...dispList, ...nuevosItems], msg);
  };

  const handleRemoveCanchaDisp = async (idx: number) => {
    if (readOnly) return;
    const newList = dispList.filter((_, i) => i !== idx);
    await persistDisponibilidad(newList);
  };

  const handleRemoveDiaCompleto = async (rawFecha: string) => {
    if (readOnly) return;
    const newList = dispList.filter(
      (item) => String(item.fecha || "").split("T")[0] !== rawFecha,
    );
    await persistDisponibilidad(
      newList,
      `Se eliminó el cronograma del ${formatDateLabel(rawFecha)}.`,
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-brand-card border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">
            Paso 5: Sedes y cronograma
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Agregá los clubes donde se juega el torneo y cargá el cronograma por
            día y cancha. Podés seleccionar varias canchas a la vez para agilizar
            torneos grandes.
          </p>
        </div>

        {esEntidadReguladora && (
          <div className="flex items-start gap-3 p-4 bg-brand-chartreuse/5 border border-brand-chartreuse/20 rounded-2xl">
            <Info className="size-5 text-brand-chartreuse shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">
                Modo Entidad Reguladora
              </p>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                Contratá los clubes que actuarán como sedes de juego. El centro
                de cómputos del Paso 1 no se usa aquí: solo las sedes que agregues
                abajo.
              </p>
            </div>
          </div>
        )}

        {/* ── 1. Sedes de juego ── */}
        <div className="space-y-4">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="size-4 text-brand-chartreuse" />
            Sedes de juego
          </h4>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <CustomDropdown
                value={newClubId}
                onChange={setNewClubId}
                options={clubs
                  .filter((c) => !selectedClubs.some((sc) => sc.id === c.id))
                  .map((c) => ({ value: String(c.id), label: c.nombre }))}
                placeholder="Buscar club para agregar como sede..."
                disabled={readOnly}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleAddSede()}
              disabled={!newClubId || readOnly || saving}
              className="bg-brand-chartreuse text-brand-black px-6 py-2.5 rounded-xl font-black text-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
            >
              Adicionar sede
            </button>
          </div>

          <div className="space-y-3">
            {selectedClubs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-white/10 rounded-2xl">
                Agregá al menos una sede para configurar el cronograma.
              </p>
            ) : (
              selectedClubs.map((club) => {
                const isActive = String(club.id) === String(activeSedeId);
                return (
                  <div
                    key={club.id}
                    className={`border p-4 rounded-2xl flex justify-between items-center gap-4 shadow-sm transition-colors ${
                      isActive
                        ? "bg-brand-chartreuse/10 border-brand-chartreuse/30"
                        : "bg-brand-input border-white/10"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => setActiveSedeId(String(club.id))}
                      className="text-left flex-1 cursor-pointer disabled:cursor-default"
                    >
                      <p className="text-white font-bold text-sm">{club.nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-medium">
                        {club.provincia} · {club.canchas} cancha
                        {Number(club.canchas) === 1 ? "" : "s"}
                        {isActive ? " · Seleccionada para cronograma" : ""}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemoveSede(String(club.id))}
                      disabled={readOnly || saving}
                      className="text-gray-500 hover:text-red-500 transition-colors p-2 cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 2. Cronograma ── */}
        <div className="border-t border-white/10 pt-6 space-y-5">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="size-4 text-brand-chartreuse" />
            Cronograma de canchas
          </h4>

          <div className="flex flex-wrap items-center gap-2 p-4 bg-black/30 border border-white/10 rounded-2xl">
            <Layers className="size-4 text-brand-chartreuse shrink-0" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Categoría del torneo (Paso 3)
            </span>
            <span className="text-sm font-bold text-white">{categoriaLabel}</span>
          </div>

          {selectedClubs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8 border border-dashed border-white/10 rounded-2xl">
              Primero agregá una sede de juego para cargar el cronograma.
            </p>
          ) : (
            <div className="space-y-5 p-4 bg-brand-input/40 rounded-2xl border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                    Sede activa
                  </span>
                  <CustomDropdown
                    value={activeSedeId}
                    onChange={setActiveSedeId}
                    options={sedesOptions}
                    placeholder="Elegí sede..."
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                    Día de competencia
                  </span>
                  {fechasCompetencia.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {fechasCompetencia.map((f) => (
                        <button
                          key={f.iso}
                          type="button"
                          disabled={readOnly}
                          onClick={() =>
                            setCronogramaForm((prev) => ({
                              ...prev,
                              fecha: f.iso,
                            }))
                          }
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                            cronogramaForm.fecha === f.iso
                              ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                              : "bg-brand-input border-white/10 text-gray-300 hover:border-white/20"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={cronogramaForm.fecha}
                      min={fechaInicioTorneo}
                      max={fechaFinTorneo}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCronogramaForm((prev) => ({
                          ...prev,
                          fecha: e.target.value,
                        }))
                      }
                      className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold text-sm outline-none focus:border-brand-chartreuse/50 h-12"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                    Hora inicio *
                  </span>
                  <input
                    type="time"
                    value={cronogramaForm.hora_inicio}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCronogramaForm((prev) => ({
                        ...prev,
                        hora_inicio: e.target.value,
                      }))
                    }
                    className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl text-center font-bold text-sm outline-none focus:border-brand-chartreuse/50 h-12"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                    Hora fin (opcional)
                  </span>
                  <input
                    type="time"
                    value={cronogramaForm.hora_fin}
                    disabled={readOnly}
                    onChange={(e) =>
                      setCronogramaForm((prev) => ({
                        ...prev,
                        hora_fin: e.target.value,
                      }))
                    }
                    className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl text-center font-bold text-sm outline-none focus:border-brand-chartreuse/50 h-12"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    Canchas de esta sede
                  </span>
                  <button
                    type="button"
                    disabled={readOnly || canchasDisponibles.length === 0}
                    onClick={() => {
                      const allIds = canchasDisponibles.map((c) =>
                        String(c.id),
                      );
                      setSelectedCanchaIds(
                        selectedCanchaIds.length === allIds.length ? [] : allIds,
                      );
                    }}
                    className="text-[10px] font-bold text-brand-chartreuse hover:underline cursor-pointer disabled:opacity-40"
                  >
                    {selectedCanchaIds.length === canchasDisponibles.length
                      ? "Deseleccionar todas"
                      : "Seleccionar todas"}
                  </button>
                </div>
                {canchasDisponibles.length === 0 ? (
                  <p className="text-xs text-gray-500 py-3">
                    Esta sede no tiene canchas cargadas.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {canchasDisponibles.map((cancha) => {
                      const id = String(cancha.id);
                      const checked = selectedCanchaIds.includes(id);
                      return (
                        <label
                          key={id}
                          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                            checked
                              ? "bg-brand-chartreuse/10 border-brand-chartreuse/40"
                              : "bg-brand-input border-white/10 hover:border-white/20"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={readOnly}
                            onChange={() => toggleCancha(id)}
                            className="size-4 rounded border-white/20 text-brand-chartreuse"
                          />
                          <span className="text-xs font-bold text-white truncate">
                            {cancha.nombre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleAddDiaCronograma()}
                disabled={readOnly || saving}
                className="w-full bg-brand-chartreuse text-brand-black p-3.5 rounded-xl font-black text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Plus className="size-4" />
                Agregar día al cronograma
                {selectedCanchaIds.length > 0 &&
                  ` (${selectedCanchaIds.length} cancha${selectedCanchaIds.length === 1 ? "" : "s"})`}
              </button>
            </div>
          )}

          {/* Cronograma cargado */}
          {groupedByDate.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Filtrar por día
                </span>
                <span className="text-[11px] font-bold text-brand-chartreuse">
                  {dispList.length}{" "}
                  {dispList.length === 1 ? "bloque cargado" : "bloques cargados"}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                    selectedDateFilter === "all"
                      ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                      : "bg-brand-input border-white/10 text-gray-300"
                  }`}
                >
                  Todos ({dispList.length})
                </button>
                {groupedByDate.map((group) => (
                  <button
                    key={group.rawFecha}
                    type="button"
                    onClick={() => setSelectedDateFilter(group.rawFecha)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                      selectedDateFilter === group.rawFecha
                        ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                        : "bg-brand-input border-white/10 text-gray-300"
                    }`}
                  >
                    {formatDateLabel(group.rawFecha)} ({group.items.length})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            {dispList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6 border border-dashed border-white/10 rounded-2xl">
                No hay días cargados en el cronograma todavía.
              </p>
            ) : (
              groupedByDate
                .filter(
                  (group) =>
                    selectedDateFilter === "all" ||
                    selectedDateFilter === group.rawFecha,
                )
                .map((group) => (
                  <div
                    key={group.rawFecha}
                    className="bg-brand-input/30 border border-white/10 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="size-4 text-brand-chartreuse shrink-0" />
                        <span className="font-extrabold text-sm text-white uppercase tracking-wide truncate">
                          {formatDateLabel(group.rawFecha)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-gray-400">
                          {group.items.length} cancha
                          {group.items.length === 1 ? "" : "s"}
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleRemoveDiaCompleto(group.rawFecha)
                            }
                            className="text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            Eliminar día
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.items.map(({ item: d, originalIndex }) => {
                        const clubName =
                          (d as { clubes?: { nombre?: string } }).clubes
                            ?.nombre ||
                          selectedClubs.find(
                            (sc) => String(sc.id) === String(d.club_id),
                          )?.nombre ||
                          "Sede";
                        const canchaName =
                          (d as { canchas?: { nombre?: string } }).canchas
                            ?.nombre || "Cancha";
                        const horaClean = String(d.hora_inicio || "").slice(
                          0,
                          5,
                        );
                        const horaFinClean = d.hora_fin
                          ? String(d.hora_fin).slice(0, 5)
                          : "";

                        return (
                          <div
                            key={originalIndex}
                            className="flex items-center justify-between bg-brand-input border border-white/10 p-3 rounded-xl"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-xs text-white truncate">
                                {clubName}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">
                                {canchaName}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="inline-flex items-center gap-1 bg-brand-chartreuse/10 border border-brand-chartreuse/30 text-brand-chartreuse px-2 py-1 rounded-lg text-xs font-black">
                                <Clock className="size-3" />
                                {horaFinClean
                                  ? `${horaClean}–${horaFinClean}`
                                  : `${horaClean} hs`}
                              </span>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRemoveCanchaDisp(originalIndex)
                                  }
                                  className="text-gray-500 hover:text-red-500 p-1.5 cursor-pointer rounded-lg hover:bg-red-500/10"
                                  title="Quitar del cronograma"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
