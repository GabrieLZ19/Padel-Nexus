"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search, Info, Calendar, Clock } from "lucide-react";
import { Club } from "@/utils/types";
import { api } from "@/utils/api";
import CustomDropdown from "../ui/CustomDropdown";
import { ClubesService } from "@/utils/services/clubes";
import { sileo } from "sileo";
import { useProfileStore } from "@/store/useProfileStore";
import type { RolUsuario } from "@/utils/types/user.types";

interface SedesFiscalesTabProps {
  torneoId: string;
  onRefresh?: () => void;
}

export const SedesFiscalesTab: React.FC<SedesFiscalesTabProps> = ({
  torneoId,
  onRefresh,
}) => {
  // State
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<Club[]>([]);
  const [canchasDisponibles, setCanchasDisponibles] = useState<any[]>([]);
  const [dispList, setDispList] = useState<any[]>([]);
  const [fiscales, setFiscales] = useState<any[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");

  // Helper de agrupar turnos por fecha para vista Calendario
  const formatDateLabel = (fStr: string) => {
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
  };

  const groupedByDate = React.useMemo(() => {
    const map = new Map<
      string,
      { rawFecha: string; items: { item: any; originalIndex: number }[] }
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

  // Forms state
  const [newClubId, setNewClubId] = useState<string>("");
  const [canchaForm, setCanchaForm] = useState({
    club_id: "",
    cancha_id: "",
    fecha: "",
    hora_inicio: "",
  });
  const [searchDni, setSearchDni] = useState("");
  const [foundFiscal, setFoundFiscal] = useState<any | null>(null);
  const [searchError, setSearchError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombre: "",
    apellido: "",
    rango: "Local" as "Local" | "Regional" | "Provincial" | "Nacional",
  });

  const [mainClub, setMainClub] = useState<any>(null);
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

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      try {
        // All clubs
        const resClubsAll = await api.get<any>("/clubes");
        setClubs(resClubsAll.data?.data || []);

        // Assigned clubs/sedes
        const resSedes = await api.get(`/torneos/${torneoId}/sedes`);
        setSelectedClubs(resSedes.data || []);

        // Assigned fiscales
        const resFiscales = await api.get(`/torneos/${torneoId}/fiscales`);
        setFiscales(resFiscales.data || []);

        // Assigned canchas availability
        const resDisp = await api.get(
          `/torneos/${torneoId}/canchas-disponibilidad`,
        );
        setDispList(resDisp.data || []);

        // Fetch tournament main club
        const resTorneo = await api.get(`/torneos/${torneoId}`);
        if (resTorneo.data) {
          if (resTorneo.data.club_id) {
            setMainClub({
              id: resTorneo.data.club_id,
              nombre: resTorneo.data.clubes?.nombre || "Sede Principal",
            });
          }
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
    loadData();
  }, [torneoId]);

  // Load canchas when club is selected in canchaForm
  useEffect(() => {
    if (canchaForm.club_id) {
      ClubesService.getCanchas(canchaForm.club_id)
        .then((data) => setCanchasDisponibles(data))
        .catch((e) => console.error(e));
    } else {
      setCanchasDisponibles([]);
    }
  }, [canchaForm.club_id]);

  const handleAddSede = async () => {
    if (!newClubId) return;
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
    const clubIds = selectedClubs
      .map((c) => c.id)
      .filter((id) => String(id) !== String(clubId));
    try {
      setSaving(true);
      await api.post(`/torneos/${torneoId}/sedes`, { club_ids: clubIds });
      setSelectedClubs(
        selectedClubs.filter((c) => String(c.id) !== String(clubId)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCanchaDisp = async () => {
    if (
      !canchaForm.club_id ||
      !canchaForm.cancha_id ||
      !canchaForm.fecha ||
      !canchaForm.hora_inicio
    )
      return;

    // Validar rango de fechas del torneo
    if (fechaInicioTorneo && canchaForm.fecha < fechaInicioTorneo) {
      sileo.error({
        title: "Error",
        description: `La fecha elegida no puede ser menor al inicio del torneo (${fechaInicioTorneo}).`,
      });

      return;
    }
    if (fechaFinTorneo && canchaForm.fecha > fechaFinTorneo) {
      sileo.error({
        title: "Error",
        description: `La fecha elegida no puede superar la finalización del torneo (${fechaFinTorneo}).`,
      });
      return;
    }

    // Validar días de juego específicos configurados en Paso 3
    if (diasJuego.length > 0) {
      const dateObj = new Date(canchaForm.fecha + "T12:00:00");
      const dayName = dateObj.toLocaleDateString("es-AR", { weekday: "short" });
      const capitalized =
        dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "");
      const dayNum = dateObj.getDate();
      const matchValue = `${capitalized} ${dayNum}`;

      if (!diasJuego.includes(matchValue)) {
        sileo.error({
          title: "Error",
          description: `La fecha elegida (${canchaForm.fecha}) no forma parte de los días de competencia configurados para este torneo. Días permitidos: ${diasJuego.join(", ")}`,
        });
        return;
      }
    }

    // Validar choques/superposiciones exactas (normalizando HH:mm)
    const normFormHora = canchaForm.hora_inicio.slice(0, 5);
    const normFormFecha = canchaForm.fecha.split("T")[0];

    const existeConflicto = dispList.some((item) => {
      const itemClubId = String(item.club_id);
      const itemCanchaId = String(item.cancha_id);
      const itemFecha = String(item.fecha || "").split("T")[0];
      const itemHora = String(item.hora_inicio || "").slice(0, 5);

      return (
        itemClubId === String(canchaForm.club_id) &&
        itemCanchaId === String(canchaForm.cancha_id) &&
        itemFecha === normFormFecha &&
        itemHora === normFormHora
      );
    });

    if (existeConflicto) {
      sileo.error({
        title: "Error",
        description:
          "Conflicto: Ya existe un horario asignado para esta cancha en la misma fecha y hora.",
      });
      return;
    }

    const newItem = {
      club_id: canchaForm.club_id,
      cancha_id: canchaForm.cancha_id,
      fecha: canchaForm.fecha,
      hora_inicio: canchaForm.hora_inicio,
    };
    const newList = [...dispList, newItem];
    try {
      setSaving(true);
      await api.post(`/torneos/${torneoId}/canchas-disponibilidad`, {
        disponibilidad: newList,
      });

      // Reload list to get names correctly
      const resDisp = await api.get(
        `/torneos/${torneoId}/canchas-disponibilidad`,
      );
      setDispList(resDisp.data || []);
      setCanchaForm({ ...canchaForm, cancha_id: "", hora_inicio: "" });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCanchaDisp = async (idx: number) => {
    const newList = dispList.filter((_, i) => i !== idx);
    try {
      setSaving(true);
      await api.post(`/torneos/${torneoId}/canchas-disponibilidad`, {
        disponibilidad: newList,
      });
      setDispList(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSearchFiscal = async () => {
    if (!searchDni) return;
    setSearchError("");
    setFoundFiscal(null);
    setShowCreateForm(false);
    try {
      const res = await api.get(`/torneos/fiscales/dni/${searchDni}`);
      setFoundFiscal(res.data);
    } catch (e: any) {
      setSearchError("No se encontró ningún fiscal con este DNI.");
    }
  };

  const handleCreateAndAddFiscal = async () => {
    if (!createForm.nombre || !createForm.apellido || !searchDni) return;
    try {
      setSaving(true);
      const resNew = await api.post("/torneos/fiscales", {
        nombre: createForm.nombre,
        apellido: createForm.apellido,
        dni: searchDni,
        rango: createForm.rango,
      });
      const newFiscal = resNew.data;

      const dnis = [...fiscales.map((f) => f.dni), searchDni];
      await api.post(`/torneos/${torneoId}/fiscales`, { dnis });

      setFiscales([...fiscales, newFiscal]);
      setShowCreateForm(false);
      setCreateForm({ nombre: "", apellido: "", rango: "Local" });
      setSearchDni("");
      setSearchError("");
    } catch (e: any) {
      console.error(e);
      setSearchError(
        e.response?.data?.error || "Error al registrar y asignar fiscal.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddFiscal = async () => {
    if (!foundFiscal) return;
    if (fiscales.some((f) => f.id === foundFiscal.id)) return;
    const dnis = [...fiscales.map((f) => f.dni), foundFiscal.dni];
    try {
      setSaving(true);
      await api.post(`/torneos/${torneoId}/fiscales`, { dnis });
      setFiscales([...fiscales, foundFiscal]);
      setFoundFiscal(null);
      setSearchDni("");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFiscal = async (dni: string) => {
    const dnis = fiscales.map((f) => f.dni).filter((d) => d !== dni);
    try {
      setSaving(true);
      await api.post(`/torneos/${torneoId}/fiscales`, { dnis });
      setFiscales(fiscales.filter((f) => f.dni !== dni));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const allSedesOptions = [];
  if (mainClub) {
    allSedesOptions.push({
      value: String(mainClub.id),
      label: `${mainClub.nombre} (Principal)`,
    });
  }
  selectedClubs.forEach((c) => {
    if (!mainClub || String(c.id) !== String(mainClub.id)) {
      allSedesOptions.push({ value: String(c.id), label: c.nombre });
    }
  });

  return (
    <div className="space-y-8">
      {/* 3. MULTI-SEDE & DISPONIBILIDAD DE CANCHAS */}
      <div className="bg-brand-card border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
          Sedes (Clubes)
        </h3>

        {/* Badge de entidad reguladora */}
        {esEntidadReguladora && (
          <div className="flex items-start gap-3 p-4 bg-brand-chartreuse/5 border border-brand-chartreuse/20 rounded-2xl">
            <Info className="size-5 text-brand-chartreuse shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">
                Modo Entidad Reguladora
              </p>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                Como{" "}
                {userRole === "admin_federacion"
                  ? "Federación Nacional"
                  : userRole === "admin_provincial"
                    ? "Asociación Provincial"
                    : "Superadmin"}
                , estás contratando los clubes que actuarán como sedes para esta
                competencia. Podés asignar múltiples clubes, definir canchas y
                horarios para cada uno.
              </p>
            </div>
          </div>
        )}

        {/* Selector de sedes */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <CustomDropdown
              value={newClubId}
              onChange={setNewClubId}
              options={clubs
                .filter((c) => !selectedClubs.some((sc) => sc.id === c.id))
                .map((c) => ({ value: String(c.id), label: c.nombre }))}
              placeholder="Adicionar Club/Sede..."
            />
          </div>
          <button
            onClick={handleAddSede}
            disabled={!newClubId}
            className="bg-brand-chartreuse text-brand-black px-6 py-2.5 rounded-xl font-black text-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
          >
            Adicionar Sede
          </button>
        </div>

        {/* Sedes agregadas */}
        <div className="space-y-3">
          {selectedClubs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-white/10 rounded-2xl">
              No hay clubes agregados.
            </p>
          ) : (
            selectedClubs.map((club) => (
              <div
                key={club.id}
                className="bg-brand-input border border-white/10 p-4 rounded-2xl flex justify-between items-center gap-4 shadow-sm"
              >
                <div>
                  <p className="text-white font-bold text-sm">{club.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">
                    {club.provincia} · {club.canchas} canchas
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveSede(club.id)}
                  className="text-gray-500 hover:text-red-500 transition-colors p-2 cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Disponibilidad horaria */}
        <div className="border-t border-white/10 pt-6 space-y-4">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">
            Disponibilidad de Canchas y Horarios
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 bg-brand-input/40 rounded-2xl border border-white/10 items-end">
            <div className="sm:col-span-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                Club
              </span>
              <CustomDropdown
                value={canchaForm.club_id}
                onChange={(val) =>
                  setCanchaForm({ ...canchaForm, club_id: val, cancha_id: "" })
                }
                options={allSedesOptions}
                placeholder="Club..."
              />
            </div>
            <div className="sm:col-span-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                Cancha
              </span>
              <CustomDropdown
                value={canchaForm.cancha_id}
                onChange={(val) =>
                  setCanchaForm({ ...canchaForm, cancha_id: val })
                }
                options={canchasDisponibles.map((c) => ({
                  value: String(c.id),
                  label: c.nombre,
                }))}
                placeholder="Cancha..."
              />
            </div>
            <div className="sm:col-span-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                Fecha
              </span>
              <input
                type="date"
                value={canchaForm.fecha}
                onChange={(e) =>
                  setCanchaForm({ ...canchaForm, fecha: e.target.value })
                }
                min={fechaInicioTorneo}
                max={fechaFinTorneo}
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl text-center font-bold text-sm outline-none focus:border-brand-chartreuse/50 h-12"
              />
            </div>
            <div className="sm:col-span-2">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                Hora Inicio
              </span>
              <input
                type="time"
                value={canchaForm.hora_inicio}
                onChange={(e) =>
                  setCanchaForm({ ...canchaForm, hora_inicio: e.target.value })
                }
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl text-center font-bold text-sm outline-none focus:border-brand-chartreuse/50 h-12"
              />
            </div>
            <div className="sm:col-span-1 flex justify-end">
              <button
                onClick={handleAddCanchaDisp}
                className="w-full bg-brand-chartreuse text-brand-black p-3.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center h-12"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {/* Filtros de Fecha estilo Calendario */}
          {groupedByDate.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="size-4 text-brand-chartreuse" />{" "}
                  Seleccionar Fecha para Filtrar
                </span>
                <span className="text-[11px] font-bold text-brand-chartreuse">
                  {dispList.length}{" "}
                  {dispList.length === 1
                    ? "turno cargado"
                    : "turnos cargados en total"}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                    selectedDateFilter === "all"
                      ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse shadow-md scale-105"
                      : "bg-brand-input border-white/10 text-gray-300 hover:border-white/20"
                  }`}
                >
                  Todas las Fechas ({dispList.length})
                </button>
                {groupedByDate.map((group) => {
                  const isSelected = selectedDateFilter === group.rawFecha;
                  return (
                    <button
                      key={group.rawFecha}
                      type="button"
                      onClick={() => setSelectedDateFilter(group.rawFecha)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse shadow-md scale-105"
                          : "bg-brand-input border-white/10 text-gray-300 hover:border-white/20"
                      }`}
                    >
                      <span>{formatDateLabel(group.rawFecha)}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isSelected
                            ? "bg-brand-black/20 text-brand-black"
                            : "bg-white/10 text-gray-300"
                        }`}
                      >
                        {group.items.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Renderizado de Disponibilidad por Fecha (Vista Calendario Organizada) */}
          <div className="space-y-4 pt-2">
            {dispList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6 border border-dashed border-white/10 rounded-2xl">
                No hay disponibilidades de canchas registradas para este torneo.
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
                    className="bg-brand-input/30 border border-white/10 rounded-2xl p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-brand-chartreuse" />
                        <span className="font-extrabold text-sm text-white uppercase tracking-wide">
                          {formatDateLabel(group.rawFecha)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400">
                        {group.items.length}{" "}
                        {group.items.length === 1
                          ? "turno programado"
                          : "turnos programados"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.items.map(({ item: d, originalIndex }) => {
                        const clubName =
                          d.clubes?.nombre ||
                          selectedClubs.find(
                            (sc) => String(sc.id) === String(d.club_id),
                          )?.nombre ||
                          "Sede";
                        const canchaName = d.canchas?.nombre || "Cancha";
                        const horaClean = (d.hora_inicio || "").slice(0, 5);

                        return (
                          <div
                            key={originalIndex}
                            className="flex items-center justify-between bg-brand-input border border-white/10 p-3 rounded-xl shadow-xs hover:border-white/20 transition-all"
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
                              <span className="inline-flex items-center gap-1 bg-brand-chartreuse/10 border border-brand-chartreuse/30 text-brand-chartreuse px-2.5 py-1 rounded-lg text-xs font-black">
                                <Clock className="size-3" />
                                {horaClean} hs
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveCanchaDisp(originalIndex)
                                }
                                className="text-gray-500 hover:text-red-500 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-red-500/10"
                                title="Eliminar este turno"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
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
