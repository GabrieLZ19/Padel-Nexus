import React, { useState, useEffect } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { ClubesService } from "@/utils/services/clubes";
import { AsociacionesService, Asociacion } from "@/utils/services/asociaciones";
import { Torneo, Club } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { Calendar, Layers, Trophy, Settings2, Gift } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { getAlcancesPermitidos, CUPOS_ESTANDAR_FAP } from "@/utils/constants/fapApaRules";
import type { RolUsuario } from "@/utils/types/user.types";

interface Paso1DatosProps {
  torneo: Torneo;
  torneoId: string;
  setFeedbackModal: (modal: any) => void;
  triggerRefresh: () => void;
  setActiveTab: (tab: string) => void;
  readOnly?: boolean;
}

export const Paso1Datos = ({
  torneo,
  torneoId,
  setFeedbackModal,
  triggerRefresh,
  setActiveTab,
  readOnly = false,
}: Paso1DatosProps) => {
  const profile = useProfileStore((s) => s.profile);
  const userRole = (profile?.rol || "admin") as RolUsuario;

  // Información General
  const [editNombre, setEditNombre] = useState(torneo.nombre || "");
  const [editSede, setEditSede] = useState(torneo.club_id || "");
  const [editAlcance, setEditAlcance] = useState<string>(torneo.alcance || "Provincial");
  const [editAsociacion, setEditAsociacion] = useState<string>(
    (torneo as any).reglamento || (torneo as any).asociacion || "FAP",
  );
  const [editAsociacionId, setEditAsociacionId] = useState<string>((torneo as any).asociacion_id || "");
  const [asociacionesList, setAsociacionesList] = useState<Asociacion[]>([]);
  const [editFormato, setEditFormato] = useState<string>((torneo as any).formato || "Zonas + Llaves");

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

  // Carnet Federativo
  const [requiereCarnet, setRequiereCarnet] = useState<boolean>(
    Boolean((torneo as any).requiere_carnet_federativo),
  );
  const [montoCarnet, setMontoCarnet] = useState<string>(
    (torneo as any).monto_carnet ? String((torneo as any).monto_carnet) : "0",
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
    ]).then(([clubesRes, asocsRes]) => {
      if (isMounted) {
        setClubs(clubesRes.data || []);
        setAsociacionesList(asocsRes || []);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleSaveStep1 = async () => {
    // Validación por si lo ingresan a mano saltándose el calendario
    if (editFecha && editFechaFin) {
      const startDate = new Date(editFecha);
      const endDate = new Date(editFechaFin);

      if (endDate < startDate) {
        // IMPORTANTE: Usamos (prev) => para no borrar la función onClose del modal
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          type: "warning",
          title: "Fechas inválidas",
          description:
            "La fecha de finalización no puede ser anterior a la fecha de inicio del torneo.",
        }));
        return;
      }
    }

    const nuevosCupos = Number(editCupos);
    const cuposActuales = torneo.cupos_actuales || 0;

    if (nuevosCupos < cuposActuales) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Cupo no permitido",
        description: `No podés reducir el cupo a ${nuevosCupos} porque ya existen ${cuposActuales} participante(s) / pareja(s) inscripta(s).`,
      }));
      return;
    }

    try {
      setGuardandoDatos(true);
      const precioFinal = esGratis ? 0 : Math.max(0, Number(editPrecio) || 0);
      await TorneosService.update(torneoId, {
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
        reglamento: editAsociacion,
        asociacion_id: editAsociacionId || null,
        formato: editFormato,
      } as any);

      triggerRefresh();

      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "success",
        title: "¡Cambios guardados!",
        description:
          "La información básica del torneo ha sido actualizada con éxito.",
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
      setGuardandoDatos(false);
    }
  };

  return (
    <div className={`bg-brand-card border border-white/10 rounded-3xl p-6 space-y-8 shadow-xl ${readOnly ? "pointer-events-none opacity-60 select-none" : ""}`}>
      <div>
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
          Paso 1: Información General y Configuración
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Completá el nombre del torneo, fechas clave de la competencia y
          gestioná la inscripción.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
            Nombre del Torneo
          </label>
          <input
            type="text"
            value={editNombre}
            onChange={(e) => setEditNombre(e.target.value)}
            className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none"
            placeholder="Ej: Torneo FAP 5ª Categoría"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
            Centro de Cómputos (Fijo)
          </label>
          <div className="w-full bg-brand-input/50 border border-white/5 text-gray-300 p-3.5 rounded-xl font-bold text-sm cursor-not-allowed flex items-center justify-between">
            <span>
              {clubs.find((c) => String(c.id) === String(editSede))?.nombre ||
                torneo.clubes?.nombre ||
                "Centro de Cómputos Oficial"}
            </span>
            <span className="text-[10px] bg-brand-chartreuse/10 text-brand-chartreuse px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold">
              No modificable
            </span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
            Alcance del Torneo
          </label>
          <CustomDropdown
            value={editAlcance}
            onChange={setEditAlcance}
            options={getAlcancesPermitidos(userRole)
              .filter((a) => !a.disabled)
              .map((a) => ({ value: a.value, label: a.label }))}
            placeholder="Seleccionar Alcance..."
          />
          {(userRole === "admin" || userRole === "admin_club") && (
            <p className="text-[10px] text-yellow-500/80 mt-1.5 font-semibold">
              Tu perfil de Club solo permite organizar torneos Locales, Regionales o Provinciales.
            </p>
          )}
          {userRole === "admin_provincial" && (
            <p className="text-[10px] text-yellow-500/80 mt-1.5 font-semibold">
              Tu perfil Provincial no permite organizar torneos Nacionales.
            </p>
          )}
        </div>
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
            Reglamento Oficial de Competencia
          </label>
          <CustomDropdown
            value={editAsociacion}
            onChange={setEditAsociacion}
            options={[
              { value: "FAP", label: "FAP (Federación Argentina de Pádel)" },
              { value: "APA", label: "APA (Asociación de Pádel Argentina)" },
              { value: "Amateur", label: "Amateur / Independiente" },
            ]}
            placeholder="Seleccionar Reglamento..."
          />
          <p className="text-[10px] text-gray-500 mt-1.5">
            El reglamento determina los cortes de edad, categorías y siembras del Paso 3.
          </p>
        </div>

        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
            Asociación Organizadora
          </label>
          <CustomDropdown
            value={editAsociacionId}
            onChange={setEditAsociacionId}
            options={asociacionesList
              .filter((a) => a.estado === "activo" || (a.estado !== "inactivo" && a.estado !== "pendiente"))
              .map((a) => ({
                value: a.id,
                label: `${a.nombre} (${a.sigla || "SF"}) — ${a.provincia}`,
              }))}
            placeholder="-- Seleccionar Asociación del Padrón --"
          />
          <p className="text-[10px] text-gray-500 mt-1.5">
            Asociación del padrón oficial encargada del torneo.
          </p>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
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
          <p className="text-[10px] text-gray-500 mt-1.5">
            {editFormato === "Eliminatoria Directa"
              ? "Los partidos comienzan directamente en llaves (32avos, 16avos, Octavos…). Sin fase de grupos."
              : "Se juegan primero zonas de grupos y luego los clasificados pasan a la llave de eliminación."}
          </p>
        </div>
      </div>

      {/* SECCIÓN FECHAS */}
      <div className="border-t border-white/5 pt-6 space-y-4">
        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="size-4" /> Cronograma de Fechas
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
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
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={editFecha}
              onChange={(e) => {
                setEditFecha(e.target.value);
                // Si la nueva fecha de inicio es mayor que la de fin, reseteamos la de fin
                if (editFechaFin && e.target.value > editFechaFin) {
                  setEditFechaFin("");
                }
              }}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
              Fecha de Finalización
            </label>
            <input
              type="date"
              value={editFechaFin}
              min={editFecha || undefined} // MAGIA ACÁ: bloquea días anteriores en el calendario
              disabled={!editFecha} // Deshabilita el input si aún no hay fecha de inicio
              onChange={(e) => setEditFechaFin(e.target.value)}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
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
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">
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
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">
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
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">
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
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
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
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
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
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
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
          onClick={handleSaveStep1}
          disabled={readOnly || guardandoDatos || !editNombre || !editFecha || !editSede}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
        >
          {readOnly ? "Modo Lectura (En curso)" : guardandoDatos ? "Guardando..." : "Guardar Cambios"}
        </button>
        <button
          onClick={() => setActiveTab("logos")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-white/10 transition-all cursor-pointer"
        >
          Siguiente Paso: Logos
        </button>
      </div>
    </div>
  );
};
