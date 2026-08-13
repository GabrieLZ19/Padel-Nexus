"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Search,
  UserCheck,
  Trash2,
  Star,
} from "lucide-react";
import { FiscalesService, Fiscal } from "@/utils/services/fiscales";
import { Torneo } from "@/utils/types";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";

interface Paso6FiscalesProps {
  torneo: Torneo;
  torneoId: string;
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  readOnly?: boolean;
}

type RolFiscalTorneo = "general" | "auxiliar";

function buildRolesMap(list: Fiscal[]): Record<string, RolFiscalTorneo> {
  const roles: Record<string, RolFiscalTorneo> = {};
  list.forEach((f) => {
    roles[f.id] = f.rol_torneo === "general" ? "general" : "auxiliar";
  });
  return roles;
}

export const Paso6Fiscales = ({
  torneo,
  torneoId,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
  readOnly = false,
}: Paso6FiscalesProps) => {
  const [fiscalesTorneo, setFiscalesTorneo] = useState<Fiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDni, setSearchDni] = useState("");
  const [foundFiscal, setFoundFiscal] = useState<Fiscal | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [asignando, setAsignando] = useState(false);
  const [rolAlAsignar, setRolAlAsignar] =
    useState<RolFiscalTorneo>("auxiliar");

  const [todosLosFiscales, setTodosLosFiscales] = useState<Fiscal[]>([]);

  const colegioEntidadId =
    (torneo as { federacion_id?: string | null; asociacion_id?: string | null })
      .federacion_id ||
    (torneo as { asociacion_id?: string | null }).asociacion_id ||
    null;

  useEffect(() => {
    fetchFiscalesTorneo();
    FiscalesService.getAll(colegioEntidadId)
      .then((res) => setTodosLosFiscales(res || []))
      .catch((err) => console.error("Error al cargar padrón de fiscales:", err));
  }, [torneoId, colegioEntidadId]);

  const fetchFiscalesTorneo = async () => {
    try {
      setLoading(true);
      const list = await FiscalesService.getByTorneo(torneoId);
      setFiscalesTorneo(list);
    } catch (err) {
      console.error("Error al cargar fiscales del torneo:", err);
    } finally {
      setLoading(false);
    }
  };

  const persistAsignacion = async (
    list: Fiscal[],
    rolesOverride?: Record<string, RolFiscalTorneo>,
  ) => {
    const roles = rolesOverride || buildRolesMap(list);
    await FiscalesService.asignarATorneo(
      torneoId,
      list.map((f) => f.id),
      roles,
    );
  };

  const handleBuscarDni = async () => {
    if (!searchDni.trim()) return;
    try {
      setSearching(true);
      setSearchError("");
      setFoundFiscal(null);
      const fiscal = await FiscalesService.getByDni(
        searchDni.trim(),
        colegioEntidadId,
      );
      if (fiscal) {
        setFoundFiscal(fiscal);
      } else {
        setSearchError(
          "No se encontró ningún fiscal registrado con ese DNI en el Colegio.",
        );
      }
    } catch (err: any) {
      setSearchError("Error al buscar fiscal en el Padrón.");
    } finally {
      setSearching(false);
    }
  };

  const handleAsignarFiscal = async (
    fiscalId: string,
    rol: RolFiscalTorneo = rolAlAsignar,
  ) => {
    try {
      setAsignando(true);
      if (fiscalesTorneo.some((f) => f.id === fiscalId)) return;

      const fiscalBase =
        foundFiscal?.id === fiscalId
          ? foundFiscal
          : todosLosFiscales.find((f) => f.id === fiscalId);

      if (!fiscalBase) {
        throw new Error("Fiscal no encontrado en el padrón.");
      }

      let roles = buildRolesMap(fiscalesTorneo);
      if (rol === "general") {
        Object.keys(roles).forEach((id) => {
          roles[id] = "auxiliar";
        });
      }
      roles[fiscalId] = rol;

      const nuevaLista: Fiscal[] = [
        ...fiscalesTorneo,
        { ...fiscalBase, rol_torneo: rol },
      ].map((f) => ({
        ...f,
        rol_torneo: roles[f.id] || "auxiliar",
      }));

      await persistAsignacion(nuevaLista, roles);
      sileo.success({
        title: "Autoridad asignada",
        description:
          rol === "general"
            ? "Fiscal general designado para este torneo."
            : "Fiscal auxiliar designado para este torneo.",
      });
      setFoundFiscal(null);
      setSearchDni("");
      setRolAlAsignar("auxiliar");
      await fetchFiscalesTorneo();
      triggerRefresh();
    } catch (err: any) {
      sileo.error({
        title: "Error al asignar",
        description: err.message || "No se pudo asignar la autoridad.",
      });
    } finally {
      setAsignando(false);
    }
  };

  const handleCambiarRol = async (
    fiscalId: string,
    nuevoRol: RolFiscalTorneo,
  ) => {
    try {
      const roles = buildRolesMap(fiscalesTorneo);
      if (nuevoRol === "general") {
        Object.keys(roles).forEach((id) => {
          roles[id] = "auxiliar";
        });
      }
      roles[fiscalId] = nuevoRol;

      const nuevaLista = fiscalesTorneo.map((f) => ({
        ...f,
        rol_torneo: roles[f.id] || "auxiliar",
      }));

      await persistAsignacion(nuevaLista, roles);
      setFiscalesTorneo(nuevaLista);
      sileo.success({
        title: "Rol actualizado",
        description:
          nuevoRol === "general"
            ? "Ahora es el fiscal general del torneo."
            : "Quedó como fiscal auxiliar.",
      });
      triggerRefresh();
    } catch (err: any) {
      sileo.error({ title: "Error", description: err.message });
    }
  };

  const handleDesasignarFiscal = async (fiscalId: string) => {
    try {
      const nuevaLista = fiscalesTorneo.filter((f) => f.id !== fiscalId);
      await persistAsignacion(nuevaLista);
      sileo.success({
        title: "Designación removida",
        description: "La autoridad ya no está asignada a este torneo.",
      });
      fetchFiscalesTorneo();
      triggerRefresh();
    } catch (err: any) {
      sileo.error({ title: "Error", description: err.message });
    }
  };

  const fiscalesOrdenados = [...fiscalesTorneo].sort((a, b) => {
    if (a.rol_torneo === "general" && b.rol_torneo !== "general") return -1;
    if (b.rol_torneo === "general" && a.rol_torneo !== "general") return 1;
    return `${a.apellido} ${a.nombre}`.localeCompare(
      `${b.apellido} ${b.nombre}`,
    );
  });

  return (
    <div
      className={`bg-brand-card border border-white/10 rounded-3xl p-6 space-y-8 shadow-xl ${readOnly ? "pointer-events-none opacity-60 select-none" : ""}`}
    >
      <div>
        <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase tracking-widest mb-1">
          <Shield className="size-4" /> Autoridades del Torneo
        </div>
        <h3 className="text-xl font-extrabold text-white">
          Paso 6: Fiscales y Autoridades
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Designá el fiscal general y los fiscales auxiliares homologados para
          este torneo.
        </p>
      </div>

      <div className="bg-brand-input/40 p-6 rounded-2xl border border-white/10 space-y-4 shadow-sm">
        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          Designar autoridad del Colegio
        </h4>

        <div className="space-y-2">
          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
            Rol al designar
          </label>
          <CustomDropdown
            value={rolAlAsignar}
            onChange={(val) =>
              setRolAlAsignar(val === "general" ? "general" : "auxiliar")
            }
            options={[
              { value: "auxiliar", label: "Fiscal auxiliar" },
              { value: "general", label: "Fiscal general (único)" },
            ]}
            placeholder="Rol..."
          />
        </div>

        {todosLosFiscales.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                Seleccionar del Padrón Oficial
              </label>
              <span className="text-[10px] text-brand-chartreuse font-bold">
                Mínimo requerido: {torneo.alcance || "Local"}
              </span>
            </div>
            <CustomDropdown
              value=""
              onChange={(val) => {
                if (val) handleAsignarFiscal(val);
              }}
              options={todosLosFiscales
                .filter((f) => {
                  const esAsignado = fiscalesTorneo.some((ft) => ft.id === f.id);
                  if (esAsignado) return false;

                  const RANGOS: Record<string, number> = {
                    Local: 1,
                    Regional: 2,
                    Provincial: 3,
                    Nacional: 4,
                  };
                  const minimoReq = RANGOS[torneo.alcance || "Local"] || 1;
                  const nivelF = RANGOS[f.rango || "Local"] || 1;
                  return nivelF >= minimoReq;
                })
                .map((f) => ({
                  value: f.id,
                  label: `${f.nombre} ${f.apellido} (DNI: ${f.dni}) — ${f.rango || "Provincial"}`,
                }))}
              placeholder={`-- Seleccionar fiscal homologado (${torneo.alcance || "Local"} o superior) --`}
            />
          </div>
        )}

        <div className="pt-2">
          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">
            O buscar por DNI
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ingresar DNI del fiscal (solo números)..."
                value={searchDni}
                onChange={(e) => setSearchDni(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-brand-input border border-white/10 text-white pl-11 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-chartreuse/50"
              />
            </div>
            <button
              onClick={handleBuscarDni}
              disabled={searching || !searchDni}
              className="bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/30 px-5 py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              {searching ? "Buscando..." : "Buscar en Colegio"}
            </button>
          </div>
        </div>

        {searchError && (
          <p className="text-xs text-rose-400 font-medium">{searchError}</p>
        )}

        {foundFiscal && (
          <div className="bg-brand-chartreuse/10 border border-brand-chartreuse/30 p-4 rounded-xl flex items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-sm text-white">
                {foundFiscal.nombre} {foundFiscal.apellido}
              </p>
              <p className="text-xs text-gray-400">
                DNI: {foundFiscal.dni} · Alcance:{" "}
                {foundFiscal.rango || "Provincial"}
              </p>
            </div>
            <button
              onClick={() => handleAsignarFiscal(foundFiscal.id)}
              disabled={asignando}
              className="bg-brand-chartreuse text-brand-black px-4 py-2 rounded-xl text-xs font-extrabold hover:opacity-90 transition-all cursor-pointer shrink-0"
            >
              {asignando ? "Designando..." : "Confirmar designación"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
          <UserCheck className="size-4 text-brand-chartreuse" /> Autoridades
          asignadas ({fiscalesTorneo.length})
        </h4>

        {loading ? (
          <div className="text-center p-6 text-gray-500 text-xs">
            Cargando autoridades asignadas...
          </div>
        ) : fiscalesTorneo.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-gray-500 text-xs">
            Aún no hay autoridades asignadas a este torneo.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fiscalesOrdenados.map((f) => {
              const esGeneral = f.rol_torneo === "general";
              return (
                <div
                  key={f.id}
                  className="bg-brand-input border border-white/10 p-4 rounded-2xl flex justify-between items-start gap-3 shadow-sm"
                >
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="font-bold text-sm text-white">
                        {f.nombre} {f.apellido}
                      </p>
                      <p className="text-xs text-gray-400 font-medium">
                        DNI: {f.dni} · Alcance: {f.rango || "Provincial"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide ${
                          esGeneral
                            ? "bg-brand-chartreuse/15 text-brand-chartreuse border border-brand-chartreuse/30"
                            : "bg-white/5 text-gray-300 border border-white/10"
                        }`}
                      >
                        {esGeneral && <Star className="size-3" />}
                        {esGeneral ? "Fiscal general" : "Fiscal auxiliar"}
                      </span>
                      {!esGeneral && (
                        <button
                          type="button"
                          onClick={() => handleCambiarRol(f.id, "general")}
                          className="text-[10px] font-bold text-brand-chartreuse hover:underline cursor-pointer"
                        >
                          Nombrar general
                        </button>
                      )}
                      {esGeneral && (
                        <button
                          type="button"
                          onClick={() => handleCambiarRol(f.id, "auxiliar")}
                          className="text-[10px] font-bold text-gray-400 hover:underline cursor-pointer"
                        >
                          Pasar a auxiliar
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDesasignarFiscal(f.id)}
                    className="text-rose-400 hover:text-rose-300 p-2 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Remover autoridad"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-white/10">
        <button
          onClick={() => setActiveTab("times")}
          className="bg-brand-input border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-brand-input/80 transition-all cursor-pointer"
        >
          Atrás: Sedes
        </button>
        <button
          onClick={() => setActiveTab("cierre")}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer"
        >
          Siguiente Paso: Cierre & Puntuación
        </button>
      </div>
    </div>
  );
};
