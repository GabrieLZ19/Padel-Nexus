"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Info,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { Club } from "@/utils/types";
import type { Torneo } from "@/utils/types";
import CustomDropdown from "../ui/CustomDropdown";
import { ClubesService } from "@/utils/services/clubes";
import { TorneosService } from "@/utils/services/torneos";
import { sileo } from "sileo";
import { useProfileStore } from "@/store/useProfileStore";
import type { RolUsuario } from "@/utils/types/user.types";
import { labelModalidad } from "@/utils/formatFecha";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";

type LocalidadSugerida = {
  ciudad: string;
  provincia: string;
  detalle: string;
  lat: number | null;
  lon: number | null;
};

function normalizarProvinciaNominatim(raw: string): string {
  const p = (raw || "").trim();
  const lower = p.toLowerCase();
  if (lower.includes("buenos aires") && !lower.includes("ciudad")) {
    return "Buenos Aires";
  }
  if (lower.includes("ciudad autónoma") || lower.includes("caba")) {
    return "CABA";
  }
  return p.replace(/^Provincia de(l)?\s+/i, "");
}

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
    const iso = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
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

  const [newClubId, setNewClubId] = useState<string>("");
  const [activeSedeId, setActiveSedeId] = useState<string>("");

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
  const [showAltaClub, setShowAltaClub] = useState(false);
  const [altaClubForm, setAltaClubForm] = useState({
    nombre: "",
    provincia: "La Rioja",
    localidad: "",
    canchas: 2,
    latitud: null as number | null,
    longitud: null as number | null,
  });
  const [localidadSearch, setLocalidadSearch] = useState("");
  const [localidadesSugeridas, setLocalidadesSugeridas] = useState<
    LocalidadSugerida[]
  >([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [isLocalidadOpen, setIsLocalidadOpen] = useState(false);
  const localidadDropdownRef = useRef<HTMLDivElement>(null);
  const [creandoClub, setCreandoClub] = useState(false);

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

  /** Canchas contratadas (únicas por club+cancha), sin franjas horarias. */
  const canchasContratadas = useMemo(() => {
    const map = new Map<
      string,
      {
        club_id: string;
        cancha_id: string;
        clubNombre: string;
        canchaNombre: string;
      }
    >();
    for (const item of dispList) {
      const clubId = String(item.club_id || "");
      const canchaId = String(item.cancha_id || "");
      if (!clubId || !canchaId) continue;
      const key = `${clubId}|${canchaId}`;
      if (map.has(key)) continue;
      const club = item.clubes as { nombre?: string } | undefined;
      const cancha = item.canchas as { nombre?: string } | undefined;
      map.set(key, {
        club_id: clubId,
        cancha_id: canchaId,
        clubNombre:
          club?.nombre ||
          selectedClubs.find((c) => String(c.id) === clubId)?.nombre ||
          "Club",
        canchaNombre: cancha?.nombre || `Cancha ${canchaId.slice(0, 4)}`,
      });
    }
    return [...map.values()].sort((a, b) =>
      `${a.clubNombre}${a.canchaNombre}`.localeCompare(
        `${b.clubNombre}${b.canchaNombre}`,
      ),
    );
  }, [dispList, selectedClubs]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const resClubsAll = await ClubesService.getAll();
        setClubs((resClubsAll.data as Club[]) || []);

        const sedes = await TorneosService.getSedes(torneoId);
        setSelectedClubs((sedes as Club[]) || []);

        const disp = await TorneosService.getCanchasDisponibilidad(torneoId);
        setDispList((disp as typeof dispList) || []);

        const torneo = await TorneosService.getById(torneoId);
        if (torneo) {
          const meta = torneo as Torneo & {
            fecha_fin?: string | null;
            dias_juego?: string[];
          };
          setTorneoMeta({
            rama: meta.rama || "",
            categoria: meta.categoria || "",
            nivel: meta.nivel || "",
            modalidad: meta.modalidad || "",
          });
          if (meta.fecha) {
            setFechaInicioTorneo(String(meta.fecha).split("T")[0]);
          }
          if (meta.fecha_fin) {
            setFechaFinTorneo(String(meta.fecha_fin).split("T")[0]);
          }
          if (Array.isArray(meta.dias_juego)) {
            setDiasJuego(meta.dias_juego);
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
        const enrolled = new Set(
          dispList
            .filter((d) => String(d.club_id) === String(activeSedeId))
            .map((d) => String(d.cancha_id)),
        );
        if (enrolled.size > 0) {
          setSelectedCanchaIds(
            list
              .map((c) => String(c.id))
              .filter((id) => enrolled.has(id)),
          );
        } else {
          setSelectedCanchaIds(list.map((c) => String(c.id)));
        }
      })
      .catch((e) => console.error(e));
    // Solo al cambiar sede; dispList se usa como snapshot inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSedeId]);

  const persistDisponibilidad = async (
    newList: typeof dispList,
    successMessage?: string,
  ) => {
    setSaving(true);
    try {
      await TorneosService.guardarCanchasDisponibilidad(torneoId, newList);
      const disp = await TorneosService.getCanchasDisponibilidad(torneoId);
      setDispList((disp as typeof dispList) || []);
      if (successMessage) {
        sileo.success({
          title: "Canchas actualizadas",
          description: successMessage,
        });
      }
    } catch (e) {
      console.error(e);
      sileo.error({
        title: "Error",
        description: "No se pudieron guardar las canchas del torneo.",
      });
    } finally {
      setSaving(false);
    }
  };

  /** Semilla 08:00–22:30 por día × cancha para el programador. */
  const buildSeedRows = (
    clubId: string,
    canchaIds: string[],
  ): typeof dispList => {
    const dias =
      fechasCompetencia.length > 0
        ? fechasCompetencia.map((f) => f.iso)
        : fechaInicioTorneo
          ? [fechaInicioTorneo]
          : [];
    const rows: typeof dispList = [];
    for (const fecha of dias) {
      for (const canchaId of canchaIds) {
        rows.push({
          club_id: clubId,
          cancha_id: canchaId,
          fecha,
          hora_inicio: "08:00:00",
          hora_fin: "22:30:00",
          categoria: categoriaLabel,
        });
      }
    }
    return rows;
  };

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

  // Autocompletado geográfico (Nominatim / OpenStreetMap), mismo patrón que ClubModal y Asociaciones
  useEffect(() => {
    if (!localidadSearch.trim() || localidadSearch.length < 2) {
      setLocalidadesSugeridas([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoadingLocalidades(true);
      try {
        const query = `${localidadSearch.trim()}, Argentina`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query,
          )}&countrycodes=ar&addressdetails=1&limit=8`,
          { headers: { "Accept-Language": "es" } },
        );
        const data = await res.json();
        if (!active || !Array.isArray(data)) return;

        const sugerencias: LocalidadSugerida[] = data.map(
          (item: {
            name?: string;
            display_name?: string;
            lat?: string;
            lon?: string;
            address?: Record<string, string>;
          }) => {
            const addr = item.address || {};
            const ciudad =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.suburb ||
              addr.municipality ||
              item.name ||
              String(item.display_name || "").split(",")[0];
            const provincia = normalizarProvinciaNominatim(addr.state || "");
            const road = addr.road || addr.pedestrian || "";
            const house = addr.house_number || "";
            const calle = road
              ? house
                ? `${road} ${house}`
                : road
              : "";
            const detalle = [calle || ciudad, provincia || addr.state]
              .filter(Boolean)
              .join(" · ");
            return {
              ciudad: calle ? `${calle}, ${ciudad}` : ciudad,
              provincia,
              detalle,
              lat: item.lat ? Number(item.lat) : null,
              lon: item.lon ? Number(item.lon) : null,
            };
          },
        );

        const unicas = sugerencias.filter(
          (v, i, self) =>
            self.findIndex(
              (t) => t.ciudad === v.ciudad && t.provincia === v.provincia,
            ) === i,
        );
        setLocalidadesSugeridas(unicas);
      } catch (err) {
        console.error("Error en búsqueda predictiva de localidades:", err);
      } finally {
        if (active) setLoadingLocalidades(false);
      }
    }, 320);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [localidadSearch]);

  const resetAltaClubForm = () => {
    setAltaClubForm({
      nombre: "",
      provincia: "La Rioja",
      localidad: "",
      canchas: 2,
      latitud: null,
      longitud: null,
    });
    setLocalidadSearch("");
    setLocalidadesSugeridas([]);
    setIsLocalidadOpen(false);
  };

  const handleCrearClubRapido = async () => {
    if (readOnly) return;
    if (!altaClubForm.nombre.trim() || !altaClubForm.localidad.trim()) {
      sileo.warning({
        title: "Datos incompletos",
        description: "Nombre y ciudad/dirección son obligatorios.",
      });
      return;
    }
    try {
      setCreandoClub(true);
      const cantidadCanchas = Math.max(1, Number(altaClubForm.canchas) || 1);
      const club = await ClubesService.create({
        nombre: altaClubForm.nombre.trim(),
        provincia: altaClubForm.provincia,
        localidad: altaClubForm.localidad.trim(),
        canchas: cantidadCanchas,
        estado: "Activo",
        latitud: altaClubForm.latitud,
        longitud: altaClubForm.longitud,
      });

      if (!club?.id) {
        throw new Error("El club se creó sin ID válido.");
      }

      // El backend ya crea las filas en `canchas`; sincronizamos por si quedó algo pendiente
      let canchasExistentes = await ClubesService.getCanchas(club.id);
      if (canchasExistentes.length < cantidadCanchas) {
        for (let i = canchasExistentes.length + 1; i <= cantidadCanchas; i++) {
          try {
            await ClubesService.createCancha(club.id, {
              nombre: `Cancha ${i}`,
              tipo_suelo: "Blindex",
              techada: true,
            });
          } catch (err) {
            console.error("Error creando cancha del club rápido:", err);
          }
        }
        canchasExistentes = await ClubesService.getCanchas(club.id);
      }

      const canchasCreadas = canchasExistentes.length;
      setClubs((prev) => [...prev, { ...club, canchas: canchasCreadas }]);
      setNewClubId(String(club.id));
      setShowAltaClub(false);
      resetAltaClubForm();
      sileo.success({
        title: "Club creado",
        description:
          canchasCreadas >= cantidadCanchas
            ? `${canchasCreadas} cancha(s) listas. Ya podés agregarlo como sede.`
            : `Club listo (${canchasCreadas}/${cantidadCanchas} canchas). Revisá el detalle del club.`,
      });
    } catch {
      sileo.error({
        title: "Error",
        description: "No se pudo crear el club.",
      });
    } finally {
      setCreandoClub(false);
    }
  };

  const handleAddSede = async () => {
    if (!newClubId || readOnly) return;
    const clubIds = [...selectedClubs.map((c) => c.id), newClubId];
    try {
      setSaving(true);
      await TorneosService.guardarSedes(torneoId, clubIds);
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
      await TorneosService.guardarSedes(torneoId, clubIds);
      setSelectedClubs(
        selectedClubs.filter((c) => String(c.id) !== String(clubId)),
      );
      if (String(activeSedeId) === String(clubId)) {
        setActiveSedeId("");
      }
      const remaining = dispList.filter(
        (d) => String(d.club_id) !== String(clubId),
      );
      if (remaining.length !== dispList.length) {
        await TorneosService.guardarCanchasDisponibilidad(torneoId, remaining);
        const disp = await TorneosService.getCanchasDisponibilidad(torneoId);
        setDispList((disp as typeof dispList) || []);
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

  const handleGuardarCanchasSede = async () => {
    if (readOnly) return;
    if (!activeSedeId) {
      sileo.warning({
        title: "Sin sede",
        description: "Elegí una sede para asociar canchas.",
      });
      return;
    }
    if (selectedCanchaIds.length === 0) {
      sileo.warning({
        title: "Sin canchas",
        description: "Seleccioná al menos una cancha.",
      });
      return;
    }
    if (fechasCompetencia.length === 0 && !fechaInicioTorneo) {
      sileo.error({
        title: "Sin fechas",
        description:
          "Definí la fecha del torneo (Paso 1) o los días de juego (Paso 3).",
      });
      return;
    }

    const otrasSedes = dispList.filter(
      (d) => String(d.club_id) !== String(activeSedeId),
    );
    // Reconstruir semillas de otras sedes por cancha única (días actuales)
    const otrasCanchas = new Map<string, { club_id: string; cancha_id: string }>();
    for (const d of otrasSedes) {
      const key = `${d.club_id}|${d.cancha_id}`;
      if (!otrasCanchas.has(key)) {
        otrasCanchas.set(key, {
          club_id: String(d.club_id),
          cancha_id: String(d.cancha_id),
        });
      }
    }
    const otrasRows: typeof dispList = [];
    for (const c of otrasCanchas.values()) {
      otrasRows.push(...buildSeedRows(c.club_id, [c.cancha_id]));
    }

    const nuevas = buildSeedRows(activeSedeId, selectedCanchaIds);
    await persistDisponibilidad(
      [...otrasRows, ...nuevas],
      `${selectedCanchaIds.length} cancha(s) listas para el programador (08:00–21:00).`,
    );
  };

  const handleQuitarCanchaTorneo = async (
    clubId: string,
    canchaId: string,
  ) => {
    if (readOnly) return;
    const newList = dispList.filter(
      (d) =>
        !(
          String(d.club_id) === String(clubId) &&
          String(d.cancha_id) === String(canchaId)
        ),
    );
    await persistDisponibilidad(newList, "Cancha quitada del torneo.");
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

        <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="size-4 text-brand-chartreuse" />
            Horarios
          </h4>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            En este paso solo elegís sedes y canchas. La grilla de horarios
            (08:00–21:00), la duración del partido y la asignación se arman en el{" "}
            <span className="text-brand-chartreuse font-semibold">
              programador visual
            </span>
            .
          </p>
        </div>

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
            <button
              type="button"
              onClick={() => setShowAltaClub((v) => !v)}
              disabled={readOnly}
              className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl font-black text-xs cursor-pointer"
            >
              <Plus className="size-3.5 inline mr-1" />
              Alta club
            </button>
          </div>

          {showAltaClub && !readOnly && (
            <div className="space-y-3 p-4 rounded-2xl border border-dashed border-white/15 bg-black/20">
              <p className="text-[11px] text-gray-500">
                Alta rápida para sedes de prueba. La dirección usa OpenStreetMap
                (Nominatim).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                    Nombre del club *
                  </label>
                  <input
                    value={altaClubForm.nombre}
                    onChange={(e) =>
                      setAltaClubForm((f) => ({ ...f, nombre: e.target.value }))
                    }
                    placeholder="Ej: Club Pádel Centro"
                    className="w-full bg-brand-card border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-chartreuse/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                    Provincia *
                  </label>
                  <CustomDropdown
                    value={altaClubForm.provincia}
                    onChange={(val) =>
                      setAltaClubForm((f) => ({
                        ...f,
                        provincia: val,
                        localidad: "",
                        latitud: null,
                        longitud: null,
                      }))
                    }
                    options={PROVINCIAS_ARG.map((p) => ({
                      value: p.value,
                      label: p.label,
                    }))}
                    placeholder="Provincia..."
                  />
                </div>
                <div className="relative md:col-span-2" ref={localidadDropdownRef}>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                    Ciudad / dirección *
                  </label>
                  <input
                    value={localidadSearch}
                    onFocus={() => setIsLocalidadOpen(true)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLocalidadSearch(v);
                      setAltaClubForm((f) => ({
                        ...f,
                        localidad: v,
                        latitud: null,
                        longitud: null,
                      }));
                      setIsLocalidadOpen(true);
                    }}
                    placeholder={
                      loadingLocalidades
                        ? "Buscando en el mapa..."
                        : "Ej: Av. San Martín 1200, La Rioja"
                    }
                    className="w-full bg-brand-card border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-chartreuse/40"
                  />
                  {isLocalidadOpen &&
                    (loadingLocalidades || localidadesSugeridas.length > 0) && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-white/5">
                        {loadingLocalidades ? (
                          <div className="p-3 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                            <MapPin className="size-3.5 animate-bounce text-brand-chartreuse" />
                            Buscando con OpenStreetMap...
                          </div>
                        ) : (
                          localidadesSugeridas.map((loc, idx) => (
                            <button
                              key={`${loc.ciudad}-${idx}`}
                              type="button"
                              onClick={() => {
                                setLocalidadSearch(loc.ciudad);
                                setAltaClubForm((f) => ({
                                  ...f,
                                  localidad: loc.ciudad,
                                  provincia: loc.provincia || f.provincia,
                                  latitud: loc.lat,
                                  longitud: loc.lon,
                                }));
                                setIsLocalidadOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-brand-chartreuse/10 text-gray-300 text-xs font-bold cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-1.5 text-white">
                                <MapPin className="size-3 text-brand-chartreuse shrink-0" />
                                <span>{loc.ciudad}</span>
                              </div>
                              <span className="text-[10px] text-gray-500 pl-4 font-medium">
                                {loc.detalle}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                    Cantidad de canchas *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={altaClubForm.canchas}
                    onChange={(e) =>
                      setAltaClubForm((f) => ({
                        ...f,
                        canchas: Number(e.target.value) || 1,
                      }))
                    }
                    className="w-full bg-brand-card border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-chartreuse/40"
                  />
                  
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void handleCrearClubRapido()}
                    disabled={creandoClub}
                    className="w-full bg-brand-chartreuse text-brand-black rounded-xl font-black text-xs uppercase py-2.5 cursor-pointer disabled:opacity-40"
                  >
                    {creandoClub ? "Creando…" : "Crear y listar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {selectedClubs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-white/10 rounded-2xl">
                Agregá al menos una sede y después marcá sus canchas.
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
                        {isActive ? " · Editando canchas" : ""}
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

        {/* ── 2. Canchas del torneo ── */}
        <div className="border-t border-white/10 pt-6 space-y-5">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="size-4 text-brand-chartreuse" />
            Canchas del torneo
          </h4>
          <p className="text-[11px] text-gray-500">
            Marcá qué canchas de la sede entran al torneo. El programador arma la
            grilla 08:00–21:00 en los días de competencia
            {fechasCompetencia.length > 0
              ? ` (${fechasCompetencia.length} jornada${fechasCompetencia.length === 1 ? "" : "s"})`
              : ""}
            .
          </p>

          {selectedClubs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8 border border-dashed border-white/10 rounded-2xl">
              Primero agregá una sede de juego.
            </p>
          ) : (
            <div className="space-y-5 p-4 bg-brand-input/40 rounded-2xl border border-white/10">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Sede
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
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs cursor-pointer ${
                            checked
                              ? "border-brand-chartreuse/40 bg-brand-chartreuse/10 text-white"
                              : "border-white/10 bg-black/20 text-gray-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={readOnly}
                            onChange={() => toggleCancha(id)}
                            className="rounded border-white/20"
                          />
                          <span className="font-semibold truncate">
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
                disabled={readOnly || saving || selectedCanchaIds.length === 0}
                onClick={() => void handleGuardarCanchasSede()}
                className="w-full sm:w-auto bg-brand-chartreuse text-brand-black px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-40 cursor-pointer"
              >
                {saving ? "Guardando…" : "Guardar canchas de la sede"}
              </button>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Contratadas ({canchasContratadas.length})
            </h5>
            {canchasContratadas.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6 border border-dashed border-white/10 rounded-2xl">
                Todavía no hay canchas asociadas al torneo.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {canchasContratadas.map((c) => (
                  <div
                    key={`${c.club_id}|${c.cancha_id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-brand-input px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {c.canchaNombre}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {c.clubNombre}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={readOnly || saving}
                      onClick={() =>
                        void handleQuitarCanchaTorneo(c.club_id, c.cancha_id)
                      }
                      className="text-gray-500 hover:text-red-400 p-1.5 cursor-pointer disabled:opacity-40"
                      aria-label="Quitar cancha"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
