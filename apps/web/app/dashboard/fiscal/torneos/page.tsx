"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  Users,
} from "lucide-react";
import {
  FiscalPanelService,
  nombreSedeFiscal,
  type FiscalTorneo,
} from "@/utils/services/fiscal-panel";
import { formatFechaCalendario } from "@/utils/formatFecha";

const FILTROS_ALCANCE = ["Todos", "Nacional", "Provincial", "Regional", "Local"] as const;

export default function FiscalTorneosPage() {
  const router = useRouter();
  const [torneos, setTorneos] = useState<FiscalTorneo[]>([]);
  const [alcance, setAlcance] = useState<(typeof FILTROS_ALCANCE)[number]>("Todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const defer = setTimeout(() => {
      FiscalPanelService.getTorneos()
        .then((data) => {
          if (mounted) setTorneos(data);
        })
        .catch(() => {
          if (mounted) setTorneos([]);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(defer);
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return torneos.filter((t) => {
      const okAlcance = alcance === "Todos" || t.alcance === alcance;
      const okSearch =
        !q ||
        t.nombre.toLowerCase().includes(q) ||
        String(t.estado || "").toLowerCase().includes(q) ||
        String(t.categoria || "").toLowerCase().includes(q);
      return okAlcance && okSearch;
    });
  }, [torneos, alcance, search]);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-6 md:px-10 md:py-10">
      <div>
        <p className="text-brand-chartreuse text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Trophy className="size-4" /> Asignaciones
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
          Mis torneos
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {filtrados.length} de {torneos.length} asignados
          {alcance !== "Todos" ? ` · alcance ${alcance}` : ""}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 size-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, estado o categoría…"
            className="w-full bg-[#151515] border border-white/10 text-white pl-11 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-chartreuse/50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS_ALCANCE.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setAlcance(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                alcance === f
                  ? "bg-brand-chartreuse text-brand-black"
                  : "bg-[#161616] text-gray-400 border border-white/10 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#151515] border border-white/5 rounded-2xl" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-[#151515] border border-white/5 rounded-2xl p-10 text-center text-gray-500 text-sm">
          No hay torneos
          {alcance !== "Todos" ? ` con alcance ${alcance}` : " asignados"}
          {search ? ` para “${search}”` : ""}.
        </div>
      ) : (
        <div className="bg-[#161616] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                  <th className="px-5 py-3">Torneo</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Modalidad</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {filtrados.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-white/5 cursor-pointer"
                    onClick={() => router.push(`/dashboard/fiscal/torneos/${t.id}`)}
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-white">{t.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="size-3" />
                        {t.alcance || "Local"} · {nombreSedeFiscal(t)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-gray-500" />
                        {formatFechaCalendario(t.fecha)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5 text-gray-500" />
                        {t.modalidad || "Duplas"}
                      </span>
                    </td>
                    <td className="px-5 py-4">{t.estado}</td>
                    <td className="px-5 py-4">
                      {t.rol_torneo === "general" ? "General" : "Auxiliar"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ArrowRight className="size-4 text-brand-chartreuse inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
