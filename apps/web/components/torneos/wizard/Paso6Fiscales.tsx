"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Search,
  CheckCircle2,
  UserCheck,
  Trash2,
} from "lucide-react";
import { FiscalesService, Fiscal } from "@/utils/services/fiscales";
import { Torneo } from "@/utils/types";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";

interface Paso6FiscalesProps {
  torneo: Torneo;
  torneoId: string;
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void;
  triggerRefresh: () => void;
  readOnly?: boolean;
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

  const [todosLosFiscales, setTodosLosFiscales] = useState<Fiscal[]>([]);

  useEffect(() => {
    fetchFiscalesTorneo();
    FiscalesService.getAll()
      .then((res) => setTodosLosFiscales(res || []))
      .catch((err) => console.error("Error al cargar padrón de fiscales:", err));
  }, [torneoId]);

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

  const handleBuscarDni = async () => {
    if (!searchDni.trim()) return;
    try {
      setSearching(true);
      setSearchError("");
      setFoundFiscal(null);
      const fiscal = await FiscalesService.getByDni(searchDni.trim());
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

  const handleAsignarFiscal = async (fiscalId: string) => {
    try {
      setAsignando(true);
      const idsActuales = fiscalesTorneo.map((f) => f.id);
      if (!idsActuales.includes(fiscalId)) {
        const nuevosIds = [...idsActuales, fiscalId];
        await FiscalesService.asignarATorneo(torneoId, nuevosIds);
        sileo.success({
          title: "Fiscal Asignado",
          description:
            "El fiscal ha sido designado oficialmente para este torneo.",
        });
        setFoundFiscal(null);
        setSearchDni("");
        fetchFiscalesTorneo();
        triggerRefresh();
      }
    } catch (err: any) {
      sileo.error({
        title: "Error al asignar",
        description: err.message || "No se pudo asignar el fiscal.",
      });
    } finally {
      setAsignando(false);
    }
  };

  const handleDesasignarFiscal = async (fiscalId: string) => {
    try {
      const nuevosIds = fiscalesTorneo
        .filter((f) => f.id !== fiscalId)
        .map((f) => f.id);
      await FiscalesService.asignarATorneo(torneoId, nuevosIds);
      sileo.success({
        title: "Designación Removida",
        description: "El fiscal ya no está asignado.",
      });
      fetchFiscalesTorneo();
      triggerRefresh();
    } catch (err: any) {
      sileo.error({ title: "Error", description: err.message });
    }
  };

  return (
    <div className={`bg-[#111111] border border-white/5 rounded-3xl p-6 space-y-8 ${readOnly ? "pointer-events-none opacity-60 select-none" : ""}`}>
      <div>
        <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase tracking-widest mb-1">
          <Shield className="size-4" /> Autoridad de Juego
        </div>
        <h3 className="text-xl font-extrabold text-white">
          Paso 6: Colegio de Fiscales & Autoridades del Torneo
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Asigná los árbitros y fiscales homologados por el Colegio Oficial de
          Fiscales para este torneo.
        </p>
      </div>

      {/* Seleccionar del Padrón Oficial o Buscar por DNI */}
      <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-4">
        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          Designar Fiscal del Colegio Homologado
        </h4>

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
                if (val) {
                  handleAsignarFiscal(val);
                }
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
              placeholder={`-- Seleccionar Fiscal Homologado (${torneo.alcance || "Local"} o Superior) --`}
            />
          </div>
        )}

        <div className="pt-2">
          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2">
            O Buscar por DNI
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 size-4 text-gray-500" />
              <input
                type="text"
                placeholder="Ingresar DNI del Fiscal (Solo números)..."
                value={searchDni}
                onChange={(e) => setSearchDni(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-brand-input border border-white/10 text-white pl-11 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-chartreuse/50"
              />
            </div>
            <button
              onClick={handleBuscarDni}
              disabled={searching || !searchDni}
              className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all border border-white/10 disabled:opacity-40 cursor-pointer"
            >
              {searching ? "Buscando..." : "Buscar en Colegio"}
            </button>
          </div>
        </div>

        {searchError && (
          <p className="text-xs text-rose-400 font-medium">{searchError}</p>
        )}

        {foundFiscal && (
          <div className="bg-brand-chartreuse/10 border border-brand-chartreuse/30 p-4 rounded-xl flex items-center justify-between">
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
              className="bg-brand-chartreuse text-brand-black px-4 py-2 rounded-xl text-xs font-extrabold hover:opacity-90 transition-all cursor-pointer"
            >
              {asignando ? "Designando..." : "Confirmar Designación"}
            </button>
          </div>
        )}
      </div>

      {/* Lista de Fiscales Asignados */}
      <div className="space-y-4">
        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
          <UserCheck className="size-4 text-brand-chartreuse" /> Cuerpo Arbitral
          Asignado ({fiscalesTorneo.length})
        </h4>

        {loading ? (
          <div className="text-center p-6 text-gray-500 text-xs">
            Cargando fiscales asignados...
          </div>
        ) : fiscalesTorneo.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-gray-500 text-xs">
            Aún no hay fiscales asignados a este torneo.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fiscalesTorneo.map((f) => (
              <div
                key={f.id}
                className="bg-black/20 border border-white/5 p-4 rounded-2xl flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-sm text-white">
                    {f.nombre} {f.apellido}
                  </p>
                  <p className="text-xs text-gray-400">
                    DNI: {f.dni} · Alcance: {f.rango || "Provincial"}
                  </p>
                </div>
                <button
                  onClick={() => handleDesasignarFiscal(f.id)}
                  className="text-rose-400 hover:text-rose-300 p-2 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Remover fiscal"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-white/5">
        <button
          onClick={() => setActiveTab("times")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-white/10 transition-all cursor-pointer"
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
