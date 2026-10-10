import React, { useState, useEffect, useRef } from "react";
import { useNumeroPaso } from "@/components/torneos/wizard/NumeroPasoContext";
import { TorneosService } from "@/utils/services/torneos";
import { ClubesService } from "@/utils/services/clubes";
import { AsociacionesService, Asociacion } from "@/utils/services/asociaciones";
import { FederacionesService, Federacion } from "@/utils/services/federaciones";
import { Torneo, Club } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { Calendar, Trophy, Settings2, Gift, Info } from "lucide-react";
import { sileo } from "sileo";
import { useProfileStore } from "@/store/useProfileStore";
import {
  getAlcancesPermitidos,
  getReglamentosPermitidos,
  filtrarAsociacionesOrganizadorasFap,
  debeForzarOrganizadorFap,
  esAlcanceSinEntidadOrganizadora,
  puedeUsarReglamentoAmateur,
  reglamentoTorneo,
  type ReglamentoTorneo,
} from "@/utils/constants/fapApaRules";
import { esRolFederacionNacional } from "@/utils/auth/roles";
import type { RolUsuario } from "@/utils/types/user.types";
import type { OnTorneoUpdated, RegisterSaveHandler } from "./types";

function AyudaCampo({ texto }: { texto: string }) {
  return (
    <span className="relative inline-flex group/ayuda">
      <button
        type="button"
        aria-label={texto}
        className="inline-flex size-5 items-center justify-center rounded-full text-brand-ayuda hover:text-white cursor-help"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 max-w-[70vw] rounded-lg border border-white/10 bg-brand-card px-2.5 py-2 text-left text-xs font-medium normal-case tracking-normal text-white shadow-lg group-hover/ayuda:block group-focus-within/ayuda:block"
      >
        {texto}
      </span>
    </span>
  );
}

const FED_PREFIX = "fed:";
const ASO_PREFIX = "aso:";

function organizadorValue(kind: "fed" | "aso", id: string) {
  return kind === "fed" ? `${FED_PREFIX}${id}` : `${ASO_PREFIX}${id}`;
}

function normalizarProvincia(valor?: string | null) {
  return (valor || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function asociacionDeLaProvincia(
  asociaciones: Asociacion[],
  provincia?: string | null,
) {
  const clave = normalizarProvincia(provincia);
  if (!clave) return undefined;
  return asociaciones.find(
    (item) => normalizarProvincia(item.provincia) === clave,
  );
}

function organizadorFromTorneo(torneo: Torneo): string {
  const asoId = torneo.asociacion_id;
  const fedId = torneo.federacion_id;
  // La asociación provincial organizadora tiene prioridad sobre federación vinculada
  if (asoId) return organizadorValue("aso", asoId);
  if (fedId) return organizadorValue("fed", fedId);
  return "";
}

function reglamentoFromTorneo(torneo: Torneo, userRole: RolUsuario): ReglamentoTorneo {
  const raw = reglamentoTorneo(torneo);
  if (raw === "Amateur") {
    if (!puedeUsarReglamentoAmateur(userRole)) return "FAP";
    if (!esAlcanceSinEntidadOrganizadora(torneo.alcance)) return "FAP";
  }
  return raw;
}

function parseOrganizador(value: string): {
  federacionId: string | null;
  asociacionId: string | null;
} {
  if (value.startsWith(FED_PREFIX)) {
    return { federacionId: value.slice(FED_PREFIX.length), asociacionId: null };
  }
  if (value.startsWith(ASO_PREFIX)) {
    return { federacionId: null, asociacionId: value.slice(ASO_PREFIX.length) };
  }
  // Legacy: bare UUID = asociación
  if (value) return { federacionId: null, asociacionId: value };
  return { federacionId: null, asociacionId: null };
}

interface Paso1DatosProps {
  torneo: Torneo;
  torneoId: string;
  setFeedbackModal: (modal: any) => void;
  triggerRefresh: () => void;
  setActiveTab: (tab: string) => void | Promise<void>;
  registerSaveHandler?: RegisterSaveHandler;
  onTorneoUpdated?: OnTorneoUpdated;
  readOnly?: boolean;
}

export const Paso1Datos = ({
  torneo,
  torneoId,
  setFeedbackModal,
  triggerRefresh,
  setActiveTab,
  registerSaveHandler,
  onTorneoUpdated,
  readOnly = false,
}: Paso1DatosProps) => {
  const numeroPaso = useNumeroPaso("edit");
  const profile = useProfileStore((s) => s.profile);
  const userRole = (profile?.rol || "admin") as RolUsuario;

  // Información General
  const [editNombre, setEditNombre] = useState(torneo.nombre || "");
  const [editSede, setEditSede] = useState(torneo.club_id || "");
  const [erroresCampo, setErroresCampo] = useState<
    Partial<Record<"nombre" | "inicio" | "fin" | "sede", string>>
  >({});
  const nombreRef = useRef<HTMLInputElement>(null);
  const inicioRef = useRef<HTMLInputElement>(null);
  const finRef = useRef<HTMLInputElement>(null);
  const sedeRef = useRef<HTMLDivElement>(null);
  const [editAlcance, setEditAlcance] = useState<string>(() => {
    const inicial = torneo.alcance || "Provincial";
    // Federación nacional no usa Local/Privado
    if (
      esRolFederacionNacional(userRole) &&
      /local|privado/i.test(String(inicial))
    ) {
      return "Provincial";
    }
    return inicial;
  });
  const [editAsociacion, setEditAsociacion] = useState<string>(() =>
    reglamentoFromTorneo(torneo, userRole),
  );
  const [asociacionesList, setAsociacionesList] = useState<Asociacion[]>([]);
  const [federacionesList, setFederacionesList] = useState<Federacion[]>([]);
  const [fapFederacionId, setFapFederacionId] = useState<string>("");
  const [editOrganizador, setEditOrganizador] = useState<string>(() =>
    organizadorFromTorneo(torneo),
  );
  const [editFormato, setEditFormato] = useState<string>(
    (torneo as { formato?: string }).formato || "Zonas + Llaves",
  );

  const forzarFap = debeForzarOrganizadorFap(editAlcance);
  const sinEntidadOrganizadora = esAlcanceSinEntidadOrganizadora(editAlcance);
  const organizadorDeshabilitado = forzarFap || sinEntidadOrganizadora;
  const reglamentosDisponibles = getReglamentosPermitidos(
    userRole,
    editAlcance,
  );
  const asociacionesOrganizadoras = filtrarAsociacionesOrganizadorasFap(
    asociacionesList,
  );
  const organizadorOptions = [
    ...federacionesList.map((f) => ({
      value: organizadorValue("fed", f.id),
      label: `${f.sigla || "FED"} — ${f.nombre}`,
    })),
    ...asociacionesOrganizadoras.map((a) => ({
      value: organizadorValue("aso", a.id),
      label: `${a.nombre} (${a.sigla || "SF"}) — ${a.provincia}`,
    })),
  ];

  // Fechas
  const [editFecha, setEditFecha] = useState(
    torneo.fecha ? torneo.fecha.split("T")[0] : "",
  );
  const [editFechaCierre, setEditFechaCierre] = useState(
    (torneo as any).fecha_cierre_inscripcion
      ? (torneo as any).fecha_cierre_inscripcion.split("T")[0]
      : "",
  );
  const [editFechaFin, setEditFechaFin] = useState(
    (torneo as any).fecha_fin ? (torneo as any).fecha_fin.split("T")[0] : "",
  );

  // Configuración de Inscripción y Premios
  const [esGratis, setEsGratis] = useState(
    (torneo as any).es_gratis !== undefined
      ? (torneo as any).es_gratis
      : Number(torneo.precio_inscripcion) === 0,
  );
  const [editPrecio, setEditPrecio] = useState(
    torneo.precio_inscripcion ? String(torneo.precio_inscripcion) : "",
  );
  const [editCupos, setEditCupos] = useState(
    torneo.cupos_maximos ? String(torneo.cupos_maximos) : "16",
  );
  const [premioPrimero, setPremioPrimero] = useState(
    torneo.premio_1 || "",
  );
  const [premioSegundo, setPremioSegundo] = useState(
    torneo.premio_2 || "",
  );
  const [premioTercero, setPremioTercero] = useState(
    torneo.premio_3 || "",
  );

  // Canchas y Clubes
  const [clubs, setClubs] = useState<Club[]>([]);
  const [canchasClub, setCanchasClub] = useState<any[]>([]);
  const [selectedCanchas, setSelectedCanchas] = useState<string[]>([]);
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      ClubesService.getAll().catch(() => ({ data: [], total: 0 })),
      AsociacionesService.getAll().catch(() => []),
      FederacionesService.getAll().catch(() => []),
    ]).then(([clubesRes, asocsRes, fedsRes]) => {
      if (!isMounted) return;
      setClubs(clubesRes.data || []);
      setAsociacionesList(asocsRes || []);
      const feds = fedsRes || [];
      setFederacionesList(feds);
      const fap =
        feds.find((f) => (f.sigla || "").toUpperCase() === "FAP") ||
        feds.find((f) => /federaci[oó]n argentina/i.test(f.nombre || ""));
      if (fap?.id) setFapFederacionId(fap.id);
      if (!editOrganizador) {
        const provincial =
          torneo.alcance === "Provincial" || torneo.alcance === "Regional";
        const deProvincia = provincial
          ? asociacionDeLaProvincia(asocsRes || [], torneo.clubes?.provincia)
          : undefined;
        if (deProvincia) {
          setEditOrganizador(organizadorValue("aso", deProvincia.id));
        } else if (fap?.id) {
          setEditOrganizador(organizadorValue("fed", fap.id));
        }
      }
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial
  }, []);

  // Sincronizar con datos persistidos tras guardar / refrescar torneo
  useEffect(() => {
    setEditAsociacion(reglamentoFromTorneo(torneo, userRole));
    const org = organizadorFromTorneo(torneo);
    if (org) {
      setEditOrganizador(org);
      return;
    }
    const provincial =
      torneo.alcance === "Provincial" || torneo.alcance === "Regional";
    const deProvincia = provincial
      ? asociacionDeLaProvincia(asociacionesList, torneo.clubes?.provincia)
      : undefined;
    if (deProvincia) {
      setEditOrganizador(organizadorValue("aso", deProvincia.id));
    } else if (fapFederacionId) {
      setEditOrganizador(organizadorValue("fed", fapFederacionId));
    }
  }, [
    torneo.id,
    torneo.reglamento,
    torneo.asociacion,
    torneo.asociacion_id,
    torneo.federacion_id,
    torneo.alcance,
    torneo.clubes?.provincia,
    asociacionesList,
    fapFederacionId,
    userRole,
  ]);

  // Alcance Nacional ⇒ organizadora FAP + reglamento FAP
  useEffect(() => {
    if (!forzarFap) return;
    if (fapFederacionId) {
      setEditOrganizador(organizadorValue("fed", fapFederacionId));
    }
    if (editAsociacion !== "FAP") {
      setEditAsociacion("FAP");
    }
  }, [forzarFap, fapFederacionId, editAsociacion]);

  // Amateur solo en Local/Privado (y roles permitidos)
  useEffect(() => {
    if (editAsociacion !== "Amateur") return;
    const amateurOk =
      puedeUsarReglamentoAmateur(userRole) && sinEntidadOrganizadora;
    if (!amateurOk) {
      setEditAsociacion("FAP");
    }
  }, [editAsociacion, userRole, sinEntidadOrganizadora]);

  useEffect(() => {
    if (!editSede) {
      setCanchasClub([]);
      setSelectedCanchas([]);
      return;
    }
    ClubesService.getCanchas(editSede)
      .then((data) => {
        const list = data || [];
        setCanchasClub(list);
        const count = torneo.canchas_disponibles || 0;
        setSelectedCanchas(list.slice(0, count).map((c: any) => String(c.id)));
      })
      .catch((err) => console.error("Error al cargar canchas del club:", err));
  }, [editSede, torneo.canchas_disponibles]);

  const handleToggleCancha = (id: string) => {
    setSelectedCanchas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSaveStep1 = async (options?: {
    silent?: boolean;
  }): Promise<boolean> => {
    if (readOnly) return true;

    // Validación por si lo ingresan a mano saltándose el calendario
    if (editFecha && editFechaFin && editFechaFin < editFecha) {
      setErroresCampo({
        fin: "La fecha de finalización no puede ser anterior a la de inicio.",
      });
      finRef.current?.focus();
      return false;
    }

    const nuevosCupos = Number(editCupos);
    const cuposActuales = torneo.cupos_actuales || 0;

    if (nuevosCupos < cuposActuales) {
      sileo.warning({
        title: "Cupo no permitido",
        description: `No podés reducir el cupo a ${nuevosCupos} porque ya existen ${cuposActuales} participante(s) / pareja(s) inscripta(s).`,
      });
      return false;
    }

    const incompletos: Partial<Record<"nombre" | "inicio" | "fin" | "sede", string>> = {};
    if (!editNombre.trim()) incompletos.nombre = "Completá el nombre del torneo.";
    if (!editFecha) incompletos.inicio = "Completá la fecha de inicio.";
    if (!editFechaFin) incompletos.fin = "Completá la fecha de finalización.";
    if (!editSede) incompletos.sede = "Elegí el centro de cómputos.";
    if (Object.keys(incompletos).length > 0) {
      setErroresCampo(incompletos);
      if (incompletos.nombre) nombreRef.current?.focus();
      else if (incompletos.inicio) inicioRef.current?.focus();
      else if (incompletos.fin) finRef.current?.focus();
      else sedeRef.current?.querySelector("button")?.focus();
      return false;
    }
    setErroresCampo({});

    try {
      setGuardandoDatos(true);
      const precioFinal = esGratis ? 0 : Math.max(0, Number(editPrecio) || 0);
      const orgParsed = parseOrganizador(
        sinEntidadOrganizadora
          ? ""
          : forzarFap && fapFederacionId
            ? organizadorValue("fed", fapFederacionId)
            : editOrganizador,
      );
      const reglamentoFinal = forzarFap
        ? "FAP"
        : editAsociacion === "Amateur" && !sinEntidadOrganizadora
          ? "FAP"
          : (editAsociacion as ReglamentoTorneo);

      const federacionIdFinal = sinEntidadOrganizadora
        ? null
        : orgParsed.federacionId;
      const asociacionIdFinal = sinEntidadOrganizadora
        ? null
        : orgParsed.federacionId
          ? null
          : orgParsed.asociacionId;

      const updated = await TorneosService.update(torneoId, {
        nombre: editNombre,
        fecha: editFecha ? editFecha : null,
        fecha_cierre_inscripcion: editFechaCierre
          ? `${editFechaCierre}T12:00:00-03:00`
          : null,
        fecha_fin: editFechaFin ? `${editFechaFin}T12:00:00-03:00` : null,
        es_gratis: esGratis,
        precio_inscripcion: precioFinal,
        premio_1: premioPrimero || null,
        premio_2: premioSegundo || null,
        premio_3: premioTercero || null,
        club_id: editSede === "" ? null : editSede,
        cupos_maximos: Number(editCupos),
        canchas_disponibles: selectedCanchas.length,
        alcance: editAlcance,
        reglamento: reglamentoFinal,
        asociacion_id: asociacionIdFinal,
        federacion_id: federacionIdFinal,
        formato: editFormato,
        ...( ["borrador", "cerrado"].includes(
          String(torneo.estado || "").toLowerCase(),
        )
          ? { estado: "Inscripción" }
          : {}),
      } as any);

      // Actualizar padre de inmediato (evita estado stale al volver al paso).
      // En silent no hacemos refresh completo: evita carrera con el remount.
      onTorneoUpdated?.(updated);
      if (!options?.silent) {
        triggerRefresh();
        sileo.success({
          title: "Cambios guardados",
          description: "La información básica del torneo quedó actualizada.",
        });
      }
      return true;
    } catch (e: any) {
      sileo.error({
        title: "Error al guardar",
        description: e.message || "No se pudieron guardar los cambios.",
      });
      return false;
    } finally {
      setGuardandoDatos(false);
    }
  };

  const saveRef = useRef(handleSaveStep1);
  saveRef.current = handleSaveStep1;

  useEffect(() => {
    if (!registerSaveHandler) return;
    registerSaveHandler(() => saveRef.current({ silent: true }));
    return () => registerSaveHandler(null);
  }, [registerSaveHandler]);

  return (
    <div className={`bg-brand-card border border-white/10 rounded-3xl p-6 space-y-8 shadow-xl ${readOnly ? "pointer-events-none opacity-60 select-none" : ""}`}>
      <div>
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
          Paso {numeroPaso}: Información General y Configuración
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Completá el nombre del torneo, fechas clave de la competencia y
          gestioná la inscripción.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
            Nombre del Torneo
          </label>
          <input
            ref={nombreRef}
            type="text"
            value={editNombre}
            onChange={(e) => {
              setEditNombre(e.target.value);
              if (e.target.value.trim()) {
                setErroresCampo((prev) => ({ ...prev, nombre: undefined }));
              }
            }}
            aria-invalid={Boolean(erroresCampo.nombre)}
            className={`w-full bg-brand-input border text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none ${
              erroresCampo.nombre ? "border-red-500/70" : "border-white/10"
            }`}
            placeholder="Ej: Torneo FAP 5ª Categoría"
          />
          {erroresCampo.nombre ? (
            <p className="mt-1.5 text-xs text-red-400" role="alert">
              {erroresCampo.nombre}
            </p>
          ) : null}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider">
              Centro de Cómputos
            </label>
            <AyudaCampo texto="Punto de mando de delegados y fiscal general." />
          </div>
          <div ref={sedeRef}>
          <CustomDropdown
            value={editSede}
            onChange={(valor) => {
              setEditSede(valor);
              if (valor) setErroresCampo((prev) => ({ ...prev, sede: undefined }));
            }}
            hasError={Boolean(erroresCampo.sede)}
            options={clubs.map((c) => ({
              value: String(c.id),
              label: c.nombre,
            }))}
            placeholder={
              clubs.length === 0
                ? "No hay clubes disponibles"
                : "Seleccionar centro de cómputos..."
            }
            disabled={clubs.length === 0}
          />
          {erroresCampo.sede ? (
            <p className="mt-1.5 text-xs text-red-400" role="alert">
              {erroresCampo.sede}
            </p>
          ) : null}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider">
              Alcance del Torneo
            </label>
            {(userRole === "admin" || userRole === "admin_club") && (
              <AyudaCampo texto="Tu perfil de Club solo permite organizar torneos Locales, Privados, Regionales, Provinciales o Clasificatorios." />
            )}
            {userRole === "admin_provincial" && (
              <AyudaCampo texto="Tu perfil Provincial no permite organizar torneos Nacionales." />
            )}
            {esRolFederacionNacional(userRole) && (
              <AyudaCampo texto="La federación nacional no organiza torneos Locales ni Privados." />
            )}
          </div>
          <CustomDropdown
            value={editAlcance}
            onChange={setEditAlcance}
            options={getAlcancesPermitidos(userRole)
              .filter((a) => !a.disabled)
              .map((a) => ({ value: a.value, label: a.label }))}
            placeholder="Seleccionar Alcance..."
          />
        </div>
        <div>
          <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
            Reglamento Oficial de Competencia
          </label>
          <CustomDropdown
            value={editAsociacion}
            onChange={(val) => setEditAsociacion(val as ReglamentoTorneo)}
            options={reglamentosDisponibles}
            placeholder="Seleccionar Reglamento..."
            disabled={forzarFap}
          />
        </div>

        <div>
          <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
            Entidad Organizadora
          </label>
          <CustomDropdown
            value={
              sinEntidadOrganizadora
                ? ""
                : forzarFap && fapFederacionId
                  ? organizadorValue("fed", fapFederacionId)
                  : editOrganizador
            }
            onChange={setEditOrganizador}
            options={organizadorOptions}
            placeholder={
              sinEntidadOrganizadora
                ? "Club sede / organizador del torneo"
                : "-- FAP o asociación del ecosistema --"
            }
            disabled={organizadorDeshabilitado}
          />
        </div>
        <div>
          <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
            Formato del Torneo
          </label>
          <CustomDropdown
            value={editFormato}
            onChange={setEditFormato}
            options={
              (userRole === "admin_club" || userRole === "admin")
                ? [
                    { value: "Zonas + Llaves", label: "Zonas + Llaves" },
                    { value: "Eliminatoria Directa", label: "Eliminatoria Directa (sin fase de grupos)" },
                    { value: "Todos contra Todos", label: "Todos contra Todos (Round Robin)" },
                    { value: "Super 8", label: "Super 8" },
                    { value: "Super 12", label: "Super 12" },
                    { value: "Americano", label: "Americano" },
                    { value: "Suma 8", label: "Suma 8" },
                    { value: "Suma 12", label: "Suma 12" },
                  ]
                : [
                    { value: "Zonas + Llaves", label: "Zonas + Llaves" },
                    { value: "Eliminatoria Directa", label: "Eliminatoria Directa (sin fase de grupos)" },
                  ]
            }
            placeholder="Seleccionar Formato..."
          />
        </div>
      </div>

      {/* SECCIÓN FECHAS */}
      <div className="border-t border-white/5 pt-6 space-y-4">
        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="size-4" /> Cronograma de Fechas
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
              Cierre de Inscripción
            </label>
            <input
              type="date"
              value={editFechaCierre}
              max={editFecha || undefined} // No deja elegir un cierre posterior al inicio del torneo
              onChange={(e) => setEditFechaCierre(e.target.value)}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
              Fecha de Inicio
            </label>
            <input
              ref={inicioRef}
              type="date"
              value={editFecha}
              aria-invalid={Boolean(erroresCampo.inicio)}
              onChange={(e) => {
                setEditFecha(e.target.value);
                if (e.target.value) {
                  setErroresCampo((prev) => ({ ...prev, inicio: undefined }));
                }
                if (editFechaFin && e.target.value > editFechaFin) {
                  setEditFechaFin("");
                }
              }}
              className={`w-full bg-brand-input border text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none cursor-pointer ${
                erroresCampo.inicio ? "border-red-500/70" : "border-white/10"
              }`}
            />
            {erroresCampo.inicio ? (
              <p className="mt-1.5 text-xs text-red-400" role="alert">
                {erroresCampo.inicio}
              </p>
            ) : null}
          </div>
          <div>
            <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
              Fecha de Finalización *
            </label>
            <input
              ref={finRef}
              type="date"
              value={editFechaFin}
              min={editFecha || undefined}
              disabled={!editFecha}
              aria-invalid={Boolean(erroresCampo.fin)}
              onChange={(e) => {
                setEditFechaFin(e.target.value);
                if (e.target.value) {
                  setErroresCampo((prev) => ({ ...prev, fin: undefined }));
                }
              }}
              className={`w-full bg-brand-input border text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                erroresCampo.fin ? "border-red-500/70" : "border-white/10"
              }`}
            />
            {erroresCampo.fin ? (
              <p className="mt-1.5 text-xs text-red-400" role="alert">
                {erroresCampo.fin}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* CONFIGURACIÓN Y PREMIOS */}
      <div className="border-t border-white/5 pt-6 space-y-6">
        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Trophy className="size-4" /> Inscripción y Premios
        </h4>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 bg-black/20 p-5 rounded-2xl border border-white/5 space-y-5">
            <h5 className="text-xs text-white font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Settings2 className="size-4 text-brand-chartreuse" /> Ajustes de
              Ingreso
            </h5>

            <div className="space-y-5">
              <div>
                <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
                  Tipo de Torneo
                </label>
                <CustomDropdown
                  value={esGratis ? "gratis" : "pago"}
                  onChange={(val) => setEsGratis(val === "gratis")}
                  options={[
                    { value: "pago", label: "De Pago" },
                    { value: "gratis", label: "Gratuito" },
                  ]}
                  placeholder="Seleccionar..."
                />
              </div>

              {!esGratis && (
                <div>
                  <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
                    Precio por Pareja / Jugador ($)
                  </label>
                  <input
                    type="number"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                    placeholder="0"
                  />
                </div>
              )}
                <div>
                <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-2">
                  Cupos Máximos (Parejas)
                </label>
                <CustomDropdown
                  value={editCupos}
                  onChange={setEditCupos}
                  options={[
                    { value: "6", label: "6 parejas" },
                    { value: "8", label: "8 parejas" },
                    { value: "12", label: "12 parejas" },
                    { value: "16", label: "16 parejas" },
                    { value: "24", label: "24 parejas" },
                    { value: "32", label: "32 parejas" },
                    { value: "64", label: "64 parejas" },
                  ]}
                  placeholder="Seleccionar Máximo de Parejas..."
                />
              </div>
            </div>
          </div>

          <div className="flex-1 bg-black/20 p-5 rounded-2xl border border-white/5 space-y-5">
            <h5 className="text-xs text-white font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Gift className="size-4 text-brand-chartreuse" /> Premiación
            </h5>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-1">
                  Premio 1° Puesto (Campeones)
                </label>
                <input
                  type="text"
                  value={premioPrimero}
                  onChange={(e) => setPremioPrimero(e.target.value)}
                  className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                  placeholder="Ej: Trofeos + $100.000 + Paletas"
                />
              </div>

              <div>
                <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-1">
                  Premio 2° Puesto (Subcampeones)
                </label>
                <input
                  type="text"
                  value={premioSegundo}
                  onChange={(e) => setPremioSegundo(e.target.value)}
                  className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                  placeholder="Ej: Trofeos + $50.000"
                />
              </div>

              <div>
                <label className="text-xs text-brand-ayuda font-bold uppercase tracking-wider block mb-1">
                  Premio 3° Puesto / Menciones
                </label>
                <input
                  type="text"
                  value={premioTercero}
                  onChange={(e) => setPremioTercero(e.target.value)}
                  className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
                  placeholder="Ej: Trofeos / Menciones"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        <button
          onClick={() => void handleSaveStep1()}
          disabled={readOnly || guardandoDatos || !editNombre || !editFecha || !editSede}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
        >
          {readOnly ? "Modo Lectura" : guardandoDatos ? "Guardando..." : "Guardar Cambios"}
        </button>
        <button
          onClick={() => void setActiveTab("logos")}
          disabled={guardandoDatos}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40"
        >
          Siguiente Paso: Logos
        </button>
      </div>
    </div>
  );
};
