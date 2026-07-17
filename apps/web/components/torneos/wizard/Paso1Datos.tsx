import React, { useState, useEffect } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { ClubesService } from "@/utils/services/clubes";
import { Torneo, Club } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { Calendar, Layers, Trophy, Settings2, Gift } from "lucide-react";

interface Paso1DatosProps {
  torneo: Torneo;
  torneoId: string;
  setFeedbackModal: (modal: any) => void;
  triggerRefresh: () => void;
  setActiveTab: (tab: string) => void;
}

export const Paso1Datos = ({
  torneo,
  torneoId,
  setFeedbackModal,
  triggerRefresh,
  setActiveTab,
}: Paso1DatosProps) => {
  // Información General
  const [editNombre, setEditNombre] = useState(torneo.nombre || "");
  const [editSede, setEditSede] = useState(torneo.club_id || "");
  const [editAlcance, setEditAlcance] = useState<string>(torneo.alcance || "Provincial");
  const [editAsociacion, setEditAsociacion] = useState<string>((torneo as any).asociacion || "FAP");

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
    ClubesService.getAll()
      .then((res) => {
        if (isMounted) setClubs(res.data || []);
      })
      .catch((err) => console.error("Error al cargar clubes:", err));

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

    try {
      setGuardandoDatos(true);
      await TorneosService.update(torneoId, {
        nombre: editNombre,
        fecha: editFecha ? editFecha : null,
        fecha_cierre_inscripcion: editFechaCierre
          ? `${editFechaCierre}T12:00:00-03:00`
          : null,
        fecha_fin: editFechaFin ? `${editFechaFin}T12:00:00-03:00` : null,
        precio_inscripcion: esGratis ? 0 : Number(editPrecio),
        premio_1: premioPrimero || null,
        premio_2: premioSegundo || null,
        premio_3: premioTercero || null,
        club_id: editSede === "" ? null : editSede,
        cupos_maximos: Number(editCupos),
        canchas_disponibles: selectedCanchas.length,
        alcance: editAlcance,
        asociacion: editAsociacion,
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
    <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 space-y-8">
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
            placeholder="Ej: Torneo Nacional FAP"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
            Club Organizador / Sede Principal
          </label>
          <CustomDropdown
            value={editSede}
            onChange={setEditSede}
            options={clubs.map((c) => ({
              value: String(c.id),
              label: c.nombre,
            }))}
            placeholder="Seleccionar Club..."
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
            Alcance del Torneo
          </label>
          <CustomDropdown
            value={editAlcance}
            onChange={setEditAlcance}
            options={[
              { value: "Local", label: "Local" },
              { value: "Provincial", label: "Provincial" },
              { value: "Nacional", label: "Nacional" },
            ]}
            placeholder="Seleccionar Alcance..."
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">
            Reglamento / Asociación
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

              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">
                  Cupos Máximos (Parejas)
                </label>
                <input
                  type="number"
                  value={editCupos}
                  onChange={(e) => setEditCupos(e.target.value)}
                  className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none"
                  placeholder="Ej: 16"
                  min="4"
                  max="128"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 bg-black/20 p-5 rounded-2xl border border-white/5 space-y-5">
            <h5 className="text-xs text-white font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Gift className="size-4 text-brand-chartreuse" /> Recompensas a
              Repartir
            </h5>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-yellow-500/80 font-black uppercase tracking-wider block mb-2">
                  1er Puesto (Campeón)
                </label>
                <input
                  type="text"
                  value={premioPrimero}
                  onChange={(e) => setPremioPrimero(e.target.value)}
                  className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-yellow-500/50 outline-none"
                  placeholder="Ej: $50.000 + Paleta + Trofeo"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block mb-2">
                  2do Puesto (Subcampeón)
                </label>
                <input
                  type="text"
                  value={premioSegundo}
                  onChange={(e) => setPremioSegundo(e.target.value)}
                  className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-gray-400/50 outline-none"
                  placeholder="Ej: $20.000 + Indumentaria"
                />
              </div>
              <div>
                <label className="text-[10px] text-orange-400/80 font-black uppercase tracking-wider block mb-2">
                  3er Puesto
                </label>
                <input
                  type="text"
                  value={premioTercero}
                  onChange={(e) => setPremioTercero(e.target.value)}
                  className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-orange-400/50 outline-none"
                  placeholder="Ej: Medalla + Grip"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DISPONIBILIDAD DE CANCHAS */}
      {editSede && (
        <div className="border-t border-white/5 pt-6 space-y-4">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Layers className="size-4" /> Canchas Disponibles de la Sede (
            {selectedCanchas.length} seleccionadas)
          </h4>
          {canchasClub.length === 0 ? (
            <p className="text-xs text-gray-500">
              Este club no tiene canchas registradas.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {canchasClub.map((cancha) => {
                const isSelected = selectedCanchas.includes(String(cancha.id));
                return (
                  <div
                    key={cancha.id}
                    onClick={() => handleToggleCancha(String(cancha.id))}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-brand-chartreuse/10 border-brand-chartreuse/40 text-white"
                        : "bg-black/20 border-white/5 text-gray-400 hover:border-white/10"
                    }`}
                  >
                    <div>
                      <p className="font-extrabold text-sm text-white">
                        {cancha.nombre || "Sin Nombre"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {cancha.tipo_suelo || "Suelo no especificado"} ·{" "}
                        {cancha.techada ? "Techada" : "Al aire libre"}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="size-5 rounded border-white/10 bg-black/50 text-brand-chartreuse focus:ring-brand-chartreuse accent-brand-chartreuse cursor-pointer transition-all"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        <button
          onClick={handleSaveStep1}
          disabled={guardandoDatos || !editNombre || !editFecha || !editSede}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
        >
          {guardandoDatos ? "Guardando..." : "Guardar Cambios"}
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
