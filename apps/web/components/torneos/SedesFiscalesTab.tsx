"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Club } from "@/utils/types";
import { api } from "@/utils/api";
import CustomDropdown from "../ui/CustomDropdown";
import { ClubesService } from "@/utils/services/clubes";
import { sileo } from "sileo";

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

    // Validar choques/superposiciones exactas
    const existeConflicto = dispList.some(
      (item) =>
        String(item.club_id) === String(canchaForm.club_id) &&
        String(item.cancha_id) === String(canchaForm.cancha_id) &&
        item.fecha === canchaForm.fecha &&
        item.hora_inicio === canchaForm.hora_inicio,
    );
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
      {/* 2. GESTIÓN DE FISCALES */}
      <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-6 space-y-6">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
          Fiscales Asignados
        </h3>

        {/* Buscador */}
        <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-[#222222] border border-white/5 px-3 py-2.5 rounded-xl w-full md:flex-1">
            <Search className="size-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar fiscal por DNI..."
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
              className="bg-transparent text-white text-sm outline-none w-full font-semibold"
            />
          </div>
          <button
            onClick={handleSearchFiscal}
            className="w-full md:w-auto bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            Buscar
          </button>
        </div>

        {searchError && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
              <span className="text-xs text-yellow-500 font-bold">
                {searchError}
              </span>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-brand-chartreuse text-brand-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer w-full sm:w-auto"
                >
                  Registrar como Nuevo Fiscal
                </button>
              )}
            </div>

            {showCreateForm && (
              <div className="p-5 bg-black/40 border border-white/5 rounded-3xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Registrar Nuevo Fiscal (DNI: {searchDni})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={createForm.nombre}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, nombre: e.target.value })
                      }
                      placeholder="Ej: Juan"
                      className="w-full bg-[#111111] border border-white/10 text-white p-2.5 rounded-xl font-bold text-sm focus:border-brand-chartreuse/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={createForm.apellido}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          apellido: e.target.value,
                        })
                      }
                      placeholder="Ej: Pérez"
                      className="w-full bg-[#111111] border border-white/10 text-white p-2.5 rounded-xl font-bold text-sm focus:border-brand-chartreuse/50 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">
                    Rango / Categoría de Fiscal
                  </label>
                  <CustomDropdown
                    value={createForm.rango}
                    onChange={(val: any) =>
                      setCreateForm({ ...createForm, rango: val })
                    }
                    options={[
                      { value: "Local", label: "Local" },
                      { value: "Regional", label: "Regional" },
                      { value: "Provincial", label: "Provincial" },
                      { value: "Nacional", label: "Nacional" },
                    ]}
                    placeholder="Rango..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateForm({
                        nombre: "",
                        apellido: "",
                        rango: "Local",
                      });
                    }}
                    className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateAndAddFiscal}
                    disabled={
                      saving || !createForm.nombre || !createForm.apellido
                    }
                    className="bg-brand-chartreuse text-brand-black px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    {saving ? "Registrando..." : "Registrar y Asignar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {foundFiscal && (
          <div className="bg-[#222222] border border-brand-chartreuse/20 p-4 rounded-2xl flex justify-between items-center gap-4 animate-in fade-in duration-200">
            <div>
              <p className="text-white font-black text-sm">
                {foundFiscal.nombre} {foundFiscal.apellido}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                DNI: {foundFiscal.dni} · Rango: {foundFiscal.rango}
              </p>
            </div>
            <button
              onClick={handleAddFiscal}
              className="bg-brand-chartreuse text-brand-black px-4 py-2 rounded-xl text-xs font-black hover:opacity-90 active:scale-95 transition-all flex items-center gap-1"
            >
              <Plus className="size-3.5" /> Agregar
            </button>
          </div>
        )}

        {/* Lista de fiscales */}
        <div className="space-y-3">
          {fiscales.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-white/5 rounded-2xl">
              No hay fiscales designados en este torneo. Use el buscador de
              arriba.
            </p>
          ) : (
            fiscales.map((f) => (
              <div
                key={f.id}
                className="bg-black/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center gap-4"
              >
                <div>
                  <p className="text-white font-bold text-sm">
                    {f.nombre} {f.apellido}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    DNI: {f.dni} · Rango: {f.rango}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveFiscal(f.dni)}
                  className="text-gray-500 hover:text-red-500 transition-colors p-2 cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. MULTI-SEDE & DISPONIBILIDAD DE CANCHAS */}
      <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-6 space-y-6">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
          Sedes (Clubes) Auxiliares
        </h3>

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
            <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-white/5 rounded-2xl">
              No hay clubes auxiliares agregados.
            </p>
          ) : (
            selectedClubs.map((club) => (
              <div
                key={club.id}
                className="bg-black/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center gap-4"
              >
                <div>
                  <p className="text-white font-bold text-sm">{club.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
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
        <div className="border-t border-white/5 pt-6 space-y-4">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">
            Disponibilidad de Canchas y Horarios
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 bg-black/20 rounded-2xl border border-white/5 items-end">
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
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl text-center font-bold text-sm outline-none focus:border-brand-chartreuse/50 h-[48px]"
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
                className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl text-center font-bold text-sm outline-none focus:border-brand-chartreuse/50 h-[48px]"
              />
            </div>
            <div className="sm:col-span-1 flex justify-end">
              <button
                onClick={handleAddCanchaDisp}
                className="w-full bg-brand-chartreuse text-brand-black p-3.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center h-[48px]"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {/* Lista de disponibilidad */}
          <div className="space-y-2">
            {dispList.map((d, index) => {
              const clubName =
                d.clubes?.nombre ||
                selectedClubs.find((sc) => String(sc.id) === String(d.club_id))
                  ?.nombre ||
                "Sede";
              const canchaName = d.canchas?.nombre || "Cancha";
              return (
                <div
                  key={index}
                  className="flex justify-between items-center bg-[#222222] p-3 px-4 rounded-xl border border-white/5 text-sm"
                >
                  <div className="text-gray-300">
                    <span className="font-bold text-white">{clubName}</span> ·{" "}
                    {canchaName} ·{" "}
                    <span className="font-semibold text-brand-chartreuse">
                      {d.fecha} {d.hora_inicio}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveCanchaDisp(index)}
                    className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
